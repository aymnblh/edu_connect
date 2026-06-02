'''app/modules/auth/dependencies.py'''
"""Centralized authentication and authorization dependencies for FastAPI.
These utilities replace scattered inline role checks and ensure school‑level data isolation
across all endpoints.
"""
from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.models import User
from sqlalchemy import select
from typing import Callable, List
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Role‑based dependency helpers
# ---------------------------------------------------------------------------

def require_roles(allowed_roles: List[str]):
    """Factory that returns a dependency ensuring the current user has one of the allowed roles.

    Usage::
        admin_user = Depends(require_roles(["principal", "secretary"]))
    """
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed_roles:
            logger.warning(
                "Unauthorized role access attempt",
                extra={"user_id": current_user.id, "required": allowed_roles, "actual": current_user.role.value},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")
        return current_user
    return dependency

# Shortcut for admin‑only routes (principal or secretary)
require_admin = require_roles(["principal", "secretary"])

# ---------------------------------------------------------------------------
# School‑scoped query helper
# ---------------------------------------------------------------------------

async def scoped_query(model, obj_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return a single instance of *model* filtered by both its primary key and the
    requesting user's ``school_id``.

    Raises ``HTTPException(403)`` if the object exists but belongs to a different school.
    """
    stmt = select(model).where(model.id == obj_id)
    if current_user.role.value != "system_admin" and hasattr(model, "school_id"):
        stmt = stmt.where(model.school_id == current_user.school_id)
    result = await db.execute(stmt)
    instance = result.scalar_one_or_none()
    if instance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    # System admin bypasses school filter
    if current_user.role.value != "system_admin" and getattr(instance, "school_id", None) != current_user.school_id:
        logger.warning(
            "Cross‑school data access attempt",
            extra={"user_id": current_user.id, "model": model.__name__, "obj_id": obj_id},
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")
    return instance

# ---------------------------------------------------------------------------
# Audit logging utility (can be used directly in routes)
# ---------------------------------------------------------------------------

def audit_log(action: str, *, user: User, target: str = "", details: dict | None = None):
    """Convenient wrapper around the standard logger for security‑relevant events.
    ``action`` is a short string like ``"create_student"``.
    """
    log_data = {"user_id": user.id, "action": action, "target": target}
    if details:
        log_data.update(details)
    logger.info("Security audit", extra=log_data)

# Export symbols for easy import
__all__ = [
    "require_admin",
    "require_roles",
    "scoped_query",
    "audit_log",
]
