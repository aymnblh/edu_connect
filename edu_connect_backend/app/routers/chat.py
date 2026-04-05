from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Message, User
from ..schemas import MessageOut
from ..auth import get_current_user
from ..ws_manager import manager
import firebase_admin
from firebase_admin import auth as firebase_auth

router = APIRouter(prefix="/classes/{class_id}", tags=["Chat"])


@router.get("/messages", response_model=list[MessageOut])
async def get_messages(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Message).where(Message.class_id == class_id).order_by(Message.created_at.asc())
    )
    return result.scalars().all()


@router.websocket("/ws")
async def ws_chat(
    class_id: str,
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket endpoint for real-time class chat.
    
    Flutter sends:
      {"token": "<firebase_id_token>", "content": "Hello!", "is_announcement": false}
    
    Server broadcasts to all room members:
      {"id": "...", "sender_id": "...", "sender_name": "...", "content": "...", ...}
    """
    await manager.connect(websocket, class_id)
    try:
        while True:
            data = await websocket.receive_json()

            # Authenticate via Firebase token sent in the WS message
            token = data.get("token", "")
            try:
                decoded = firebase_auth.verify_id_token(token)
                uid = decoded["uid"]
            except Exception:
                await websocket.send_json({"error": "Unauthorized"})
                continue

            # Resolve user
            from sqlalchemy import select as sa_select
            result = await db.execute(sa_select(User).where(User.id == uid))
            sender = result.scalar_one_or_none()
            if not sender:
                await websocket.send_json({"error": "User not found"})
                continue

            is_announcement = bool(data.get("is_announcement", False))
            if is_announcement and sender.role.value != "teacher":
                await websocket.send_json({"error": "Only teachers can send announcements"})
                continue

            msg = Message(
                class_id=class_id,
                sender_id=sender.id,
                sender_name=sender.full_name,
                content=str(data.get("content", "")),
                is_announcement=is_announcement,
            )
            db.add(msg)
            
            # If announcement, notify all class members (except sender)
            if is_announcement:
                from app.utils.notifications import create_notification
                from app.models import ClassMember
                stmt = sa_select(ClassMember.user_id).where(
                    ClassMember.class_id == class_id, 
                    ClassMember.user_id != sender.id
                )
                res = await db.execute(stmt)
                member_ids = res.scalars().all()
                for mid in member_ids:
                    await create_notification(
                        db,
                        user_id=mid,
                        title=f"Arrivée de l'annonce",
                        content=f"Une nouvelle annonce a été publiée par {sender.full_name}.",
                        type="INFO"
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
                "created_at": msg.created_at.isoformat(),
            }
            await manager.broadcast(class_id, payload)

    except WebSocketDisconnect:
        manager.disconnect(websocket, class_id)
