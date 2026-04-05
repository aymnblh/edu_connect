from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from ..database import get_db
from ..models import Remark, User, UserRole, Class, Student, StudentParent
from ..schemas import RemarkCreate, RemarkOut
from ..auth import get_current_user
from app.utils.notifications import create_notification

router = APIRouter(prefix="/classes/{class_id}/remarks", tags=["Remarks"])


@router.post("/", response_model=RemarkOut)
async def add_remark(
    remark: RemarkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check authorization
    if current_user.role.value not in ["principal", "secretary", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.role.value == "teacher":
        # We need class_id from payload or as param. RemarkCreate has it?
        # Looking at previous code, Remark(**remark.model_dump()) was used.
        # But Remark model needs class_id.
        pass

    new_remark = Remark(**remark.model_dump())
    
    if current_user.role.value == "teacher":
        stmt = select(Class).join(Class.teachers).where(Class.id == new_remark.class_id, User.id == current_user.id)
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="You are not a teacher for this class")
            
    db.add(new_remark)
    
    # Notify Parents
    parents_res = await db.execute(select(User).join(User.students_linking).where(Student.id == remark.student_id))
    parents = parents_res.scalars().all()
    for parent in parents:
        await create_notification(
            db,
            user_id=parent.id,
            title="Nouvelle Remarque",
            content=f"Votre enfant a reçu une remarque de type {remark.type} : {remark.title}.",
            type="INFO"
        )
    
    await db.commit()
    await db.refresh(new_remark)
    return new_remark


@router.get("/", response_model=list[RemarkOut])
async def list_remarks(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Remark).where(Remark.class_id == class_id)
    elif current_user.role.value == "teacher":
        # Check if they teach this class
        stmt = select(Remark).join(Class).join(Class.teachers).where(Class.id == class_id, User.id == current_user.id)
    else:
        # Parent: Only remarks for their children
        stmt = (
            select(Remark)
            .join(Student)
            .join(Student.parents)
            .where(Remark.class_id == class_id, User.id == current_user.id)
        )
    
    result = await db.execute(stmt.order_by(Remark.date.desc()))
    return result.scalars().all()


@router.get("/student/{student_id}", response_model=list[RemarkOut])
async def student_remarks(
    class_id: str, student_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Remark).where(Remark.class_id == class_id, Remark.student_id == student_id)
    elif current_user.role.value == "teacher":
        # Check if they teach this class
        stmt = select(Remark).join(Class).join(Class.teachers).where(
            Remark.class_id == class_id,
            Remark.student_id == student_id,
            User.id == current_user.id
        )
    else:
        # Parent: Only if this is their child
        stmt = select(Remark).join(Student).join(Student.parents).where(
            Remark.class_id == class_id,
            Remark.student_id == student_id,
            User.id == current_user.id
        )

    result = await db.execute(stmt.order_by(Remark.date.desc()))
    return result.scalars().all()
