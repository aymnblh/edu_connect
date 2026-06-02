from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.rls import set_request_rls_context
from app.core.security import get_password_hash
from app.db.database import AsyncSessionLocal
from app.models import User, UserRole


TERMS_VERSION = "privacy-terms-2026-05-13"


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required.")
    return value


async def main() -> int:
    email = required_env("SUPERADMIN_EMAIL").lower()
    password = required_env("SUPERADMIN_PASSWORD")
    full_name = os.getenv("SUPERADMIN_NAME", "Super Administrateur").strip() or "Super Administrateur"

    async with AsyncSessionLocal() as db:
        await set_request_rls_context(db, is_system_admin=True)

        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()

        if existing:
            existing.full_name = full_name
            existing.role = UserRole.system_admin
            existing.school_id = None
            existing.password_hash = get_password_hash(password)
            existing.terms_accepted_at = existing.terms_accepted_at or datetime.now(timezone.utc)
            existing.terms_version = existing.terms_version or TERMS_VERSION
            await db.commit()
            print(f"Updated superadmin: {email}")
            return 0

        user = User(
            id=str(uuid.uuid4()),
            school_id=None,
            email=email,
            full_name=full_name,
            role=UserRole.system_admin,
            password_hash=get_password_hash(password),
            terms_accepted_at=datetime.now(timezone.utc),
            terms_version=TERMS_VERSION,
        )
        db.add(user)
        await db.commit()
        print(f"Created superadmin: {email}")
        return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
