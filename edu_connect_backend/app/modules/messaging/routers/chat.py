from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models import Class, ClassMember, ClassTeacher, ClassTemporaryAccess, Message, StudentParent, User, UserRole
from app.schemas import MessageOut
from app.core.access import assert_class_read_access
from app.core.rate_limit import check_rate_limit
from app.core.security import get_current_user, decode_token
from app.ws_manager import manager

router = APIRouter(prefix="/classes/{class_id}", tags=["Chat"])

_STAFF_ROLES = {UserRole.teacher, UserRole.principal, UserRole.secretary}
_ADMIN_ROLES = {UserRole.principal, UserRole.secretary}


async def _assert_can_access_class_chat(
    class_id: str,
    current_user: User,
    db: AsyncSession,
) -> Class:
    cls_res = await db.execute(select(Class).where(Class.id == class_id))
    cls = cls_res.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Classe introuvable.")

    if current_user.role == UserRole.system_admin:
        return cls

    if not current_user.school_id or cls.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Acces refuse.")

    if current_user.role in _ADMIN_ROLES:
        return cls

    if current_user.role == UserRole.teacher:
        await assert_class_read_access(class_id, current_user, db)
        return cls

    if current_user.role == UserRole.teacher:
        teacher_res = await db.execute(
            select(ClassTeacher.teacher_id).where(
                ClassTeacher.class_id == class_id,
                ClassTeacher.teacher_id == current_user.id,
            )
        )
        if teacher_res.scalar_one_or_none():
            return cls
        raise HTTPException(status_code=403, detail="Vous n'enseignez pas dans cette classe.")

    if current_user.role == UserRole.parent:
        parent_res = await db.execute(
            select(ClassMember.student_id)
            .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
            .where(
                ClassMember.school_id == cls.school_id,
                ClassMember.class_id == class_id,
                StudentParent.school_id == cls.school_id,
                StudentParent.parent_id == current_user.id,
            )
            .limit(1)
        )
        if parent_res.scalar_one_or_none():
            return cls

    raise HTTPException(status_code=403, detail="Acces refuse.")


async def _class_teacher_ids(class_id: str, school_id: str, db: AsyncSession) -> set[str]:
    res = await db.execute(
        select(ClassTeacher.teacher_id).where(
            ClassTeacher.school_id == school_id,
            ClassTeacher.class_id == class_id,
        )
    )
    return set(res.scalars().all())


async def _class_temporary_teacher_ids(class_id: str, school_id: str, db: AsyncSession) -> set[str]:
    now = datetime.now(timezone.utc)
    res = await db.execute(
        select(ClassTemporaryAccess.user_id).where(
            ClassTemporaryAccess.school_id == school_id,
            ClassTemporaryAccess.class_id == class_id,
            ClassTemporaryAccess.starts_at <= now,
            ClassTemporaryAccess.expires_at >= now,
        )
    )
    return set(res.scalars().all())


async def _class_parent_ids(class_id: str, school_id: str, db: AsyncSession) -> set[str]:
    res = await db.execute(
        select(StudentParent.parent_id)
        .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
        .where(
            ClassMember.school_id == school_id,
            ClassMember.class_id == class_id,
            StudentParent.school_id == school_id,
        )
        .distinct()
    )
    return set(res.scalars().all())


async def _school_admin_ids(school_id: str, db: AsyncSession) -> set[str]:
    res = await db.execute(
        select(User.id).where(
            User.school_id == school_id,
            User.role.in_([UserRole.principal, UserRole.secretary]),
        )
    )
    return set(res.scalars().all())


async def _class_audience_ids(
    class_id: str,
    school_id: str,
    db: AsyncSession,
    *,
    include_parents: bool,
) -> set[str]:
    audience = await _class_teacher_ids(class_id, school_id, db)
    audience.update(await _class_temporary_teacher_ids(class_id, school_id, db))
    audience.update(await _school_admin_ids(school_id, db))
    if include_parents:
        audience.update(await _class_parent_ids(class_id, school_id, db))
    return audience


def _requested_recipient_ids(raw: object) -> list[str]:
    if not isinstance(raw, list):
        return []
    cleaned: list[str] = []
    for value in raw:
        if isinstance(value, str):
            recipient_id = value.strip()
            if recipient_id and recipient_id not in cleaned:
                cleaned.append(recipient_id)
    return cleaned


