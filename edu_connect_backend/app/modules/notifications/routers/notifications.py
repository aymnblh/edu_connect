from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.db.database import get_db
from app.models import Notification, NotificationPreference, User
from app.schemas import NotificationOut, NotificationPreferenceOut, NotificationPreferenceUpdate
from app.core.security import get_current_user
from typing import List
import uuid

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[NotificationOut])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.school_id:
        return []
    stmt = (
        select(Notification)
        .where(
            Notification.school_id == current_user.school_id,
            Notification.user_id == current_user.id,
        )
        .order_by(Notification.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/preferences", response_model=List[NotificationPreferenceOut])
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.school_id:
        return []
    result = await db.execute(
        select(NotificationPreference)
        .where(
            NotificationPreference.school_id == current_user.school_id,
            NotificationPreference.user_id == current_user.id,
        )
        .order_by(NotificationPreference.notification_type.asc())
    )
    return result.scalars().all()


@router.put("/preferences/{notification_type}", response_model=NotificationPreferenceOut)
async def update_notification_preference(
    notification_type: str,
    payload: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="Utilisateur non rattache a un etablissement.")

    normalized_type = notification_type.strip().upper()
    if not normalized_type:
        raise HTTPException(status_code=400, detail="Type de notification obligatoire.")

    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.school_id == current_user.school_id,
            NotificationPreference.user_id == current_user.id,
            NotificationPreference.notification_type == normalized_type,
        )
    )
    preference = result.scalar_one_or_none()
    if not preference:
        preference = NotificationPreference(
            school_id=current_user.school_id,
            user_id=current_user.id,
            notification_type=normalized_type,
        )
        db.add(preference)

    if payload.in_app_enabled is not None:
        preference.in_app_enabled = payload.in_app_enabled
    if payload.push_enabled is not None:
        preference.push_enabled = payload.push_enabled

    await db.commit()
    await db.refresh(preference)
    return preference


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = update(Notification).where(
        Notification.id == notification_id,
        Notification.school_id == current_user.school_id,
        Notification.user_id == current_user.id
    ).values(is_read=True)
    await db.execute(stmt)
    await db.commit()
    return {"status": "success"}

@router.post("/mark-all-read")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = update(Notification).where(
        Notification.school_id == current_user.school_id,
        Notification.user_id == current_user.id
    ).values(is_read=True)
    await db.execute(stmt)
    await db.commit()
    return {"status": "success"}
