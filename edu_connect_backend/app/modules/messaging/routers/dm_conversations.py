"""DM conversation, broadcast, message, and WebSocket endpoints."""
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

from .dm_shared import (
    BroadcastRequest,
    ConversationOut,
    CreateBulkConversationsRequest,
    CreateConversationRequest,
    DirectMessageOut,
    SendMessageRequest,
    _ADMIN_ROLES,
    _assert_can_dm,
    _assert_can_send_in_conversation,
    _assert_can_send_message,
    _assert_not_message_blocked,
    _assert_participant,
    _build_conv_out,
    _get_or_create_direct_conv,
    _notify_dm_recipients,
)

router = APIRouter()


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
        await _notify_dm_recipients(
            db,
            school_id=conv.school_id,
            sender=current_user,
            recipient_ids=[recipient.id],
            content=req.initial_message,
        )

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
        .execution_options(populate_existing=True)
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
    await _notify_dm_recipients(
        db,
        school_id=current_user.school_id or (conversations[0].school_id if conversations else None),
        sender=current_user,
        recipient_ids=recipient_ids,
        content=content,
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
        .execution_options(populate_existing=True)
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
    await _notify_dm_recipients(
        db,
        school_id=conv.school_id,
        sender=current_user,
        recipient_ids=[parent.id for parent in parents],
        content=req.initial_message,
    )
    await db.commit()

    # Reload
    conv_res = await db.execute(
        select(Conversation)
        .where(Conversation.school_id == conv.school_id, Conversation.id == conv.id)
        .options(
            selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
            selectinload(Conversation.messages)
        )
        .execution_options(populate_existing=True)
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
    if isinstance(db, AsyncSession):
        part_ids_res = await db.execute(
            select(ConversationParticipant.user_id).where(
                ConversationParticipant.school_id == conv.school_id,
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id != current_user.id,
            )
        )
        await _notify_dm_recipients(
            db,
            school_id=conv.school_id,
            sender=current_user,
            recipient_ids=list(part_ids_res.scalars().all()),
            content=req.content,
        )
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

    Clients authenticate with the first WebSocket frame instead of putting the
    JWT in the URL, then send message frames.

    Server broadcasts to all room members:
      {"id": "...", "conversation_id": "...", "sender_id": "...",
       "sender_name": "...", "content": "...", "created_at": "..."}
    """
    await websocket.accept()
    try:
        auth_frame = await asyncio.wait_for(websocket.receive_json(), timeout=10.0)
        token = auth_frame.get("token") if isinstance(auth_frame, dict) and auth_frame.get("type") == "auth" else None
    except Exception:
        token = None
    try:
        payload = decode_token(token or "")
        uid = payload.get("sub")
        if not uid or not role_may_call(payload.get("role"), websocket.url.path):
            raise ValueError("Unauthorized WebSocket role or subject")
        await set_request_rls_context(
            db,
            school_id=payload.get("school_id"),
            is_system_admin=payload.get("role") == "system_admin",
        )
    except Exception:
        await websocket.close(code=1008)
        return

    user_stmt = select(User).options(selectinload(User.school)).where(User.id == uid)
    if payload.get("role") != "system_admin":
        user_stmt = user_stmt.where(User.school_id == payload.get("school_id"))
    user_res = await db.execute(user_stmt)
    sender = user_res.scalar_one_or_none()
    if not sender:
        await websocket.close(code=1008)
        return
    if sender.role.value != payload.get("role") or session_rejection(sender, payload):
        await websocket.close(code=1008)
        return
    try:
        assert_school_is_active(sender)
    except HTTPException:
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
            if is_read_only_demo_user(sender):
                await websocket.send_json({"error": DEMO_READ_ONLY_MESSAGE})
                continue

            # Reuse only the token authenticated in the first frame. A client
            # cannot switch identity by sending a second token later.
            data["token"] = token

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
            user_stmt = select(User).options(selectinload(User.school)).where(User.id == uid)
            if payload.get("role") != "system_admin":
                user_stmt = user_stmt.where(User.school_id == payload.get("school_id"))
            user_res = await db.execute(user_stmt)
            sender = user_res.scalar_one_or_none()
            if not sender:
                await websocket.send_json({"error": "Utilisateur introuvable"})
                continue
            if session_rejection(sender, payload):
                await websocket.close(code=1008)
                return
            try:
                assert_school_is_active(sender)
            except HTTPException as exc:
                await websocket.send_json({"error": exc.detail})
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
            if len(content) > 4000:
                await websocket.send_json({"error": "Message trop long."})
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
            if isinstance(db, AsyncSession):
                part_ids_res = await db.execute(
                    select(ConversationParticipant.user_id).where(
                        ConversationParticipant.school_id == conv.school_id,
                        ConversationParticipant.conversation_id == conversation_id,
                        ConversationParticipant.user_id != sender.id,
                    )
                )
                await _notify_dm_recipients(
                    db,
                    school_id=conv.school_id,
                    sender=sender,
                    recipient_ids=list(part_ids_res.scalars().all()),
                    content=content,
                )
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
