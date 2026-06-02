import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rls import (
    set_audit_event_write_context,
    set_audit_retention_context,
    set_request_rls_context,
)
from app.models import AuditEvent, User

logger = logging.getLogger(__name__)


async def record_audit_event(
    db: AsyncSession,
    *,
    action: str,
    actor: User | None = None,
    school_id: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    method: str | None = None,
    path: str | None = None,
    status_code: int | None = None,
    ip_address: str | None = None,
    device_fingerprint: str | None = None,
    device_platform: str | None = None,
    user_agent: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    resolved_school_id = school_id if school_id is not None else (actor.school_id if actor else None)
    await set_request_rls_context(
        db,
        school_id=resolved_school_id,
        is_system_admin=bool(actor and actor.role.value == "system_admin"),
    )
    if resolved_school_id is None:
        await set_audit_event_write_context(db)

    event = AuditEvent(
        school_id=resolved_school_id,
        actor_id=actor.id if actor else None,
        actor_role=actor.role.value if actor else None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        method=method,
        path=path,
        status_code=status_code,
        ip_address=ip_address,
        device_fingerprint=device_fingerprint,
        device_platform=device_platform,
        user_agent=user_agent,
        event_metadata=metadata,
    )
    db.add(event)
    try:
        await db.flush()
    except Exception:
        logger.exception("Failed to record audit event")
        raise


async def purge_expired_audit_events(
    db: AsyncSession,
    *,
    now: datetime | None = None,
) -> tuple[int, datetime]:
    retention_days = max(settings.audit_retention_days, 1)
    cutoff = (now or datetime.now(timezone.utc)) - timedelta(days=retention_days)
    await set_audit_retention_context(db)
    result = await db.execute(delete(AuditEvent).where(AuditEvent.created_at < cutoff))
    return result.rowcount or 0, cutoff
