"""Keeps the public demo school fresh: rebuilt once a day so its dates stay current."""
import asyncio
from datetime import date, datetime
import logging
from weakref import WeakKeyDictionary

from sqlalchemy import select, text

from app.core.config import settings
from app.core.rls import set_request_rls_context
from app.db.database import AsyncSessionLocal, engine
from app.models import School, User
from app.modules.demo.access import DEMO_ROLE_ACCOUNTS, DEMO_SCHOOL_NAME
from app.modules.schools.calendar import ALGERIA_TZ

logger = logging.getLogger(__name__)

# Rebuild after this hour (Algeria time), when nobody is likely to be visiting.
REFRESH_HOUR = 3
# Arbitrary constant shared by every worker, so only one rebuilds at a time.
DEMO_LOCK_KEY = 7_160_424
_ensure_locks: WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Lock] = WeakKeyDictionary()
_last_error: str | None = None


def last_refresh_error() -> str | None:
    return _last_error


def _loop_lock() -> asyncio.Lock:
    loop = asyncio.get_running_loop()
    lock = _ensure_locks.get(loop)
    if lock is None:
        lock = asyncio.Lock()
        _ensure_locks[loop] = lock
    return lock


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


async def _demo_state() -> tuple[bool, str | None, bool]:
    """Return whether the demo school exists cleanly, its seed date, and whether demo accounts are ready."""
    async with AsyncSessionLocal() as db:
        await set_request_rls_context(db, is_system_admin=True)
        schools = (
            await db.execute(select(School).where(School.name == DEMO_SCHOOL_NAME))
        ).scalars().all()
        if len(schools) != 1:
            return False, None, False
        school = schools[0]
        seeded_on = (school.tenant_config or {}).get("seeded_on")
        await set_request_rls_context(db, school_id=school.id, is_system_admin=True)
        expected_emails = list(DEMO_ROLE_ACCOUNTS.values())
        users = (
            await db.execute(select(User).where(User.email.in_(expected_emails)))
        ).scalars().all()
        by_email = {user.email: user for user in users}
        accounts_ready = all(
            (u := by_email.get(email)) is not None
            and u.school_id == school.id
            and u.deactivated_at is None
            and u.password_hash is not None
            for email in expected_emails
        )
        return True, seeded_on, accounts_ready


def _needs_rebuild(exists: bool, seeded_on: str | None, accounts_ready: bool, now: datetime) -> bool:
    return not exists or not accounts_ready or demo_is_stale(seeded_on, now)


async def refresh_demo_if_stale(now: datetime | None = None) -> bool:
    """Seed or rebuild the demo school when it is missing, incomplete, or out of date."""
    global _last_error
    if not settings.public_demo_enabled:
        return False
    now = now or datetime.now(ALGERIA_TZ)
    async with _loop_lock():
        exists, seeded_on, accounts_ready = await _demo_state()
        if not _needs_rebuild(exists, seeded_on, accounts_ready, now):
            _last_error = None
            return False

        async with engine.connect() as conn:
            if not await conn.scalar(text("SELECT pg_try_advisory_lock(:key)"), {"key": DEMO_LOCK_KEY}):
                return False
            await conn.commit()
            try:
                # Another worker may have rebuilt it while we waited.
                exists, seeded_on, accounts_ready = await _demo_state()
                if not _needs_rebuild(exists, seeded_on, accounts_ready, now):
                    _last_error = None
                    return False
                from scripts.seed_demo_presentation_data import seed_demo_data

                await seed_demo_data(reset_demo=True, accounts_output=None, force=False)
                _last_error = None
                return True
            except Exception as exc:
                _last_error = f"{type(exc).__name__}: {str(exc).splitlines()[0][:200]}"
                raise
            finally:
                try:
                    await asyncio.shield(
                        conn.execute(text("SELECT pg_advisory_unlock_all()"))
                    )
                    await asyncio.shield(conn.commit())
                except Exception:
                    logger.warning("Failed to release public demo advisory lock", exc_info=True)


async def ensure_demo_ready(now: datetime | None = None) -> bool:
    """Ensure demo accounts exist when a visitor clicks demo before background seeding finishes."""
    global _last_error
    if not settings.public_demo_enabled or settings.app_env.lower() in {"test", "testing"}:
        return False
    try:
        await refresh_demo_if_stale(now=now)
    except Exception as exc:
        _last_error = f"{type(exc).__name__}: {str(exc).splitlines()[0][:200]}"
        logger.exception("On-demand public demo initialization failed")
        return False
    exists, _, accounts_ready = await _demo_state()
    return exists and accounts_ready
