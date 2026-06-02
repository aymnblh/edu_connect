from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.access import (
    assert_class_read_access,
    assert_class_write_access,
    assert_parent_linked_to_student,
    assert_student_enrolled_in_class,
)
from app.db.database import get_db
from app.models import Remark, User, Student, StudentParent
from app.schemas import RemarkCreate, RemarkOut
from app.core.security import get_current_user
from app.utils.notifications import create_notification

router = APIRouter(prefix="/classes/{class_id}/remarks", tags=["Remarks"])


@router.post("/", response_model=RemarkOut)
async def add_remark(
    class_id: str,
    remark: RemarkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_write_access(class_id, current_user, db)
    student = await assert_student_enrolled_in_class(
        class_id,
        remark.student_id,
        db,
        school_id=cls.school_id,
    )

    new_remark = Remark(
        **remark.model_dump(exclude={"student_name"}),
        student_name=student.full_name,
        class_id=class_id,
        school_id=cls.school_id,
    )
            
    db.add(new_remark)
    
    # Notify Parents
    parents_res = await db.execute(
        select(User)
        .join(StudentParent, StudentParent.parent_id == User.id)
        .where(
            StudentParent.student_id == remark.student_id,
            StudentParent.school_id == cls.school_id,
        )
    )
    parents = parents_res.scalars().all()
    for parent in parents:
        await create_notification(
            db,
            user_id=parent.id,
            title="Nouvelle Remarque",
            content=f"Votre enfant a reçu une remarque de type {remark.type} : {remark.title}.",
            type="INFO",
            school_id=cls.school_id,
        )
    
    await db.commit()
    result = await db.execute(
        select(Remark).where(Remark.id == new_remark.id).options(selectinload(Remark.student))
    )
    return result.scalar_one()


@router.get("/", response_model=list[RemarkOut])
async def list_remarks(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_read_access(class_id, current_user, db)
    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Remark).where(Remark.school_id == cls.school_id, Remark.class_id == class_id)
    elif current_user.role.value == "teacher":
        stmt = select(Remark).where(Remark.school_id == cls.school_id, Remark.class_id == class_id)
    else:
        # Parent: Only remarks for their children
        stmt = (
            select(Remark)
            .join(StudentParent, StudentParent.student_id == Remark.student_id)
            .where(
                Remark.school_id == cls.school_id,
                Remark.class_id == class_id,
                StudentParent.school_id == cls.school_id,
                StudentParent.parent_id == current_user.id,
            )
        )
    
    result = await db.execute(stmt.options(selectinload(Remark.student)).order_by(Remark.date.desc()))
    return result.scalars().all()


@router.get("/student/{student_id}", response_model=list[RemarkOut])
async def student_remarks(
    class_id: str, student_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_read_access(class_id, current_user, db)
    await assert_student_enrolled_in_class(class_id, student_id, db, school_id=cls.school_id)
    if current_user.role.value == "parent":
        await assert_parent_linked_to_student(student_id, current_user.id, db, school_id=cls.school_id)

    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Remark).where(
            Remark.school_id == cls.school_id,
            Remark.class_id == class_id,
            Remark.student_id == student_id,
        )
    elif current_user.role.value == "teacher":
        stmt = select(Remark).where(
            Remark.school_id == cls.school_id,
            Remark.class_id == class_id,
            Remark.student_id == student_id,
        )
    else:
        # Parent: Only if this is their child
        stmt = select(Remark).join(StudentParent, StudentParent.student_id == Remark.student_id).where(
            Remark.school_id == cls.school_id,
            Remark.class_id == class_id,
            Remark.student_id == student_id,
            StudentParent.school_id == cls.school_id,
            StudentParent.parent_id == current_user.id,
        )

    result = await db.execute(stmt.options(selectinload(Remark.student)).order_by(Remark.date.desc()))
    return result.scalars().all()
