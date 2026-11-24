"""SuperAdmin user management endpoints across all schools and platform admins."""
from datetime import datetime, timezone
from typing import Literal
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_event
from app.core.security import get_current_user, get_password_hash
from app.db.database import get_db
from app.models import RefreshToken, School, User, UserRole

router = APIRouter(tags=["System Administration"])

TERMS_VERSION = "privacy-terms-2026-10-24"


def _require_system_admin(current_user: User) -> User:
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Unprivileged")
    return current_user


class SystemUserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    school_id: str | None = None
    school_name: str | None = None
    phone: str | None = None
    is_active: bool
    deactivated_at: str | None = None
    has_password: bool
    active_session_count: int = 0
    created_at: str | None = None


class SystemUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole
    password: str = Field(min_length=8, max_length=128)
    school_id: str | None = None
    phone: str | None = Field(default=None, max_length=50)


class SystemUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    role: UserRole | None = None
    school_id: str | None = None
    is_active: bool | None = None


class SystemPasswordResetRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _serialize_user(user: User, school_name: str | None, active_sessions: int = 0) -> SystemUserOut:
    return SystemUserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        school_id=user.school_id,
        school_name=school_name,
        phone=user.phone,
        is_active=user.deactivated_at is None,
        deactivated_at=_iso(user.deactivated_at),
        has_password=bool(user.password_hash),
        active_session_count=active_sessions,
        created_at=_iso(user.created_at),
    )


async def _active_system_admin_count(db: AsyncSession) -> int:
    count = await db.scalar(
        select(func.count(User.id)).where(
            User.role == UserRole.system_admin,
            User.deactivated_at.is_(None),
        )
    )
    return int(count or 0)


