"""
Direct Messaging (DM) Router
============================
Handles private and group conversations between school users.

Authorization matrix:
  - Teacher   → can DM parents of their students + principal + secretary
  - Teacher   → can broadcast to ALL parents of one of their classes (group conv)
  - Parent    → can DM teachers of their children + principal + secretary
  - Principal/Secretary → can DM any user in their school
  - Conversations are visible only to explicit participants
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.db.database import get_db
from app.core.audit import record_audit_event
from app.core.rate_limit import check_rate_limit
from app.core.rls import set_request_rls_context
from app.models import (
    Conversation, ConversationParticipant, ConversationType,
    DirectMessage, User, UserRole,
    Class, ClassMember, ClassTemporaryAccess, MessageBlock, MessageReport,
    StudentParent, ClassTeacher
)
from app.core.security import get_current_user, decode_token
from app.ws_manager import manager

router = APIRouter(prefix="/dm", tags=["Direct Messaging"])
_STAFF_ROLES = {UserRole.teacher, UserRole.principal, UserRole.secretary}
_ADMIN_ROLES = {UserRole.principal, UserRole.secretary, UserRole.system_admin}
_REPORT_STATUSES = {"pending", "reviewed", "dismissed", "actioned"}
_REPORT_REASONS = {"harassment", "spam", "inappropriate", "threat", "other"}


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

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

class ContactOut(BaseModel):
    user_id: str
    full_name: str
    role: str
    email: str | None = None

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


# ─── Authorization Helpers ────────────────────────────────────────────────────

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


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/contacts", response_model=list[ContactOut])
async def list_dm_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return only the users the current account is allowed to message.

    Rules:
      - Teacher   → parents of students in their classes + principal + secretary
      - Parent    → teachers of their children + principal + secretary
      - Principal/Secretary → all users in the school
    """
    if not current_user.school_id and current_user.role != UserRole.system_admin:
        return []

    role = current_user.role
    school_id = current_user.school_id

    if role == UserRole.teacher:
        # Parents of students in the teacher's classes
        parents_stmt = (
            select(User)
            .join(StudentParent, StudentParent.parent_id == User.id)
            .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
            .join(ClassTeacher, ClassTeacher.class_id == ClassMember.class_id)
            .where(
                User.school_id == school_id,
                StudentParent.school_id == school_id,
                ClassMember.school_id == school_id,
                ClassTeacher.school_id == school_id,
                ClassTeacher.teacher_id == current_user.id,
                User.id != current_user.id,
            )
            .distinct()
        )
        # Admin (principal + secretary) of the same school
        admin_stmt = (
            select(User)
            .where(
                User.school_id == school_id,
                User.role.in_([UserRole.principal, UserRole.secretary]),
            )
        )
        now = datetime.now(timezone.utc)
        temp_parents_stmt = (
            select(User)
            .join(StudentParent, StudentParent.parent_id == User.id)
            .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
            .join(ClassTemporaryAccess, ClassTemporaryAccess.class_id == ClassMember.class_id)
            .where(
                User.school_id == school_id,
                StudentParent.school_id == school_id,
                ClassMember.school_id == school_id,
                ClassTemporaryAccess.user_id == current_user.id,
                ClassTemporaryAccess.school_id == school_id,
                ClassTemporaryAccess.starts_at <= now,
                ClassTemporaryAccess.expires_at >= now,
                User.id != current_user.id,
            )
            .distinct()
        )
        parents_res = await db.execute(parents_stmt)
        temp_parents_res = await db.execute(temp_parents_stmt)
        admin_res = await db.execute(admin_stmt)
        contact_map = {
            user.id: user
            for user in (
                list(parents_res.scalars().unique().all())
                + list(temp_parents_res.scalars().unique().all())
                + list(admin_res.scalars().unique().all())
            )
        }
        contacts = sorted(contact_map.values(), key=lambda u: u.full_name)

    elif role == UserRole.parent:
        # Teachers of the parent's children
        teachers_stmt = (
            select(User)
            .join(ClassTeacher, ClassTeacher.teacher_id == User.id)
            .join(ClassMember, ClassMember.class_id == ClassTeacher.class_id)
            .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
            .where(
                User.school_id == school_id,
                ClassTeacher.school_id == school_id,
                ClassMember.school_id == school_id,
                StudentParent.school_id == school_id,
                StudentParent.parent_id == current_user.id,
                User.id != current_user.id,
            )
            .distinct()
        )
        # Admin (principal + secretary) of the same school
        admin_stmt = (
            select(User)
            .where(
                User.school_id == school_id,
                User.role.in_([UserRole.principal, UserRole.secretary]),
            )
        )
        now = datetime.now(timezone.utc)
        temp_teachers_stmt = (
            select(User)
            .join(ClassTemporaryAccess, ClassTemporaryAccess.user_id == User.id)
            .join(ClassMember, ClassMember.class_id == ClassTemporaryAccess.class_id)
            .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
            .where(
                User.school_id == school_id,
                ClassMember.school_id == school_id,
                StudentParent.school_id == school_id,
                StudentParent.parent_id == current_user.id,
                ClassTemporaryAccess.school_id == school_id,
                ClassTemporaryAccess.starts_at <= now,
                ClassTemporaryAccess.expires_at >= now,
                User.id != current_user.id,
            )
            .distinct()
        )
        teachers_res = await db.execute(teachers_stmt)
        temp_teachers_res = await db.execute(temp_teachers_stmt)
        admin_res = await db.execute(admin_stmt)
        contact_map = {
            user.id: user
            for user in (
                list(teachers_res.scalars().unique().all())
                + list(temp_teachers_res.scalars().unique().all())
                + list(admin_res.scalars().unique().all())
            )
        }
        contacts = sorted(contact_map.values(), key=lambda u: u.full_name)

    elif role in [UserRole.principal, UserRole.secretary]:
        stmt = (
            select(User)
            .where(
                User.school_id == school_id,
                User.id != current_user.id,
                User.role.in_([
                    UserRole.parent,
                    UserRole.teacher,
                    UserRole.principal,
                    UserRole.secretary,
                ]),
            )
            .order_by(User.full_name.asc())
        )
        result = await db.execute(stmt)
        contacts = result.scalars().unique().all()
    else:
        return []

    contacts = await _filter_blocked_contacts(current_user, list(contacts), db)
    return [
        ContactOut(
            user_id=user.id,
            full_name=user.full_name,
            role=user.role.value,
            email=user.email,
        )
        for user in contacts
    ]


