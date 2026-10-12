import uuid
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_event
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import Class, ClassMember, ClassTeacher, StudentParent, User, UserRole
from app.modules.announcements.models import Announcement, AnnouncementClass, AnnouncementRead
from app.utils.notifications import create_notification

router = APIRouter(prefix="/announcements", tags=["Announcements"])

ADMIN_ROLES = {UserRole.principal, UserRole.secretary}
CATEGORY_TITLES = {
    "announcement": "Annonce",
    "holiday": "Vacances",
    "exam_period": "Periode d'examens",
    "meeting": "Reunion",
    "event": "Evenement",
}


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=5000)
    category: Literal["announcement", "holiday", "exam_period", "meeting", "event"] = "announcement"
    starts_on: date | None = None
    ends_on: date | None = None
    whole_school: bool = False
    class_ids: list[str] = Field(default_factory=list, max_length=200)

    @model_validator(mode="after")
    def check_dates_and_audience(self):
        if self.category != "announcement" and self.starts_on is None:
            raise ValueError("Une date est requise pour un evenement du calendrier.")
        if self.ends_on is not None and (self.starts_on is None or self.ends_on < self.starts_on):
            raise ValueError("La date de fin doit suivre la date de debut.")
        if not self.whole_school and not self.class_ids:
            raise ValueError("Choisissez au moins une classe ou toute l'ecole.")
        return self


class AnnouncementOut(BaseModel):
    id: str
    title: str
    body: str
    category: str
    starts_on: date | None
    ends_on: date | None
    whole_school: bool
    class_ids: list[str]
    author_id: str | None
    author_name: str | None
    created_at: datetime
    is_read: bool
    # Only for the author and school administration.
    read_count: int | None = None
    recipient_count: int | None = None


def _require_school(user: User) -> str:
    if not user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")
    return user.school_id


async def _teacher_class_ids(db: AsyncSession, user: User) -> set[str]:
    result = await db.execute(
        select(ClassTeacher.class_id).where(
            ClassTeacher.school_id == user.school_id,
            ClassTeacher.teacher_id == user.id,
        )
    )
    return set(result.scalars().all())


async def _parent_class_ids(db: AsyncSession, user: User) -> set[str]:
    result = await db.execute(
        select(ClassMember.class_id)
        .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
        .where(
            ClassMember.school_id == user.school_id,
            StudentParent.school_id == user.school_id,
            StudentParent.parent_id == user.id,
        )
        .distinct()
    )
    return set(result.scalars().all())


async def _visibility_clause(db: AsyncSession, user: User):
    """SQL condition selecting the announcements this user may see."""
    school_id = _require_school(user)
    in_school = Announcement.school_id == school_id
    if user.role in ADMIN_ROLES:
        return in_school
    if user.role == UserRole.teacher:
        class_ids = await _teacher_class_ids(db, user)
    elif user.role == UserRole.parent:
        class_ids = await _parent_class_ids(db, user)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    targets_my_class = exists().where(
        AnnouncementClass.announcement_id == Announcement.id,
        AnnouncementClass.class_id.in_(sorted(class_ids)),
    )
    return and_(
        in_school,
        or_(Announcement.whole_school.is_(True), Announcement.created_by == user.id, targets_my_class),
    )


async def _recipients(db: AsyncSession, *, school_id: str, whole_school: bool, class_ids: list[str], author_id: str) -> list[str]:
    """Active parents and staff the announcement is addressed to (author excluded)."""
    if whole_school:
        stmt = select(User.id).where(
            User.school_id == school_id,
            User.role.in_([UserRole.parent, UserRole.teacher, UserRole.secretary, UserRole.principal]),
        )
    else:
        parents = (
            select(StudentParent.parent_id)
            .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
            .where(
                StudentParent.school_id == school_id,
                ClassMember.school_id == school_id,
                ClassMember.class_id.in_(class_ids),
            )
        )
        teachers = select(ClassTeacher.teacher_id).where(
            ClassTeacher.school_id == school_id,
            ClassTeacher.class_id.in_(class_ids),
        )
        stmt = select(User.id).where(
            User.school_id == school_id,
            or_(User.id.in_(parents), User.id.in_(teachers)),
        )
    result = await db.execute(
        stmt.where(User.deactivated_at.is_(None), User.id != author_id).distinct()
    )
    return list(result.scalars().all())


def _excerpt(text: str, limit: int = 140) -> str:
    compact = " ".join(text.split())
    return compact if len(compact) <= limit else f"{compact[: limit - 1].rstrip()}..."


