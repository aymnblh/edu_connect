"""Shared schemas and authorization helpers for Direct Messaging (DM)."""
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.access import assert_school_is_active
from app.core.audit import record_audit_event
from app.core.middleware import role_may_call
from app.core.rate_limit import check_rate_limit
from app.core.rls import set_request_rls_context
from app.core.security import decode_token, get_current_user, session_rejection
from app.db.database import get_db
from app.models import (
    Class,
    ClassMember,
    ClassTeacher,
    ClassTemporaryAccess,
    Conversation,
    ConversationParticipant,
    ConversationType,
    DirectMessage,
    MessageBlock,
    MessageReport,
    StudentParent,
    User,
    UserRole,
)
from app.modules.demo.access import DEMO_READ_ONLY_MESSAGE, is_read_only_demo_user
from app.ws_manager import manager


_STAFF_ROLES = {UserRole.teacher, UserRole.principal, UserRole.secretary}


_ADMIN_ROLES = {UserRole.principal, UserRole.secretary, UserRole.system_admin}


_REPORT_STATUSES = {"pending", "reviewed", "dismissed", "actioned"}


_REPORT_REASONS = {"harassment", "spam", "inappropriate", "threat", "other"}


class CreateConversationRequest(BaseModel):
    """Create a direct 1-to-1 conversation."""
    recipient_id: str          # user_id of the other participant
    initial_message: Optional[str] = None  # optional first message


class CreateBulkConversationsRequest(BaseModel):
    """Send the same message to several users as separate private DMs."""
    recipient_ids: list[str]
    initial_message: str


class BroadcastRequest(BaseModel):
    """Teacher broadcasts a message to all parents of a class (creates group conv)."""
    class_id: str
    title: str                 # e.g. "Réunion parents - 3ème A"
    initial_message: str


class SendMessageRequest(BaseModel):
    content: str


class ParticipantOut(BaseModel):
    user_id: str
    full_name: str
    role: str

    model_config = {"from_attributes": True}


class ContactClassOut(BaseModel):
    id: str
    name: str


class ContactOut(BaseModel):
    user_id: str
    full_name: str
    role: str
    email: str | None = None
    classes: list[ContactClassOut] = []

    model_config = {"from_attributes": True}


class DirectMessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    content: str
    bulk_send_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: str
    school_id: str
    type: str
    title: Optional[str]
    created_by: str
    created_at: datetime
    unread_count: int = 0
    last_message: Optional[DirectMessageOut] = None
    participants: list[ParticipantOut] = []

    model_config = {"from_attributes": True}


class MessageBlockOut(BaseModel):
    id: str
    school_id: str
    blocker_id: str
    blocked_user_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateMessageReportRequest(BaseModel):
    reported_user_id: str
    message_id: str | None = None
    reason: str
    details: str | None = None


class MessageReportOut(BaseModel):
    id: str
    school_id: str
    reporter_id: str
    reported_user_id: str
    conversation_id: str | None = None
    message_id: str | None = None
    reason: str
    details: str | None = None
    status: str
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateMessageReportRequest(BaseModel):
    status: str


async def _assert_not_message_blocked(sender: User, recipient: User, db: AsyncSession) -> None:
    if sender.role in _ADMIN_ROLES or recipient.role in _ADMIN_ROLES:
        return

    school_id = sender.school_id or recipient.school_id
    block_res = await db.execute(
        select(MessageBlock)
        .where(
            MessageBlock.school_id == school_id,
            or_(
                and_(
                    MessageBlock.blocker_id == sender.id,
                    MessageBlock.blocked_user_id == recipient.id,
                ),
                and_(
                    MessageBlock.blocker_id == recipient.id,
                    MessageBlock.blocked_user_id == sender.id,
                ),
            ),
        )
        .limit(1)
    )
    block = block_res.scalar_one_or_none()
    if not block:
        return

    if block.blocker_id == sender.id:
        raise HTTPException(status_code=403, detail="Debloquez ce contact avant de lui envoyer un message.")

    raise HTTPException(status_code=403, detail="Ce destinataire n'accepte pas de messages directs de votre compte.")


