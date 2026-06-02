from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.access import assert_class_read_access, assert_class_write_access
from app.db.database import get_db
from app.models import Homework, User
from app.schemas import HomeworkCreate, HomeworkOut
from app.core.security import get_current_user

router = APIRouter(prefix="/classes/{class_id}/homework", tags=["Homework"])


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