async def _resolve_class_message_recipients(
    *,
    class_id: str,
    school_id: str,
    sender: User,
    is_announcement: bool,
    requested_ids: list[str],
    db: AsyncSession,
) -> list[str]:
    if is_announcement:
        audience = await _class_audience_ids(class_id, school_id, db, include_parents=True)
        audience.add(sender.id)
        return sorted(audience)

    if requested_ids:
        allowed = await _class_audience_ids(class_id, school_id, db, include_parents=True)
        if sender.role == UserRole.parent:
            parent_ids = await _class_parent_ids(class_id, school_id, db)
            if any(recipient_id in parent_ids for recipient_id in requested_ids):
                raise HTTPException(
                    status_code=403,
                    detail="Un parent ne peut pas envoyer de message aux autres parents.",
                )

        unauthorized = [recipient_id for recipient_id in requested_ids if recipient_id not in allowed]
        if unauthorized:
            raise HTTPException(status_code=403, detail="Destinataire non autorise.")

        audience = set(requested_ids)
        audience.add(sender.id)
        return sorted(audience)

    # Privacy-first defaults:
    # - parent notes go only to class staff/admins and the sender
    # - staff notes stay internal unless explicit recipients or announcement mode are used
    audience = await _class_audience_ids(class_id, school_id, db, include_parents=False)
    audience.add(sender.id)
    return sorted(audience)


def _can_view_message(message: Message, current_user: User) -> bool:
    if message.recipient_ids is not None:
        return current_user.id in message.recipient_ids

    # Legacy messages had no audience. Keep announcements class-wide, but do not
    # show old parent chat messages to other parents.
    if message.is_announcement or message.sender_id == current_user.id:
        return True
    return current_user.role in _STAFF_ROLES or current_user.role == UserRole.system_admin


async def _user_from_ws_token(token: str | None, db: AsyncSession) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
        uid = payload.get("sub")
    except Exception:
        return None
    if not uid:
        return None
    stmt = select(User).where(User.id == uid)
    if payload.get("role") != "system_admin":
        stmt = stmt.where(User.school_id == payload.get("school_id"))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


@router.get("/messages", response_model=list[MessageOut])
async def get_messages(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await _assert_can_access_class_chat(class_id, current_user, db)
    result = await db.execute(
        select(Message)
        .where(Message.school_id == cls.school_id, Message.class_id == class_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    return [message for message in messages if _can_view_message(message, current_user)]


@router.websocket("/ws")
async def ws_chat(
    class_id: str,
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket endpoint for real-time class chat.
    
    Flutter sends:
      {"token": "<local_access_token>", "content": "Hello!", "is_announcement": false}
    
    Server broadcasts to all room members:
      {"id": "...", "sender_id": "...", "sender_name": "...", "content": "...", ...}
    """
    token = websocket.query_params.get("token")
    sender = await _user_from_ws_token(token, db)
    if not sender:
        await websocket.close(code=1008)
        return

    try:
        cls = await _assert_can_access_class_chat(class_id, sender, db)
    except HTTPException:
        await websocket.close(code=1008)
        return

    room_key = manager.class_user_room(class_id, sender.id)
    await manager.connect(websocket, room_key)
    try:
        while True:
            data = await websocket.receive_json()

            is_announcement = bool(data.get("is_announcement", False))
            if is_announcement and sender.role not in _STAFF_ROLES:
                await websocket.send_json({"error": "Only teachers can send announcements"})
                continue

            content = str(data.get("content", "")).strip()
            if not content:
                continue

            try:
                await check_rate_limit(f"class_chat:{sender.id}:{class_id}", limit=60, window_seconds=60)
                recipient_ids = await _resolve_class_message_recipients(
                    class_id=class_id,
                    school_id=cls.school_id,
                    sender=sender,
                    is_announcement=is_announcement,
                    requested_ids=_requested_recipient_ids(data.get("recipient_ids")),
                    db=db,
                )
            except HTTPException as exc:
                await websocket.send_json({"error": exc.detail})
                continue

            msg = Message(
                school_id=cls.school_id,
                class_id=class_id,
                sender_id=sender.id,
                sender_name=sender.full_name,
                content=content,
                is_announcement=is_announcement,
                recipient_ids=recipient_ids,
            )
            db.add(msg)
            
            # If announcement, notify the resolved audience (except sender).
            if is_announcement:
                from app.utils.notifications import create_notification
                for mid in recipient_ids:
                    if mid == sender.id:
                        continue
                    await create_notification(
                        db,
                        user_id=mid,
                        title=f"Arrivée de l'annonce",
                        content=f"Une nouvelle annonce a été publiée par {sender.full_name}.",
                        type="INFO",
                        school_id=cls.school_id,
                    )

            await db.commit()
            await db.refresh(msg)

            payload = {
                "id": msg.id,
                "class_id": msg.class_id,
                "sender_id": msg.sender_id,
                "sender_name": msg.sender_name,
                "content": msg.content,
                "is_announcement": msg.is_announcement,
                "recipient_ids": msg.recipient_ids,
                "created_at": msg.created_at.isoformat(),
            }
            for recipient_id in recipient_ids:
                await manager.broadcast(manager.class_user_room(class_id, recipient_id), payload)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_key)
