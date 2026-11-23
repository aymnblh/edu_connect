"""Shared schemas, constants, and CSV/access helpers for school admin routers."""
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


class CreateTeacherRequest(BaseModel):
    email: EmailStr
    full_name: str


class CreateStaffRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.teacher


class UserSimpleOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    invite_code: str | None = None
    deactivated_at: datetime | None = None
    model_config = {"from_attributes": True}


class ArchiveStudentRequest(BaseModel):
    reason: str


class PendingAttendanceOut(BaseModel):
    id: str
    class_id: str
    class_name: str
    student_id: str
    student_name: str
    status: AttendanceStatus
    date: datetime
    note: str | None = None
    is_justified: bool
    justification_text: str | None = None
    justification_attachment_url: str | None = None


class StudentParentOut(BaseModel):
    id: str
    full_name: str
    email: str
    label: str | None = None
    model_config = {"from_attributes": True}


class _EmailCheck(BaseModel):
    email: EmailStr


ALLOWED_STUDENT_ARCHIVE_REASONS = {"graduated", "transferred", "other"}


ALGERIAN_CORE_SUBJECTS = [
    "اللغة العربية (Arabic)",
    "الرياضيات (Mathematics)",
    "اللغة الفرنسية (French)",
    "اللغة الإنجليزية (English)",
    "فيزياء وكيمياء (Physics/Chemistry)",
    "علوم الطبيعة والحياة (Life Sciences)",
    "التاريخ والجغرافيا (History/Geography)",
    "التربية الإسلامية (Islamic Education)",
    "التربية البدنية (PE)",
    "المعلوماتية (Informatics)",
    "التربية الفنية (Arts)",
    "التربية المدنية (Civic Education)",
    "الفلسفة (Philosophy)"
]


STUDENT_IMPORT_MAX_ROWS = 2000


TEACHER_IMPORT_MAX_ROWS = 300


def generate_invite_code(length: int = 32) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def _create_invited_staff_user(
    *,
    payload: CreateStaffRequest,
    current_user: User,
    db: AsyncSession,
) -> User:
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Only school administration can invite staff accounts.")

    if payload.role not in INVITABLE_STAFF_ROLES:
        raise HTTPException(status_code=400, detail="Only teacher, secretary, nurse, canteen and driver invitations are supported.")

    if payload.role in DIRECTOR_MANAGED_ROLES and current_user.role != UserRole.principal:
        raise HTTPException(status_code=403, detail="Only the director can invite secretary, nurse, canteen and driver accounts.")

    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="You are not assigned to a school.")

    # Row security hides other schools' users unless the lookup email is declared.
    await set_auth_lookup_email(db, str(payload.email))
    stmt = select(User).where(User.email == payload.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Un compte avec cet email existe deja.")

    invited_user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        school_id=current_user.school_id,
        password_hash=None,
        invite_code=generate_invite_code(),
        invite_expires_at=datetime.now(timezone.utc) + timedelta(hours=72),
    )
    db.add(invited_user)
    await db.commit()
    await db.refresh(invited_user)
    return invited_user


def _normalized_csv_row(row: dict[str | None, str | None]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for key, value in row.items():
        if key is None:
            continue
        clean_key = key.lstrip("\ufeff").strip().lower().replace(" ", "_")
        normalized[clean_key] = (value or "").strip()
    return normalized


def _student_name_from_csv_row(row: dict[str | None, str | None]) -> str:
    normalized = _normalized_csv_row(row)
    full_name = (
        normalized.get("full_name")
        or normalized.get("name")
        or normalized.get("nom_complet")
        or normalized.get("الاسم_الكامل")
        or normalized.get("الإسم_الكامل")
    )
    if full_name:
        return full_name

    first_name = (
        normalized.get("prenom")
        or normalized.get("prénom")
        or normalized.get("first_name")
        or normalized.get("firstname")
        or normalized.get("الاسم")
        or normalized.get("الإسم")
        or normalized.get("اسم")
    )
    last_name = (
        normalized.get("nom")
        or normalized.get("last_name")
        or normalized.get("lastname")
        or normalized.get("اللقب")
        or normalized.get("النسب")
        or normalized.get("اسم_العائلة")
        or normalized.get("العائلة")
    )
    return " ".join(part for part in [first_name, last_name] if part)


def _class_name_from_csv_row(row: dict[str | None, str | None]) -> str:
    normalized = _normalized_csv_row(row)
    return (
        normalized.get("classe")
        or normalized.get("class")
        or normalized.get("division")
        or normalized.get("القسم")
        or normalized.get("الفوج")
        or ""
    )


def _email_from_csv_row(row: dict[str | None, str | None]) -> str:
    normalized = _normalized_csv_row(row)
    return (
        normalized.get("email")
        or normalized.get("e-mail")
        or normalized.get("mail")
        or normalized.get("courriel")
        or normalized.get("البريد_الإلكتروني")
        or normalized.get("البريد")
        or ""
    ).strip().lower()


async def _get_manageable_staff(user_id: str, current_user: User, db: AsyncSession) -> User:
    """Load a teacher/secretary the current admin may reset or deactivate."""
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Only school administration can manage staff access.")
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="You are not assigned to a school.")

    staff = await db.get(User, user_id)
    if (
        not staff
        or staff.school_id != current_user.school_id
        or staff.role not in INVITABLE_STAFF_ROLES
    ):
        raise HTTPException(status_code=404, detail="Staff member not found.")
    if staff.role in DIRECTOR_MANAGED_ROLES and current_user.role != UserRole.principal:
        raise HTTPException(status_code=403, detail="Only the director can manage secretary, nurse, canteen and driver accounts.")
    return staff


async def _revoke_user_access(db: AsyncSession, user: User, *, school_id: str, issue_code: bool) -> None:
    """Invalidate a user's password and every session; optionally issue a 72h access code."""
    user.password_hash = None
    user.token_version = (user.token_version or 0) + 1
    if issue_code:
        user.invite_code = generate_invite_code()
        user.invite_expires_at = datetime.now(timezone.utc) + timedelta(hours=72)
        user.deactivated_at = None
    else:
        user.invite_code = None
        user.invite_expires_at = None
    await db.execute(
        delete(RefreshToken).where(
            RefreshToken.school_id == school_id,
            RefreshToken.user_id == user.id,
        )
    )
