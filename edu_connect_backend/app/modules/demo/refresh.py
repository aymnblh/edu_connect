"""Keeps the public demo school fresh: rebuilt once a day so its dates stay current."""
from datetime import date, datetime

from sqlalchemy import select, text

from app.core.config import settings
from app.core.rls import set_request_rls_context
from app.db.database import AsyncSessionLocal, engine
from app.models import School
from app.modules.demo.access import DEMO_SCHOOL_NAME
from app.modules.schools.calendar import ALGERIA_TZ

# Rebuild after this hour (Algeria time), when nobody is likely to be visiting.
REFRESH_HOUR = 3
# Arbitrary constant shared by every worker, so only one rebuilds at a time.
DEMO_LOCK_KEY = 7_160_423


def demo_is_stale(seeded_on: str | None, now: datetime) -> bool:
    """Whether the demo school must be rebuilt now."""
    if not seeded_on:
        return True
    try:
        seeded = date.fromisoformat(seeded_on)
    except ValueError:
        return True
    days_old = (now.date() - seeded).days
    return days_old >= 2 or (days_old == 1 and now.hour >= REFRESH_HOUR)


async def _demo_seeded_on() -> tuple[bool, str | None]:
    async with AsyncSessionLocal() as db:
        await set_request_rls_context(db, is_system_admin=True)
        school = (await db.execute(select(School).where(School.name == DEMO_SCHOOL_NAME))).scalar_one_or_none()
        return school is not None, (school.tenant_config or {}).get("seeded_on") if school else None


async def refresh_demo_if_stale(now: datetime | None = None) -> bool:
    """Seed or rebuild the demo school when it is missing or out of date."""
    if not settings.public_demo_enabled:
        return False
    now = now or datetime.now(ALGERIA_TZ)
    _, seeded_on = await _demo_seeded_on()
    if not demo_is_stale(seeded_on, now):
        return False

    async with engine.connect() as conn:
        if not await conn.scalar(text("SELECT pg_try_advisory_lock(:key)"), {"key": DEMO_LOCK_KEY}):
            return False
        try:
            # Another worker may have rebuilt it while we waited.
            _, seeded_on = await _demo_seeded_on()
            if not demo_is_stale(seeded_on, now):
                return False
            from scripts.seed_demo_presentation_data import seed_demo_data

            await seed_demo_data(reset_demo=True, accounts_output=None, force=False)
            return True
        finally:
            await conn.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": DEMO_LOCK_KEY})
