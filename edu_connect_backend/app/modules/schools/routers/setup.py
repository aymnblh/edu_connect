"""Getting a new school running: the director's setup checklist and its helpers."""
import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_event
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import Class, ClassCourse, ClassMember, Course, School, Semester, Student, StudentParent, User, UserRole

router = APIRouter(prefix="/admin", tags=["School setup"])

ADMIN_ROLES = {UserRole.principal, UserRole.secretary}
# Parents are the last step: it counts as done once half the students have one connected.
PARENT_COVERAGE_TARGET = 0.5

TEMPLATE_ROWS = [
    ("prenom", "nom", "classe"),
    ("Amina", "Benali", "1AM-A"),
    ("Yacine", "Haddad", "1AM-A"),
    ("Nour", "Bensaid", "2AM-B"),
]


def _require_admin(user: User) -> str:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Reserve a l'administration de l'etablissement.")
    if not user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")
    return user.school_id


async def _scalar(db: AsyncSession, stmt) -> int:
    return (await db.execute(stmt)).scalar_one() or 0


def setup_steps(counts: dict[str, int]) -> list[dict]:
    """The checklist, in the order a director goes through it."""
    students = counts["students"]
    classes = counts["classes"]
    return [
        {"key": "logo", "done": counts.get("logo", 0) > 0, "count": counts.get("logo", 0)},
        {"key": "trimesters", "done": counts["semesters"] > 0, "count": counts["semesters"]},
        {"key": "classes", "done": classes > 0, "count": classes},
        {"key": "subjects", "done": counts["courses"] > 0, "count": counts["courses"]},
        {
            "key": "students",
            "done": students > 0 and counts["students_without_class"] == 0,
            "count": students,
            "pending": counts["students_without_class"],
        },
        {
            "key": "teachers",
            "done": counts["teachers"] > 0,
            "count": counts["teachers"],
            "pending": counts["teachers"] - counts["teachers_active"],
        },
        {
            "key": "assignments",
            "done": classes > 0 and counts["classes_with_teacher"] == classes,
            "count": counts["classes_with_teacher"],
            "total": classes,
        },
        {
            "key": "parents",
            "done": students > 0 and counts["students_with_parent"] >= students * PARENT_COVERAGE_TARGET,
            "count": counts["students_with_parent"],
            "total": students,
        },
    ]


@router.get("/setup-status")
async def setup_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Where the school stands in its setup, step by step."""
    school_id = _require_admin(current_user)
    school = await db.get(School, school_id)
    active_students = select(Student.id).where(Student.school_id == school_id, Student.archived_at.is_(None))
    counts = {
        "logo": 1 if school and school.logo_data else 0,
        "semesters": await _scalar(db, select(func.count()).select_from(Semester).where(Semester.school_id == school_id)),
        "classes": await _scalar(db, select(func.count()).select_from(Class).where(Class.school_id == school_id)),
        "courses": await _scalar(db, select(func.count()).select_from(Course).where(Course.school_id == school_id)),
        "students": await _scalar(db, select(func.count()).select_from(active_students.subquery())),
        "students_without_class": await _scalar(
            db,
            select(func.count()).select_from(
                active_students.where(
                    ~Student.id.in_(select(ClassMember.student_id).where(ClassMember.school_id == school_id))
                ).subquery()
            ),
        ),
        "teachers": await _scalar(
            db,
            select(func.count()).select_from(User).where(
                User.school_id == school_id, User.role == UserRole.teacher, User.deactivated_at.is_(None)
            ),
        ),
        "teachers_active": await _scalar(
            db,
            select(func.count()).select_from(User).where(
                User.school_id == school_id,
                User.role == UserRole.teacher,
                User.deactivated_at.is_(None),
                User.password_hash.is_not(None),
            ),
        ),
        "classes_with_teacher": await _scalar(
            db, select(func.count(distinct(ClassCourse.class_id))).where(ClassCourse.school_id == school_id)
        ),
        "students_with_parent": await _scalar(
            db,
            select(func.count(distinct(StudentParent.student_id))).where(
                StudentParent.school_id == school_id, StudentParent.student_id.in_(active_students)
            ),
        ),
    }
    steps = setup_steps(counts)
    completed = sum(1 for step in steps if step["done"])
    return {
        "dismissed": bool((school.tenant_config or {}).get("setup_dismissed")) if school else False,
        "completed": completed,
        "total": len(steps),
        "steps": steps,
    }


class SetupDismissRequest(BaseModel):
    dismissed: bool = True


@router.post("/setup-status/dismiss")
async def dismiss_setup(
    payload: SetupDismissRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Hide (or bring back) the checklist for everyone in the school administration."""
    school_id = _require_admin(current_user)
    school = await db.get(School, school_id)
    if school is None:
        raise HTTPException(status_code=404, detail="School not found")
    # Reassign so SQLAlchemy sees the JSON change.
    school.tenant_config = {**(school.tenant_config or {}), "setup_dismissed": payload.dismissed}
    await db.commit()
    return {"dismissed": payload.dismissed}


@router.get("/import/students/template")
async def student_import_template(current_user: User = Depends(get_current_user)):
    """A CSV that Excel opens directly (semicolons, UTF-8 with BOM for accents and Arabic)."""
    _require_admin(current_user)
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerows(TEMPLATE_ROWS)
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=modele_import_eleves.csv"},
    )


@router.get("/parent-codes")
async def parent_codes(
    request: Request,
    class_id: str | None = Query(None, max_length=36),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Student identifier and PIN of every active student, to print and hand to parents."""
    school_id = _require_admin(current_user)
    stmt = (
        select(Student.id, Student.full_name, Student.student_id, Student.linking_pin, Class.id, Class.name)
        .outerjoin(ClassMember, (ClassMember.student_id == Student.id) & (ClassMember.school_id == school_id))
        .outerjoin(Class, Class.id == ClassMember.class_id)
        .where(Student.school_id == school_id, Student.archived_at.is_(None))
        .order_by(Class.name.nulls_last(), Student.full_name)
    )
    if class_id:
        stmt = stmt.where(ClassMember.class_id == class_id)
    rows = (await db.execute(stmt)).all()
    linked = dict(
        (
            await db.execute(
                select(StudentParent.student_id, func.count())
                .where(StudentParent.school_id == school_id)
                .group_by(StudentParent.student_id)
            )
        ).all()
    )
    # A student in two classes appears once, under the first.
    seen: set[str] = set()
    codes = []
    for student_id, name, code, pin, row_class_id, class_name in rows:
        if student_id in seen:
            continue
        seen.add(student_id)
        codes.append(
            {
                "student_id": student_id,
                "student_name": name,
                "student_code": code,
                "linking_pin": pin,
                "class_id": row_class_id,
                "class_name": class_name,
                "parents_linked": linked.get(student_id, 0),
            }
        )
    # The PINs let anyone link to a child: record who printed them.
    await record_audit_event(
        db,
        action="parent_codes.viewed",
        actor=current_user,
        school_id=school_id,
        resource_type="class" if class_id else "school",
        resource_id=class_id or school_id,
        method=request.method,
        path=request.url.path,
        metadata={"students": len(codes)},
    )
    await db.commit()
    return codes
