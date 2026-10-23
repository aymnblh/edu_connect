"""Subscriptions at activation: the free first trimester and the referral reward."""
import calendar
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rls import set_request_rls_context
from app.models import School, User, UserRole
from app.modules.schools.calendar import algerian_trimesters
from app.utils.notifications import create_notification

REFERRAL_REWARD_MONTHS = 2
# A trimester with less than this left is not much of a trial: run to the next one.
TRIAL_MIN_DAYS = 30
# Unambiguous letters and digits (no 0/O, 1/I/L) for codes read aloud or typed.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def new_referral_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))


def add_months(moment: datetime, months: int) -> datetime:
    """Same day ``months`` later, clamped to the end of shorter months."""
    month = moment.month - 1 + months
    year = moment.year + month // 12
    month = month % 12 + 1
    day = min(moment.day, calendar.monthrange(year, month)[1])
    return moment.replace(year=year, month=month, day=day)


def free_trial_end(now: datetime) -> datetime:
    """End of the trimester in progress (or the next one if it ends within a month)."""
    trimesters = algerian_trimesters(now)
    for _name, start, end, _active in trimesters:
        closing = end + timedelta(days=1)
        if closing > now and (closing - now).days >= TRIAL_MIN_DAYS:
            return closing
    # Summer or the last weeks of the school year: through the next first trimester.
    next_year = algerian_trimesters(now + timedelta(days=120))
    return next_year[0][2] + timedelta(days=1)


def extend_subscription(school: School, months: int, now: datetime) -> datetime:
    start = school.subscription_expires_at
    if start is not None and start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if start is None or start < now:
        start = now
    school.subscription_expires_at = add_months(start, months)
    return school.subscription_expires_at


async def _notify_directors(db: AsyncSession, school_id: str, title: str, content: str) -> None:
    # Notifications only accept rows of the current school, even for the platform.
    await set_request_rls_context(db, school_id=school_id, is_system_admin=True)
    directors = (
        await db.execute(
            select(User.id).where(
                User.school_id == school_id, User.role == UserRole.principal, User.deactivated_at.is_(None)
            )
        )
    ).scalars().all()
    for director_id in directors:
        await create_notification(db, user_id=director_id, title=title, content=content, type="SUCCESS", school_id=school_id)


async def apply_activation_benefits(db: AsyncSession, school: School, now: datetime | None = None) -> dict:
    """Free first trimester for a school that never had a subscription, then the
    referral reward for both schools (once). Returns what was applied."""
    now = now or datetime.now(timezone.utc)
    applied: dict = {}
    if school.subscription_expires_at is None:
        school.subscription_expires_at = free_trial_end(now)
        applied["trial_until"] = school.subscription_expires_at.isoformat()

    config = dict(school.tenant_config or {})
    if school.referred_by and not config.get("referral_rewarded_at"):
        sponsor = await db.get(School, school.referred_by)
        if sponsor is not None:
            extend_subscription(school, REFERRAL_REWARD_MONTHS, now)
            extend_subscription(sponsor, REFERRAL_REWARD_MONTHS, now)
            config["referral_rewarded_at"] = now.isoformat()
            school.tenant_config = config
            applied["referral_reward_months"] = REFERRAL_REWARD_MONTHS
            applied["sponsor"] = sponsor.name
            await _notify_directors(
                db, sponsor.id, "Parrainage récompensé",
                f"{school.name} a rejoint Wasel Edu grâce à vous : {REFERRAL_REWARD_MONTHS} mois offerts sur votre abonnement. Merci !",
            )
            await _notify_directors(
                db, school.id, "Bienvenue sur Wasel Edu",
                f"Parrainé par {sponsor.name} : {REFERRAL_REWARD_MONTHS} mois offerts en plus de votre premier trimestre.",
            )
    return applied
