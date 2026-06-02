import csv
import io
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.access import (
    assert_class_read_access,
    assert_class_write_access,
    assert_parent_linked_to_student,
    assert_student_enrolled_in_class,
)
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import Class, ClassCourse, ClassMember, Course, Grade, School, Semester, Student, StudentParent, User
from app.schemas import GradeApprovalOut, GradeCreate, GradeOut
from app.modules.academics.averages import (
    grade_response,
    grade_score_on_twenty,
    load_grade_coefficients,
    weighted_average_for_grades,
    weighted_averages_by_group,
)
from app.utils.notifications import create_notification

router = APIRouter(prefix="/classes/{class_id}/grades", tags=["Grades"])


_ARABIC_SUBJECT_LABELS = {
    "arabic": "اللغة العربية",
    "arabic language": "اللغة العربية",
    "arabe": "اللغة العربية",
    "langue arabe": "اللغة العربية",
    "mathematics": "الرياضيات",
    "math": "الرياضيات",
    "maths": "الرياضيات",
    "mathematiques": "الرياضيات",
    "mathématiques": "الرياضيات",
    "french": "اللغة الفرنسية",
    "french language": "اللغة الفرنسية",
    "francais": "اللغة الفرنسية",
    "français": "اللغة الفرنسية",
    "english": "اللغة الإنجليزية",
    "english language": "اللغة الإنجليزية",
    "anglais": "اللغة الإنجليزية",
    "physics": "العلوم الفيزيائية",
    "chemistry": "العلوم الفيزيائية",
    "physics/chemistry": "العلوم الفيزيائية",
    "physique": "العلوم الفيزيائية",
    "physique chimie": "العلوم الفيزيائية",
    "physique/chimie": "العلوم الفيزيائية",
    "life sciences": "علوم الطبيعة والحياة",
    "science": "علوم الطبيعة والحياة",
    "sciences": "علوم الطبيعة والحياة",
    "sciences naturelles": "علوم الطبيعة والحياة",
    "svt": "علوم الطبيعة والحياة",
    "history": "التاريخ والجغرافيا",
    "geography": "التاريخ والجغرافيا",
    "history/geography": "التاريخ والجغرافيا",
    "histoire": "التاريخ والجغرافيا",
    "geographie": "التاريخ والجغرافيا",
    "géographie": "التاريخ والجغرافيا",
    "islamic education": "التربية الإسلامية",
    "education islamique": "التربية الإسلامية",
    "islamique": "التربية الإسلامية",
    "pe": "التربية البدنية",
    "sports": "التربية البدنية",
    "sport": "التربية البدنية",
    "education physique": "التربية البدنية",
    "informatique": "الإعلام الآلي",
    "informatics": "الإعلام الآلي",
    "computer science": "الإعلام الآلي",
    "arts": "التربية الفنية",
    "art": "التربية الفنية",
    "education artistique": "التربية الفنية",
    "civic education": "التربية المدنية",
    "education civique": "التربية المدنية",
    "philosophy": "الفلسفة",
    "philosophie": "الفلسفة",
    "economics": "الاقتصاد",
    "economie": "الاقتصاد",
    "économie": "الاقتصاد",
    "law": "القانون",
    "droit": "القانون",
    "accounting": "تسيير محاسبي ومالي",
    "comptabilite": "تسيير محاسبي ومالي",
    "comptabilité": "تسيير محاسبي ومالي",
}


async def _assert_grade_writer(class_id: str, current_user: User, db: AsyncSession) -> Class:
    return await assert_class_write_access(class_id, current_user, db)


def _format_decimal(value: float | None, digits: int = 2) -> str:
    if value is None:
        return ""
    return f"{value:.{digits}f}".replace(".", ",")


def _format_coefficient(value: float | None) -> str:
    if value is None:
        return "1"
    if float(value).is_integer():
        return str(int(value))
    return _format_decimal(value, 1)


def _normalized_subject(value: str | None) -> str:
    return " ".join((value or "").strip().casefold().split())


def _contains_arabic(value: str) -> bool:
    return any("\u0600" <= char <= "\u06ff" for char in value)


def _arabic_subject_label(value: str | None) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if _contains_arabic(raw):
        return raw.split("(", 1)[0].strip()
    normalized = _normalized_subject(raw)
    return _ARABIC_SUBJECT_LABELS.get(normalized, raw)


