"""Staff, parent access, and teacher-import admin endpoints."""
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
    CreateStaffRequest,
    CreateTeacherRequest,
    TEACHER_IMPORT_MAX_ROWS,
    UserSimpleOut,
    _EmailCheck,
    _create_invited_staff_user,
    _email_from_csv_row,
    _get_manageable_staff,
    _normalized_csv_row,
    _revoke_user_access,
    _student_name_from_csv_row,
    generate_invite_code,
)

router = APIRouter()


@router.post("/create-teacher", response_model=UserSimpleOut, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    payload: CreateTeacherRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Principal creates a teacher account without a password.
    An invite_code is generated so the teacher can log in for the first time.
    """
    return await _create_invited_staff_user(
        payload=CreateStaffRequest(
            email=payload.email,
            full_name=payload.full_name,
            role=UserRole.teacher,
        ),
        current_user=current_user,
        db=db,
    )


@router.post("/create-staff", response_model=UserSimpleOut, status_code=status.HTTP_201_CREATED)
async def create_staff(
    payload: CreateStaffRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite a teacher or secretary account with a first-login code."""
    return await _create_invited_staff_user(payload=payload, current_user=current_user, db=db)


@router.post("/staff/{user_id}/reset-access", response_model=UserSimpleOut)
async def reset_staff_access(
    user_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Issue a new first-login code for a teacher or secretary.

    Used when an invitation expired or a staff member lost their password.
    The current password stops working and every session is signed out until
    the code is redeemed on the activation page.
    """
    staff = await _get_manageable_staff(user_id, current_user, db)

    reactivated = staff.deactivated_at is not None
    await _revoke_user_access(db, staff, school_id=current_user.school_id, issue_code=True)
    await record_audit_event(
        db,
        action="staff.access_reset",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="user",
        resource_id=staff.id,
        method=request.method,
        path=request.url.path,
        metadata={"role": staff.role.value, "sessions_revoked": True, "reactivated": reactivated},
    )
    await db.commit()
    await db.refresh(staff)
    return staff


@router.post("/staff/{user_id}/deactivate", response_model=UserSimpleOut)
async def deactivate_staff(
    user_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Block a teacher or secretary who left the school.

    Login stops working at once, every session (including open WebSockets) is
    revoked and no activation code remains. "Reset access" reactivates them.
    """
    staff = await _get_manageable_staff(user_id, current_user, db)
    if staff.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")
    await _revoke_user_access(db, staff, school_id=current_user.school_id, issue_code=False)
    staff.deactivated_at = datetime.now(timezone.utc)
    await record_audit_event(
        db,
        action="staff.deactivated",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="user",
        resource_id=staff.id,
        method=request.method,
        path=request.url.path,
        metadata={"role": staff.role.value, "sessions_revoked": True},
    )
    await db.commit()
    await db.refresh(staff)
    return staff


@router.post("/users/{user_id}/sign-out")
async def sign_out_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """End every session of a staff member or parent (their password still works)."""
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Only school administration can sign users out.")
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="You are not assigned to a school.")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Use 'sign out my other devices' for your own account.")

    target = await db.get(User, user_id)
    if not target or target.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.role in INVITABLE_STAFF_ROLES:
        target = await _get_manageable_staff(user_id, current_user, db)
    elif target.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="This account cannot be signed out here.")

    target.token_version = (target.token_version or 0) + 1
    await db.execute(
        delete(RefreshToken).where(
            RefreshToken.school_id == current_user.school_id,
            RefreshToken.user_id == target.id,
        )
    )
    await record_audit_event(
        db,
        action="user.signed_out",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="user",
        resource_id=target.id,
        method=request.method,
        path=request.url.path,
        metadata={"role": target.role.value},
    )
    await db.commit()
    return {"status": "signed_out"}


@router.post("/parents/{parent_id}/reset-access", response_model=UserSimpleOut)
async def reset_parent_access(
    parent_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Issue a new access code for a parent who lost their password."""
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Only school administration can reset parent access.")
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="You are not assigned to a school.")

    parent = await db.get(User, parent_id)
    if not parent or parent.role != UserRole.parent or parent.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Parent not found.")

    await _revoke_user_access(db, parent, school_id=current_user.school_id, issue_code=True)
    await record_audit_event(
        db,
        action="parent.access_reset",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="user",
        resource_id=parent.id,
        method=request.method,
        path=request.url.path,
        metadata={"sessions_revoked": True},
    )
    await db.commit()
    await db.refresh(parent)
    return parent


@router.get("/staff", response_model=list[UserSimpleOut])
async def list_staff(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only school administration can list staff accounts.")

    if not current_user.school_id:
        return []

    result = await db.execute(
        select(User)
        .where(
            User.school_id == current_user.school_id,
            User.role.in_([UserRole.principal, *INVITABLE_STAFF_ROLES]),
        )
        .order_by(User.role.asc(), User.full_name.asc())
    )
    return result.scalars().all()


@router.post("/import/teachers")
async def import_teachers(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite teachers from a CSV file: full_name (or prenom + nom) and email.
    Each new teacher gets a first-login code, valid 72 hours, returned once so the
    school can hand it out. Existing emails and invalid rows are reported, not imported.
    """
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can import data")

    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    content = await file.read(settings.media_max_upload_bytes + 1)
    if len(content) > settings.media_max_upload_bytes:
        raise HTTPException(status_code=413, detail="CSV file is too large.")
    decoded = content.decode("utf-8-sig", errors="replace")
    try:
        dialect = csv.Sniffer().sniff(decoded[:4096], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    rows = list(csv.DictReader(io.StringIO(decoded), dialect=dialect))
    if len(rows) > TEACHER_IMPORT_MAX_ROWS:
        raise HTTPException(status_code=400, detail=f"Au plus {TEACHER_IMPORT_MAX_ROWS} enseignants par fichier.")

    invited: list[dict] = []
    skipped: list[dict] = []
    seen: set[str] = set()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=72)
    for line, row in enumerate(rows, start=2):
        name = _student_name_from_csv_row(row)
        email = _email_from_csv_row(row)
        if not name or not email:
            skipped.append({"line": line, "email": email, "reason": "missing"})
            continue
        try:
            email = str(_EmailCheck(email=email).email).lower()
        except ValueError:
            skipped.append({"line": line, "email": email, "reason": "invalid_email"})
            continue
        if email in seen:
            skipped.append({"line": line, "email": email, "reason": "duplicate"})
            continue
        seen.add(email)
        # Row security hides other schools' users unless the lookup email is declared.
        await set_auth_lookup_email(db, email)
        if (await db.execute(select(User.id).where(User.email == email))).scalar_one_or_none():
            skipped.append({"line": line, "email": email, "reason": "exists"})
            continue
        code = generate_invite_code()
        db.add(
            User(
                id=str(uuid.uuid4()),
                email=email,
                full_name=name[:255],
                role=UserRole.teacher,
                school_id=current_user.school_id,
                password_hash=None,
                invite_code=code,
                invite_expires_at=expires_at,
            )
        )
        invited.append({"full_name": name, "email": email, "invite_code": code, "invite_expires_at": expires_at})

    await record_audit_event(
        db,
        action="staff.teachers_imported",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="staff",
        method=request.method,
        path=request.url.path,
        # Emails only: the codes are credentials.
        metadata={"invited": [item["email"] for item in invited], "skipped": len(skipped)},
    )
    await db.commit()
    return {"invited": invited, "skipped": skipped}