@router.get("/blocks", response_model=list[MessageBlockOut])
async def list_message_blocks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MessageBlock)
        .where(
            MessageBlock.school_id == current_user.school_id,
            MessageBlock.blocker_id == current_user.id,
        )
        .order_by(MessageBlock.created_at.desc())
    )
    return result.scalars().all()


@router.post("/blocks/{blocked_user_id}", response_model=MessageBlockOut, status_code=201)
async def block_message_user(
    blocked_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="Utilisateur non assigne a un etablissement.")
    if blocked_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous bloquer vous-meme.")

    user_res = await db.execute(
        select(User).where(
            User.id == blocked_user_id,
            User.school_id == current_user.school_id,
        )
    )
    blocked_user = user_res.scalar_one_or_none()
    if not blocked_user or blocked_user.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if blocked_user.role in _ADMIN_ROLES:
        raise HTTPException(status_code=400, detail="Les comptes administratifs ne peuvent pas etre bloques.")

    existing_res = await db.execute(
        select(MessageBlock).where(
            MessageBlock.school_id == current_user.school_id,
            MessageBlock.blocker_id == current_user.id,
            MessageBlock.blocked_user_id == blocked_user_id,
        )
    )
    existing = existing_res.scalar_one_or_none()
    if existing:
        return existing

    block = MessageBlock(
        id=str(uuid.uuid4()),
        school_id=current_user.school_id,
        blocker_id=current_user.id,
        blocked_user_id=blocked_user_id,
    )
    db.add(block)
    await record_audit_event(
        db,
        action="dm.user_blocked",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="message_block",
        resource_id=block.id,
        metadata={"blocked_user_id": blocked_user_id},
    )
    await db.commit()
    await db.refresh(block)
    return block


