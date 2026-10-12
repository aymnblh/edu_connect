import uuid
from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_event
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import (
    Attendance,
    Class,
    ClassCourse,
    ClassMember,
    ClassTeacher,
    Course,
    Grade,
    School,
    Semester,
    Student,
    StudentParent,
    User,
    UserRole,
)
from app.modules.academics.averages import load_grade_coefficients
from app.modules.reports.compute import AttendanceRow, CourseRow, StudentRow, build_report_cards
from app.modules.reports.models import ReportCard
from app.utils.notifications import create_notification

router = APIRouter(prefix="/report-cards", tags=["Report cards"])

ADMIN_ROLES = {UserRole.principal, UserRole.secretary}


class PublishRequest(BaseModel):
    class_id: str
    semester_id: str


class ReportCardSummary(BaseModel):
    id: str
    class_id: str
    semester_id: str
    student_id: str
    student_name: str
    class_name: str | None
    semester_name: str | None
    overall_average: float | None
    rank: int | None
    class_size: int
    published_at: datetime


class ReportCardOut(ReportCardSummary):
    data: dict


def _require_admin(user: User) -> str:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Reserve a l'administration de l'etablissement.")
    if not user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")
    return user.school_id


async def _class_and_semester(db: AsyncSession, school_id: str, class_id: str, semester_id: str) -> tuple[Class, Semester]:
    cls = await db.get(Class, class_id)
    semester = await db.get(Semester, semester_id)
    if not cls or cls.school_id != school_id:
        raise HTTPException(status_code=404, detail="Classe introuvable.")
    if not semester or semester.school_id != school_id:
        raise HTTPException(status_code=404, detail="Trimestre introuvable.")
    return cls, semester


async def compute_class_report_cards(db: AsyncSession, cls: Class, semester: Semester) -> list[dict]:
    """Load the class's term data and build every student's report card."""
    # Whole days: semester bounds are stored as midnight of the first/last day.
    period_start = datetime.combine(semester.start_date.date(), time.min, tzinfo=timezone.utc)
    period_end = datetime.combine(semester.end_date.date() + timedelta(days=1), time.min, tzinfo=timezone.utc)
    students = (
        await db.execute(
            select(Student.id, Student.full_name, Student.student_id)
            .join(ClassMember, ClassMember.student_id == Student.id)
            .where(
                ClassMember.class_id == cls.id,
                ClassMember.school_id == cls.school_id,
                Student.school_id == cls.school_id,
                Student.archived_at.is_(None),
            )
            .order_by(Student.full_name)
        )
    ).all()
    courses = (
        await db.execute(
            select(Course.id, Course.name, func.coalesce(ClassCourse.coefficient, Course.coefficient))
            .join(ClassCourse, ClassCourse.course_id == Course.id)
            .where(ClassCourse.class_id == cls.id, ClassCourse.school_id == cls.school_id)
            .distinct()
        )
    ).all()
    grades = (
        await db.execute(
            select(Grade).where(
                Grade.class_id == cls.id,
                Grade.school_id == cls.school_id,
                Grade.is_approved.is_(True),
                Grade.date >= period_start,
                Grade.date < period_end,
            )
        )
    ).scalars().all()
    coefficients = await load_grade_coefficients(db, grades)
    attendance = (
        await db.execute(
            select(Attendance.student_id, Attendance.status, Attendance.is_justified).where(
                Attendance.class_id == cls.id,
                Attendance.school_id == cls.school_id,
                Attendance.date >= period_start,
                Attendance.date < period_end,
            )
        )
    ).all()
    school = await db.get(School, cls.school_id)

    return build_report_cards(
        students=[StudentRow(id=row[0], full_name=row[1], student_number=row[2]) for row in students],
        courses=[CourseRow(course_id=row[0], name=row[1], coefficient=row[2]) for row in courses],
        grades=grades,
        coefficients=coefficients,
        attendance=[
            AttendanceRow(
                student_id=row[0],
                status=row[1].value if hasattr(row[1], "value") else str(row[1]),
                is_justified=bool(row[2]),
            )
            for row in attendance
        ],
        meta={
            "school_name": school.name if school else None,
            "class_name": cls.name,
            "semester_name": semester.name,
            "period_start": semester.start_date.date().isoformat(),
            "period_end": semester.end_date.date().isoformat(),
        },
    )


