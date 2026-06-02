from collections import defaultdict
from collections.abc import Hashable, Iterable
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ClassCourse, Course, Grade


@dataclass
class _ModuleAverage:
    coefficient: float
    scores: list[float] = field(default_factory=list)


def _positive_coefficient(value: float | None) -> float:
    if value is None or value <= 0:
        return 1.0
    return float(value)


def _normalized_subject(value: str | None) -> str:
    return " ".join((value or "").strip().casefold().split())


def grade_score_on_twenty(grade: Grade) -> float:
    if not grade.max_score or grade.max_score <= 0:
        return float(grade.score)
    return (float(grade.score) / float(grade.max_score)) * 20.0


async def load_grade_coefficients(
    db: AsyncSession,
    grades: Iterable[Grade],
) -> dict[str, float]:
    grades_list = list(grades)
    class_ids = {grade.class_id for grade in grades_list if grade.class_id}
    if not class_ids:
        return {}

    result = await db.execute(
        select(
            ClassCourse.class_id,
            ClassCourse.course_id,
            ClassCourse.coefficient.label("class_coefficient"),
            Course.name,
            Course.coefficient.label("course_coefficient"),
        )
        .join(Course, Course.id == ClassCourse.course_id)
        .where(ClassCourse.class_id.in_(class_ids))
    )

    by_course: dict[tuple[str, str], float] = {}
    by_subject: dict[tuple[str, str], float] = {}
    for row in result.all():
        coefficient = _positive_coefficient(row.class_coefficient or row.course_coefficient)
        by_course[(row.class_id, row.course_id)] = coefficient
        by_subject[(row.class_id, _normalized_subject(row.name))] = coefficient

    coefficients: dict[str, float] = {}
    for grade in grades_list:
        coefficient = None
        if grade.course_id:
            coefficient = by_course.get((grade.class_id, grade.course_id))
        if coefficient is None:
            coefficient = by_subject.get((grade.class_id, _normalized_subject(grade.subject)))
        coefficients[grade.id] = _positive_coefficient(coefficient)
    return coefficients


def weighted_average_for_grades(
    grades: Iterable[Grade],
    coefficients_by_grade_id: dict[str, float],
) -> float | None:
    modules: dict[Hashable, _ModuleAverage] = {}

    for grade in grades:
        module_key: Hashable = grade.course_id or _normalized_subject(grade.subject) or grade.id
        coefficient = _positive_coefficient(coefficients_by_grade_id.get(grade.id))
        module = modules.setdefault(module_key, _ModuleAverage(coefficient))
        module.coefficient = coefficient
        module.scores.append(grade_score_on_twenty(grade))

    weighted_total = 0.0
    coefficient_total = 0.0
    for module in modules.values():
        coefficient = _positive_coefficient(module.coefficient)
        if not module.scores:
            continue
        module_average = sum(module.scores) / len(module.scores)
        weighted_total += module_average * coefficient
        coefficient_total += coefficient

    if coefficient_total <= 0:
        return None
    return weighted_total / coefficient_total


def weighted_averages_by_group(
    grades: Iterable[Grade],
    coefficients_by_grade_id: dict[str, float],
    group_key,
) -> dict[Hashable, float]:
    grouped: dict[Hashable, list[Grade]] = defaultdict(list)
    for grade in grades:
        grouped[group_key(grade)].append(grade)

    averages: dict[Hashable, float] = {}
    for key, group_grades in grouped.items():
        average = weighted_average_for_grades(group_grades, coefficients_by_grade_id)
        if average is not None:
            averages[key] = average
    return averages


def grade_response(grade: Grade, coefficient: float) -> dict[str, object]:
    return {
        "id": grade.id,
        "class_id": grade.class_id,
        "student_id": grade.student_id,
        "student_name": grade.student_name,
        "course_id": grade.course_id,
        "subject": grade.subject or "",
        "score": grade.score,
        "max_score": grade.max_score,
        "comment": grade.comment,
        "coefficient": _positive_coefficient(coefficient),
        "normalized_score": round(grade_score_on_twenty(grade), 4),
        "is_approved": grade.is_approved,
        "approved_by": grade.approved_by,
        "approved_at": grade.approved_at,
        "date": grade.date,
        "student": grade.student,
    }
