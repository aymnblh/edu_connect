"""SuperAdmin platform-wide broadcast announcements and history."""
from datetime import datetime, timezone
from typing import Literal
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_event
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import AuditEvent, School, User, UserRole
from app.modules.announcements.models import Announcement
from app.utils.notifications import create_notification

router = APIRouter(tags=["System Administration"])

AUDIENCE_ROLES: dict[str, list[UserRole]] = {
    "principals": [UserRole.principal],
    "admins": [UserRole.principal, UserRole.secretary],
    "staff": [
        UserRole.principal,
        UserRole.secretary,
        UserRole.teacher,
        UserRole.nurse,
        UserRole.canteen,
        UserRole.driver,
    ],
    "all_users": [
        UserRole.principal,
        UserRole.secretary,
        UserRole.teacher,
        UserRole.nurse,
        UserRole.canteen,
        UserRole.driver,
        UserRole.parent,
    ],
}


def _require_system_admin(current_user: User) -> User:
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Unprivileged")
    return current_user


def _excerpt(text: str, limit: int = 180) -> str:
    compact = " ".join(text.split())
    return compact if len(compact) <= limit else f"{compact[: limit - 1].rstrip()}..."


class PlatformBroadcastRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=5000)
    category: Literal["announcement", "holiday", "exam_period", "meeting", "event"] = "announcement"
    audience: Literal["principals", "admins", "staff", "all_users"] = "principals"
    target_schools: Literal["all", "active", "selected"] = "active"
    school_ids: list[str] = Field(default_factory=list, max_length=500)
    publish_announcement: bool = False


class PlatformBroadcastOut(BaseModel):
    id: str
    title: str
    body: str
    category: str
    audience: str
    target_schools: str
    school_count: int
    recipient_count: int
    announcements_created: int
    school_names: list[str] = Field(default_factory=list)
    author_name: str | None = None
    created_at: str


@router.post("/broadcasts", response_model=PlatformBroadcastOut, status_code=status.HTTP_201_CREATED)
async def send_platform_broadcast(
    payload: PlatformBroadcastRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Broadcast a platform notice to selected schools and roles."""
    _require_system_admin(current_user)

    school_stmt = select(School).order_by(School.name.asc())
    if payload.target_schools == "active":
        school_stmt = school_stmt.where(School.is_active.is_(True))
    elif payload.target_schools == "selected":
        selected_ids = sorted(set(payload.school_ids))
        if not selected_ids:
            raise HTTPException(status_code=400, detail="Selectionnez au moins un etablissement.")
        school_stmt = school_stmt.where(School.id.in_(selected_ids))

    schools = (await db.execute(school_stmt)).scalars().all()
    if not schools:
        raise HTTPException(status_code=404, detail="Aucun etablissement cible trouve.")

    title = payload.title.strip()
    body = payload.body.strip()
    target_roles = AUDIENCE_ROLES[payload.audience]
    now = datetime.now(timezone.utc)
    broadcast_id = str(uuid.uuid4())

    total_recipients = 0
    announcements_created = 0
    notif_title = f"WaselEdu : {title}"
    notif_content = _excerpt(body)

    for school in schools:
        user_ids = (
            await db.execute(
                select(User.id).where(
                    User.school_id == school.id,
                    User.role.in_(target_roles),
                    User.deactivated_at.is_(None),
                )
            )
        ).scalars().all()

        for uid in user_ids:
            await create_notification(
                db,
                user_id=uid,
                title=notif_title,
                content=notif_content,
                type="ANNOUNCEMENT",
                school_id=school.id,
            )
        total_recipients += len(user_ids)

        if payload.publish_announcement and payload.audience == "all_users":
            db.add(
                Announcement(
                    id=str(uuid.uuid4()),
                    school_id=school.id,
                    title=title,
                    body=body,
                    category=payload.category,
                    whole_school=True,
                    created_by=current_user.id,
                    recipient_count=len(user_ids),
                    created_at=now,
                )
            )
            announcements_created += 1

    school_names = [s.name for s in schools]
    metadata = {
        "title": title,
        "body": body,
        "category": payload.category,
        "audience": payload.audience,
        "target_schools": payload.target_schools,
        "school_count": len(schools),
        "recipient_count": total_recipients,
        "announcements_created": announcements_created,
        "school_names": school_names[:20],
    }
    await record_audit_event(
        db,
        action="system.broadcast_sent",
        actor=current_user,
        school_id=None,
        resource_type="broadcast",
        resource_id=broadcast_id,
        method=request.method,
        path=request.url.path,
        metadata=metadata,
    )
    await db.commit()

    return PlatformBroadcastOut(
        id=broadcast_id,
        title=title,
        body=body,
        category=payload.category,
        audience=payload.audience,
        target_schools=payload.target_schools,
        school_count=len(schools),
        recipient_count=total_recipients,
        announcements_created=announcements_created,
        school_names=school_names[:20],
        author_name=current_user.full_name,
        created_at=now.isoformat(),
    )


@router.get("/broadcasts", response_model=list[PlatformBroadcastOut])
async def list_platform_broadcasts(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Return history of platform broadcasts sent by Super Admins."""
    _require_system_admin(current_user)

    rows = (
        await db.execute(
            select(AuditEvent, User.full_name)
            .outerjoin(User, User.id == AuditEvent.actor_id)
            .where(AuditEvent.action == "system.broadcast_sent")
            .order_by(AuditEvent.created_at.desc())
            .limit(limit)
        )
    ).all()

    out: list[PlatformBroadcastOut] = []
    for event, author_name in rows:
        meta = event.event_metadata or {}
        out.append(
            PlatformBroadcastOut(
                id=event.resource_id or event.id,
                title=str(meta.get("title") or ""),
                body=str(meta.get("body") or ""),
                category=str(meta.get("category") or "announcement"),
                audience=str(meta.get("audience") or "principals"),
                target_schools=str(meta.get("target_schools") or "active"),
                school_count=int(meta.get("school_count") or 0),
                recipient_count=int(meta.get("recipient_count") or 0),
                announcements_created=int(meta.get("announcements_created") or 0),
                school_names=list(meta.get("school_names") or []),
                author_name=author_name,
                created_at=event.created_at.isoformat(),
            )
        )
    return out
