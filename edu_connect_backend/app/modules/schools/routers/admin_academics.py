"""School creation, semesters, courses, and pending attendance admin endpoints."""
import csv
import io
import secrets
import string
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import DIRECTOR_MANAGED_ROLES, INVITABLE_STAFF_ROLES
from app.core.audit import record_audit_event
from app.core.config import settings
from app.core.rls import set_auth_lookup_email
from app.core.security import get_current_user, get_password_hash
from app.db.database import get_db
from app.models import (
    Attendance,
    AttendanceStatus,
    Class,
    ClassMember,
    Course,
    Grade,
    PendingLink,
    RefreshToken,
    School,
    Semester,
    Student,
    StudentParent,
    User,
    UserRole,
)
from app.modules.academics.averages import (
    grade_score_on_twenty,
    load_grade_coefficients,
    weighted_averages_by_group,
)
from app.modules.schools.calendar import ALGERIA_TZ, algerian_trimesters
from app.modules.schools.insights import (
    AVERAGE_DROP,
    LATES_30D,
    LOW_AVERAGE,
    UNJUSTIFIED_ABSENCES_30D,
    AttendanceFact,
    attendance_weeks,
    class_attendance,
    students_at_risk,
    week_start,
)
from app.schemas import (
    AnalyticsOverview,
    ClassPerformance,
    CourseCreate,
    CourseOut,
    ParentLinkAuditOut,
    SchoolCreate,
    SchoolOut,
    SemesterOut,
    SemesterUpdate,
    StudentAdminOut,
    StudentRegeneratePin,
    TokenGenerationRequest,
)
from app.utils.notifications import create_notification

from .admin_shared import (
    ALGERIAN_CORE_SUBJECTS,
    PendingAttendanceOut,
)

router = APIRouter()


@router.post("/schools", response_model=SchoolOut, status_code=status.HTTP_201_CREATED)
async def create_school(
    payload: SchoolCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a school only from the authenticated platform administration workspace."""
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Seul le super administrateur peut creer un etablissement.")

    school = School(name=payload.name, is_active=False)
    db.add(school)
    await db.flush() # Ensure school.id is generated
    
    # Seed Algerian standard courses
    for subject_name in ALGERIAN_CORE_SUBJECTS:
        course = Course(name=subject_name, school_id=school.id)
        db.add(course)
    
    # Assign current user to this school if they don't have one
    # Never assign a system_admin to a school — they must remain school-agnostic
    if not current_user.school_id and current_user.role != UserRole.system_admin:
        current_user.school_id = school.id
        
    # Seed Algerian standard semesters (Trimesters)
    for name, start_dt, end_dt, is_active in algerian_trimesters():
        semester = Semester(
            name=name,
            start_date=start_dt,
            end_date=end_dt,
            school_id=school.id,
            is_active=is_active,
        )
        db.add(semester)

    await db.commit()
    await db.refresh(school)
    return school


@router.get("/semesters", response_model=list[SemesterOut])
async def list_semesters(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.school_id:
        return []
    result = await db.execute(select(Semester).where(Semester.school_id == current_user.school_id))
    return result.scalars().all()


@router.put("/semesters/{semester_id}", response_model=SemesterOut)
async def update_semester(
    semester_id: str,
    payload: SemesterUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")
        
    stmt = select(Semester).where(Semester.id == semester_id, Semester.school_id == current_user.school_id)
    result = await db.execute(stmt)
    semester = result.scalar_one_or_none()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
        
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(semester, key, value)
        
    await db.commit()
    await db.refresh(semester)
    return semester


@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can manage courses")
    
    course = Course(
        name=payload.name,
        school_id=current_user.school_id,
        coefficient=payload.coefficient,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/courses", response_model=list[CourseOut])
async def list_courses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.school_id:
        return []
    result = await db.execute(select(Course).where(Course.school_id == current_user.school_id))
    return result.scalars().all()


@router.get("/attendance/pending", response_model=list[PendingAttendanceOut])
async def pending_attendance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only school administration can review attendance.")
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="You are not assigned to a school.")

    stmt = (
        select(
            Attendance.id,
            Attendance.class_id,
            Class.name.label("class_name"),
            Attendance.student_id,
            Attendance.student_name,
            Attendance.status,
            Attendance.date,
            Attendance.note,
            Attendance.is_justified,
            Attendance.justification_text,
            Attendance.justification_attachment_url,
        )
        .join(Class, Class.id == Attendance.class_id)
        .where(
            Attendance.school_id == current_user.school_id,
            Class.school_id == current_user.school_id,
            Attendance.status.in_([AttendanceStatus.absent, AttendanceStatus.late]),
            Attendance.is_justified.is_(False),
        )
        .order_by(Attendance.date.desc(), Class.name.asc(), Attendance.student_name.asc())
        .limit(200)
    )
    result = await db.execute(stmt)
    pending = []
    for row in result.all():
        mapping = row._mapping if hasattr(row, "_mapping") else row
        pending.append(PendingAttendanceOut.model_validate(mapping))
    return pending
