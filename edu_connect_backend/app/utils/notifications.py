import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Notification, NotificationPreference, StudentParent, User
from sqlalchemy import select
import uuid

CRITICAL_NOTIFICATION_TYPES = {"ACCOUNT", "SECURITY"}


async def _notification_preference(
    db: AsyncSession,
    user_id: str,
    notification_type: str,
) -> tuple[bool, bool]:
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.user_id == user_id,
            NotificationPreference.notification_type.in_([notification_type, "ALL"]),
        )
    )
    preferences = result.scalars().all()
    specific = next((pref for pref in preferences if pref.notification_type == notification_type), None)
    fallback = next((pref for pref in preferences if pref.notification_type == "ALL"), None)
    preference = specific or fallback
    if not preference:
        return True, True
    return preference.in_app_enabled, preference.push_enabled

async def create_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    content: str,
    type: str = "INFO",
    school_id: str | None = None,
):
    """Creates an in-app notification and triggers local push if a topic exists."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    notification_type = (type or "INFO").strip().upper() or "INFO"
    is_critical = notification_type in CRITICAL_NOTIFICATION_TYPES
    in_app_enabled, push_enabled = await _notification_preference(db, user_id, notification_type)
    if not in_app_enabled and not is_critical:
        return None

    resolved_school_id = school_id or (user.school_id if user else None)
    if resolved_school_id is None:
        link_result = await db.execute(
            select(StudentParent.school_id).where(StudentParent.parent_id == user_id).limit(1)
        )
        resolved_school_id = link_result.scalar_one_or_none()
    if resolved_school_id is None:
        raise ValueError("Cannot create notification without a school_id.")

    notification = Notification(
        id=str(uuid.uuid4()),
        school_id=resolved_school_id,
        user_id=user_id,
        title=title,
        content=content,
        type=notification_type
    )
    db.add(notification)
    await db.flush() 
    
    # Trigger local ntfy push in background.
    from app.utils.push import send_push
    if user and user.push_token and (push_enabled or is_critical):
        asyncio.create_task(send_push(user.push_token, title, content))
    
    return notification
