from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.access import assert_class_read_access, assert_class_write_access
from app.db.database import get_db
from app.models import ClassMember, Homework, StudentParent, User
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

    hw = Homework(**payload.model_dump(), class_id=class_id, school_id=cls.school_id)
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
