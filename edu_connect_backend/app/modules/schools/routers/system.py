"""SuperAdmin school lifecycle, billing, inspection, user management, and platform broadcasts."""
import calendar
from datetime import datetime, timedelta, timezone
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_event
from app.core.modules import enabled_modules, with_modules
from app.core.security import create_impersonation_token, get_current_user, get_password_hash
from app.db.database import get_db
from app.models import (
    Attendance,
    AttendanceStatus,
    AuditEvent,
    Class,
    Course,
    DirectMessage,
    Grade,
    Homework,
    Message,
    PendingLink,
    RefreshToken,
    School,
    Semester,
    Student,
    SubscriptionPayment,
    User,
    UserRole,
)
from app.modules.schools.calendar import algerian_trimesters, school_year_label
from app.modules.schools.referral import apply_activation_benefits, new_referral_code
from app.modules.schools.routers.admin_shared import ALGERIAN_CORE_SUBJECTS
from app.modules.schools.routers import system_broadcasts, system_users

router = APIRouter(prefix="/system", tags=["System Administration"])
router.include_router(system_users.router)
router.include_router(system_broadcasts.router)

TERMS_VERSION = "privacy-terms-2026-10-24"


def _require_system_admin(current_user: User) -> User:
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Unprivileged")
    return current_user


def _add_months(base: datetime, months: int) -> datetime:
    new_month = base.month + months - 1
    new_year = base.year + new_month // 12
    new_month = new_month % 12 + 1
    max_days = calendar.monthrange(new_year, new_month)[1]
    new_day = min(base.day, max_days)
    return base.replace(year=new_year, month=new_month, day=new_day)


def _derive_prefix(name: str, explicit: str | None = None) -> str:
    source = (explicit or "").strip()
    if source:
        cleaned = re.sub(r"[^A-Za-z0-9]", "", source).upper()[:10]
        if cleaned:
            return cleaned
    cleaned_name = re.sub(r"[^A-Za-z0-9]", "", name).upper()[:3]
    return cleaned_name or "EDU"


class SchoolModulesPayload(BaseModel):
    canteen: bool = False
    transport: bool = False


class SchoolAdminOut(BaseModel):
    id: str
    name: str
    student_id_prefix: str = "EDU"
    referral_code: str | None = None
    is_active: bool
    subscription_expires_at: str | None = None
    created_at: str | None = None
    plan: str = "pro"
    max_parents_per_student: int = 2
    modules: dict[str, bool] = Field(default_factory=lambda: {"canteen": False, "transport": False})
    user_count: int = 0
    teacher_count: int = 0
    parent_count: int = 0
    principal_count: int = 0
    secretary_count: int = 0
    nurse_count: int = 0
    canteen_count: int = 0
    driver_count: int = 0
    student_count: int = 0
    class_count: int = 0
    course_count: int = 0
    active_session_count: int = 0
    pending_parent_link_count: int = 0
    used_parent_link_count: int = 0
    grade_count: int = 0
    approved_grade_count: int = 0
    pending_grade_count: int = 0
    attendance_count: int = 0
    absence_count: int = 0
    homework_count: int = 0
    class_message_count: int = 0
    direct_message_count: int = 0
    audit_event_count_24h: int = 0
    failed_auth_count_24h: int = 0
    server_error_count_24h: int = 0
    payment_count: int = 0
    total_revenue: float = 0
    last_payment_amount: float | None = None
    last_payment_at: str | None = None
    last_login_at: str | None = None
    last_audit_at: str | None = None
    last_message_at: str | None = None
    last_grade_at: str | None = None
    last_attendance_at: str | None = None
    days_until_expiry: int | None = None
    health_status: str = "healthy"
    health_score: int = 100
    role_counts: dict[str, int] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class SystemSchoolCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    student_id_prefix: str | None = Field(default=None, max_length=10)
    is_active: bool = False
    plan: str = Field(default="pro", max_length=50)
    max_parents_per_student: int = Field(default=2, ge=1, le=10)
    modules: SchoolModulesPayload = Field(default_factory=SchoolModulesPayload)
    subscription_months: int = Field(default=0, ge=0, le=120)
    principal_email: EmailStr | None = None
    principal_full_name: str | None = Field(default=None, max_length=255)
    principal_password: str | None = Field(default=None, min_length=8, max_length=128)


class SystemSchoolUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    student_id_prefix: str | None = Field(default=None, max_length=10)
    is_active: bool | None = None
    subscription_expires_at: datetime | None = None
    plan: str | None = Field(default=None, max_length=50)
    max_parents_per_student: int | None = Field(default=None, ge=1, le=10)
    modules: SchoolModulesPayload | None = None


class SubscriptionPaymentOut(BaseModel):
    id: str
    school_id: str
    amount: float
    months_added: int
    payment_method: str
    notes: str | None = None
    created_at: str


class SubscriptionPaymentRequest(BaseModel):
    amount: float = Field(ge=0, le=100_000_000)
    months_added: int = Field(gt=0, le=120)
    payment_method: str = Field(default="cash", min_length=2, max_length=50)
    notes: str | None = Field(default=None, max_length=2000)


class SchoolImpersonationOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    school_id: str
    school_name: str
    role: str = "principal"


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _aware(value: datetime | None) -> datetime | None:
    if not value:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _days_until(value: datetime | None, now: datetime) -> int | None:
    aware_value = _aware(value)
    if not aware_value:
        return None
    return int((aware_value - now).total_seconds() // 86400)


async def _count(db: AsyncSession, stmt) -> int:
    return int(await db.scalar(stmt) or 0)


async def _max_date(db: AsyncSession, stmt) -> datetime | None:
    return await db.scalar(stmt)


def _health_status_and_score(
    *,
    school: School,
    now: datetime,
    server_errors: int,
    failed_auth: int,
    active_sessions: int,
) -> tuple[str, int]:
    score = 100
    expiry = _aware(school.subscription_expires_at)

    if not school.is_active:
        return "suspended", 35
    if not expiry or expiry < now:
        return "subscription_expired", 45

    days_left = _days_until(expiry, now)
    if days_left is not None and days_left <= 7:
        score -= 20
    if server_errors:
        score -= min(35, server_errors * 8)
    if failed_auth >= 10:
        score -= 20
    elif failed_auth >= 3:
        score -= 10
    if active_sessions == 0:
        score -= 10

    score = max(score, 0)
    if score >= 80:
        return "healthy", score
    if score >= 55:
        return "watch", score
    return "risk", score


@router.get("/schools", response_model=list[SchoolAdminOut])
async def list_all_schools(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: List all schools with operational, usage, and billing metrics."""
    _require_system_admin(current_user)

    result = await db.execute(select(School).order_by(School.created_at.desc()))
    schools = result.scalars().all()

    out = []
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    for s in schools:
        user_count = await _count(db, select(func.count(User.id)).where(User.school_id == s.id))
        teacher_count = await _count(
            db, select(func.count(User.id)).where(User.school_id == s.id, User.role == UserRole.teacher)
        )
        parent_count = await _count(
            db, select(func.count(User.id)).where(User.school_id == s.id, User.role == UserRole.parent)
        )
        principal_count = await _count(
            db, select(func.count(User.id)).where(User.school_id == s.id, User.role == UserRole.principal)
        )
        secretary_count = await _count(
            db, select(func.count(User.id)).where(User.school_id == s.id, User.role == UserRole.secretary)
        )
        nurse_count = await _count(
            db, select(func.count(User.id)).where(User.school_id == s.id, User.role == UserRole.nurse)
        )
        canteen_count = await _count(
            db, select(func.count(User.id)).where(User.school_id == s.id, User.role == UserRole.canteen)
        )
        driver_count = await _count(
            db, select(func.count(User.id)).where(User.school_id == s.id, User.role == UserRole.driver)
        )
        student_count = await _count(db, select(func.count(Student.id)).where(Student.school_id == s.id))
        class_count = await _count(db, select(func.count(Class.id)).where(Class.school_id == s.id))
        course_count = await _count(db, select(func.count(Course.id)).where(Course.school_id == s.id))
        active_session_count = await _count(
            db,
            select(func.count(RefreshToken.id)).where(
                RefreshToken.school_id == s.id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            ),
        )
        pending_parent_link_count = await _count(
            db,
            select(func.count(PendingLink.id)).where(
                PendingLink.school_id == s.id,
                PendingLink.status == "pending",
                PendingLink.revoked_at.is_(None),
                PendingLink.expires_at > now,
            ),
        )
        used_parent_link_count = await _count(
            db,
            select(func.count(PendingLink.id)).where(
                PendingLink.school_id == s.id,
                PendingLink.used_at.is_not(None),
            ),
        )
        grade_count = await _count(db, select(func.count(Grade.id)).where(Grade.school_id == s.id))
        approved_grade_count = await _count(
            db, select(func.count(Grade.id)).where(Grade.school_id == s.id, Grade.is_approved.is_(True))
        )
        pending_grade_count = await _count(
            db, select(func.count(Grade.id)).where(Grade.school_id == s.id, Grade.is_approved.is_(False))
        )
        attendance_count = await _count(db, select(func.count(Attendance.id)).where(Attendance.school_id == s.id))
        absence_count = await _count(
            db,
            select(func.count(Attendance.id)).where(
                Attendance.school_id == s.id,
                Attendance.status == AttendanceStatus.absent,
            ),
        )
        homework_count = await _count(db, select(func.count(Homework.id)).where(Homework.school_id == s.id))
        class_message_count = await _count(db, select(func.count(Message.id)).where(Message.school_id == s.id))
        direct_message_count = await _count(
            db, select(func.count(DirectMessage.id)).where(DirectMessage.school_id == s.id)
        )
        audit_event_count_24h = await _count(
            db,
            select(func.count(AuditEvent.id)).where(
                AuditEvent.school_id == s.id,
                AuditEvent.created_at >= last_24h,
            ),
        )
        failed_auth_count_24h = await _count(
            db,
            select(func.count(AuditEvent.id)).where(
                AuditEvent.school_id == s.id,
                AuditEvent.created_at >= last_24h,
                AuditEvent.action.in_(["auth.login_failed", "auth.refresh_failed"]),
            ),
        )
        server_error_count_24h = await _count(
            db,
            select(func.count(AuditEvent.id)).where(
                AuditEvent.school_id == s.id,
                AuditEvent.created_at >= last_24h,
                AuditEvent.status_code >= 500,
            ),
        )
        payment_count = await _count(
            db, select(func.count(SubscriptionPayment.id)).where(SubscriptionPayment.school_id == s.id)
        )
        total_revenue = float(
            await db.scalar(
                select(func.coalesce(func.sum(SubscriptionPayment.amount), 0)).where(
                    SubscriptionPayment.school_id == s.id
                )
            )
            or 0
        )
        last_payment = (
            await db.execute(
                select(SubscriptionPayment)
                .where(SubscriptionPayment.school_id == s.id)
                .order_by(SubscriptionPayment.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        last_login_at = await _max_date(
            db,
            select(func.max(AuditEvent.created_at)).where(
                AuditEvent.school_id == s.id,
                AuditEvent.action == "auth.login_success",
            ),
        )
        last_audit_at = await _max_date(
            db,
            select(func.max(AuditEvent.created_at)).where(AuditEvent.school_id == s.id),
        )
        last_class_message_at = await _max_date(
            db,
            select(func.max(Message.created_at)).where(Message.school_id == s.id),
        )
        last_direct_message_at = await _max_date(
            db,
            select(func.max(DirectMessage.created_at)).where(DirectMessage.school_id == s.id),
        )
        message_dates = [date for date in [last_class_message_at, last_direct_message_at] if date]
        last_message_at = max(message_dates) if message_dates else None
        last_grade_at = await _max_date(db, select(func.max(Grade.date)).where(Grade.school_id == s.id))
        last_attendance_at = await _max_date(db, select(func.max(Attendance.date)).where(Attendance.school_id == s.id))
        health_status, health_score = _health_status_and_score(
            school=s,
            now=now,
            server_errors=server_error_count_24h,
            failed_auth=failed_auth_count_24h,
            active_sessions=active_session_count,
        )
        role_counts = {
            "principal": principal_count,
            "secretary": secretary_count,
            "teacher": teacher_count,
            "parent": parent_count,
            "nurse": nurse_count,
            "canteen": canteen_count,
            "driver": driver_count,
        }
        config = s.tenant_config or {}
        out.append(
            SchoolAdminOut(
                id=s.id,
                name=s.name,
                student_id_prefix=s.student_id_prefix or "EDU",
                referral_code=s.referral_code,
                is_active=s.is_active,
                subscription_expires_at=_iso(s.subscription_expires_at),
                created_at=_iso(s.created_at),
                plan=str(config.get("plan") or "pro"),
                max_parents_per_student=int(config.get("max_parents_per_student") or 2),
                modules=enabled_modules(s),
                user_count=user_count,
                teacher_count=teacher_count,
                parent_count=parent_count,
                principal_count=principal_count,
                secretary_count=secretary_count,
                nurse_count=nurse_count,
                canteen_count=canteen_count,
                driver_count=driver_count,
                student_count=student_count,
                class_count=class_count,
                course_count=course_count,
                active_session_count=active_session_count,
                pending_parent_link_count=pending_parent_link_count,
                used_parent_link_count=used_parent_link_count,
                grade_count=grade_count,
                approved_grade_count=approved_grade_count,
                pending_grade_count=pending_grade_count,
                attendance_count=attendance_count,
                absence_count=absence_count,
                homework_count=homework_count,
                class_message_count=class_message_count,
                direct_message_count=direct_message_count,
                audit_event_count_24h=audit_event_count_24h,
                failed_auth_count_24h=failed_auth_count_24h,
                server_error_count_24h=server_error_count_24h,
                payment_count=payment_count,
                total_revenue=total_revenue,
                last_payment_amount=last_payment.amount if last_payment else None,
                last_payment_at=_iso(last_payment.created_at) if last_payment else None,
                last_login_at=_iso(last_login_at),
                last_audit_at=_iso(last_audit_at),
                last_message_at=_iso(last_message_at),
                last_grade_at=_iso(last_grade_at),
                last_attendance_at=_iso(last_attendance_at),
                days_until_expiry=_days_until(s.subscription_expires_at, now),
                health_status=health_status,
                health_score=health_score,
                role_counts=role_counts,
            )
        )
    return out


@router.post("/schools", status_code=status.HTTP_201_CREATED)
async def create_school_full(
    payload: SystemSchoolCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Create a school with full configuration and optional initial director account."""
    _require_system_admin(current_user)

    has_any_principal_field = any(
        [payload.principal_email, payload.principal_full_name, payload.principal_password]
    )
    if has_any_principal_field and not (
        payload.principal_email and payload.principal_full_name and payload.principal_password
    ):
        raise HTTPException(
            status_code=400,
            detail="Pour creer le compte directeur, renseignez l'email, le nom complet et le mot de passe.",
        )

    principal_email: str | None = None
    if payload.principal_email:
        principal_email = str(payload.principal_email).strip().lower()
        existing = (
            await db.execute(select(User.id).where(func.lower(User.email) == principal_email))
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="L'email du directeur est deja utilise.")

    now = datetime.now(timezone.utc)
    expires_at = _add_months(now, payload.subscription_months) if payload.subscription_months > 0 else None
    config = with_modules(
        {
            "active": payload.is_active,
            "activated_at": now.isoformat() if payload.is_active else None,
            "plan": payload.plan.strip() or "pro",
            "max_parents_per_student": payload.max_parents_per_student,
            "offline_scope": "current_trimester",
        },
        payload.modules.model_dump(),
    )

    school = School(
        name=payload.name.strip(),
        student_id_prefix=_derive_prefix(payload.name, payload.student_id_prefix),
        is_active=payload.is_active,
        subscription_expires_at=expires_at,
        referral_code=new_referral_code(),
        tenant_config=config,
    )
    db.add(school)
    await db.flush()

    for subject_name in ALGERIAN_CORE_SUBJECTS:
        db.add(Course(name=subject_name, school_id=school.id))

    year_label = school_year_label()
    for name, start_dt, end_dt, is_active_sem in algerian_trimesters():
        db.add(
            Semester(
                name=name,
                academic_year=year_label,
                start_date=start_dt,
                end_date=end_dt,
                school_id=school.id,
                is_active=is_active_sem,
            )
        )

    principal_user: User | None = None
    if principal_email and payload.principal_full_name and payload.principal_password:
        principal_user = User(
            id=str(uuid.uuid4()),
            school_id=school.id,
            email=principal_email,
            full_name=payload.principal_full_name.strip(),
            role=UserRole.principal,
            password_hash=get_password_hash(payload.principal_password),
            terms_accepted_at=now,
            terms_version=TERMS_VERSION,
        )
        db.add(principal_user)

    await record_audit_event(
        db,
        action="system.school_created",
        actor=current_user,
        school_id=school.id,
        resource_type="school",
        resource_id=school.id,
        method=request.method,
        path=request.url.path,
        metadata={
            "school_name": school.name,
            "plan": config["plan"],
            "is_active": school.is_active,
            "modules": enabled_modules(school),
            "principal_created": bool(principal_user),
        },
    )
    await db.commit()
    await db.refresh(school)

    return {
        "id": school.id,
        "name": school.name,
        "student_id_prefix": school.student_id_prefix,
        "is_active": school.is_active,
        "subscription_expires_at": _iso(school.subscription_expires_at),
        "plan": config["plan"],
        "modules": enabled_modules(school),
        "principal_id": principal_user.id if principal_user else None,
        "principal_email": principal_user.email if principal_user else None,
    }


@router.patch("/schools/{school_id}")
async def update_school(
    school_id: str,
    payload: SystemSchoolUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Update school details, modules, plan, and expiration date."""
    _require_system_admin(current_user)

    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="Etablissement introuvable.")

    fields_set = payload.model_fields_set
    config = dict(school.tenant_config or {})
    changes: dict[str, object] = {}

    if payload.name is not None:
        cleaned = payload.name.strip()
        if cleaned != school.name:
            school.name = cleaned
            changes["name"] = cleaned

    if payload.student_id_prefix is not None:
        prefix = _derive_prefix(school.name, payload.student_id_prefix)
        if prefix != school.student_id_prefix:
            school.student_id_prefix = prefix
            changes["student_id_prefix"] = prefix

    if payload.is_active is not None and payload.is_active != school.is_active:
        school.is_active = payload.is_active
        config["active"] = payload.is_active
        if payload.is_active:
            config["activated_at"] = datetime.now(timezone.utc).isoformat()
        changes["is_active"] = payload.is_active

    if "subscription_expires_at" in fields_set:
        new_expiry = _aware(payload.subscription_expires_at)
        school.subscription_expires_at = new_expiry
        changes["subscription_expires_at"] = _iso(new_expiry)

    if payload.plan is not None:
        cleaned_plan = payload.plan.strip() or "pro"
        config["plan"] = cleaned_plan
        changes["plan"] = cleaned_plan

    if payload.max_parents_per_student is not None:
        config["max_parents_per_student"] = payload.max_parents_per_student
        changes["max_parents_per_student"] = payload.max_parents_per_student

    if payload.modules is not None:
        config = with_modules(config, payload.modules.model_dump())
        changes["modules"] = payload.modules.model_dump()

    school.tenant_config = config

    await record_audit_event(
        db,
        action="system.school_updated",
        actor=current_user,
        school_id=school.id,
        resource_type="school",
        resource_id=school.id,
        method=request.method,
        path=request.url.path,
        metadata={"school_name": school.name, "changes": changes},
    )
    await db.commit()
    await db.refresh(school)

    return {
        "status": "success",
        "id": school.id,
        "name": school.name,
        "student_id_prefix": school.student_id_prefix,
        "is_active": school.is_active,
        "subscription_expires_at": _iso(school.subscription_expires_at),
        "plan": config.get("plan", "pro"),
        "max_parents_per_student": int(config.get("max_parents_per_student") or 2),
        "modules": enabled_modules(school),
    }


@router.delete("/schools/{school_id}")
async def delete_school(
    school_id: str,
    request: Request,
    confirm_name: str = Query(..., min_length=1, max_length=255),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Permanently delete a school and all its users/data after name confirmation."""
    _require_system_admin(current_user)

    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="Etablissement introuvable.")

    if confirm_name.strip().casefold() != school.name.strip().casefold():
        raise HTTPException(
            status_code=400,
            detail="Le nom de confirmation ne correspond pas a l'etablissement.",
        )

    school_name = school.name
    school_user_ids = list(
        (
            await db.execute(
                select(User.id).where(
                    User.school_id == school_id,
                    User.role != UserRole.system_admin,
                )
            )
        ).scalars().all()
    )

    # Record platform-level audit event (school_id=None so it is preserved after deletion).
    await record_audit_event(
        db,
        action="system.school_deleted",
        actor=current_user,
        school_id=None,
        resource_type="school",
        resource_id=school_id,
        method=request.method,
        path=request.url.path,
        metadata={"school_name": school_name, "deleted_users": len(school_user_ids)},
    )

    # Delete School first so all ON DELETE CASCADE child rows (including messages) are removed cleanly.
    await db.execute(delete(School).where(School.id == school_id))
    if school_user_ids:
        await db.execute(delete(User).where(User.id.in_(school_user_ids)))

    await db.commit()
    return {
        "status": "deleted",
        "school_id": school_id,
        "deleted_users": len(school_user_ids),
        "message": f"Etablissement {school_name} supprime definitivement.",
    }


@router.post("/schools/{school_id}/activate")
async def activate_school(
    school_id: str,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Activate a school (e.g. after verifying payment)."""
    _require_system_admin(current_user)

    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school.is_active = True
    config = dict(school.tenant_config) if school.tenant_config else {}
    config.update({"active": True, "activated_at": datetime.now(timezone.utc).isoformat()})
    school.tenant_config = config
    applied = await apply_activation_benefits(db, school)
    if request is not None:
        await record_audit_event(
            db,
            action="system.school_activated",
            actor=current_user,
            school_id=school.id,
            resource_type="school",
            resource_id=school.id,
            method=request.method,
            path=request.url.path,
            metadata={"school_name": school.name, **applied},
        )
    await db.commit()

    message = "École activée avec succès"
    if applied.get("trial_until"):
        message += f" — premier trimestre offert jusqu'au {applied['trial_until'][:10]}"
    if applied.get("referral_reward_months"):
        message += f" — parrainage par {applied['sponsor']} : {applied['referral_reward_months']} mois offerts aux deux écoles"
    return {"status": "success", "message": message, **applied}


@router.post("/schools/{school_id}/deactivate")
async def deactivate_school(
    school_id: str,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Deactivate a school."""
    _require_system_admin(current_user)

    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school.is_active = False
    config = dict(school.tenant_config) if school.tenant_config else {}
    config["active"] = False
    school.tenant_config = config
    if request is not None:
        await record_audit_event(
            db,
            action="system.school_deactivated",
            actor=current_user,
            school_id=school.id,
            resource_type="school",
            resource_id=school.id,
            method=request.method,
            path=request.url.path,
            metadata={"school_name": school.name},
        )
    await db.commit()

    return {"status": "success", "message": "École suspendue."}


@router.get("/schools/{school_id}/payments", response_model=list[SubscriptionPaymentOut])
async def list_school_payments(
    school_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: List subscription payment history for a school."""
    _require_system_admin(current_user)

    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="Etablissement introuvable.")

    payments = (
        await db.execute(
            select(SubscriptionPayment)
            .where(SubscriptionPayment.school_id == school_id)
            .order_by(SubscriptionPayment.created_at.desc())
        )
    ).scalars().all()

    return [
        SubscriptionPaymentOut(
            id=p.id,
            school_id=p.school_id,
            amount=float(p.amount),
            months_added=int(p.months_added),
            payment_method=p.payment_method,
            notes=p.notes,
            created_at=p.created_at.isoformat(),
        )
        for p in payments
    ]


@router.delete("/schools/{school_id}/payments/{payment_id}")
async def delete_school_payment(
    school_id: str,
    payment_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Delete an erroneous subscription payment record."""
    _require_system_admin(current_user)

    payment = await db.get(SubscriptionPayment, payment_id)
    if not payment or payment.school_id != school_id:
        raise HTTPException(status_code=404, detail="Paiement introuvable.")

    amount = float(payment.amount)
    months_added = int(payment.months_added)
    await db.delete(payment)
    await record_audit_event(
        db,
        action="system.payment_deleted",
        actor=current_user,
        school_id=school_id,
        resource_type="subscription_payment",
        resource_id=payment_id,
        method=request.method,
        path=request.url.path,
        metadata={"amount": amount, "months_added": months_added},
    )
    await db.commit()
    return {"status": "deleted", "payment_id": payment_id}


@router.post("/schools/{school_id}/subscription")
async def add_subscription_payment(
    school_id: str,
    payload: SubscriptionPaymentRequest,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Add a subscription payment (e.g. cash) for a school."""
    _require_system_admin(current_user)

    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="Établissement introuvable.")

    payment = SubscriptionPayment(
        school_id=school_id,
        amount=payload.amount,
        months_added=payload.months_added,
        payment_method=payload.payment_method,
        notes=payload.notes,
    )
    db.add(payment)

    now = datetime.now(timezone.utc)
    current_expiry = _aware(school.subscription_expires_at)
    if not current_expiry or current_expiry < now:
        current_expiry = now

    new_expiry = _add_months(current_expiry, payload.months_added)

    school.subscription_expires_at = new_expiry
    school.is_active = True
    config = dict(school.tenant_config) if school.tenant_config else {}
    config.update({"active": True, "last_payment_at": now.isoformat()})
    school.tenant_config = config

    if request is not None:
        await record_audit_event(
            db,
            action="system.subscription_payment_added",
            actor=current_user,
            school_id=school.id,
            resource_type="subscription_payment",
            resource_id=payment.id,
            method=request.method,
            path=request.url.path,
            metadata={
                "school_name": school.name,
                "amount": payload.amount,
                "months_added": payload.months_added,
                "payment_method": payload.payment_method,
                "new_expiry": new_expiry.isoformat(),
            },
        )
    await db.commit()
    await db.refresh(school)

    return {
        "status": "success",
        "message": f"Paiement de {payload.amount} enregistré. Abonnement prolongé jusqu'au {new_expiry.strftime('%Y-%m-%d')}.",
        "new_expiry": new_expiry.isoformat(),
    }


@router.post("/schools/{school_id}/revoke-sessions")
async def revoke_school_sessions(
    school_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Force sign-out of all users belonging to a school."""
    _require_system_admin(current_user)

    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="Etablissement introuvable.")

    updated_users = await db.execute(
        update(User)
        .where(User.school_id == school_id)
        .values(token_version=func.coalesce(User.token_version, 0) + 1)
    )
    deleted_tokens = await db.execute(delete(RefreshToken).where(RefreshToken.school_id == school_id))

    affected_users = int(updated_users.rowcount or 0)
    revoked_tokens = int(deleted_tokens.rowcount or 0)

    await record_audit_event(
        db,
        action="system.school_sessions_revoked",
        actor=current_user,
        school_id=school_id,
        resource_type="school",
        resource_id=school_id,
        method=request.method,
        path=request.url.path,
        metadata={
            "school_name": school.name,
            "affected_users": affected_users,
            "revoked_tokens": revoked_tokens,
        },
    )
    await db.commit()
    return {
        "status": "success",
        "affected_users": affected_users,
        "revoked_tokens": revoked_tokens,
        "message": "Toutes les sessions de l'etablissement ont ete revoquees.",
    }


@router.post("/schools/{school_id}/impersonate", response_model=SchoolImpersonationOut)
async def impersonate_school(
    school_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Start a short-lived (30 min) principal inspection session for a school."""
    _require_system_admin(current_user)

    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="Etablissement introuvable.")

    minutes = 30
    access_token = create_impersonation_token(current_user, school, minutes=minutes)

    await record_audit_event(
        db,
        action="system.school_impersonation_started",
        actor=current_user,
        school_id=school.id,
        resource_type="school",
        resource_id=school.id,
        method=request.method,
        path=request.url.path,
        metadata={"school_name": school.name, "expires_in_minutes": minutes},
    )
    await db.commit()

    return SchoolImpersonationOut(
        access_token=access_token,
        expires_in_minutes=minutes,
        school_id=school.id,
        school_name=school.name,
    )
