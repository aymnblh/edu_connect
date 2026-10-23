"""The director's monthly report: what the platform did for the school this month.

Every figure is counted from real records (attendance, notifications, audit
trail...) for one calendar month in Algeria time, next to the month before.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rls import set_request_rls_context
from app.db.database import AsyncSessionLocal
from app.models import (
    Attendance,
    AuditEvent,
    Class,
    DirectMessage,
    Grade,
    Homework,
    LessonEntry,
    Message,
    Notification,
    School,
    Student,
    StudentParent,
    TuitionPayment,
    User,
    UserRole,
)
from app.modules.announcements.models import Announcement
from app.modules.meetings.models import MeetingSlot
from app.modules.reports.models import ReportCard
from app.modules.schools.calendar import ALGERIA_TZ
from app.utils.notifications import create_notification

logger = logging.getLogger(__name__)

FRENCH_MONTHS = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]


def month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    """First instant of the month and of the next one, in Algeria time."""
    start = datetime(year, month, 1, tzinfo=ALGERIA_TZ)
    end = datetime(year + (month == 12), month % 12 + 1, 1, tzinfo=ALGERIA_TZ)
    return start, end


def previous_month(year: int, month: int) -> tuple[int, int]:
    return (year - 1, 12) if month == 1 else (year, month - 1)


def parse_month(value: str) -> tuple[int, int]:
    year, month = (int(part) for part in value.split("-"))
    if not 1 <= month <= 12:
        raise ValueError("month out of range")
    return year, month


def rate(part: int, whole: int) -> float | None:
    return round(part * 100 / whole, 1) if whole else None


async def _count(db: AsyncSession, stmt) -> int:
    return (await db.execute(stmt)).scalar_one() or 0


async def period_activity(db: AsyncSession, school_id: str, start: datetime, end: datetime) -> dict:
    """Activity counted between ``start`` (included) and ``end`` (excluded)."""
    attendance_rows = (
        await db.execute(
            select(Attendance.status, Attendance.is_justified, func.count())
            .where(Attendance.school_id == school_id, Attendance.date >= start, Attendance.date < end)
            .group_by(Attendance.status, Attendance.is_justified)
        )
    ).all()
    by_status: dict[str, int] = {}
    unjustified = 0
    for status, justified, count in attendance_rows:
        key = status.value if hasattr(status, "value") else str(status)
        by_status[key] = by_status.get(key, 0) + count
        if key == "absent" and not justified:
            unjustified += count
    records = sum(by_status.values())

    def audit_actors(role: str):
        return select(func.count(distinct(AuditEvent.actor_id))).where(
            AuditEvent.school_id == school_id,
            AuditEvent.actor_role == role,
            AuditEvent.created_at >= start,
            AuditEvent.created_at < end,
        )

    return {
        "attendance_records": records,
        "attendance_rate": rate(by_status.get("present", 0) + by_status.get("late", 0), records),
        "absences": by_status.get("absent", 0),
        "unjustified_absences": unjustified,
        "lates": by_status.get("late", 0),
        "parent_notifications": await _count(
            db,
            select(func.count())
            .select_from(Notification)
            .join(User, User.id == Notification.user_id)
            .where(
                Notification.school_id == school_id,
                User.role == UserRole.parent,
                Notification.created_at >= start,
                Notification.created_at < end,
            ),
        ),
        "active_parents": await _count(db, audit_actors(UserRole.parent.value)),
        "active_teachers": await _count(db, audit_actors(UserRole.teacher.value)),
        "grades_entered": await _count(
            db,
            select(func.count()).select_from(Grade).where(Grade.school_id == school_id, Grade.date >= start, Grade.date < end),
        ),
        "homework_posted": await _count(
            db,
            select(func.count()).select_from(Homework).where(
                Homework.school_id == school_id, Homework.created_at >= start, Homework.created_at < end
            ),
        ),
        "lessons_logged": await _count(
            db,
            select(func.count()).select_from(LessonEntry).where(
                LessonEntry.school_id == school_id, LessonEntry.session_date >= start, LessonEntry.session_date < end
            ),
        ),
        "messages": await _count(
            db,
            select(func.count()).select_from(DirectMessage).where(
                DirectMessage.school_id == school_id, DirectMessage.created_at >= start, DirectMessage.created_at < end
            ),
        )
        + await _count(
            db,
            select(func.count()).select_from(Message).where(
                Message.school_id == school_id, Message.created_at >= start, Message.created_at < end
            ),
        ),
        "announcements": await _count(
            db,
            select(func.count()).select_from(Announcement).where(
                Announcement.school_id == school_id, Announcement.created_at >= start, Announcement.created_at < end
            ),
        ),
        "report_cards": await _count(
            db,
            select(func.count()).select_from(ReportCard).where(
                ReportCard.school_id == school_id, ReportCard.published_at >= start, ReportCard.published_at < end
            ),
        ),
        "meetings_booked": await _count(
            db,
            select(func.count()).select_from(MeetingSlot).where(
                MeetingSlot.school_id == school_id, MeetingSlot.booked_at >= start, MeetingSlot.booked_at < end
            ),
        ),
        "fees_collected": round(
            float(
                await _count(
                    db,
                    select(func.coalesce(func.sum(TuitionPayment.amount), 0)).where(
                        TuitionPayment.school_id == school_id,
                        TuitionPayment.paid_at >= start,
                        TuitionPayment.paid_at < end,
                    ),
                )
            ),
            2,
        ),
    }


async def school_snapshot(db: AsyncSession, school_id: str) -> dict:
    """Head counts as they are today (they have no history)."""
    active_students = select(Student.id).where(Student.school_id == school_id, Student.archived_at.is_(None))
    return {
        "students": await _count(db, select(func.count()).select_from(active_students.subquery())),
        "students_with_parent": await _count(
            db,
            select(func.count(distinct(StudentParent.student_id))).where(
                StudentParent.school_id == school_id, StudentParent.student_id.in_(active_students)
            ),
        ),
        "linked_parents": await _count(
            db, select(func.count(distinct(StudentParent.parent_id))).where(StudentParent.school_id == school_id)
        ),
        "teachers": await _count(
            db,
            select(func.count()).select_from(User).where(
                User.school_id == school_id, User.role == UserRole.teacher, User.deactivated_at.is_(None)
            ),
        ),
    }


async def class_attendance(db: AsyncSession, school_id: str, start: datetime, end: datetime) -> list[dict]:
    rows = (
        await db.execute(
            select(Attendance.class_id, Class.name, Attendance.status, func.count())
            .join(Class, Class.id == Attendance.class_id)
            .where(Attendance.school_id == school_id, Attendance.date >= start, Attendance.date < end)
            .group_by(Attendance.class_id, Class.name, Attendance.status)
        )
    ).all()
    classes: dict[str, dict] = {}
    for class_id, name, status, count in rows:
        key = status.value if hasattr(status, "value") else str(status)
        entry = classes.setdefault(class_id, {"class_id": class_id, "class_name": name, "records": 0, "present": 0})
        entry["records"] += count
        if key in ("present", "late"):
            entry["present"] += count
    result = [
        {"class_id": item["class_id"], "class_name": item["class_name"], "attendance_rate": rate(item["present"], item["records"])}
        for item in classes.values()
    ]
    return sorted(result, key=lambda item: (-(item["attendance_rate"] or 0), item["class_name"]))


async def compute_monthly_report(db: AsyncSession, school_id: str, year: int, month: int, *, now: datetime | None = None) -> dict:
    now = now or datetime.now(ALGERIA_TZ)
    start, end = month_bounds(year, month)
    prev_start, prev_end = month_bounds(*previous_month(year, month))
    current = await period_activity(db, school_id, start, end)
    previous = await period_activity(db, school_id, prev_start, prev_end)
    snapshot = await school_snapshot(db, school_id)
    return {
        "month": f"{year:04d}-{month:02d}",
        "previous_month": prev_start.strftime("%Y-%m"),
        "is_partial": start <= now < end,
        "current": current,
        "previous": previous,
        "snapshot": snapshot,
        "parent_coverage": rate(snapshot["students_with_parent"], snapshot["students"]),
        "active_parent_rate": rate(current["active_parents"], snapshot["linked_parents"]),
        "class_attendance": await class_attendance(db, school_id, start, end),
    }


def notification_text(report: dict) -> tuple[str, str]:
    year, month = parse_month(report["month"])
    title = f"Votre bilan de {FRENCH_MONTHS[month - 1]} {year} est prêt"
    current = report["current"]
    parts = []
    if current["attendance_rate"] is not None:
        parts.append(f"présence {current['attendance_rate']:.1f} %".replace(".", ","))
    parts.append(f"{current['parent_notifications']} notifications envoyées aux parents")
    parts.append(f"{current['active_parents']} parents actifs")
    content = "Ce mois-ci : " + ", ".join(parts) + ". Ouvrez « Bilan mensuel » pour le détail et l'impression."
    return title, content


async def notify_monthly_reports(now: datetime | None = None) -> int:
    """Tell each school's directors, once, that last month's report is ready.

    Safe to run from several workers at once: each school row is locked while it
    is handled and remembers the last month it was notified for.
    """
    now = now or datetime.now(ALGERIA_TZ)
    year, month = previous_month(now.year, now.month)
    key = f"{year:04d}-{month:02d}"
    _, period_end = month_bounds(year, month)

    async with AsyncSessionLocal() as db:
        await set_request_rls_context(db, is_system_admin=True)
        candidates = [
            school_id
            for school_id, config in (
                await db.execute(select(School.id, School.tenant_config).where(School.is_active.is_(True)))
            ).all()
            if not (config or {}).get("demo_data") and (config or {}).get("monthly_report_notified") != key
        ]

    notified = 0
    for school_id in candidates:
        try:
            async with AsyncSessionLocal() as db:
                await set_request_rls_context(db, school_id=school_id, is_system_admin=True)
                school = (
                    await db.execute(select(School).where(School.id == school_id).with_for_update(skip_locked=True))
                ).scalar_one_or_none()
                if school is None or (school.tenant_config or {}).get("monthly_report_notified") == key:
                    continue
                created_at = school.created_at
                if created_at and created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                # A school that did not exist yet that month has nothing to report.
                if created_at is None or created_at < period_end:
                    report = await compute_monthly_report(db, school_id, year, month, now=now)
                    title, content = notification_text(report)
                    directors = (
                        await db.execute(
                            select(User.id).where(
                                User.school_id == school_id,
                                User.role == UserRole.principal,
                                User.deactivated_at.is_(None),
                            )
                        )
                    ).scalars().all()
                    for director_id in directors:
                        await create_notification(
                            db, user_id=director_id, title=title, content=content, type="REPORT", school_id=school_id
                        )
                    notified += 1
                school.tenant_config = {**(school.tenant_config or {}), "monthly_report_notified": key}
                await db.commit()
        except Exception:
            logger.exception("Monthly report notification failed for school %s", school_id)
    return notified
