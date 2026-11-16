"""Canteen rules: school days, who eats on a given day, monthly billing amounts."""
from calendar import monthrange
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal

FRENCH_MONTHS = (
    "janvier", "fevrier", "mars", "avril", "mai", "juin",
    "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
)
ALL_SCHOOL_DAYS = (0, 1, 2, 3, 4)


def school_weekday(day: date) -> int | None:
    """Algerian school week: 0 = Sunday ... 4 = Thursday; None on Friday and Saturday."""
    index = (day.weekday() + 1) % 7  # Python: Monday = 0 ... Sunday = 6
    return index if index <= 4 else None


def week_start(day: date) -> date:
    """The Sunday that opens the school week containing ``day`` (Fri/Sat belong to the past week)."""
    return day - timedelta(days=(day.weekday() + 1) % 7)


def week_days(day: date) -> list[date]:
    start = week_start(day)
    return [start + timedelta(days=offset) for offset in range(5)]


def effective_weekdays(plan: str, weekdays: Iterable[int] | None) -> set[int]:
    if plan == "monthly":
        return set(ALL_SCHOOL_DAYS)
    return {int(value) for value in (weekdays or []) if int(value) in ALL_SCHOOL_DAYS}


def eats_on(enrollment, day: date, holidays: set[date] | frozenset = frozenset()) -> bool:
    """Whether an enrolled student is expected at the canteen on ``day``."""
    weekday = school_weekday(day)
    if weekday is None or day in holidays:
        return False
    if enrollment.start_date and day < enrollment.start_date:
        return False
    if enrollment.end_date and day > enrollment.end_date:
        return False
    return weekday in effective_weekdays(enrollment.plan, enrollment.weekdays)


def holiday_dates(ranges: Iterable[tuple[date | None, date | None]]) -> set[date]:
    """Every date covered by the school's holiday announcements."""
    days: set[date] = set()
    for start, end in ranges:
        if start is None:
            continue
        end = end or start
        current = start
        while current <= end:
            days.add(current)
            current += timedelta(days=1)
    return days


def month_bounds(year: int, month: int) -> tuple[date, date]:
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])


def billable_days(enrollment, year: int, month: int, holidays: set[date]) -> int:
    first, last = month_bounds(year, month)
    count = 0
    current = first
    while current <= last:
        if eats_on(enrollment, current, holidays):
            count += 1
        current += timedelta(days=1)
    return count


def monthly_amount(
    enrollment,
    year: int,
    month: int,
    *,
    monthly_price: Decimal,
    daily_price: Decimal,
    holidays: set[date],
) -> Decimal:
    """What a student owes for the canteen that month (0 if not enrolled then).

    ``monthly`` plan: the flat price as soon as the student eats at least one
    day that month. ``days`` plan: the daily price per school day on their
    weekdays, holidays excluded.
    """
    days = billable_days(enrollment, year, month, holidays)
    if days == 0:
        return Decimal("0")
    if enrollment.plan == "monthly":
        return monthly_price.quantize(Decimal("0.01"))
    return (daily_price * days).quantize(Decimal("0.01"))


def billing_label(year: int, month: int) -> str:
    return f"Cantine {FRENCH_MONTHS[month - 1]} {year}"


@dataclass
class Headcount:
    day: date
    total: int = 0
    by_class: dict[str, dict] = field(default_factory=dict)
    by_diet: dict[str, int] = field(default_factory=dict)
    students: list[dict] = field(default_factory=list)
    absent: int = 0


def compute_headcount(
    day: date,
    enrollments: Iterable,
    *,
    names: dict[str, str],
    classes: dict[str, tuple[str, str]],
    absent_ids: set[str],
    classes_with_attendance: set[str],
    alerts: dict[str, str],
    holidays: set[date] = frozenset(),
) -> Headcount:
    """Expected meals: enrolled for that weekday, minus students marked absent that day.

    ``classes`` maps a student to (class_id, class_name). A class whose roll has
    not been taken yet is flagged so the kitchen knows the count may still drop.
    """
    result = Headcount(day=day)
    for enrollment in enrollments:
        if not eats_on(enrollment, day, holidays):
            continue
        student_id = enrollment.student_id
        class_id, class_name = classes.get(student_id, ("", "-"))
        bucket = result.by_class.setdefault(
            class_id,
            {"class_id": class_id or None, "class_name": class_name, "expected": 0, "absent": 0,
             "attendance_taken": class_id in classes_with_attendance},
        )
        if student_id in absent_ids:
            bucket["absent"] += 1
            result.absent += 1
            continue
        bucket["expected"] += 1
        result.total += 1
        result.by_diet[enrollment.diet] = result.by_diet.get(enrollment.diet, 0) + 1
        result.students.append({
            "student_id": student_id,
            "student_name": names.get(student_id, ""),
            "class_name": class_name,
            "diet": enrollment.diet,
            "diet_note": enrollment.diet_note,
            "alert": alerts.get(student_id),
        })
    result.students.sort(key=lambda item: (item["class_name"], item["student_name"]))
    return result