def _arabic_semester_label(value: str | None) -> str:
    normalized = _normalized_subject(value)
    if normalized in {"trimester 1", "trimestre 1", "الثلاثي 1"}:
        return "الثلاثي الأول"
    if normalized in {"trimester 2", "trimestre 2", "الثلاثي 2"}:
        return "الثلاثي الثاني"
    if normalized in {"trimester 3", "trimestre 3", "الثلاثي 3"}:
        return "الثلاثي الثالث"
    return value or "الثلاثي"


def _arabic_appreciation(average: float | None) -> str:
    if average is None:
        return ""
    if average >= 16:
        return "نتائج ممتازة واصل(ي)"
    if average >= 14:
        return "نتائج جيدة واصل(ي)"
    if average >= 12:
        return "نتائج فوق المتوسط"
    if average >= 10:
        return "نتائج متوسطة"
    if average >= 8:
        return "نتائج غير كافية"
    return "نتائج ضعيفة"


def _module_key_for_grade(grade: Grade) -> str:
    return f"course:{grade.course_id}" if grade.course_id else f"subject:{_normalized_subject(grade.subject)}"


def _module_keys_for_course(course_id: str | None, subject: str | None) -> set[str]:
    keys = set()
    if course_id:
        keys.add(f"course:{course_id}")
    normalized = _normalized_subject(subject)
    if normalized:
        keys.add(f"subject:{normalized}")
    return keys


def _split_student_name(full_name: str) -> tuple[str, str]:
    parts = full_name.strip().split(" ", 1)
    first_name = parts[0] if parts else ""
    last_name = parts[1] if len(parts) > 1 else ""
    return last_name, first_name


def _school_year_label(value: datetime | None = None) -> str:
    today = value or datetime.now(timezone.utc)
    start_year = today.year if today.month >= 9 else today.year - 1
    return f"{start_year}/{start_year + 1}"


def _grade_value_for_column(grade: Grade, target_max: float) -> str:
    if not grade.max_score or grade.max_score <= 0:
        return _format_decimal(float(grade.score))
    value = (float(grade.score) / float(grade.max_score)) * target_max
    return _format_decimal(value)


async def _resolve_grade_course(
    cls: Class,
    payload: GradeCreate,
    db: AsyncSession,
) -> Course | None:
    base_stmt = (
        select(Course)
        .join(ClassCourse, ClassCourse.course_id == Course.id)
        .where(
            Course.school_id == cls.school_id,
            ClassCourse.school_id == cls.school_id,
            ClassCourse.class_id == cls.id,
        )
    )
    if payload.course_id:
        result = await db.execute(base_stmt.where(Course.id == payload.course_id))
        course = result.scalar_one_or_none()
        if not course:
            raise HTTPException(status_code=404, detail="Matiere introuvable dans cette classe")
        return course

    subject = payload.subject.strip()
    if not subject:
        return None
    result = await db.execute(base_stmt.where(func.lower(Course.name) == subject.lower()).limit(1))
    return result.scalar_one_or_none()