@router.post("/", response_model=AnnouncementOut, status_code=201)
async def create_announcement(
    payload: AnnouncementCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _require_school(current_user)
    if current_user.role not in ADMIN_ROLES | {UserRole.teacher}:
        raise HTTPException(status_code=403, detail="Seuls l'administration et les enseignants publient des annonces.")

    class_ids = sorted(set(payload.class_ids)) if not payload.whole_school else []
    if current_user.role == UserRole.teacher:
        if payload.whole_school:
            raise HTTPException(status_code=403, detail="Seule l'administration publie pour toute l'ecole.")
        taught = await _teacher_class_ids(db, current_user)
        if not set(class_ids) <= taught:
            raise HTTPException(status_code=403, detail="Vous ne pouvez publier que pour vos classes.")
    if class_ids:
        found = await db.execute(select(Class.id).where(Class.school_id == school_id, Class.id.in_(class_ids)))
        if len(set(found.scalars().all())) != len(class_ids):
            raise HTTPException(status_code=404, detail="Classe introuvable.")

    announcement = Announcement(
        id=str(uuid.uuid4()),
        school_id=school_id,
        title=payload.title.strip(),
        body=payload.body.strip(),
        category=payload.category,
        starts_on=payload.starts_on,
        ends_on=payload.ends_on,
        whole_school=payload.whole_school,
        created_by=current_user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(announcement)
    await db.flush()
    for class_id in class_ids:
        db.add(AnnouncementClass(announcement_id=announcement.id, class_id=class_id, school_id=school_id))

    recipients = await _recipients(
        db,
        school_id=school_id,
        whole_school=payload.whole_school,
        class_ids=class_ids,
        author_id=current_user.id,
    )
    title = f"{CATEGORY_TITLES[payload.category]} : {announcement.title}"
    for user_id in recipients:
        await create_notification(
            db,
            user_id=user_id,
            title=title,
            content=_excerpt(announcement.body),
            type="ANNOUNCEMENT",
            school_id=school_id,
        )
    announcement.recipient_count = len(recipients)

    await record_audit_event(
        db,
        action="announcement.created",
        actor=current_user,
        school_id=school_id,
        resource_type="announcement",
        resource_id=announcement.id,
        method=request.method,
        path=request.url.path,
        metadata={"whole_school": payload.whole_school, "class_ids": class_ids, "recipients": len(recipients)},
    )
    await db.commit()
    return AnnouncementOut(
        id=announcement.id,
        title=announcement.title,
        body=announcement.body,
        category=announcement.category,
        starts_on=announcement.starts_on,
        ends_on=announcement.ends_on,
        whole_school=announcement.whole_school,
        class_ids=class_ids,
        author_id=current_user.id,
        author_name=current_user.full_name,
        created_at=announcement.created_at,
        is_read=True,
        read_count=0,
        recipient_count=len(recipients),
    )


@router.get("/", response_model=list[AnnouncementOut])
async def list_announcements(
    calendar_only: bool = Query(False, description="Only dated entries (the school calendar)."),
    limit: int = Query(200, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Announcement, User.full_name)
        .outerjoin(User, User.id == Announcement.created_by)
        .where(await _visibility_clause(db, current_user))
    )
    if calendar_only:
        stmt = stmt.where(Announcement.starts_on.is_not(None)).order_by(Announcement.starts_on.asc())
    else:
        stmt = stmt.order_by(Announcement.created_at.desc())
    rows = (await db.execute(stmt.limit(limit))).all()
    ids = [announcement.id for announcement, _ in rows]
    if not ids:
        return []

    class_map: dict[str, list[str]] = {}
    for announcement_id, class_id in (
        await db.execute(
            select(AnnouncementClass.announcement_id, AnnouncementClass.class_id).where(
                AnnouncementClass.announcement_id.in_(ids)
            )
        )
    ).all():
        class_map.setdefault(announcement_id, []).append(class_id)

    read_ids = set(
        (
            await db.execute(
                select(AnnouncementRead.announcement_id).where(
                    AnnouncementRead.user_id == current_user.id,
                    AnnouncementRead.announcement_id.in_(ids),
                )
            )
        ).scalars().all()
    )

    is_admin = current_user.role in ADMIN_ROLES
    managed = [a.id for a, _ in rows if is_admin or a.created_by == current_user.id]
    read_counts: dict[str, int] = {}
    if managed:
        read_counts = dict(
            (
                await db.execute(
                    select(AnnouncementRead.announcement_id, func.count())
                    .where(AnnouncementRead.announcement_id.in_(managed))
                    .group_by(AnnouncementRead.announcement_id)
                )
            ).all()
        )

    out = []
    for announcement, author_name in rows:
        can_manage = announcement.id in managed
        out.append(
            AnnouncementOut(
                id=announcement.id,
                title=announcement.title,
                body=announcement.body,
                category=announcement.category,
                starts_on=announcement.starts_on,
                ends_on=announcement.ends_on,
                whole_school=announcement.whole_school,
                class_ids=sorted(class_map.get(announcement.id, [])),
                author_id=announcement.created_by,
                author_name=author_name,
                created_at=announcement.created_at,
                is_read=announcement.id in read_ids or announcement.created_by == current_user.id,
                read_count=read_counts.get(announcement.id, 0) if can_manage else None,
                recipient_count=announcement.recipient_count if can_manage else None,
            )
        )
    return out


async def _visible_announcement(db: AsyncSession, user: User, announcement_id: str) -> Announcement:
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id, await _visibility_clause(db, user))
    )
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=404, detail="Annonce introuvable.")
    return announcement


@router.post("/{announcement_id}/read")
async def mark_announcement_read(
    announcement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    announcement = await _visible_announcement(db, current_user, announcement_id)
    existing = await db.execute(
        select(AnnouncementRead.announcement_id).where(
            AnnouncementRead.announcement_id == announcement.id,
            AnnouncementRead.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none() is None:
        db.add(AnnouncementRead(announcement_id=announcement.id, user_id=current_user.id, school_id=announcement.school_id))
        await db.commit()
    return {"status": "read"}


@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    announcement = await _visible_announcement(db, current_user, announcement_id)
    if current_user.role not in ADMIN_ROLES and announcement.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Seul l'auteur ou l'administration peut supprimer cette annonce.")
    await record_audit_event(
        db,
        action="announcement.deleted",
        actor=current_user,
        school_id=announcement.school_id,
        resource_type="announcement",
        resource_id=announcement.id,
        method=request.method,
        path=request.url.path,
        metadata={"title": announcement.title},
    )
    await db.delete(announcement)
    await db.commit()
    return {"status": "deleted"}