async def _filter_blocked_contacts(current_user: User, contacts: list[User], db: AsyncSession) -> list[User]:
    if current_user.role in _ADMIN_ROLES or not contacts:
        return contacts

    contact_ids = [user.id for user in contacts if user.role not in _ADMIN_ROLES]
    if not contact_ids:
        return contacts

    block_res = await db.execute(
        select(MessageBlock).where(
            MessageBlock.school_id == current_user.school_id,
            or_(
                and_(
                    MessageBlock.blocker_id == current_user.id,
                    MessageBlock.blocked_user_id.in_(contact_ids),
                ),
                and_(
                    MessageBlock.blocker_id.in_(contact_ids),
                    MessageBlock.blocked_user_id == current_user.id,
                ),
            ),
        )
    )
    blocked_ids: set[str] = set()
    for block in block_res.scalars().all():
        blocked_ids.add(block.blocker_id)
        blocked_ids.add(block.blocked_user_id)
    blocked_ids.discard(current_user.id)
    return [user for user in contacts if user.id not in blocked_ids]


async def _notify_dm_recipients(
    db: AsyncSession,
    *,
    school_id: str | None,
    sender: User,
    recipient_ids: list[str],
    content: str,
) -> None:
    if not isinstance(db, AsyncSession) or not school_id:
        return
    from app.utils.notifications import create_notification

    preview = content.strip()
    if not preview:
        return
    if len(preview) > 140:
        preview = f"{preview[:137]}..."
    title = f"Nouveau message de {sender.full_name}"
    for recipient_id in dict.fromkeys(recipient_ids):
        if not recipient_id or recipient_id == sender.id:
            continue
        await create_notification(
            db,
            user_id=recipient_id,
            title=title,
            content=preview,
            type="INFO",
            school_id=school_id,
        )


