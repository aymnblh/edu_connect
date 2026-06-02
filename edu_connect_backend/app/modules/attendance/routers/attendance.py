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
from app.models import Attendance, AttendanceStatus, User, Student, StudentParent
from app.schemas import AttendanceCreate, AttendanceOut, JustifyRequest
from app.core.security import get_current_user

router = APIRouter(prefix="/classes/{class_id}/attendance", tags=["Attendance"])


@router.post("/", response_model=AttendanceOut, status_code=201)
async def mark_attendance(
    class_id: str,
    payload: AttendanceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone

    cls = await assert_class_write_access(class_id, current_user, db)
    student = await assert_student_enrolled_in_class(
        class_id,
        payload.student_id,
        db,
        school_id=cls.school_id,
    )

    today = datetime.now(timezone.utc).date()
    doc_id = f"{payload.student_id}_{today.isoformat()}"
    existing = await db.execute(select(Attendance).where(Attendance.id == doc_id))
    existing_record = existing.scalar_one_or_none()
    
    record = Attendance(
        id=doc_id,
        school_id=cls.school_id,
        class_id=class_id,
        date=datetime(today.year, today.month, today.day, tzinfo=timezone.utc),
        **payload.model_dump(exclude={"student_name"}),
        student_name=student.full_name,
    )
    if existing_record:
        existing_record.status = payload.status
        existing_record.note = payload.note
        existing_record.student_name = student.full_name
    else:
        db.add(record)
    await db.commit()
    result = await db.execute(
        select(Attendance).where(Attendance.id == doc_id).options(selectinload(Attendance.student))
    )
    return result.scalar_one()


@router.get("/", response_model=list[AttendanceOut])
async def list_attendance(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_read_access(class_id, current_user, db)
    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Attendance).where(Attendance.school_id == cls.school_id, Attendance.class_id == class_id)
    elif current_user.role.value == "teacher":
        stmt = select(Attendance).where(Attendance.school_id == cls.school_id, Attendance.class_id == class_id)
    else:
        # Parent: Only records for their children
        stmt = (
            select(Attendance)
            .join(StudentParent, StudentParent.student_id == Attendance.student_id)
            .where(
                Attendance.school_id == cls.school_id,
                Attendance.class_id == class_id,
                StudentParent.school_id == cls.school_id,
                StudentParent.parent_id == current_user.id,
            )
        )
    
    result = await db.execute(stmt.options(selectinload(Attendance.student)).order_by(Attendance.date.desc()))
    return result.scalars().all()


@router.get("/student/{student_id}", response_model=list[AttendanceOut])
async def student_attendance(
    class_id: str, student_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_read_access(class_id, current_user, db)
    await assert_student_enrolled_in_class(class_id, student_id, db, school_id=cls.school_id)
    if current_user.role.value == "parent":
        await assert_parent_linked_to_student(student_id, current_user.id, db, school_id=cls.school_id)

    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Attendance).where(
            Attendance.school_id == cls.school_id,
            Attendance.class_id == class_id,
            Attendance.student_id == student_id,
        )
    elif current_user.role.value == "teacher":
        stmt = select(Attendance).where(
            Attendance.school_id == cls.school_id,
            Attendance.class_id == class_id,
            Attendance.student_id == student_id,
        )
    else:
        # Parent: Only if this is their child
        stmt = select(Attendance).join(StudentParent, StudentParent.student_id == Attendance.student_id).where(
            Attendance.school_id == cls.school_id,
            Attendance.class_id == class_id,
            Attendance.student_id == student_id,
            StudentParent.school_id == cls.school_id,
            StudentParent.parent_id == current_user.id,
        )

    result = await db.execute(stmt.options(selectinload(Attendance.student)).order_by(Attendance.date.desc()))
    return result.scalars().all()


@router.patch("/{attendance_id}/justify", response_model=AttendanceOut)
async def justify_absence(
    class_id: str,
    attendance_id: str,
    payload: JustifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_read_access(class_id, current_user, db)

    record = await db.get(Attendance, attendance_id)
    if not record or record.class_id != class_id:
        raise HTTPException(status_code=404, detail="Attendance record not found.")
    if record.school_id != cls.school_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if record.status not in {AttendanceStatus.absent, AttendanceStatus.late}:
        raise HTTPException(status_code=400, detail="Only absences and late arrivals can be justified.")

    if current_user.role.value == "parent":
        await assert_parent_linked_to_student(record.student_id, current_user.id, db, school_id=cls.school_id)
        record.justification_text = payload.justification
        record.justification_attachment_url = payload.attachment_url
        record.is_justified = False
    else:
        if current_user.role.value not in ["principal", "secretary"]:
            raise HTTPException(status_code=403, detail="Only school administration can accept justifications.")
        record.is_justified = True
        record.justification_text = payload.justification
        record.justification_attachment_url = payload.attachment_url

    await db.commit()
    result = await db.execute(
        select(Attendance).where(Attendance.id == attendance_id).options(selectinload(Attendance.student))
    )
    return result.scalar_one()
