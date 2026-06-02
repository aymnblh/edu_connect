import logging
import time
from collections import defaultdict
from datetime import datetime, timezone

import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_event
from app.core.config import settings
from app.core.rls import set_request_rls_context
from app.models import User, UserRole
from app.utils.notifications import create_notification

logger = logging.getLogger(__name__)

_memory_counters: dict[str, tuple[int, float]] = {}
_memory_cooldowns: dict[str, float] = {}
_redis_client: redis.Redis | None = None
_redis_failed_at: float | None = None
_redis_retry_after_seconds = 30.0


def _redis_available_for_attempt() -> bool:
    if _redis_failed_at is None:
        return True
    return (time.monotonic() - _redis_failed_at) >= _redis_retry_after_seconds


def _get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


def _bucket_key(*, school_id: str | None, ip_address: str, status_code: int) -> str:
    school_part = school_id or "global"
    return f"educonnect:security_alert:{school_part}:{ip_address}:{status_code}"


def _cooldown_key(bucket_key: str) -> str:
    return f"{bucket_key}:cooldown"


def _memory_increment(bucket_key: str, *, window_seconds: int) -> int:
    now = time.monotonic()
    count, expires_at = _memory_counters.get(bucket_key, (0, now + window_seconds))
    if now >= expires_at:
        count = 0
        expires_at = now + window_seconds
    count += 1
    _memory_counters[bucket_key] = (count, expires_at)
    return count


def _memory_cooldown_active(cooldown_key: str) -> bool:
    expires_at = _memory_cooldowns.get(cooldown_key)
    if not expires_at:
        return False
    if time.monotonic() >= expires_at:
        _memory_cooldowns.pop(cooldown_key, None)
        return False
    return True


def _memory_set_cooldown(cooldown_key: str, *, cooldown_seconds: int) -> None:
    _memory_cooldowns[cooldown_key] = time.monotonic() + cooldown_seconds


async def _increment_and_check_alert(bucket_key: str) -> tuple[int, bool]:
    threshold = max(settings.security_alert_threshold, 1)
    window_seconds = max(settings.security_alert_window_seconds, 1)
    cooldown_seconds = max(settings.security_alert_cooldown_seconds, 1)
    cooldown_key = _cooldown_key(bucket_key)

    global _redis_failed_at
    if settings.app_env.lower() not in {"test", "testing"} and _redis_available_for_attempt():
        try:
            client = _get_redis_client()
            count = await client.incr(bucket_key)
            if count == 1:
                await client.expire(bucket_key, window_seconds)
            if count < threshold:
                return count, False
            cooldown_started = await client.set(cooldown_key, "1", ex=cooldown_seconds, nx=True)
            _redis_failed_at = None
            return count, bool(cooldown_started)
        except Exception as exc:
            _redis_failed_at = time.monotonic()
            logger.warning("Redis security alert counter unavailable: %s", exc)

    count = _memory_increment(bucket_key, window_seconds=window_seconds)
    if count < threshold or _memory_cooldown_active(cooldown_key):
        return count, False
    _memory_set_cooldown(cooldown_key, cooldown_seconds=cooldown_seconds)
    return count, True


async def _notify_school_admins(
    db: AsyncSession,
    *,
    school_id: str,
    status_code: int,
    count: int,
    ip_address: str,
    path: str,
) -> None:
    await set_request_rls_context(db, school_id=school_id)
    result = await db.execute(
        select(User).where(
            User.school_id == school_id,
            User.role.in_([UserRole.principal, UserRole.secretary]),
        )
    )
    admins = result.scalars().all()
    for admin in admins:
        await create_notification(
            db,
            user_id=admin.id,
            title="Alerte securite",
            content=(
                f"{count} reponses {status_code} detectees depuis {ip_address} "
                f"sur {path}. Consultez les journaux d'audit."
            ),
            type="SECURITY",
            school_id=school_id,
        )


async def record_security_response_if_needed(
    db: AsyncSession,
    *,
    status_code: int,
    path: str,
    method: str,
    ip_address: str | None,
    device_fingerprint: str | None = None,
    device_platform: str | None = None,
    user_agent: str | None = None,
    actor_id: str | None = None,
    actor_role: str | None = None,
    school_id: str | None = None,
) -> bool:
    if status_code not in settings.security_alert_codes:
        return False

    source_ip = ip_address or "unknown"
    bucket_key = _bucket_key(school_id=school_id, ip_address=source_ip, status_code=status_code)
    count, should_alert = await _increment_and_check_alert(bucket_key)
    if not should_alert:
        return False

    actor = None
    if actor_id:
        await set_request_rls_context(
            db,
            school_id=school_id,
            is_system_admin=actor_role == UserRole.system_admin.value,
        )
        actor = await db.get(User, actor_id)

    await record_audit_event(
        db,
        action="security.response_spike",
        actor=actor,
        school_id=school_id,
        resource_type="security_alert",
        method=method,
        path=path,
        status_code=status_code,
        ip_address=source_ip,
        device_fingerprint=device_fingerprint,
        device_platform=device_platform,
        user_agent=user_agent,
        metadata={
            "status_code": status_code,
            "count": count,
            "threshold": settings.security_alert_threshold,
            "window_seconds": settings.security_alert_window_seconds,
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    if school_id:
        await _notify_school_admins(
            db,
            school_id=school_id,
            status_code=status_code,
            count=count,
            ip_address=source_ip,
            path=path,
        )

    return True
