from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from ..database import get_db
from ..models import Homework, User, UserRole, Class, Student, StudentParent
from ..schemas import HomeworkCreate, HomeworkOut
from ..auth import get_current_user

router = APIRouter(prefix="/classes/{class_id}/homework", tags=["Homework"])


@router.post("/", response_model=HomeworkOut, status_code=201)
async def add_homework(
    class_id: str,
    payload: HomeworkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check authorization
    if current_user.role.value not in ["principal", "secretary", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.role.value == "teacher":
        stmt = select(Class).join(Class.teachers).where(Class.id == class_id, User.id == current_user.id)
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="You are not a teacher for this class")

    hw = Homework(**payload.model_dump(), class_id=class_id)
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
    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Homework).where(Homework.class_id == class_id)
    elif current_user.role.value == "teacher":
        # Check if they teach this class
        stmt = select(Homework).join(Class).join(Class.teachers).where(Class.id == class_id, User.id == current_user.id)
    else:
        # Parent: Only see homework for classes where their children are members
        stmt = (
            select(Homework)
            .join(Class)
            .join(Class.members)
            .join(Student.parents)
            .where(Homework.class_id == class_id, User.id == current_user.id)
            .distinct()
        )
    
    result = await db.execute(stmt.order_by(Homework.due_date.asc()))
    return result.scalars().all()
