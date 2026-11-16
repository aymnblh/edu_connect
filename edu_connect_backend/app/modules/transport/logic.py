"""School transport business rules: schedules, rider lists, check-in state and billing."""
import re
from collections.abc import Iterable
from datetime import date, datetime, time, timedelta

from app.modules.canteen.logic import FRENCH_MONTHS, month_bounds, school_weekday
from app.modules.schools.calendar import ALGERIA_TZ

_HHMM_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def parse_hhmm(value: str | None) -> time | None:
    """Validate and parse an ``HH:MM`` string (00:00..23:59). Returns None when empty."""
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    match = _HHMM_RE.match(cleaned)
    if not match:
        raise ValueError("Heure attendue au format HH:MM (00:00 - 23:59).")
    return time(int(match.group(1)), int(match.group(2)))


def rides_on(
    assignment,
    day: date,
    direction: str,
    excepted_student_ids: set[str] | frozenset[str] = frozenset(),
    holidays: set[date] | frozenset[date] = frozenset(),
) -> bool:
    """Whether a student with ``assignment`` is expected on the bus on ``day`` in ``direction``."""
    if school_weekday(day) is None or day in holidays:
        return False
    if assignment.start_date and day < assignment.start_date:
        return False
    if assignment.end_date and day > assignment.end_date:
        return False
    if assignment.direction not in ("both", direction):
        return False
    if assignment.student_id in excepted_student_ids:
        return False
    return True


def rides_in_month(assignment, year: int, month: int, holidays: set[date] | frozenset[date] = frozenset()) -> bool:
    """Whether an assignment covers at least one school day in the given month."""
    first, last = month_bounds(year, month)
    current = first
    while current <= last:
        if school_weekday(current) is not None and current not in holidays:
            if (not assignment.start_date or current >= assignment.start_date) and (
                not assignment.end_date or current <= assignment.end_date
            ):
                return True
        current += timedelta(days=1)
    return False


def can_parent_declare_exception(
    now: datetime,
    day: date,
    stop_time: str | None,
    cutoff_minutes: int = 30,
) -> bool:
    """Parents may declare a bus absence up to ``cutoff_minutes`` before the scheduled stop time."""
    local_now = now.astimezone(ALGERIA_TZ)
    today = local_now.date()
    if day < today:
        return False
    if day == today and stop_time:
        parsed = parse_hhmm(stop_time)
        if parsed is not None:
            cutoff_at = datetime.combine(day, parsed, tzinfo=ALGERIA_TZ) - timedelta(minutes=cutoff_minutes)
            if local_now > cutoff_at:
                return False
    return True


def student_trip_states(events: Iterable) -> dict[str, str]:
    """Return each student's latest check-in kind (``boarded``, ``dropped``, ``no_show``) in chronological order."""
    ordered = sorted(events, key=lambda event: (getattr(event, "recorded_at", None) or datetime.min))
    states: dict[str, str] = {}
    for event in ordered:
        states[event.student_id] = event.kind
    return states


def unaccounted_boarded_students(events: Iterable) -> list[str]:
    """Sorted student IDs who boarded and were never dropped off (forgotten-child safety check)."""
    states = student_trip_states(events)
    return sorted(student_id for student_id, kind in states.items() if kind == "boarded")


def first_emergency_contact(contacts: list | None) -> dict | None:
    """Expose only the first emergency contact (name, relationship, phone) to the bus driver."""
    if not contacts:
        return None
    for item in contacts:
        if isinstance(item, dict) and (item.get("name") or item.get("phone")):
            return {
                "name": item.get("name") or "",
                "relationship": item.get("relationship") or "",
                "phone": item.get("phone") or "",
            }
    return None


def billing_label(year: int, month: int) -> str:
    return f"Transport {FRENCH_MONTHS[month - 1]} {year}"
