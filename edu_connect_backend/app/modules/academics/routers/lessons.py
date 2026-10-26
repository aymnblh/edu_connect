from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import assert_class_read_access, assert_class_write_access
from app.core.audit import record_audit_event
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import Class, ClassMember, LessonEntry, StudentParent, User, UserRole
from app.schemas import LessonEntryCreate, LessonEntryOut

router = APIRouter(prefix="/classes/{class_id}/lessons", tags=["Lesson Diary"])


async def _assert_lesson_access(class_id: str, current_user: User, db: AsyncSession, *, write: bool) -> Class:
    if write:
        return await assert_class_write_access(class_id, current_user, db)
    return await assert_class_read_access(class_id, current_user, db)


@router.post("/", response_model=LessonEntryOut, status_code=201)
async def create_lesson_entry(
    class_id: str,
    payload: LessonEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await _assert_lesson_access(class_id, current_user, db, write=True)
    entry = LessonEntry(
        school_id=cls.school_id,
        class_id=class_id,
        teacher_id=current_user.id,
        subject=payload.subject,
        content=payload.content,
        homework_summary=payload.homework_summary,
        session_date=payload.session_date or datetime.now(timezone.utc),
        course_id=payload.course_id,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/", response_model=list[LessonEntryOut])
async def list_lesson_entries(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await _assert_lesson_access(class_id, current_user, db, write=False)
    stmt = (
        select(LessonEntry)
        .where(LessonEntry.school_id == cls.school_id, LessonEntry.class_id == class_id)
        .order_by(LessonEntry.session_date.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()


class LessonEntryUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1)
    homework_summary: str | None = None
    session_date: datetime | None = None


async def _lesson_for_change(class_id: str, lesson_id: str, current_user: User, db: AsyncSession) -> tuple[Class, LessonEntry]:
    cls = await _assert_lesson_access(class_id, current_user, db, write=True)
    entry = await db.get(LessonEntry, lesson_id)
    if not entry or entry.class_id != class_id or entry.school_id != cls.school_id:
        raise HTTPException(status_code=404, detail="Seance introuvable.")
    if current_user.role == UserRole.teacher and entry.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Seul l'auteur ou l'administration peut modifier cette seance.")
    return cls, entry


@router.patch("/{lesson_id}", response_model=LessonEntryOut)
async def update_lesson_entry(
    class_id: str,
    lesson_id: str,
    payload: LessonEntryUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls, entry = await _lesson_for_change(class_id, lesson_id, current_user, db)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        if value is None and field != "homework_summary":
            continue
        setattr(entry, field, value)
    await record_audit_event(
        db,
        action="lesson.updated",
        actor=current_user,
        school_id=cls.school_id,
        resource_type="lesson",
        resource_id=entry.id,
        method=request.method,
        path=request.url.path,
        metadata={"fields": sorted(changes)},
    )
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{lesson_id}")
async def delete_lesson_entry(
    class_id: str,
    lesson_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls, entry = await _lesson_for_change(class_id, lesson_id, current_user, db)
    await record_audit_event(
        db,
        action="lesson.deleted",
        actor=current_user,
        school_id=cls.school_id,
        resource_type="lesson",
        resource_id=entry.id,
        method=request.method,
        path=request.url.path,
        metadata={"subject": entry.subject},
    )
    await db.delete(entry)
    await db.commit()
    return {"status": "deleted"}
