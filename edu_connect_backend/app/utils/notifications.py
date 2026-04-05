from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Notification, User
from sqlalchemy import select
import uuid

async def create_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    content: str,
    type: str = "INFO"
):
    """Creates an in-app notification and triggers push if token exists."""
    notification = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=title,
        content=content,
        type=type
    )
    db.add(notification)
    await db.flush() 
    
    # Trigger Push
    from app.utils.push import send_push
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user and user.fcm_token:
        send_push(user.fcm_token, title, content)
    
    return notification