@router.delete("/blocks/{blocked_user_id}")
async def unblock_message_user(
    blocked_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MessageBlock).where(
            MessageBlock.school_id == current_user.school_id,
            MessageBlock.blocker_id == current_user.id,
            MessageBlock.blocked_user_id == blocked_user_id,
        )
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Blocage introuvable.")

    await db.delete(block)
    await record_audit_event(
        db,
        action="dm.user_unblocked",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="message_block",
        resource_id=block.id,
        metadata={"blocked_user_id": blocked_user_id},
    )
    await db.commit()
    return {"status": "success"}


@router.post("/conversations/{conversation_id}/reports", response_model=MessageReportOut, status_code=201)
async def report_conversation_message(
    conversation_id: str,
    req: CreateMessageReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await _assert_participant(current_user, conversation_id, db)
    reason = req.reason.strip().lower()
    if reason not in _REPORT_REASONS:
        raise HTTPException(status_code=400, detail="Motif de signalement invalide.")
    if req.reported_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous signaler vous-meme.")

    participant_res = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.school_id == conv.school_id,
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == req.reported_user_id,
        )
    )
    if not participant_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="L'utilisateur signale ne participe pas a cette conversation.")

    if req.message_id:
        message_res = await db.execute(
            select(DirectMessage).where(
                DirectMessage.school_id == conv.school_id,
                DirectMessage.id == req.message_id,
                DirectMessage.conversation_id == conversation_id,
            )
        )
        message = message_res.scalar_one_or_none()
        if not message:
            raise HTTPException(status_code=404, detail="Message introuvable.")
        if message.sender_id != req.reported_user_id:
            raise HTTPException(status_code=400, detail="Le message signale ne vient pas de cet utilisateur.")

    report = MessageReport(
        id=str(uuid.uuid4()),
        school_id=conv.school_id,
        reporter_id=current_user.id,
        reported_user_id=req.reported_user_id,
        conversation_id=conversation_id,
        message_id=req.message_id,
        reason=reason,
        details=req.details.strip() if req.details else None,
    )
    db.add(report)
    await record_audit_event(
        db,
        action="dm.report_created",
        actor=current_user,
        school_id=conv.school_id,
        resource_type="message_report",
        resource_id=report.id,
        metadata={
            "conversation_id": conversation_id,
            "message_id": req.message_id,
            "reported_user_id": req.reported_user_id,
            "reason": reason,
        },
    )
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/reports", response_model=list[MessageReportOut])
async def list_message_reports(
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in _ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Reserve a l'administration.")
    if status_filter and status_filter not in _REPORT_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide.")

    stmt = select(MessageReport)
    if current_user.role != UserRole.system_admin:
        stmt = stmt.where(MessageReport.school_id == current_user.school_id)
    if status_filter:
        stmt = stmt.where(MessageReport.status == status_filter)

    result = await db.execute(stmt.order_by(MessageReport.created_at.desc()).limit(limit))
    return result.scalars().all()


@router.patch("/reports/{report_id}", response_model=MessageReportOut)
async def update_message_report(
    report_id: str,
    req: UpdateMessageReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in _ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Reserve a l'administration.")
    status_value = req.status.strip().lower()
    if status_value not in _REPORT_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide.")

    stmt = select(MessageReport).where(MessageReport.id == report_id)
    if current_user.role != UserRole.system_admin:
        stmt = stmt.where(MessageReport.school_id == current_user.school_id)
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Signalement introuvable.")

    report.status = status_value
    report.reviewed_by = current_user.id
    report.reviewed_at = datetime.now(timezone.utc)
    await record_audit_event(
        db,
        action="dm.report_reviewed",
        actor=current_user,
        school_id=report.school_id,
        resource_type="message_report",
        resource_id=report.id,
        metadata={"status": status_value},
    )
    await db.commit()
    await db.refresh(report)
    return report


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_direct_conversation(
    req: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start (or resume) a direct 1-to-1 conversation.
    If a DM between these two users already exists, returns it instead of creating a duplicate.
    """
    if not current_user.school_id and current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=400, detail="Utilisateur non assigné à un établissement.")

    await check_rate_limit(f"dm_create:{current_user.id}", limit=30, window_seconds=3600)
    recipient = await _assert_can_dm(current_user, req.recipient_id, db)
    school_id = current_user.school_id or recipient.school_id

    conv = await _get_or_create_direct_conv(current_user, recipient, school_id, db)

    # Send initial message if provided
    if req.initial_message:
        msg = DirectMessage(
            school_id=conv.school_id,
            conversation_id=conv.id,
            sender_id=current_user.id,
            sender_name=current_user.full_name,
            content=req.initial_message,
        )
        db.add(msg)

    await db.commit()
    await db.refresh(conv)

    # Reload with relationships
    conv_res = await db.execute(
        select(Conversation)
        .where(Conversation.school_id == conv.school_id, Conversation.id == conv.id)
        .options(
            selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
            selectinload(Conversation.messages)
        )
    )
    conv = conv_res.scalar_one()
    return _build_conv_out(conv, current_user.id)


@router.post("/conversations/bulk", response_model=list[ConversationOut], status_code=status.HTTP_201_CREATED)
async def create_bulk_direct_conversations(
    req: CreateBulkConversationsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send one message to multiple users without creating a shared room.

    Each recipient gets (or reuses) a separate direct conversation with the
    sender, so parents never see each other's replies or message history.
    """
    if not current_user.school_id and current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=400, detail="Utilisateur non assignÃ© Ã  un Ã©tablissement.")

    content = req.initial_message.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Le message est obligatoire.")

    recipient_ids: list[str] = []
    for recipient_id in req.recipient_ids:
        recipient_id = recipient_id.strip()
        if recipient_id and recipient_id != current_user.id and recipient_id not in recipient_ids:
            recipient_ids.append(recipient_id)

    if not recipient_ids:
        raise HTTPException(status_code=400, detail="Aucun destinataire valide.")
    if len(recipient_ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 destinataires par envoi.")
    await check_rate_limit(f"dm_bulk:{current_user.id}", limit=10, window_seconds=3600)

    bulk_send_id = str(uuid.uuid4())
    conversations: list[Conversation] = []
    for recipient_id in recipient_ids:
        recipient = await _assert_can_dm(current_user, recipient_id, db)
        school_id = current_user.school_id or recipient.school_id
        conv = await _get_or_create_direct_conv(current_user, recipient, school_id, db)
        conversations.append(conv)
        db.add(
            DirectMessage(
                school_id=conv.school_id,
                conversation_id=conv.id,
                sender_id=current_user.id,
                sender_name=current_user.full_name,
                content=content,
                bulk_send_id=bulk_send_id,
            )
        )

    await record_audit_event(
        db,
        action="dm.bulk_send",
        actor=current_user,
        school_id=current_user.school_id or (conversations[0].school_id if conversations else None),
        resource_type="direct_message_bulk",
        resource_id=bulk_send_id,
        metadata={
            "sender_id": current_user.id,
            "sender_name": current_user.full_name,
            "recipient_count": len(recipient_ids),
            "recipient_ids": recipient_ids,
            "conversation_ids": [conv.id for conv in conversations],
        },
    )
    await db.commit()

    conv_ids = [conv.id for conv in conversations]
    conv_res = await db.execute(
        select(Conversation)
        .where(Conversation.school_id == current_user.school_id, Conversation.id.in_(conv_ids))
        .options(
            selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
            selectinload(Conversation.messages),
        )
    )
    loaded = {conv.id: conv for conv in conv_res.scalars().unique().all()}
    return [_build_conv_out(loaded[conv_id], current_user.id) for conv_id in conv_ids if conv_id in loaded]


@router.post("/conversations/broadcast", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def broadcast_to_class_parents(
    req: BroadcastRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Teacher-only: Create a group conversation with ALL parents of a class.
    Useful for class announcements (réunion, sortie, etc.).
    """
    if current_user.role not in [UserRole.teacher, UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Réservé aux enseignants et à la direction.")

    await check_rate_limit(f"dm_broadcast:{current_user.id}", limit=10, window_seconds=3600)

    # Verify teacher belongs to this class
    if current_user.role == UserRole.teacher:
        stmt = select(Class).join(Class.teachers).where(
            Class.school_id == current_user.school_id,
            Class.id == req.class_id,
            User.id == current_user.id,
        )
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Vous n'enseignez pas dans cette classe.")
    else:
        class_res = await db.execute(
            select(Class).where(
                Class.school_id == current_user.school_id,
                Class.id == req.class_id,
            )
        )
        if not class_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Classe introuvable.")

    # Get all parents of students in this class
    parents_res = await db.execute(
        select(User)
        .join(StudentParent, StudentParent.parent_id == User.id)
        .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
        .where(
            User.school_id == current_user.school_id,
            StudentParent.school_id == current_user.school_id,
            ClassMember.school_id == current_user.school_id,
            ClassMember.class_id == req.class_id,
        )
        .distinct()
    )
    parents = parents_res.scalars().all()

    if not parents:
        raise HTTPException(status_code=404, detail="Aucun parent trouvé pour cette classe.")

    # Create group conversation
    conv = Conversation(
        id=str(uuid.uuid4()),
        school_id=current_user.school_id,
        type=ConversationType.group,
        title=req.title,
        created_by=current_user.id,
    )
    db.add(conv)
    await db.flush()

    # Add sender + all parents as participants
    db.add(ConversationParticipant(conversation_id=conv.id, school_id=current_user.school_id, user_id=current_user.id))
    for parent in parents:
        db.add(ConversationParticipant(conversation_id=conv.id, school_id=current_user.school_id, user_id=parent.id))

    # Initial message
    msg = DirectMessage(
        school_id=conv.school_id,
        conversation_id=conv.id,
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        content=req.initial_message,
    )
    db.add(msg)
    await db.commit()

    # Reload
    conv_res = await db.execute(
        select(Conversation)
        .where(Conversation.school_id == conv.school_id, Conversation.id == conv.id)
        .options(
            selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
            selectinload(Conversation.messages)
        )
    )
    conv = conv_res.scalar_one()
    return _build_conv_out(conv, current_user.id)


@router.get("/conversations", response_model=list[ConversationOut])
async def list_my_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all conversations the current user participates in,
    ordered by latest message. Includes unread count and last message preview.
    """
    stmt = (
        select(Conversation)
        .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
        .where(
            Conversation.school_id == current_user.school_id,
            ConversationParticipant.school_id == current_user.school_id,
            ConversationParticipant.user_id == current_user.id,
        )
        .options(
            selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
            selectinload(Conversation.messages)
        )
        .order_by(Conversation.created_at.desc())
    )

    result = await db.execute(stmt)
    conversations = result.scalars().unique().all()
    return [_build_conv_out(c, current_user.id) for c in conversations]


@router.get("/conversations/{conversation_id}/messages", response_model=list[DirectMessageOut])
async def get_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all messages in a conversation (paginated in future)."""
    conv = await _assert_participant(current_user, conversation_id, db)

    result = await db.execute(
        select(DirectMessage)
        .where(
            DirectMessage.school_id == conv.school_id,
            DirectMessage.conversation_id == conversation_id,
        )
        .order_by(DirectMessage.created_at.asc())
    )
    return result.scalars().all()


@router.post("/conversations/{conversation_id}/messages", response_model=DirectMessageOut, status_code=201)
async def send_message(
    conversation_id: str,
    req: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message via HTTP (alternative to WebSocket for reliability)."""
    conv = await _assert_participant(current_user, conversation_id, db)
    await _assert_can_send_message(conv, current_user, db)
    await check_rate_limit(f"dm_send:{current_user.id}", limit=60, window_seconds=60)

    msg = DirectMessage(
        school_id=conv.school_id,
        conversation_id=conversation_id,
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        content=req.content,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    # Broadcast to connected WebSocket clients in this conversation room
    await manager.broadcast(
        manager.conv_room(conversation_id),
        {
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_id": msg.sender_id,
            "sender_name": msg.sender_name,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
        }
    )
    return msg


@router.post("/conversations/{conversation_id}/read", status_code=200)
async def mark_conversation_read(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all messages as read (updates last_read_at timestamp)."""
    conv = await _assert_participant(current_user, conversation_id, db)
    participant_res = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.school_id == conv.school_id,
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
    )
    participant = participant_res.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=403, detail="Vous ne participez pas à cette conversation.")

    participant.last_read_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "ok"}


@router.websocket("/conversations/{conversation_id}/ws")
async def dm_websocket(
    conversation_id: str,
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
):
    """
    Real-time WebSocket for a DM conversation room.

    Flutter connects with ?token=<jwt> and sends:
      {"token": "<jwt>", "content": "Bonjour !"}

    Server broadcasts to all room members:
      {"id": "...", "conversation_id": "...", "sender_id": "...",
       "sender_name": "...", "content": "...", "created_at": "..."}
    """
    token = websocket.query_params.get("token")
    try:
        payload = decode_token(token or "")
        uid = payload.get("sub")
        if not uid:
            raise ValueError("No sub in token")
        await set_request_rls_context(
            db,
            school_id=payload.get("school_id"),
            is_system_admin=payload.get("role") == "system_admin",
        )
    except Exception:
        await websocket.close(code=1008)
        return

    user_stmt = select(User).where(User.id == uid)
    if payload.get("role") != "system_admin":
        user_stmt = user_stmt.where(User.school_id == payload.get("school_id"))
    user_res = await db.execute(user_stmt)
    sender = user_res.scalar_one_or_none()
    if not sender:
        await websocket.close(code=1008)
        return

    try:
        conv = await _assert_participant(sender, conversation_id, db)
    except HTTPException:
        await websocket.close(code=1008)
        return

    room_key = manager.conv_room(conversation_id)
    await manager.connect(websocket, room_key)
    try:
        while True:
            data = await websocket.receive_json()

            # Authenticate via JWT in the WS message
            token = data.get("token", "")
            try:
                payload = decode_token(token)
                uid = payload.get("sub")
                if not uid:
                    raise ValueError("No sub in token")
                await set_request_rls_context(
                    db,
                    school_id=payload.get("school_id"),
                    is_system_admin=payload.get("role") == "system_admin",
                )
            except Exception:
                await websocket.send_json({"error": "Non autorisé"})
                continue

            # Resolve user
            user_stmt = select(User).where(User.id == uid)
            if payload.get("role") != "system_admin":
                user_stmt = user_stmt.where(User.school_id == payload.get("school_id"))
            user_res = await db.execute(user_stmt)
            sender = user_res.scalar_one_or_none()
            if not sender:
                await websocket.send_json({"error": "Utilisateur introuvable"})
                continue

            # Check participation
            conv_res = await db.execute(
                select(Conversation).where(
                    Conversation.school_id == sender.school_id,
                    Conversation.id == conversation_id,
                )
            )
            conv = conv_res.scalar_one_or_none()
            if not conv:
                await websocket.send_json({"error": "Conversation introuvable"})
                continue

            part_res = await db.execute(
                select(ConversationParticipant).where(
                    ConversationParticipant.school_id == conv.school_id,
                    ConversationParticipant.conversation_id == conversation_id,
                    ConversationParticipant.user_id == uid,
                )
            )
            if not part_res.scalar_one_or_none():
                await websocket.send_json({"error": "Accès refusé à cette conversation"})
                continue

            content = str(data.get("content", "")).strip()
            if not content:
                continue

            try:
                await _assert_can_send_message(conv, sender, db)
                await check_rate_limit(f"dm_send:{sender.id}", limit=60, window_seconds=60)
            except HTTPException as exc:
                await websocket.send_json({"error": exc.detail})
                continue

            msg = DirectMessage(
                school_id=conv.school_id,
                conversation_id=conversation_id,
                sender_id=sender.id,
                sender_name=sender.full_name,
                content=content,
            )
            db.add(msg)
            await db.commit()
            await db.refresh(msg)

            out = {
                "id": msg.id,
                "conversation_id": msg.conversation_id,
                "sender_id": msg.sender_id,
                "sender_name": msg.sender_name,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
            }
            await manager.broadcast(room_key, out)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_key)


# ─── Private Helpers ──────────────────────────────────────────────────────────

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
