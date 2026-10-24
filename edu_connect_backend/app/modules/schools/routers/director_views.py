"""Director views: a teacher's history and a student's complete file."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_event
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import (
    Attendance,
    AttendanceStatus,
    AuditEvent,
    Class,
    ClassCourse,
    ClassMember,
    Course,
    Grade,
    Homework,
    LessonEntry,
    Remark,
    Semester,
    Student,
    StudentParent,
    User,
    UserRole,
)
from app.modules.academics.averages import load_grade_coefficients, weighted_averages_by_group
from app.modules.health.models import StudentHealthRecord
from app.modules.health.routers.health import _out as health_out
from app.modules.reports.models import ReportCard

router = APIRouter(prefix="/admin", tags=["Director views"])

ADMIN_ROLES = {UserRole.principal, UserRole.secretary}
CORRECTION_ACTIONS = ("grade.updated", "grade.deleted", "attendance.corrected", "homework.updated",
                      "homework.deleted", "lesson.updated", "lesson.deleted")


def _require_admin(user: User) -> str:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Reserve a l'administration de l'etablissement.")
    if not user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")
    return user.school_id


async def _count(db: AsyncSession, stmt) -> int:
    return (await db.execute(stmt)).scalar_one() or 0


@router.get("/teachers/{teacher_id}/history")
async def teacher_history(
    teacher_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """What a teacher did over the last ``days`` days, plus their assignments."""
    school_id = _require_admin(current_user)
    teacher = await db.get(User, teacher_id)
    if not teacher or teacher.school_id != school_id or teacher.role != UserRole.teacher:
        raise HTTPException(status_code=404, detail="Enseignant introuvable.")
    since = datetime.now(timezone.utc) - timedelta(days=days)

    assignments = (
        await db.execute(
            select(Class.name, Course.name)
            .join(ClassCourse, ClassCourse.class_id == Class.id)
            .join(Course, Course.id == ClassCourse.course_id)
            .where(ClassCourse.school_id == school_id, ClassCourse.teacher_id == teacher_id)
            .order_by(Class.name, Course.name)
        )
    ).all()
    last_sign_in = (
        await db.execute(
            select(func.max(AuditEvent.created_at)).where(
                AuditEvent.school_id == school_id,
                AuditEvent.actor_id == teacher_id,
                AuditEvent.action == "auth.login_success",
            )
        )
    ).scalar_one()

    stats = {
        "grades_entered": await _count(db, select(func.count()).select_from(Grade).where(
            Grade.school_id == school_id, Grade.created_by == teacher_id, Grade.date >= since)),
        "grades_pending_approval": await _count(db, select(func.count()).select_from(Grade).where(
            Grade.school_id == school_id, Grade.created_by == teacher_id, Grade.is_approved.is_(False))),
        "attendance_records": await _count(db, select(func.count()).select_from(Attendance).where(
            Attendance.school_id == school_id, Attendance.recorded_by == teacher_id, Attendance.date >= since)),
        "homework_posted": await _count(db, select(func.count()).select_from(Homework).where(
            Homework.school_id == school_id, Homework.created_by == teacher_id, Homework.created_at >= since)),
        "lessons_logged": await _count(db, select(func.count()).select_from(LessonEntry).where(
            LessonEntry.school_id == school_id, LessonEntry.teacher_id == teacher_id, LessonEntry.created_at >= since)),
        "corrections": await _count(db, select(func.count()).select_from(AuditEvent).where(
            AuditEvent.school_id == school_id, AuditEvent.actor_id == teacher_id,
            AuditEvent.action.in_(CORRECTION_ACTIONS), AuditEvent.created_at >= since)),
        "failed_sign_ins": await _count(db, select(func.count()).select_from(AuditEvent).where(
            AuditEvent.school_id == school_id, AuditEvent.resource_id == teacher_id,
            AuditEvent.action == "auth.login_failed", AuditEvent.created_at >= since)),
    }
    recent = (
        await db.execute(
            select(AuditEvent)
            .where(
                AuditEvent.school_id == school_id,
                AuditEvent.actor_id == teacher_id,
                AuditEvent.action.not_like("http.%"),
                AuditEvent.created_at >= since,
            )
            .order_by(AuditEvent.created_at.desc())
            .limit(30)
        )
    ).scalars().all()

    return {
        "teacher": {
            "id": teacher.id,
            "full_name": teacher.full_name,
            "email": teacher.email,
            "deactivated_at": teacher.deactivated_at,
            "last_sign_in": last_sign_in,
        },
        "days": days,
        "assignments": [{"class_name": row[0], "subject": row[1]} for row in assignments],
        "stats": stats,
        "recent_activity": [
            {"action": event.action, "created_at": event.created_at, "resource_type": event.resource_type,
             "details": event.event_metadata or {}}
            for event in recent
        ],
    }


@router.get("/students/{student_id}/file")
async def student_file(
    student_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Everything the school holds about one student, for the administration."""
    school_id = _require_admin(current_user)
    student = await db.get(Student, student_id)
    if not student or student.school_id != school_id:
        raise HTTPException(status_code=404, detail="Eleve introuvable.")

    classes = (
        await db.execute(
            select(Class.id, Class.name)
            .join(ClassMember, ClassMember.class_id == Class.id)
            .where(ClassMember.student_id == student_id, ClassMember.school_id == school_id)
            .order_by(Class.name)
        )
    ).all()
    parents = (
        await db.execute(
            select(User.id, User.full_name, User.email, User.phone)
            .join(StudentParent, StudentParent.parent_id == User.id)
            .where(StudentParent.student_id == student_id, StudentParent.school_id == school_id)
            .order_by(User.full_name)
        )
    ).all()

    active = (
        await db.execute(
            select(Semester).where(Semester.school_id == school_id, Semester.is_active.is_(True)).limit(1)
        )
    ).scalar_one_or_none()
    grade_stmt = select(Grade).where(
        Grade.school_id == school_id, Grade.student_id == student_id, Grade.is_approved.is_(True)
    )
    attendance_stmt = select(Attendance.status, Attendance.is_justified).where(
        Attendance.school_id == school_id, Attendance.student_id == student_id
    )
    if active is not None:
        start = datetime.combine(active.start_date.date(), datetime.min.time(), tzinfo=timezone.utc)
        end = datetime.combine(active.end_date.date() + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
        grade_stmt = grade_stmt.where(Grade.date >= start, Grade.date < end)
        attendance_stmt = attendance_stmt.where(Attendance.date >= start, Attendance.date < end)
    grades = (await db.execute(grade_stmt)).scalars().all()
    coefficients = await load_grade_coefficients(db, grades)
    class_averages = weighted_averages_by_group(grades, coefficients, lambda grade: grade.class_id)
    subject_averages = weighted_averages_by_group(grades, coefficients, lambda grade: grade.subject or "-")

    attendance = {"absences": 0, "justified_absences": 0, "lates": 0, "records": 0}
    for status, justified in (await db.execute(attendance_stmt)).all():
        attendance["records"] += 1
        if status == AttendanceStatus.absent:
            attendance["absences"] += 1
            attendance["justified_absences"] += 1 if justified else 0
        elif status == AttendanceStatus.late:
            attendance["lates"] += 1

    remarks = (
        await db.execute(
            select(Remark).where(Remark.school_id == school_id, Remark.student_id == student_id)
            .order_by(Remark.date.desc()).limit(10)
        )
    ).scalars().all()
    report_cards = (
        await db.execute(
            select(ReportCard).where(ReportCard.school_id == school_id, ReportCard.student_id == student_id)
            .order_by(ReportCard.published_at.desc())
        )
    ).scalars().all()

    health = await db.get(StudentHealthRecord, student_id)
    if health is not None:
        await record_audit_event(
            db,
            action="health.viewed",
            actor=current_user,
            school_id=school_id,
            resource_type="student",
            resource_id=student_id,
            method=request.method,
            path=request.url.path,
            metadata={"via": "student_file"},
        )
        await db.commit()

    class_names = {row[0]: row[1] for row in classes}
    return {
        "student": {
            "id": student.id,
            "full_name": student.full_name,
            "student_number": student.student_id,
            "archived_at": student.archived_at,
            "archive_reason": student.archive_reason,
            "created_at": student.created_at,
        },
        "classes": [{"id": row[0], "name": row[1]} for row in classes],
        "parents": [{"id": row[0], "full_name": row[1], "email": row[2], "phone": row[3]} for row in parents],
        "term": {"id": active.id, "name": active.name} if active else None,
        "averages": {
            "by_class": [
                {"class_name": class_names.get(class_id, class_id), "average": round(value, 2)}
                for class_id, value in class_averages.items()
            ],
            "by_subject": sorted(
                ({"subject": subject, "average": round(value, 2)} for subject, value in subject_averages.items()),
                key=lambda item: item["subject"],
            ),
        },
        "attendance": attendance,
        "remarks": [
            {"date": remark.date, "title": remark.title, "content": remark.content,
             "type": remark.type.value if hasattr(remark.type, "value") else remark.type}
            for remark in remarks
        ],
        "report_cards": [
            {"id": card.id, "semester_name": card.data.get("semester_name"), "overall_average": card.overall_average,
             "rank": card.rank, "class_size": card.class_size, "published_at": card.published_at}
            for card in report_cards
        ],
        "health": health_out(student_id, health).model_dump(),
    }
