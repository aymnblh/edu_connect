from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import assert_class_read_access, assert_class_write_access
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import Class, ClassMember, LessonEntry, StudentParent, User
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