@router.get("/users", response_model=list[SystemUserOut])
async def list_system_users(
    school_id: str | None = None,
    role: UserRole | None = None,
    search: str | None = Query(default=None, max_length=120),
    account_status: Literal["all", "active", "deactivated"] = Query(default="all", alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0, le=100_000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: List and filter users across all schools and platform admins."""
    _require_system_admin(current_user)

    stmt = select(User, School.name).outerjoin(School, School.id == User.school_id)
    if school_id == "__platform__":
        stmt = stmt.where(User.school_id.is_(None))
    elif school_id:
        stmt = stmt.where(User.school_id == school_id)

    if role is not None:
        stmt = stmt.where(User.role == role)

    if account_status == "active":
        stmt = stmt.where(User.deactivated_at.is_(None))
    elif account_status == "deactivated":
        stmt = stmt.where(User.deactivated_at.is_not(None))

    if search and search.strip():
        needle = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.email).like(needle),
                func.lower(User.full_name).like(needle),
            )
        )

    rows = (
        await db.execute(stmt.order_by(User.created_at.desc()).offset(offset).limit(limit))
    ).all()
    if not rows:
        return []

    user_ids = [user.id for user, _ in rows]
    now = datetime.now(timezone.utc)
    session_counts = dict(
        (
            await db.execute(
                select(RefreshToken.user_id, func.count(RefreshToken.id))
                .where(
                    RefreshToken.user_id.in_(user_ids),
                    RefreshToken.revoked_at.is_(None),
                    RefreshToken.expires_at > now,
                )
                .group_by(RefreshToken.user_id)
            )
        ).all()
    )

    return [
        _serialize_user(user, school_name, int(session_counts.get(user.id, 0)))
        for user, school_name in rows
    ]


@router.post("/users", response_model=SystemUserOut, status_code=status.HTTP_201_CREATED)
async def create_system_user(
    payload: SystemUserCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Create any user account (school staff, principal, parent, or system_admin)."""
    _require_system_admin(current_user)

    normalized_email = str(payload.email).strip().lower()
    existing = (
        await db.execute(select(User.id).where(func.lower(User.email) == normalized_email))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Cet email est deja utilise.")

    school_name: str | None = None
    target_school_id: str | None = None
    if payload.role == UserRole.system_admin:
        target_school_id = None
    else:
        if not payload.school_id:
            raise HTTPException(status_code=400, detail="Un etablissement est requis pour ce role.")
        school = await db.get(School, payload.school_id)
        if not school:
            raise HTTPException(status_code=404, detail="Etablissement introuvable.")
        target_school_id = school.id
        school_name = school.name

    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid.uuid4()),
        school_id=target_school_id,
        email=normalized_email,
        full_name=payload.full_name.strip(),
        role=payload.role,
        phone=payload.phone.strip() if payload.phone else None,
        password_hash=get_password_hash(payload.password),
        terms_accepted_at=now,
        terms_version=TERMS_VERSION,
    )
    db.add(user)
    await db.flush()

    await record_audit_event(
        db,
        action="system.user_created",
        actor=current_user,
        school_id=target_school_id,
        resource_type="user",
        resource_id=user.id,
        method=request.method,
        path=request.url.path,
        metadata={"email": user.email, "role": user.role.value, "school_name": school_name},
    )
    await db.commit()
    await db.refresh(user)
    return _serialize_user(user, school_name, 0)


@router.patch("/users/{user_id}", response_model=SystemUserOut)
async def update_system_user(
    user_id: str,
    payload: SystemUserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Update user profile, role, school assignment, or active status."""
    _require_system_admin(current_user)

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    fields_set = payload.model_fields_set
    new_role = payload.role if payload.role is not None else user.role
    new_active = payload.is_active if payload.is_active is not None else (user.deactivated_at is None)

    if user.id == current_user.id:
        if payload.is_active is False:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas desactiver votre propre compte.")
        if payload.role is not None and payload.role != UserRole.system_admin:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas retirer votre propre role Super Admin.")

    losing_admin = (
        user.role == UserRole.system_admin
        and user.deactivated_at is None
        and (new_role != UserRole.system_admin or not new_active)
    )
    if losing_admin and await _active_system_admin_count(db) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Impossible de desactiver ou retrograder le dernier Super Admin actif.",
        )

    revoke_tokens = False
    changes: dict[str, object] = {}

    if payload.email is not None:
        normalized_email = str(payload.email).strip().lower()
        if normalized_email != user.email.lower():
            duplicate = (
                await db.execute(
                    select(User.id).where(func.lower(User.email) == normalized_email, User.id != user.id)
                )
            ).scalar_one_or_none()
            if duplicate:
                raise HTTPException(status_code=409, detail="Cet email est deja utilise.")
            user.email = normalized_email
            changes["email"] = normalized_email

    if payload.full_name is not None:
        cleaned_name = payload.full_name.strip()
        if cleaned_name and cleaned_name != user.full_name:
            user.full_name = cleaned_name
            changes["full_name"] = cleaned_name

    if "phone" in fields_set:
        cleaned_phone = payload.phone.strip() if payload.phone else None
        if cleaned_phone != user.phone:
            user.phone = cleaned_phone
            changes["phone"] = cleaned_phone

    if payload.role is not None and payload.role != user.role:
        user.role = payload.role
        changes["role"] = payload.role.value
        revoke_tokens = True

    if new_role == UserRole.system_admin:
        if user.school_id is not None:
            user.school_id = None
            changes["school_id"] = None
            revoke_tokens = True
    else:
        target_school_id = payload.school_id if "school_id" in fields_set else user.school_id
        if not target_school_id:
            raise HTTPException(status_code=400, detail="Un etablissement est requis pour ce role.")
        if target_school_id != user.school_id:
            school = await db.get(School, target_school_id)
            if not school:
                raise HTTPException(status_code=404, detail="Etablissement introuvable.")
            user.school_id = school.id
            changes["school_id"] = school.id
            revoke_tokens = True

    if payload.is_active is not None:
        currently_active = user.deactivated_at is None
        if payload.is_active and not currently_active:
            user.deactivated_at = None
            changes["is_active"] = True
        elif not payload.is_active and currently_active:
            user.deactivated_at = datetime.now(timezone.utc)
            changes["is_active"] = False
            revoke_tokens = True

    if revoke_tokens:
        user.token_version = (user.token_version or 0) + 1
        await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))

    school_name: str | None = None
    if user.school_id:
        school_obj = await db.get(School, user.school_id)
        school_name = school_obj.name if school_obj else None

    await record_audit_event(
        db,
        action="system.user_updated",
        actor=current_user,
        school_id=user.school_id,
        resource_type="user",
        resource_id=user.id,
        method=request.method,
        path=request.url.path,
        metadata={"email": user.email, "changes": changes},
    )
    await db.commit()
    await db.refresh(user)

    now = datetime.now(timezone.utc)
    active_sessions = int(
        await db.scalar(
            select(func.count(RefreshToken.id)).where(
                RefreshToken.user_id == user.id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
        )
        or 0
    )
    return _serialize_user(user, school_name, active_sessions)


@router.post("/users/{user_id}/reset-password")
async def reset_system_user_password(
    user_id: str,
    payload: SystemPasswordResetRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Reset any user's password and revoke all active sessions."""
    _require_system_admin(current_user)

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    user.password_hash = get_password_hash(payload.password)
    user.invite_code = None
    user.invite_expires_at = None
    user.token_version = (user.token_version or 0) + 1
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))

    await record_audit_event(
        db,
        action="system.user_password_reset",
        actor=current_user,
        school_id=user.school_id,
        resource_type="user",
        resource_id=user.id,
        method=request.method,
        path=request.url.path,
        metadata={"email": user.email, "role": user.role.value},
    )
    await db.commit()
    return {"status": "success", "message": "Mot de passe reinitialise et sessions revoquees."}


@router.post("/users/{user_id}/revoke-sessions")
async def revoke_system_user_sessions(
    user_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SuperAdmin only: Force sign-out of all active sessions for a user."""
    _require_system_admin(current_user)

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    user.token_version = (user.token_version or 0) + 1
    deleted = await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))
    revoked_count = int(deleted.rowcount or 0)

    await record_audit_event(
        db,
        action="system.user_sessions_revoked",
        actor=current_user,
        school_id=user.school_id,
        resource_type="user",
        resource_id=user.id,
        method=request.method,
        path=request.url.path,
        metadata={"email": user.email, "revoked_count": revoked_count},
    )
    await db.commit()
    return {
        "status": "success",
        "revoked_count": revoked_count,
        "message": "Sessions de l'utilisateur revoquees.",
    }
