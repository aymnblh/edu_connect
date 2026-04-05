import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Class, ClassMember, User, Student, ClassTeacher, StudentParent
from ..schemas import ClassCreate, ClassOut, JoinClassRequest
from ..auth import get_current_user
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/classes", tags=["Classes"])


def _random_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


@router.post("/", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
async def create_class(
    payload: ClassCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["teacher", "principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Not authorized to create classes.")
    
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    join_code = _random_code()
    # Use school_id from creator
    cls = Class(
        name=payload.name, 
        subject=payload.subject, 
        join_code=join_code,
        school_id=current_user.school_id
    )
    cls.teachers.append(current_user)
    db.add(cls)
    await db.commit()
    await db.refresh(cls)
    return cls


@router.post("/join", response_model=ClassOut)
async def join_class(
    payload: JoinClassRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Class).where(Class.join_code == payload.join_code))
    cls = result.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Invalid join code.")
    
    # In the new model, students are entities. A parent joins and links their children.
    # We should ensure the current_user is a parent or teacher.
    if current_user.role.value == "teacher":
        if current_user not in cls.teachers:
            cls.teachers.append(current_user)
            await db.commit()
    return cls


@router.get("/", response_model=list[ClassOut])
async def list_classes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value in ["principal", "secretary"]:
        # Only see classes within their school
        result = await db.execute(select(Class).where(Class.school_id == current_user.school_id))
    elif current_user.role.value == "teacher":
        result = await db.execute(
            select(Class)
            .join(Class.teachers)
            .where(User.id == current_user.id)
        )
    else:
        # Parent: see classes where their children are members
        result = await db.execute(
            select(Class)
            .where(Class.school_id == current_user.school_id)
            .join(Class.members)
            .join(Student.parents)
            .where(User.id == current_user.id)
            .distinct()
        )
    return result.scalars().all()


@router.get("/{class_id}", response_model=ClassOut)
async def get_class(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Class)
        .where(Class.id == class_id)
        .options(selectinload(Class.members), selectinload(Class.teachers))
    )
    result = await db.execute(stmt)
    cls = result.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return cls