@router.post("/", response_model=GradeOut, status_code=201)
async def add_grade(
    class_id: str,
    payload: GradeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await _assert_grade_writer(class_id, current_user, db)
    student = await assert_student_enrolled_in_class(
        class_id,
        payload.student_id,
        db,
        school_id=cls.school_id,
    )
    course = await _resolve_grade_course(cls, payload, db)
    grade_data = payload.model_dump(exclude={"student_name"})
    if course:
        grade_data["course_id"] = course.id
        grade_data["subject"] = course.name
    grade = Grade(
        **grade_data,
        student_name=student.full_name,
        class_id=class_id,
        school_id=cls.school_id,
        is_approved=False,
    )
    db.add(grade)
    await db.commit()

    result = await db.execute(
        select(Grade).where(Grade.id == grade.id).options(selectinload(Grade.student))
    )
    saved_grade = result.scalar_one()
    coefficients = await load_grade_coefficients(db, [saved_grade])
    return grade_response(saved_grade, coefficients.get(saved_grade.id, 1.0))


@router.get("/", response_model=list[GradeOut])
async def list_grades(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_read_access(class_id, current_user, db)
    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Grade).where(Grade.school_id == cls.school_id, Grade.class_id == class_id)
    elif current_user.role.value == "teacher":
        stmt = select(Grade).where(Grade.school_id == cls.school_id, Grade.class_id == class_id)
    else:
        stmt = (
            select(Grade)
            .join(Student, Student.id == Grade.student_id)
            .join(StudentParent, StudentParent.student_id == Student.id)
            .where(
                Grade.school_id == cls.school_id,
                Grade.class_id == class_id,
                Grade.is_approved == True,
                Student.school_id == cls.school_id,
                StudentParent.school_id == cls.school_id,
                StudentParent.parent_id == current_user.id,
            )
        )

    result = await db.execute(stmt.options(selectinload(Grade.student)).order_by(Grade.date.desc()))
    grades = result.scalars().all()
    coefficients = await load_grade_coefficients(db, grades)
    return [grade_response(grade, coefficients.get(grade.id, 1.0)) for grade in grades]


@router.get("/student/{student_id}", response_model=list[GradeOut])
async def student_grades(
    class_id: str,
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_read_access(class_id, current_user, db)
    await assert_student_enrolled_in_class(class_id, student_id, db, school_id=cls.school_id)
    if current_user.role.value == "parent":
        await assert_parent_linked_to_student(student_id, current_user.id, db, school_id=cls.school_id)

    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Grade).where(
            Grade.school_id == cls.school_id,
            Grade.class_id == class_id,
            Grade.student_id == student_id,
        )
    elif current_user.role.value == "teacher":
        stmt = select(Grade).where(
            Grade.school_id == cls.school_id,
            Grade.class_id == class_id,
            Grade.student_id == student_id,
        )
    else:
        stmt = select(Grade).join(StudentParent, StudentParent.student_id == Grade.student_id).where(
            Grade.school_id == cls.school_id,
            Grade.class_id == class_id,
            Grade.student_id == student_id,
            Grade.is_approved == True,
            StudentParent.school_id == cls.school_id,
            StudentParent.parent_id == current_user.id,
        )

    result = await db.execute(stmt.options(selectinload(Grade.student)).order_by(Grade.date.desc()))
    grades = result.scalars().all()
    coefficients = await load_grade_coefficients(db, grades)
    return [grade_response(grade, coefficients.get(grade.id, 1.0)) for grade in grades]


@router.post("/{grade_id}/approve", response_model=GradeApprovalOut)
async def approve_grade(
    class_id: str,
    grade_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only administration can approve final grades")

    grade = await db.get(Grade, grade_id)
    if not grade or grade.class_id != class_id:
        raise HTTPException(status_code=404, detail="Grade not found")
    if grade.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if not grade.is_approved:
        grade.is_approved = True
        grade.approved_by = current_user.id
        grade.approved_at = datetime.now(timezone.utc)

        parents_res = await db.execute(
            select(User)
            .join(StudentParent, StudentParent.parent_id == User.id)
            .where(
                StudentParent.school_id == grade.school_id,
                StudentParent.student_id == grade.student_id,
                User.school_id == grade.school_id,
            )
        )
        parents = parents_res.scalars().all()
        for parent in parents:
            await create_notification(
                db,
                user_id=parent.id,
                title="Nouvelle note validee",
                content=f"Votre enfant a recu une note de {grade.score}/{grade.max_score} en {grade.subject}.",
                type="SUCCESS",
                school_id=grade.school_id,
            )

    await db.commit()
    return {"status": "approved", "grade_id": grade.id, "is_approved": grade.is_approved}


@router.get("/export/raw")
async def export_grades_raw(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["principal", "secretary", "teacher"]:
        raise HTTPException(status_code=403, detail="Unprivileged")

    cls = await _assert_grade_writer(class_id, current_user, db)
    school_res = await db.execute(select(School).where(School.id == cls.school_id))
    school = school_res.scalar_one_or_none()
    prefix = school.student_id_prefix if school and school.student_id_prefix else ""

    grades_res = await db.execute(
        select(Grade).where(
            Grade.school_id == cls.school_id,
            Grade.class_id == class_id,
            Grade.is_approved == True,
        )
    )
    grades = grades_res.scalars().all()
    coefficients = await load_grade_coefficients(db, grades)

    student_averages = weighted_averages_by_group(
        grades,
        coefficients,
        lambda grade: grade.student_id,
    )
    averages_list = list(student_averages.items())
    averages_list.sort(key=lambda item: item[1], reverse=True)
    rank_map = {sid: i + 1 for i, (sid, _) in enumerate(averages_list)}

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "ID_Eleve",
        "Nom",
        "Prenom",
        "Matiere",
        "Note",
        "Note_Max",
        "Coefficient",
        "Note_20",
        "Date",
        "Rang",
        "Observation",
    ])

    for grade in grades:
        clean_id = grade.student_id
        if prefix and clean_id.startswith(prefix):
            clean_id = clean_id[len(prefix):]

        name_parts = grade.student_name.split(" ", 1)
        prenom = name_parts[0]
        nom = name_parts[1] if len(name_parts) > 1 else ""

        writer.writerow([
            clean_id,
            nom,
            prenom,
            grade.subject,
            grade.score,
            grade.max_score,
            coefficients.get(grade.id, 1.0),
            round(grade_score_on_twenty(grade), 2),
            grade.date.strftime("%Y-%m-%d"),
            rank_map.get(grade.student_id, "-"),
            grade.comment or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=bulletin_brut_{class_id}.csv"},
    )


@router.get("/export")
async def export_grades(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["principal", "secretary", "teacher"]:
        raise HTTPException(status_code=403, detail="Unprivileged")

    cls = await _assert_grade_writer(class_id, current_user, db)
    school_res = await db.execute(select(School).where(School.id == cls.school_id))
    school = school_res.scalar_one_or_none()

    semester_res = await db.execute(
        select(Semester)
        .where(Semester.school_id == cls.school_id, Semester.is_active == True)
        .order_by(Semester.start_date.desc())
        .limit(1)
    )
    semester = semester_res.scalar_one_or_none()

    students_res = await db.execute(
        select(Student)
        .join(ClassMember, ClassMember.student_id == Student.id)
        .where(
            Student.school_id == cls.school_id,
            ClassMember.school_id == cls.school_id,
            ClassMember.class_id == class_id,
            Student.archived_at.is_(None),
        )
        .order_by(Student.full_name)
    )
    students = students_res.scalars().all()

    courses_res = await db.execute(
        select(ClassCourse, Course, User.full_name.label("teacher_name"))
        .join(Course, Course.id == ClassCourse.course_id)
        .outerjoin(User, User.id == ClassCourse.teacher_id)
        .where(
            ClassCourse.school_id == cls.school_id,
            ClassCourse.class_id == class_id,
            Course.school_id == cls.school_id,
        )
        .order_by(Course.name)
    )
    modules: list[dict[str, object]] = []
    seen_courses: set[str] = set()
    for class_course, course, teacher_name in courses_res.all():
        if course.id in seen_courses:
            continue
        seen_courses.add(course.id)
        modules.append(
            {
                "course_id": course.id,
                "subject": course.name,
                "teacher_name": teacher_name or "",
                "coefficient": class_course.coefficient or course.coefficient or 1.0,
            }
        )

    grades_res = await db.execute(
        select(Grade).where(
            Grade.school_id == cls.school_id,
            Grade.class_id == class_id,
            Grade.is_approved == True,
        ).order_by(Grade.student_name, Grade.subject, Grade.date)
    )
    grades = grades_res.scalars().all()
    coefficients = await load_grade_coefficients(db, grades)

    if not modules:
        seen_subjects: set[str] = set()
        for grade in grades:
            normalized = _normalized_subject(grade.subject)
            if not normalized or normalized in seen_subjects:
                continue
            seen_subjects.add(normalized)
            modules.append(
                {
                    "course_id": grade.course_id,
                    "subject": grade.subject or "",
                    "teacher_name": "",
                    "coefficient": coefficients.get(grade.id, 1.0),
                }
            )

    grades_by_student_module: dict[tuple[str, str], list[Grade]] = defaultdict(list)
    for grade in grades:
        grades_by_student_module[(grade.student_id, _module_key_for_grade(grade))].append(grade)

    grades_by_student: dict[str, list[Grade]] = defaultdict(list)
    for grade in grades:
        grades_by_student[grade.student_id].append(grade)

    averages = {
        student_id: weighted_average_for_grades(student_grades, coefficients)
        for student_id, student_grades in grades_by_student.items()
    }
    ranked = sorted(
        [(student_id, average) for student_id, average in averages.items() if average is not None],
        key=lambda item: item[1],
        reverse=True,
    )
    rank_map = {student_id: index + 1 for index, (student_id, _) in enumerate(ranked)}

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(
        [
            "السنة الدراسية",
            "الثلاثي",
            "المؤسسة",
            "القسم",
            "رقم التلميذ",
            "لقب واسم التلميذ(ة)",
            "تاريخ الازدياد",
            "المواد",
            "لقب الأستاذ(ة)",
            "الفرض الأول /20",
            "الفرض الثاني /20",
            "الاختبار /40",
            "نقاط أخرى",
            "معدل المادة /20",
            "المعامل",
            "المعدل x المعامل",
            "المعدل العام /20",
            "مجموع النقاط",
            "مجموع المعاملات",
            "الرتبة",
            "التقييم",
            "الملاحظات",
        ]
    )

    year_label = _school_year_label(semester.start_date if semester else None)
    semester_label = _arabic_semester_label(semester.name if semester else None)
    school_name = school.name if school else ""

    for student in students:
        student_average = averages.get(student.id)
        student_appreciation = _arabic_appreciation(student_average)
        ranked_modules: list[tuple[float, float]] = []

        module_rows = []
        for module in modules:
            raw_subject = str(module["subject"])
            subject = _arabic_subject_label(raw_subject)
            course_id = module["course_id"]
            coefficient = float(module["coefficient"] or 1.0)
            module_grades: list[Grade] = []
            for key in _module_keys_for_course(str(course_id) if course_id else None, raw_subject):
                module_grades.extend(grades_by_student_module.get((student.id, key), []))
            module_grades = sorted({grade.id: grade for grade in module_grades}.values(), key=lambda grade: grade.date)

            controls: list[str] = []
            compositions: list[str] = []
            other_notes: list[str] = []
            comments: list[str] = []
            for grade in module_grades:
                if grade.comment:
                    comments.append(grade.comment)
                if grade.max_score and grade.max_score > 20:
                    compositions.append(_grade_value_for_column(grade, 40))
                elif len(controls) < 2:
                    controls.append(_grade_value_for_column(grade, 20))
                else:
                    other_notes.append(f"{_format_decimal(grade.score)}/{_format_decimal(grade.max_score, 0)}")

            module_average = None
            points = None
            if module_grades:
                module_average = sum(grade_score_on_twenty(grade) for grade in module_grades) / len(module_grades)
                points = module_average * coefficient
                ranked_modules.append((points, coefficient))

            module_rows.append(
                {
                    "subject": subject,
                    "teacher_name": str(module["teacher_name"]),
                    "coefficient": coefficient,
                    "controle_1": controls[0] if len(controls) > 0 else "",
                    "controle_2": controls[1] if len(controls) > 1 else "",
                    "composition": compositions[0] if compositions else "",
                    "other_notes": " | ".join(other_notes + compositions[1:]),
                    "module_average": module_average,
                    "points": points,
                    "comments": " | ".join(dict.fromkeys(comments)),
                }
            )

        total_points = sum(points for points, _ in ranked_modules)
        total_coefficients = sum(coefficient for _, coefficient in ranked_modules)

        for row in module_rows:
            writer.writerow(
                [
                    year_label,
                    semester_label,
                    school_name,
                    cls.name,
                    student.student_id or student.id,
                    student.full_name,
                    "",
                    row["subject"],
                    row["teacher_name"],
                    row["controle_1"],
                    row["controle_2"],
                    row["composition"],
                    row["other_notes"],
                    _format_decimal(row["module_average"]),  # type: ignore[arg-type]
                    _format_coefficient(row["coefficient"]),  # type: ignore[arg-type]
                    _format_decimal(row["points"]),  # type: ignore[arg-type]
                    _format_decimal(student_average),
                    _format_decimal(total_points),
                    _format_coefficient(total_coefficients) if total_coefficients else "",
                    rank_map.get(student.id, ""),
                    student_appreciation,
                    row["comments"],
                ]
            )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=kashf_nokat_ar_{class_id}.csv"},
    )