@router.get("/preview")
async def preview_report_cards(
    class_id: str = Query(...),
    semester_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Report cards as they would be published now (nothing is saved)."""
    school_id = _require_admin(current_user)
    cls, semester = await _class_and_semester(db, school_id, class_id, semester_id)
    return await compute_class_report_cards(db, cls, semester)


@router.post("/publish")
async def publish_report_cards(
    payload: PublishRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Publish (or re-publish) the class's report cards for a term and notify parents."""
    school_id = _require_admin(current_user)
    cls, semester = await _class_and_semester(db, school_id, payload.class_id, payload.semester_id)
    cards = await compute_class_report_cards(db, cls, semester)

    existing = (
        await db.execute(
            select(func.count())
            .select_from(ReportCard)
            .where(ReportCard.class_id == cls.id, ReportCard.semester_id == semester.id)
        )
    ).scalar_one()
    await db.execute(
        delete(ReportCard).where(
            ReportCard.school_id == school_id,
            ReportCard.class_id == cls.id,
            ReportCard.semester_id == semester.id,
        )
    )
    now = datetime.now(timezone.utc)
    for card in cards:
        db.add(
            ReportCard(
                id=str(uuid.uuid4()),
                school_id=school_id,
                class_id=cls.id,
                semester_id=semester.id,
                student_id=card["student_id"],
                overall_average=card["overall_average"],
                rank=card["rank"],
                class_size=card["class_size"],
                data=card,
                published_by=current_user.id,
                published_at=now,
            )
        )

    student_names = {card["student_id"]: card["student_name"] for card in cards}
    links = (
        await db.execute(
            select(StudentParent.parent_id, StudentParent.student_id).where(
                StudentParent.school_id == school_id,
                StudentParent.student_id.in_(list(student_names) or [""]),
            )
        )
    ).all()
    title = "Bulletin mis a jour" if existing else "Bulletin disponible"
    for parent_id, student_id in links:
        await create_notification(
            db,
            user_id=parent_id,
            title=title,
            content=f"Le bulletin du {semester.name} de {student_names[student_id]} est disponible.",
            type="INFO",
            school_id=school_id,
        )

    await record_audit_event(
        db,
        action="report_cards.published",
        actor=current_user,
        school_id=school_id,
        resource_type="class",
        resource_id=cls.id,
        method=request.method,
        path=request.url.path,
        metadata={"semester_id": semester.id, "count": len(cards), "republished": bool(existing)},
    )
    await db.commit()
    return {"published": len(cards), "republished": bool(existing), "parents_notified": len(links)}


@router.post("/unpublish")
async def unpublish_report_cards(
    payload: PublishRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _require_admin(current_user)
    cls, semester = await _class_and_semester(db, school_id, payload.class_id, payload.semester_id)
    result = await db.execute(
        delete(ReportCard).where(
            ReportCard.school_id == school_id,
            ReportCard.class_id == cls.id,
            ReportCard.semester_id == semester.id,
        )
    )
    await record_audit_event(
        db,
        action="report_cards.unpublished",
        actor=current_user,
        school_id=school_id,
        resource_type="class",
        resource_id=cls.id,
        method=request.method,
        path=request.url.path,
        metadata={"semester_id": semester.id},
    )
    await db.commit()
    return {"removed": result.rowcount or 0}


async def _visibility_filter(db: AsyncSession, user: User):
    if not user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")
    in_school = ReportCard.school_id == user.school_id
    if user.role in ADMIN_ROLES:
        return in_school
    if user.role == UserRole.teacher:
        taught = select(ClassTeacher.class_id).where(
            ClassTeacher.school_id == user.school_id,
            ClassTeacher.teacher_id == user.id,
        )
        return in_school & ReportCard.class_id.in_(taught)
    if user.role == UserRole.parent:
        children = select(StudentParent.student_id).where(
            StudentParent.school_id == user.school_id,
            StudentParent.parent_id == user.id,
        )
        return in_school & ReportCard.student_id.in_(children)
    raise HTTPException(status_code=403, detail="Not authorized")


def _summary(card: ReportCard) -> dict:
    return {
        "id": card.id,
        "class_id": card.class_id,
        "semester_id": card.semester_id,
        "student_id": card.student_id,
        "student_name": card.data.get("student_name", ""),
        "class_name": card.data.get("class_name"),
        "semester_name": card.data.get("semester_name"),
        "overall_average": card.overall_average,
        "rank": card.rank,
        "class_size": card.class_size,
        "published_at": card.published_at,
    }


@router.get("/", response_model=list[ReportCardSummary])
async def list_report_cards(
    class_id: str | None = Query(None),
    semester_id: str | None = Query(None),
    student_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ReportCard).where(await _visibility_filter(db, current_user))
    if class_id:
        stmt = stmt.where(ReportCard.class_id == class_id)
    if semester_id:
        stmt = stmt.where(ReportCard.semester_id == semester_id)
    if student_id:
        stmt = stmt.where(ReportCard.student_id == student_id)
    cards = (await db.execute(stmt.order_by(ReportCard.published_at.desc()).limit(500))).scalars().all()
    return [_summary(card) for card in cards]


@router.get("/{report_card_id}", response_model=ReportCardOut)
async def get_report_card(
    report_card_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    card = (
        await db.execute(
            select(ReportCard).where(ReportCard.id == report_card_id, await _visibility_filter(db, current_user))
        )
    ).scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Bulletin introuvable.")
    return {**_summary(card), "data": card.data}
