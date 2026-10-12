from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.access import (
    assert_class_read_access,
    assert_class_write_access,
    assert_scope_allows_course,
    resolve_class_course,
    teacher_course_scope,
)
from app.core.audit import record_audit_event
from app.db.database import get_db
from app.models import Class, ClassMember, Homework, StudentParent, User, UserRole
from app.schemas import HomeworkCreate, HomeworkOut
from app.core.security import get_current_user
from app.utils.notifications import create_notification

router = APIRouter(prefix="/classes/{class_id}/homework", tags=["Homework"])


_HOMEWORK_KIND_LABELS = {
    "homework": "devoir maison",
    "assignment": "devoir",
    "exam": "examen",
}


def _homework_kind_label(kind: str | None) -> str:
    return _HOMEWORK_KIND_LABELS.get((kind or "homework").strip().lower(), "devoir")


def _truncate(value: str, limit: int = 120) -> str:
    compact = " ".join(value.strip().split())
    if len(compact) <= limit:
        return compact
    return f"{compact[: limit - 1].rstrip()}..."


async def _notify_class_parents(
    *,
    class_id: str,
    school_id: str,
    payload: HomeworkCreate,
    db: AsyncSession,
) -> None:
    parents_result = await db.execute(
        select(User)
        .join(StudentParent, StudentParent.parent_id == User.id)
        .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
        .where(
            User.school_id == school_id,
            StudentParent.school_id == school_id,
            ClassMember.school_id == school_id,
            ClassMember.class_id == class_id,
        )
        .distinct()
    )
    parents = parents_result.scalars().all()
    kind_label = _homework_kind_label(payload.kind)
    due_label = payload.due_date.strftime("%d/%m/%Y")
    title = f"Nouveau {kind_label}"
    due_phrase = "prevu le" if payload.kind == "exam" else "a remettre le"
    content = f"{payload.subject} - {_truncate(payload.homework_content)} ({due_phrase} {due_label})."
    for parent in parents:
        await create_notification(
            db,
            user_id=parent.id,
            title=title,
            content=content,
            type="INFO",
            school_id=school_id,
        )


@router.post("/", response_model=HomeworkOut, status_code=201)
async def add_homework(
    class_id: str,
    payload: HomeworkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_write_access(class_id, current_user, db)
    course = await resolve_class_course(cls, course_id=payload.course_id, subject=payload.subject, db=db)
    assert_scope_allows_course(await teacher_course_scope(cls, current_user, db), course)
    if course:
        payload = payload.model_copy(update={"course_id": course.id, "subject": course.name})

    hw = Homework(
        **payload.model_dump(),
        class_id=class_id,
        school_id=cls.school_id,
        created_by=current_user.id,
    )
    db.add(hw)
    await db.flush()
    await _notify_class_parents(class_id=class_id, school_id=cls.school_id, payload=payload, db=db)
    await db.commit()
    await db.refresh(hw)
    return hw


@router.get("/", response_model=list[HomeworkOut])
async def list_homework(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_read_access(class_id, current_user, db)
    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Homework).where(Homework.school_id == cls.school_id, Homework.class_id == class_id)
    elif current_user.role.value == "teacher":
        stmt = select(Homework).where(Homework.school_id == cls.school_id, Homework.class_id == class_id)
    else:
        stmt = select(Homework).where(Homework.school_id == cls.school_id, Homework.class_id == class_id)
    
    result = await db.execute(stmt.order_by(Homework.due_date.asc()))
    return result.scalars().all()


class HomeworkUpdate(BaseModel):
    kind: str | None = Field(default=None, pattern="^(homework|assignment|exam)$")
    lesson_content: str | None = None
    homework_content: str | None = Field(default=None, min_length=1)
    due_date: datetime | None = None


def _homework_snapshot(hw: Homework) -> dict:
    return {
        "kind": hw.kind,
        "homework_content": hw.homework_content,
        "due_date": hw.due_date.isoformat() if hw.due_date else None,
    }


async def _homework_for_change(class_id: str, homework_id: str, current_user: User, db: AsyncSession) -> tuple[Class, Homework]:
    """Teachers change their own entries (or legacy ones of a subject they teach); admins any."""
    cls = await assert_class_write_access(class_id, current_user, db)
    hw = await db.get(Homework, homework_id)
    if not hw or hw.class_id != class_id or hw.school_id != cls.school_id:
        raise HTTPException(status_code=404, detail="Devoir introuvable.")
    if current_user.role == UserRole.teacher and hw.created_by != current_user.id:
        denied = HTTPException(status_code=403, detail="Seul l'auteur ou l'administration peut modifier ce devoir.")
        if hw.created_by is not None:
            raise denied
        # Entries created before authors were recorded: fall back to the subject.
        scope = await teacher_course_scope(cls, current_user, db)
        if scope is not None and not scope.allows(hw.course_id, hw.subject):
            raise denied
    return cls, hw


@router.patch("/{homework_id}", response_model=HomeworkOut)
async def update_homework(
    class_id: str,
    homework_id: str,
    payload: HomeworkUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls, hw = await _homework_for_change(class_id, homework_id, current_user, db)
    before = _homework_snapshot(hw)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is None and field != "lesson_content":
            continue
        setattr(hw, field, value)
    await record_audit_event(
        db,
        action="homework.updated",
        actor=current_user,
        school_id=cls.school_id,
        resource_type="homework",
        resource_id=hw.id,
        method=request.method,
        path=request.url.path,
        metadata={"before": before, "after": _homework_snapshot(hw)},
    )
    await db.commit()
    await db.refresh(hw)
    return hw


@router.delete("/{homework_id}")
async def delete_homework(
    class_id: str,
    homework_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls, hw = await _homework_for_change(class_id, homework_id, current_user, db)
    await record_audit_event(
        db,
        action="homework.deleted",
        actor=current_user,
        school_id=cls.school_id,
        resource_type="homework",
        resource_id=hw.id,
        method=request.method,
        path=request.url.path,
        metadata={"subject": hw.subject, **_homework_snapshot(hw)},
    )
    await db.delete(hw)
    await db.commit()
    return {"status": "deleted"}
