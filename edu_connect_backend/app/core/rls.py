import hashlib

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def set_request_rls_context(
    db: AsyncSession,
    *,
    school_id: str | None = None,
    is_system_admin: bool = False,
) -> None:
    if is_system_admin:
        await db.execute(text("SELECT set_config('app.is_system_admin', 'true', true)"))
    if school_id:
        await db.execute(
            text("SELECT set_config('app.current_school_id', :school_id, true)"),
            {"school_id": str(school_id)},
        )


async def set_auth_lookup_email(db: AsyncSession, email: str) -> None:
    await db.execute(
        text("SELECT set_config('app.auth_lookup_email', :email, true)"),
        {"email": email.strip().lower()},
    )


async def set_auth_invite_code(db: AsyncSession, invite_code: str) -> None:
    await db.execute(
        text("SELECT set_config('app.auth_invite_code', :invite_code, true)"),
        {"invite_code": invite_code.strip()},
    )


async def set_auth_user_id(db: AsyncSession, user_id: str) -> None:
    await db.execute(
        text("SELECT set_config('app.auth_user_id', :user_id, true)"),
        {"user_id": str(user_id)},
    )


async def set_pending_link_token(db: AsyncSession, token: str) -> None:
    await db.execute(
        text("SELECT set_config('app.pending_link_token', :token, true)"),
        {"token": token.strip()},
    )


async def set_student_pin_lookup(db: AsyncSession, *, student_id: str, pin: str) -> None:
    await db.execute(
        text("SELECT set_config('app.student_lookup_id', :student_id, true)"),
        {"student_id": student_id.strip()},
    )
    await db.execute(
        text("SELECT set_config('app.student_lookup_pin', :pin, true)"),
        {"pin": pin.strip()},
    )


async def set_refresh_token_lookup(db: AsyncSession, refresh_token: str) -> str:
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    await db.execute(
        text("SELECT set_config('app.refresh_token_hash', :token_hash, true)"),
        {"token_hash": token_hash},
    )
    return token_hash


async def set_refresh_family_lookup(db: AsyncSession, *, user_id: str, family_id: str) -> None:
    await db.execute(
        text("SELECT set_config('app.refresh_token_user_id', :user_id, true)"),
        {"user_id": str(user_id)},
    )
    await db.execute(
        text("SELECT set_config('app.refresh_token_family_id', :family_id, true)"),
        {"family_id": str(family_id)},
    )


async def set_audit_event_write_context(db: AsyncSession) -> None:
    await db.execute(text("SELECT set_config('app.audit_event_write', 'true', true)"))


async def set_audit_retention_context(db: AsyncSession) -> None:
    await db.execute(text("SELECT set_config('app.audit_retention_job', 'true', true)"))


async def set_student_retention_context(db: AsyncSession) -> None:
    await db.execute(text("SELECT set_config('app.student_retention_job', 'true', true)"))
