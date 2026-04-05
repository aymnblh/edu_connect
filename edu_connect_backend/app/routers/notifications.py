from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models import Notification, User
from app.schemas import NotificationOut
from app.auth import get_current_user
from typing import List
import uuid

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[NotificationOut])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = update(Notification).where(
        Notification.id == notification_id, 
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
        Notification.user_id == current_user.id
    ).values(is_read=True)
    await db.execute(stmt)
    await db.commit()
    return {"status": "success"}
