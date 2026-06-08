from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field

import calendar
from datetime import datetime, timezone, timedelta
from app.db.database import get_db
from app.models import (
    AuditEvent,
    Attendance,
    AttendanceStatus,
    Class,
    Course,
    DirectMessage,
    Grade,
    Homework,
    Message,
    PendingLink,
    RefreshToken,
    School,
    Student,
    SubscriptionPayment,
    User,
    UserRole,
)
from app.core.security import get_current_user

router = APIRouter(prefix="/system", tags=["System Administration"])


class SchoolAdminOut(BaseModel):
    id: str
    name: str
    is_active: bool
    subscription_expires_at: str | None = None
    created_at: str | None = None
    user_count: int = 0
    teacher_count: int = 0
    parent_count: int = 0
    principal_count: int = 0
    secretary_count: int = 0
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
    db: AsyncSession = Depends(get_db)
):
    """SuperAdmin only: List all schools."""
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Unprivileged")
        
    result = await db.execute(select(School).order_by(School.created_at.desc()))
    schools = result.scalars().all()
    
    out = []
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    for s in schools:
        user_count = await _count(db,
            select(func.count(User.id)).where(User.school_id == s.id)
        )
        teacher_count = await _count(db,
            select(func.count(User.id)).where(User.school_id == s.id, User.role == UserRole.teacher)
        )
        parent_count = await _count(db,
            select(func.count(User.id)).where(User.school_id == s.id, User.role == UserRole.parent)
        )
        principal_count = await _count(db,
            select(func.count(User.id)).where(User.school_id == s.id, User.role == UserRole.principal)
        )
        secretary_count = await _count(db,
            select(func.count(User.id)).where(User.school_id == s.id, User.role == UserRole.secretary)
        )
        student_count = await _count(db,
            select(func.count(Student.id)).where(Student.school_id == s.id)
        )
        class_count = await _count(db,
            select(func.count(Class.id)).where(Class.school_id == s.id)
        )
        course_count = await _count(db,
            select(func.count(Course.id)).where(Course.school_id == s.id)
        )
        active_session_count = await _count(db,
            select(func.count(RefreshToken.id)).where(
                RefreshToken.school_id == s.id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
        )
        pending_parent_link_count = await _count(db,
            select(func.count(PendingLink.id)).where(
                PendingLink.school_id == s.id,
                PendingLink.status == "pending",
                PendingLink.revoked_at.is_(None),
                PendingLink.expires_at > now,
            )
        )
        used_parent_link_count = await _count(db,
            select(func.count(PendingLink.id)).where(
                PendingLink.school_id == s.id,
                PendingLink.used_at.is_not(None),
            )
        )
        grade_count = await _count(db,
            select(func.count(Grade.id)).where(Grade.school_id == s.id)
        )
        approved_grade_count = await _count(db,
            select(func.count(Grade.id)).where(Grade.school_id == s.id, Grade.is_approved.is_(True))
        )
        pending_grade_count = await _count(db,
            select(func.count(Grade.id)).where(Grade.school_id == s.id, Grade.is_approved.is_(False))
        )
        attendance_count = await _count(db,
            select(func.count(Attendance.id)).where(Attendance.school_id == s.id)
        )
        absence_count = await _count(db,
            select(func.count(Attendance.id)).where(
                Attendance.school_id == s.id,
                Attendance.status == AttendanceStatus.absent,
            )
        )
        homework_count = await _count(db,
            select(func.count(Homework.id)).where(Homework.school_id == s.id)
        )
        class_message_count = await _count(db,
            select(func.count(Message.id)).where(Message.school_id == s.id)
        )
        direct_message_count = await _count(db,
            select(func.count(DirectMessage.id)).where(DirectMessage.school_id == s.id)
        )
        audit_event_count_24h = await _count(db,
            select(func.count(AuditEvent.id)).where(
                AuditEvent.school_id == s.id,
                AuditEvent.created_at >= last_24h,
            )
        )
        failed_auth_count_24h = await _count(db,
            select(func.count(AuditEvent.id)).where(
                AuditEvent.school_id == s.id,
                AuditEvent.created_at >= last_24h,
                AuditEvent.action.in_(["auth.login_failed", "auth.refresh_failed"]),
            )
        )
        server_error_count_24h = await _count(db,
            select(func.count(AuditEvent.id)).where(
                AuditEvent.school_id == s.id,
                AuditEvent.created_at >= last_24h,
                AuditEvent.status_code >= 500,
            )
        )
        payment_count = await _count(db,
            select(func.count(SubscriptionPayment.id)).where(SubscriptionPayment.school_id == s.id)
        )
        total_revenue = float(await db.scalar(
            select(func.coalesce(func.sum(SubscriptionPayment.amount), 0)).where(SubscriptionPayment.school_id == s.id)
        ) or 0)
        last_payment = (
            await db.execute(
                select(SubscriptionPayment)
                .where(SubscriptionPayment.school_id == s.id)
                .order_by(SubscriptionPayment.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        last_login_at = await _max_date(db,
            select(func.max(AuditEvent.created_at)).where(
                AuditEvent.school_id == s.id,
                AuditEvent.action == "auth.login_success",
            )
        )
        last_audit_at = await _max_date(db,
            select(func.max(AuditEvent.created_at)).where(AuditEvent.school_id == s.id)
        )
        last_class_message_at = await _max_date(db,
            select(func.max(Message.created_at)).where(Message.school_id == s.id)
        )
        last_direct_message_at = await _max_date(db,
            select(func.max(DirectMessage.created_at)).where(DirectMessage.school_id == s.id)
        )
        message_dates = [date for date in [last_class_message_at, last_direct_message_at] if date]
        last_message_at = max(message_dates) if message_dates else None
        last_grade_at = await _max_date(db,
            select(func.max(Grade.date)).where(Grade.school_id == s.id)
        )
        last_attendance_at = await _max_date(db,
            select(func.max(Attendance.date)).where(Attendance.school_id == s.id)
        )
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
        }
        out.append(SchoolAdminOut(
            id=s.id,
            name=s.name,
            is_active=s.is_active,
            subscription_expires_at=_iso(s.subscription_expires_at),
            created_at=_iso(s.created_at),
            user_count=user_count,
            teacher_count=teacher_count,
            parent_count=parent_count,
            principal_count=principal_count,
            secretary_count=secretary_count,
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
        ))
    return out


@router.post("/schools/{school_id}/activate")
async def activate_school(
    school_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """SuperAdmin only: Activate a school (e.g. after verifying payment)."""
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Unprivileged")
        
    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    school.is_active = True
    config = dict(school.tenant_config) if school.tenant_config else {}
    config.update({"active": True, "activated_at": datetime.now(timezone.utc).isoformat()})
    school.tenant_config = config
    await db.commit()
    
    return {"status": "success", "message": "École activée avec succès"}


@router.post("/schools/{school_id}/deactivate")
async def deactivate_school(
    school_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """SuperAdmin only: Deactivate a school."""
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Unprivileged")
        
    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    school.is_active = False
    config = dict(school.tenant_config) if school.tenant_config else {}
    config["active"] = False
    school.tenant_config = config
    await db.commit()
    
    return {"status": "success", "message": "École suspendue."}

class SubscriptionPaymentRequest(BaseModel):
    amount: float
    months_added: int
    payment_method: str = "cash"
    notes: str | None = None

@router.post("/schools/{school_id}/subscription")
async def add_subscription_payment(
    school_id: str,
    payload: SubscriptionPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """SuperAdmin only: Add a subscription payment (e.g. cash) for a school."""
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Unprivileged")

    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="Établissement introuvable.")

    payment = SubscriptionPayment(
        school_id=school_id,
        amount=payload.amount,
        months_added=payload.months_added,
        payment_method=payload.payment_method,
        notes=payload.notes
    )
    db.add(payment)

    # Extend subscription date manually to avoid dateutil dependency
    now = datetime.now(timezone.utc)
    current_expiry = school.subscription_expires_at
    if not current_expiry or current_expiry < now:
        current_expiry = now

    new_month = current_expiry.month + payload.months_added - 1
    new_year = current_expiry.year + new_month // 12
    new_month = new_month % 12 + 1
    
    # Handle end of month issues (e.g. Jan 31 -> Feb 28)
    max_days = calendar.monthrange(new_year, new_month)[1]
    new_day = min(current_expiry.day, max_days)
    
    new_expiry = current_expiry.replace(year=new_year, month=new_month, day=new_day)
    
    school.subscription_expires_at = new_expiry
    school.is_active = True
    config = dict(school.tenant_config) if school.tenant_config else {}
    config.update({"active": True, "last_payment_at": now.isoformat()})
    school.tenant_config = config

    await db.commit()
    await db.refresh(school)

    return {
        "status": "success", 
        "message": f"Paiement de {payload.amount} enregistré. Abonnement prolongé jusqu'au {new_expiry.strftime('%Y-%m-%d')}.",
        "new_expiry": new_expiry.isoformat()
    }
