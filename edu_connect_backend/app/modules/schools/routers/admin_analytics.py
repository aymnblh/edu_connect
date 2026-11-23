"""Director analytics overview and early-warning insights endpoints."""
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

router = APIRouter()


def _whole_days(start: datetime, end: datetime) -> tuple[datetime, datetime]:
    return (
        datetime.combine(start.date(), datetime.min.time(), tzinfo=timezone.utc),
        datetime.combine(end.date() + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc),
    )


async def _term_averages(db: AsyncSession, school_id: str, semester: Semester | None) -> dict[tuple[str, str], float]:
    """Weighted average per (student, class) from approved grades dated in the term."""
    if semester is None:
        return {}
    start, end = _whole_days(semester.start_date, semester.end_date)
    grades = (
        await db.execute(
            select(Grade).where(
                Grade.school_id == school_id,
                Grade.is_approved == True,
                Grade.date >= start,
                Grade.date < end,
            )
        )
    ).scalars().all()
    coefficients = await load_grade_coefficients(db, grades)
    return weighted_averages_by_group(grades, coefficients, lambda grade: (grade.student_id, grade.class_id))


@router.get("/analytics/insights")
async def analytics_insights(
    semester_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Early warning for the director: students at risk, attendance trend, pending work."""
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Unprivileged")
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    semesters = (
        await db.execute(select(Semester).where(Semester.school_id == school_id).order_by(Semester.start_date))
    ).scalars().all()
    now = datetime.now(timezone.utc)
    current = None
    if semester_id:
        current = next((item for item in semesters if item.id == semester_id), None)
        if current is None:
            raise HTTPException(status_code=404, detail="Trimestre introuvable.")
    else:
        started = [item for item in semesters if item.start_date.replace(tzinfo=item.start_date.tzinfo or timezone.utc) <= now]
        current = next((item for item in semesters if item.is_active), None) or (started[-1] if started else None)
    previous = None
    if current is not None:
        earlier = [item for item in semesters if item.start_date < current.start_date]
        previous = earlier[-1] if earlier else None

    class_names = dict(
        (await db.execute(select(Class.id, Class.name).where(Class.school_id == school_id))).all()
    )
    students = {
        (row[0], row[1]): row[2]
        for row in (
            await db.execute(
                select(ClassMember.student_id, ClassMember.class_id, Student.full_name)
                .join(Student, Student.id == ClassMember.student_id)
                .where(
                    ClassMember.school_id == school_id,
                    Student.school_id == school_id,
                    Student.archived_at.is_(None),
                )
            )
        ).all()
    }
    current_averages = await _term_averages(db, school_id, current)
    previous_averages = await _term_averages(db, school_id, previous)

    today = datetime.now(ALGERIA_TZ).date()
    window_start = week_start(today) - timedelta(weeks=11)
    term_start, term_end = _whole_days(current.start_date, current.end_date) if current else (None, None)
    fetch_from = datetime.combine(
        min(window_start, term_start.date()) if term_start else window_start,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )
    facts = [
        AttendanceFact(
            student_id=row[0],
            class_id=row[1],
            day=row[2].date(),
            status=row[3].value if hasattr(row[3], "value") else str(row[3]),
            is_justified=bool(row[4]),
        )
        for row in (
            await db.execute(
                select(
                    Attendance.student_id,
                    Attendance.class_id,
                    Attendance.date,
                    Attendance.status,
                    Attendance.is_justified,
                ).where(Attendance.school_id == school_id, Attendance.date >= fetch_from)
            )
        ).all()
    ]
    recent_from = today - timedelta(days=30)
    recent = [fact for fact in facts if fact.day >= recent_from]
    term_facts = (
        [fact for fact in facts if term_start.date() <= fact.day < term_end.date()] if term_start else []
    )

    pending_approvals = (
        await db.execute(
            select(func.count()).select_from(Grade).where(Grade.school_id == school_id, Grade.is_approved == False)
        )
    ).scalar_one()

    return {
        "semester": {"id": current.id, "name": current.name} if current else None,
        "previous_semester": {"id": previous.id, "name": previous.name} if previous else None,
        "semesters": [{"id": item.id, "name": item.name} for item in semesters],
        "attendance_weeks": attendance_weeks(
            [fact for fact in facts if fact.day >= window_start], today=today, weeks=12
        ),
        "class_attendance": class_attendance(term_facts, class_names),
        "at_risk": students_at_risk(
            students=students,
            class_names=class_names,
            current_averages=current_averages,
            previous_averages=previous_averages,
            recent_facts=recent,
        ),
        "pending_grade_approvals": pending_approvals,
        "unjustified_absences_30d": sum(1 for fact in recent if fact.status == "absent" and not fact.is_justified),
        "thresholds": {
            "low_average": LOW_AVERAGE,
            "average_drop": AVERAGE_DROP,
            "unjustified_absences_30d": UNJUSTIFIED_ABSENCES_30D,
            "lates_30d": LATES_30D,
        },
    }


@router.get("/analytics/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    SaaS Dashboard Analytics:
    - Global school average
    - Class-by-class averages
    - Parent adoption rate
    """
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")

    school_id = current_user.school_id

    approved_grade_rows = await db.execute(
        select(Grade, Student.full_name, Class.name.label("class_name"))
        .join(Student, Student.id == Grade.student_id)
        .join(Class, Class.id == Grade.class_id)
        .where(
            Student.school_id == school_id,
            Class.school_id == school_id,
            Grade.school_id == school_id,
            Student.archived_at.is_(None),
            Grade.is_approved == True,
        )
    )
    approved_rows = approved_grade_rows.all()
    approved_grades = [row[0] for row in approved_rows]
    grade_coefficients = await load_grade_coefficients(db, approved_grades)

    class_names = {grade.class_id: class_name for grade, _, class_name in approved_rows}
    student_names = {
        (grade.student_id, grade.class_id): full_name or grade.student_name
        for grade, full_name, _ in approved_rows
    }

    student_class_averages = weighted_averages_by_group(
        approved_grades,
        grade_coefficients,
        lambda grade: (grade.student_id, grade.class_id),
    )
    school_avg = (
        sum(student_class_averages.values()) / len(student_class_averages)
        if student_class_averages
        else 0.0
    )

    class_average_scores: dict[str, list[float]] = defaultdict(list)
    for (_, class_id), average in student_class_averages.items():
        class_average_scores[class_id].append(average)

    class_performance = [
        {
            "class_name": class_names.get(class_id, class_id),
            "average_score": round(sum(scores) / len(scores), 2),
        }
        for class_id, scores in class_average_scores.items()
        if scores
    ]
    class_performance.sort(key=lambda item: item["average_score"], reverse=True)

    # 3. Adoption Rate (Students with >=1 parent / Total students)
    total_students_stmt = select(func.count(Student.id)).where(
        Student.school_id == school_id,
        Student.archived_at.is_(None),
    )
    total_res = await db.execute(total_students_stmt)
    total_count = total_res.scalar() or 1 # Avoid division by zero

    linked_students_stmt = (
        select(func.count(func.distinct(StudentParent.student_id)))
        .join(Student, Student.id == StudentParent.student_id)
        .where(
            StudentParent.school_id == school_id,
            Student.school_id == school_id,
            Student.archived_at.is_(None),
        )
    )
    linked_res = await db.execute(linked_students_stmt)
    linked_count = linked_res.scalar() or 0

    adoption_rate = (linked_count / total_count) * 100

    subject_scores: dict[str, list[float]] = defaultdict(list)
    for grade in approved_grades:
        if grade.subject:
            subject_scores[grade.subject].append(grade_score_on_twenty(grade))
    subject_performance = [
        {"subject": subject, "average_score": round(sum(scores) / len(scores), 2)}
        for subject, scores in subject_scores.items()
        if scores
    ]
    subject_performance.sort(key=lambda item: item["average_score"], reverse=True)

    student_rankings = [
        {
            "student_id": student_id,
            "student_name": student_names.get((student_id, class_id), ""),
            "class_name": class_names.get(class_id, class_id),
            "average_score": round(average, 2),
        }
        for (student_id, class_id), average in student_class_averages.items()
    ]
    student_rankings.sort(key=lambda item: item["average_score"], reverse=True)

    top_students = student_rankings[:5]
    struggling_students = [
        student
        for student in sorted(student_rankings, key=lambda item: item["average_score"])
        if student["average_score"] < 10.0
    ][:5]

    from sqlalchemy import case, Integer
    # 6. Absence Rate (Absent count / Total attendances * 100)
    att_stmt = select(
        func.count(Attendance.id).label("total"),
        func.sum(
            case(
                # Late arrivals are not absences.
                (Attendance.status == AttendanceStatus.absent, 1),
                else_=0
            )
        ).label("absences")
    ).where(Attendance.school_id == school_id)
    att_res = await db.execute(att_stmt)
    att_row = att_res.first()
    
    absence_rate = 0.0
    if att_row and att_row.total and att_row.total > 0:
        absences = att_row.absences or 0
        absence_rate = (absences / att_row.total) * 100

    return {
        "school_avg": round(school_avg, 2),
        "class_performance": class_performance,
        "adoption_rate": round(adoption_rate, 1),
        "subject_performance": subject_performance,
        "top_students": top_students,
        "struggling_students": struggling_students,
        "absence_rate": round(absence_rate, 2)
    }
