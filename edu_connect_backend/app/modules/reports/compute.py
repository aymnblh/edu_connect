"""Term report card computation (pure: no database access)."""
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass

from app.modules.academics.averages import grade_score_on_twenty


@dataclass(frozen=True)
class StudentRow:
    id: str
    full_name: str
    student_number: str | None


@dataclass(frozen=True)
class CourseRow:
    course_id: str
    name: str
    coefficient: float | None


@dataclass(frozen=True)
class AttendanceRow:
    student_id: str
    status: str
    is_justified: bool


def _norm(value: str | None) -> str:
    return " ".join((value or "").strip().casefold().split())


def _coefficient(value: float | None) -> float:
    return float(value) if value and value > 0 else 1.0


def _round(value: float | None) -> float | None:
    return None if value is None else round(value, 2)


def _mean(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def competition_ranks(averages: dict[str, float | None]) -> dict[str, int | None]:
    """1, 2, 2, 4 ranking on rounded averages; students without an average are unranked."""
    ranked = sorted(
        ((student_id, round(avg, 2)) for student_id, avg in averages.items() if avg is not None),
        key=lambda item: item[1],
        reverse=True,
    )
    ranks: dict[str, int | None] = {student_id: None for student_id in averages}
    previous: float | None = None
    previous_rank = 0
    for position, (student_id, avg) in enumerate(ranked, start=1):
        rank = previous_rank if avg == previous else position
        ranks[student_id] = rank
        previous, previous_rank = avg, rank
    return ranks


def build_report_cards(
    *,
    students: Iterable[StudentRow],
    courses: Iterable[CourseRow],
    grades: Iterable,
    coefficients: dict[str, float],
    attendance: Iterable[AttendanceRow],
    meta: dict[str, str | None],
) -> list[dict]:
    """Return one report card payload per student, in the students' order.

    Subjects are the class's courses plus any legacy free-text subject that
    received grades; grades without a course are matched to a course by name.
    Only the grades passed in are used (callers pass approved grades of the
    term).
    """
    students = list(students)
    modules: dict[str, dict] = {}
    by_name: dict[str, str] = {}
    for course in courses:
        key = f"course:{course.course_id}"
        modules[key] = {"subject": course.name, "coefficient": _coefficient(course.coefficient)}
        by_name[_norm(course.name)] = key

    scores: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for grade in grades:
        key = f"course:{grade.course_id}" if grade.course_id else None
        if key not in modules:
            normalized = _norm(grade.subject)
            key = by_name.get(normalized, f"subject:{normalized}")
            modules.setdefault(
                key,
                {"subject": grade.subject or "-", "coefficient": _coefficient(coefficients.get(grade.id))},
            )
        scores[grade.student_id][key].append(grade_score_on_twenty(grade))

    keys = sorted(modules, key=lambda k: _norm(modules[k]["subject"]))
    averages = {
        student.id: {key: _mean(scores[student.id].get(key, [])) for key in keys} for student in students
    }

    overall: dict[str, float | None] = {}
    for student in students:
        total = weight = 0.0
        for key in keys:
            avg = averages[student.id][key]
            if avg is not None:
                total += avg * modules[key]["coefficient"]
                weight += modules[key]["coefficient"]
        overall[student.id] = total / weight if weight else None

    class_subject_avg = {
        key: _mean([averages[s.id][key] for s in students if averages[s.id][key] is not None]) for key in keys
    }
    class_overall = _mean([value for value in overall.values() if value is not None])
    ranks = competition_ranks(overall)
    ranked_count = sum(1 for value in overall.values() if value is not None)

    absences: dict[str, dict[str, int]] = defaultdict(lambda: {"absences": 0, "justified_absences": 0, "lates": 0})
    for row in attendance:
        counts = absences[row.student_id]
        if row.status == "absent":
            counts["absences"] += 1
            if row.is_justified:
                counts["justified_absences"] += 1
        elif row.status == "late":
            counts["lates"] += 1

    cards = []
    for student in students:
        cards.append(
            {
                **meta,
                "student_id": student.id,
                "student_name": student.full_name,
                "student_number": student.student_number,
                "subjects": [
                    {
                        "key": key,
                        "subject": modules[key]["subject"],
                        "coefficient": modules[key]["coefficient"],
                        "average": _round(averages[student.id][key]),
                        "grades_count": len(scores[student.id].get(key, [])),
                        "class_average": _round(class_subject_avg[key]),
                    }
                    for key in keys
                ],
                "overall_average": _round(overall[student.id]),
                "rank": ranks[student.id],
                "class_size": ranked_count,
                "class_average": _round(class_overall),
                "attendance": dict(absences[student.id]),
            }
        )
    return cards