async def _assert_can_dm(current_user: User, recipient_id: str, db: AsyncSession):
    """
    Validate that current_user is allowed to start a DM with recipient.
    Raises HTTP 403 if not allowed.

    Rules:
      - Teacher   → parents of students in their classes OR admin (principal/secretary)
      - Parent    → teachers of their children OR admin (principal/secretary)
      - Principal/Secretary → any user in same school
    """
    recipient_stmt = select(User).where(User.id == recipient_id)
    if current_user.role != UserRole.system_admin:
        recipient_stmt = recipient_stmt.where(User.school_id == current_user.school_id)
    recipient_res = await db.execute(recipient_stmt)
    recipient = recipient_res.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="Destinataire introuvable.")

    # Same school guard (except system_admin)
    if current_user.role != UserRole.system_admin:
        if recipient.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Ce destinataire n'appartient pas à votre établissement.")

    role = current_user.role

    # ① Teacher → parents of students in their classes OR admin
    if role == UserRole.teacher:
        if recipient.role in [UserRole.principal, UserRole.secretary]:
            await _assert_not_message_blocked(current_user, recipient, db)
            return recipient  # admin always allowed
        if recipient.role != UserRole.parent:
            raise HTTPException(
                status_code=403,
                detail="Un enseignant ne peut contacter que les parents de ses eleves ou l'administration."
            )
        # Check parent has a child in one of the teacher's classes
        stmt = (
            select(StudentParent.parent_id)
            .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
            .join(ClassTeacher, ClassTeacher.class_id == ClassMember.class_id)
            .where(
                StudentParent.school_id == current_user.school_id,
                ClassMember.school_id == current_user.school_id,
                ClassTeacher.school_id == current_user.school_id,
                ClassTeacher.teacher_id == current_user.id,
                StudentParent.parent_id == recipient_id,
            )
            .limit(1)
        )
        res = await db.execute(stmt)
        has_access = res.scalar_one_or_none()
        if not has_access:
            now = datetime.now(timezone.utc)
            temp_res = await db.execute(
                select(StudentParent.parent_id)
                .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
                .join(ClassTemporaryAccess, ClassTemporaryAccess.class_id == ClassMember.class_id)
                .where(
                    StudentParent.school_id == current_user.school_id,
                    ClassMember.school_id == current_user.school_id,
                    ClassTemporaryAccess.school_id == current_user.school_id,
                    ClassTemporaryAccess.user_id == current_user.id,
                    ClassTemporaryAccess.starts_at <= now,
                    ClassTemporaryAccess.expires_at >= now,
                    StudentParent.parent_id == recipient_id,
                )
                .limit(1)
            )
            has_access = temp_res.scalar_one_or_none()
        if not has_access:
            raise HTTPException(
                status_code=403,
                detail="Vous ne pouvez contacter que les parents de vos eleves ou l'administration."
            )

    # ② Parent → teachers of their children OR admin
    elif role == UserRole.parent:
        if recipient.role in [UserRole.principal, UserRole.secretary]:
            await _assert_not_message_blocked(current_user, recipient, db)
            return recipient  # admin always allowed
        if recipient.role != UserRole.teacher:
            raise HTTPException(
                status_code=403,
                detail="En tant que parent, vous pouvez contacter les enseignants de vos enfants ou l'administration."
            )
        # Check the teacher teaches a class that contains parent's child
        stmt = (
            select(ClassTeacher.teacher_id)
            .join(ClassMember, ClassMember.class_id == ClassTeacher.class_id)
            .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
            .where(
                ClassTeacher.school_id == current_user.school_id,
                ClassMember.school_id == current_user.school_id,
                StudentParent.school_id == current_user.school_id,
                StudentParent.parent_id == current_user.id,
                ClassTeacher.teacher_id == recipient_id,
            )
            .limit(1)
        )
        res = await db.execute(stmt)
        has_access = res.scalar_one_or_none()
        if not has_access:
            now = datetime.now(timezone.utc)
            temp_res = await db.execute(
                select(ClassTemporaryAccess.user_id)
                .join(ClassMember, ClassMember.class_id == ClassTemporaryAccess.class_id)
                .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
                .where(
                    ClassTemporaryAccess.school_id == current_user.school_id,
                    ClassMember.school_id == current_user.school_id,
                    StudentParent.school_id == current_user.school_id,
                    StudentParent.parent_id == current_user.id,
                    ClassTemporaryAccess.user_id == recipient_id,
                    ClassTemporaryAccess.starts_at <= now,
                    ClassTemporaryAccess.expires_at >= now,
                )
                .limit(1)
            )
            has_access = temp_res.scalar_one_or_none()
        if not has_access:
            raise HTTPException(
                status_code=403,
                detail="Vous ne pouvez contacter que les enseignants de vos enfants ou l'administration."
            )

    # ③ Principal / Secretary → any user in their school
    elif role in [UserRole.principal, UserRole.secretary]:
        if recipient.role not in [
            UserRole.parent, UserRole.teacher,
            UserRole.principal, UserRole.secretary
        ]:
            raise HTTPException(status_code=403, detail="Destinataire non autorisé.")

    await _assert_not_message_blocked(current_user, recipient, db)
    return recipient


async def _get_or_create_direct_conv(
    user_a: User, user_b: User, school_id: str, db: AsyncSession
) -> Conversation:
    """Return existing 1-to-1 conv between two users, or create a new one."""
    # Find a direct conversation where BOTH users are participants
    stmt = (
        select(Conversation.id)
        .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
        .where(
            Conversation.type == ConversationType.direct,
            Conversation.school_id == school_id,
            ConversationParticipant.school_id == school_id,
            ConversationParticipant.user_id == user_a.id
        )
        .intersect(
            select(Conversation.id)
            .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
            .where(
                Conversation.type == ConversationType.direct,
                Conversation.school_id == school_id,
                ConversationParticipant.school_id == school_id,
                ConversationParticipant.user_id == user_b.id
            )
        )
    )
    res = await db.execute(stmt)
    existing_id = res.scalar_one_or_none()

    if existing_id:
        conv_res = await db.execute(
            select(Conversation)
            .where(Conversation.school_id == school_id, Conversation.id == existing_id)
            .options(selectinload(Conversation.participants).selectinload(ConversationParticipant.user))
        )
        return conv_res.scalar_one()

    # Create new
    conv = Conversation(
        id=str(uuid.uuid4()),
        school_id=school_id,
        type=ConversationType.direct,
        created_by=user_a.id,
    )
    db.add(conv)
    await db.flush()

    db.add(ConversationParticipant(conversation_id=conv.id, school_id=school_id, user_id=user_a.id))
    db.add(ConversationParticipant(conversation_id=conv.id, school_id=school_id, user_id=user_b.id))
    return conv


