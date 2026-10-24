"""Algerian school calendar helpers."""
from datetime import datetime, timedelta, timezone

# Algeria uses UTC+1 all year (no daylight saving time).
ALGERIA_TZ = timezone(timedelta(hours=1), "Africa/Algiers")

# (name, start_month, start_day, end_month, end_day); the school year starts in September.
ALGERIAN_TRIMESTERS = [
    ("Trimester 1", 9, 15, 12, 15),
    ("Trimester 2", 1, 5, 3, 25),
    ("Trimester 3", 4, 5, 7, 5),
]


def school_year_start(now: datetime) -> int:
    """Calendar year in which the current school year began (September to August)."""
    return now.year if now.month >= 9 else now.year - 1


def algerian_trimesters(now: datetime | None = None) -> list[tuple[str, datetime, datetime, bool]]:
    """Trimesters of the current school year as (name, start, end, is_active).

    The trimester containing ``now`` is active; between trimesters (or in
    summer) the first trimester is.
    """
    now = now or datetime.now(timezone.utc)
    first_year = school_year_start(now)
    trimesters = []
    for name, sm, sd, em, ed in ALGERIAN_TRIMESTERS:
        start = datetime(first_year if sm >= 9 else first_year + 1, sm, sd, tzinfo=timezone.utc)
        end = datetime(first_year if em >= 9 else first_year + 1, em, ed, tzinfo=timezone.utc)
        trimesters.append((name, start, end))
    today = now.date()
    current = next((name for name, start, end in trimesters if start.date() <= today <= end.date()), None)
    active = current or trimesters[0][0]
    return [(name, start, end, name == active) for name, start, end in trimesters]
