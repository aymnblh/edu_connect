from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.rls import set_request_rls_context
from app.core.security import get_password_hash
from app.db.database import AsyncSessionLocal
from app.modules.auth.routers.auth import TERMS_VERSION
from app.modules.demo.access import DEMO_DOMAIN
from app.modules.users.models import User, UserRole

logger = logging.getLogger(__name__)

MIN_BOOTSTRAP_PASSWORD_LENGTH = 12


async def bootstrap_superadmin_if_configured(session_factory=AsyncSessionLocal) -> str | None:
    """Create or reset a platform SuperAdmin at startup when explicitly configured.

    Intended for environments without interactive shell access (e.g. Render Free).
    Refuses demo-domain addresses (wiped by nightly demo refresh) and never
    escalates an existing non-admin account.
    """
    email = settings.superadmin_bootstrap_email.strip().lower()
    password = settings.superadmin_bootstrap_password.strip()
    full_name = settings.superadmin_bootstrap_name.strip() or "Super Administrateur"

    if not email and not password:
        return None
    if not email or not password:
        logger.warning(
            "SuperAdmin bootstrap skipped: both SUPERADMIN_BOOTSTRAP_EMAIL and "
            "SUPERADMIN_BOOTSTRAP_PASSWORD must be set."
        )
        return "skipped_incomplete"
    if "@" not in email or email.endswith(f"@{DEMO_DOMAIN}"):
        logger.warning(
            "SuperAdmin bootstrap skipped: email must be a valid non-demo address "
            "(addresses under @%s are wiped by demo refresh).",
            DEMO_DOMAIN,
        )
        return "skipped_invalid_email"
    if len(password) < MIN_BOOTSTRAP_PASSWORD_LENGTH:
        logger.warning(
            "SuperAdmin bootstrap skipped: SUPERADMIN_BOOTSTRAP_PASSWORD must be at least %d characters.",
            MIN_BOOTSTRAP_PASSWORD_LENGTH,
        )
        return "skipped_weak_password"

    now = datetime.now(timezone.utc)
    password_hash = get_password_hash(password)

    async with session_factory() as db:
        await set_request_rls_context(db, is_system_admin=True)
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()

        if existing is not None:
            if existing.role != UserRole.system_admin:
                logger.warning(
                    "SuperAdmin bootstrap refused: %s already belongs to a %s account.",
                    email,
                    existing.role.value,
                )
                return "refused_non_admin"
            existing.full_name = full_name
            existing.school_id = None
            existing.password_hash = password_hash
            existing.deactivated_at = None
            existing.terms_accepted_at = existing.terms_accepted_at or now
            existing.terms_version = existing.terms_version or TERMS_VERSION
            existing.token_version = (existing.token_version or 0) + 1
            await db.commit()
            logger.info("SuperAdmin bootstrap updated existing account: %s", email)
            return "updated"

        db.add(
            User(
                id=str(uuid.uuid4()),
                school_id=None,
                email=email,
                full_name=full_name,
                role=UserRole.system_admin,
                password_hash=password_hash,
                terms_accepted_at=now,
                terms_version=TERMS_VERSION,
            )
        )
        await db.commit()
        logger.info("SuperAdmin bootstrap created account: %s", email)
        return "created"