def _assert_can_send_in_conversation(conv: Conversation, current_user: User) -> None:
    """Group broadcasts are one-way for parents; private replies use direct DMs."""
    if conv.type == ConversationType.group and current_user.role not in _STAFF_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Repondez en conversation privee pour que les autres parents ne voient pas votre message.",
        )


async def _assert_can_send_message(conv: Conversation, current_user: User, db: AsyncSession) -> None:
    _assert_can_send_in_conversation(conv, current_user)
    if conv.type != ConversationType.direct:
        return

    recipient_res = await db.execute(
        select(User)
        .join(ConversationParticipant, ConversationParticipant.user_id == User.id)
        .where(
            User.school_id == conv.school_id,
            ConversationParticipant.school_id == conv.school_id,
            ConversationParticipant.conversation_id == conv.id,
            ConversationParticipant.user_id != current_user.id,
        )
    )
    for recipient in recipient_res.scalars().all():
        await _assert_can_dm(current_user, recipient.id, db)


async def _assert_participant(current_user: User, conversation_id: str, db: AsyncSession):
    """Raise 403 if user is not an explicit conversation participant."""
    stmt = select(Conversation).where(Conversation.id == conversation_id)
    if current_user.role != UserRole.system_admin:
        stmt = stmt.where(Conversation.school_id == current_user.school_id)
    conv_res = await db.execute(stmt)
    conv = conv_res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")

    if current_user.role != UserRole.system_admin and conv.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Acces refuse.")

    part_res = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.school_id == conv.school_id,
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
    )
    if not part_res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Vous ne faites pas partie de cette conversation.")
    return conv


def _build_conv_out(conv: Conversation, current_user_id: str) -> ConversationOut:
    """Build ConversationOut DTO with unread count and last message."""
    # Find last_read_at for current user
    last_read_at = None
    for p in conv.participants:
        if p.user_id == current_user_id:
            last_read_at = p.last_read_at
            break

    # Count unread messages
    unread_count = 0
    last_message = None
    sorted_msgs = sorted(conv.messages, key=lambda m: m.created_at)

    if sorted_msgs:
        last_msg = sorted_msgs[-1]
        last_message = DirectMessageOut(
            id=last_msg.id,
            conversation_id=last_msg.conversation_id,
            sender_id=last_msg.sender_id,
            sender_name=last_msg.sender_name,
            content=last_msg.content,
            bulk_send_id=last_msg.bulk_send_id,
            created_at=last_msg.created_at,
        )
        if last_read_at is None:
            unread_count = len(sorted_msgs)
        else:
            unread_count = sum(
                1 for m in sorted_msgs
                if m.created_at > last_read_at and m.sender_id != current_user_id
            )

    participants = [
        ParticipantOut(
            user_id=p.user_id,
            full_name=p.user.full_name if p.user else "?",
            role=p.user.role.value if p.user else "unknown",
        )
        for p in conv.participants
    ]

    return ConversationOut(
        id=conv.id,
        school_id=conv.school_id,
        type=conv.type.value,
        title=conv.title,
        created_by=conv.created_by,
        created_at=conv.created_at,
        unread_count=unread_count,
        last_message=last_message,
        participants=participants,
    )
