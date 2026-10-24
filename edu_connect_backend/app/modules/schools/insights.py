"""Director early-warning analytics (pure functions, no database access)."""
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, timedelta

LOW_AVERAGE = 10.0
AVERAGE_DROP = 2.0
UNJUSTIFIED_ABSENCES_30D = 3
LATES_30D = 5


@dataclass(frozen=True)
class AttendanceFact:
    student_id: str
    class_id: str
    day: date
    status: str
    is_justified: bool


def week_start(day: date) -> date:
    """Sunday starting the Algerian school week (Sunday to Thursday)."""
    return day - timedelta(days=(day.weekday() + 1) % 7)


def _rate(part: int, total: int) -> float:
    return round(part / total * 100, 1) if total else 0.0


def attendance_weeks(facts: Iterable[AttendanceFact], *, today: date, weeks: int = 12) -> list[dict]:
    """Absence and late rates per school week, oldest first, including empty weeks."""
    current = week_start(today)
    starts = [current - timedelta(weeks=offset) for offset in range(weeks - 1, -1, -1)]
    counts = {start: {"records": 0, "absences": 0, "lates": 0} for start in starts}
    for fact in facts:
        bucket = counts.get(week_start(fact.day))
        if bucket is None:
            continue
        bucket["records"] += 1
        if fact.status == "absent":
            bucket["absences"] += 1
        elif fact.status == "late":
            bucket["lates"] += 1
    return [
        {
            "week_start": start.isoformat(),
            **counts[start],
            "absence_rate": _rate(counts[start]["absences"], counts[start]["records"]),
            "late_rate": _rate(counts[start]["lates"], counts[start]["records"]),
        }
        for start in starts
    ]


def class_attendance(facts: Iterable[AttendanceFact], class_names: dict[str, str]) -> list[dict]:
    """Per-class absence and late rates, worst absence rate first."""
    counts: dict[str, dict[str, int]] = defaultdict(lambda: {"records": 0, "absences": 0, "lates": 0})
    for fact in facts:
        bucket = counts[fact.class_id]
        bucket["records"] += 1
        if fact.status == "absent":
            bucket["absences"] += 1
        elif fact.status == "late":
            bucket["lates"] += 1
    rows = [
        {
            "class_id": class_id,
            "class_name": class_names.get(class_id, class_id),
            **bucket,
            "absence_rate": _rate(bucket["absences"], bucket["records"]),
            "late_rate": _rate(bucket["lates"], bucket["records"]),
        }
        for class_id, bucket in counts.items()
    ]
    rows.sort(key=lambda row: (row["absence_rate"], row["late_rate"]), reverse=True)
    return rows


def students_at_risk(
    *,
    students: dict[tuple[str, str], str],
    class_names: dict[str, str],
    current_averages: dict[tuple[str, str], float],
    previous_averages: dict[tuple[str, str], float],
    recent_facts: Iterable[AttendanceFact],
) -> list[dict]:
    """Students (per class) matching at least one warning rule, most warnings first.

    ``students`` maps (student_id, class_id) to the student's name; recent
    facts are the last 30 days of attendance.
    """
    unjustified: dict[tuple[str, str], int] = defaultdict(int)
    lates: dict[tuple[str, str], int] = defaultdict(int)
    for fact in recent_facts:
        key = (fact.student_id, fact.class_id)
        if fact.status == "absent" and not fact.is_justified:
            unjustified[key] += 1
        elif fact.status == "late":
            lates[key] += 1

    flagged = []
    for key, name in students.items():
        average = current_averages.get(key)
        previous = previous_averages.get(key)
        reasons = []
        if average is not None and average < LOW_AVERAGE:
            reasons.append("low_average")
        if average is not None and previous is not None and previous - average >= AVERAGE_DROP:
            reasons.append("dropping")
        if unjustified[key] >= UNJUSTIFIED_ABSENCES_30D:
            reasons.append("absences")
        if lates[key] >= LATES_30D:
            reasons.append("lateness")
        if reasons:
            student_id, class_id = key
            flagged.append(
                {
                    "student_id": student_id,
                    "student_name": name,
                    "class_id": class_id,
                    "class_name": class_names.get(class_id, class_id),
                    "average": None if average is None else round(average, 2),
                    "previous_average": None if previous is None else round(previous, 2),
                    "unjustified_absences_30d": unjustified[key],
                    "lates_30d": lates[key],
                    "reasons": reasons,
                }
            )
    flagged.sort(key=lambda row: (-len(row["reasons"]), row["average"] if row["average"] is not None else 99.0))
    return flagged
