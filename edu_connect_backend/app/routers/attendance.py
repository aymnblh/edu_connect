from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from ..database import get_db
from ..models import Attendance, User, UserRole, Class, Student, StudentParent
from ..schemas import AttendanceCreate, AttendanceOut, JustifyRequest
from ..auth import get_current_user

router = APIRouter(prefix="/classes/{class_id}/attendance", tags=["Attendance"])


@router.post("/", response_model=AttendanceOut, status_code=201)
async def mark_attendance(
    class_id: str,
    payload: AttendanceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    
    # Check authorization
    if current_user.role.value not in ["principal", "secretary", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.role.value == "teacher":
        stmt = select(Class).join(Class.teachers).where(Class.id == class_id, User.id == current_user.id)
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="You are not a teacher for this class")

    today = datetime.now(timezone.utc).date()
    doc_id = f"{payload.student_id}_{today.isoformat()}"
    existing = await db.execute(select(Attendance).where(Attendance.id == doc_id))
    existing_record = existing.scalar_one_or_none()
    
    record = Attendance(
        id=doc_id,
        class_id=class_id,
        date=datetime(today.year, today.month, today.day, tzinfo=timezone.utc),
        **payload.model_dump(),
    )
    if existing_record:
        existing_record.status = payload.status
        existing_record.note = payload.note
    else:
        db.add(record)
    await db.commit()
    result = await db.get(Attendance, doc_id)
    return result


@router.get("/", response_model=list[AttendanceOut])
async def list_attendance(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Attendance).where(Attendance.class_id == class_id)
    elif current_user.role.value == "teacher":
        # Check if they teach this class
        stmt = select(Attendance).join(Class).join(Class.teachers).where(Class.id == class_id, User.id == current_user.id)
    else:
        # Parent: Only records for their children
        stmt = (
            select(Attendance)
            .join(Student)
            .join(Student.parents)
            .where(Attendance.class_id == class_id, User.id == current_user.id)
        )
    
    result = await db.execute(stmt.order_by(Attendance.date.desc()))
    return result.scalars().all()


@router.get("/student/{student_id}", response_model=list[AttendanceOut])
async def student_attendance(
    class_id: str, student_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Attendance).where(Attendance.class_id == class_id, Attendance.student_id == student_id)
    elif current_user.role.value == "teacher":
        # Check if they teach this class
        stmt = select(Attendance).join(Class).join(Class.teachers).where(
            Attendance.class_id == class_id,
            Attendance.student_id == student_id,
            User.id == current_user.id
        )
    else:
        # Parent: Only if this is their child
        stmt = select(Attendance).join(Student).join(Student.parents).where(
            Attendance.class_id == class_id,
            Attendance.student_id == student_id,
            User.id == current_user.id
        )

    result = await db.execute(stmt.order_by(Attendance.date.desc()))
    return result.scalars().all()


@router.patch("/{attendance_id}/justify", response_model=AttendanceOut)
async def justify_absence(
    class_id: str,
    attendance_id: str,
    payload: JustifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await db.get(Attendance, attendance_id)
    if not record or record.class_id != class_id:
        raise HTTPException(status_code=404, detail="Attendance record not found.")
    
    # Check if parent (of this student) or admin/teacher
    if current_user.role.value == "parent":
        # Check if this student is their child
        stmt = select(Student).join(Student.parents).where(Student.id == record.student_id, User.id == current_user.id)
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized to justify this student's absence")
    elif current_user.role.value == "teacher":
        # Check if they teach this class
        stmt = select(Class).join(Class.teachers).where(Class.id == class_id, User.id == current_user.id)
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="You are not a teacher for this class")
    elif current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    record.is_justified = True
    record.justification_text = payload.text
    await db.commit()
    await db.refresh(record)
    return record
