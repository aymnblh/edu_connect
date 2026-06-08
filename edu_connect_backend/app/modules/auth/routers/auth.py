import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, func, select, update
from pydantic import BaseModel, EmailStr

from app.core.audit import record_audit_event
from app.core.rate_limit import check_rate_limit
from app.core.rls import (
    set_auth_invite_code,
    set_auth_lookup_email,
    set_auth_user_id,
    set_pending_link_token,
    set_refresh_token_lookup,
    set_request_rls_context,
    set_student_pin_lookup,
)
from app.db.database import get_db
from app.models import User, RefreshToken, UserRole
from app.core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token_for_user,
    create_refresh_token,
    get_current_user,
    rotate_refresh_token
)
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
TERMS_VERSION = "privacy-terms-2026-05-13"

def require_terms_accepted(accepted: bool):
    if not accepted:
        raise HTTPException(
            status_code=400,
            detail="Vous devez accepter la politique de confidentialite et les conditions d'utilisation.",
        )

def mark_terms_accepted(user: User):
    user.terms_accepted_at = datetime.now(timezone.utc)
    user.terms_version = TERMS_VERSION

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SetPasswordRequest(BaseModel):
    email: EmailStr
    password: str
    terms_accepted: bool = False

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class SessionOut(BaseModel):
    family_id: str
    device_platform: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime
    last_used_at: datetime | None = None
    expires_at: datetime

    model_config = {"from_attributes": True}


def _session_metadata(request: Request) -> dict:
    return {
        "device_fingerprint": getattr(request.state, "device_fingerprint", None),
        "device_platform": getattr(request.state, "device_platform", None),
        "ip_address": getattr(request.state, "ip_address", None),
        "user_agent": request.headers.get("user-agent"),
    }


async def _enforce_session_limit(db: AsyncSession, user_id: str) -> None:
    max_families = max(settings.max_active_session_families, 1)
    families_res = await db.execute(
        select(RefreshToken.family_id, func.max(RefreshToken.created_at).label("last_created"))
        .where(RefreshToken.user_id == user_id)
        .group_by(RefreshToken.family_id)
        .order_by(func.max(RefreshToken.created_at).desc())
    )
    families = families_res.all()
    stale_family_ids = [family_id for family_id, _ in families[max_families:]]
    if stale_family_ids:
        await db.execute(
            delete(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.family_id.in_(stale_family_ids),
            )
        )


async def _audit_auth(
    db: AsyncSession,
    request: Request,
    *,
    action: str,
    user: User | None = None,
    school_id: str | None = None,
    status_code: int = 200,
    metadata: dict | None = None,
) -> None:
    await record_audit_event(
        db,
        action=action,
        actor=user,
        school_id=school_id,
        resource_type="auth",
        resource_id=user.id if user else None,
        method=request.method,
        path=request.url.path,
        status_code=status_code,
        ip_address=getattr(request.state, "ip_address", None),
        device_fingerprint=getattr(request.state, "device_fingerprint", None),
        device_platform=getattr(request.state, "device_platform", None),
        user_agent=request.headers.get("user-agent"),
        metadata=metadata,
    )

@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip_address = getattr(request.state, "ip_address", "unknown")
    email = str(req.email).lower()
    await check_rate_limit(f"login:{ip_address}:{email}", limit=10, window_seconds=300)

    await set_auth_lookup_email(db, email)
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user:
        await _audit_auth(
            db,
            request,
            action="auth.login_failed",
            status_code=401,
            metadata={"email": email, "reason": "unknown_email"},
        )
        await db.commit()
        raise HTTPException(status_code=401, detail="Identifiants incorrects.")

    await set_request_rls_context(
        db,
        school_id=user.school_id,
        is_system_admin=user.role == UserRole.system_admin,
    )

    # Migration Check: password_hash IS NULL
    if user.password_hash is None:
        await _audit_auth(
            db,
            request,
            action="auth.password_setup_required",
            user=user,
            status_code=403,
        )
        await db.commit()
        raise HTTPException(
            status_code=403, 
            detail={"code": "password_setup_required", "message": "Veuillez définir votre mot de passe pour continuer."}
        )

    if not verify_password(req.password, user.password_hash):
        await _audit_auth(
            db,
            request,
            action="auth.login_failed",
            user=user,
            status_code=401,
            metadata={"reason": "bad_password"},
        )
        await db.commit()
        raise HTTPException(status_code=401, detail="Identifiants incorrects.")

    # Issue Tokens
    family_id = str(uuid.uuid4())
    access_token = create_access_token_for_user(user)
    refresh_token = create_refresh_token(user.id, family_id)
    session_metadata = _session_metadata(request)
    existing_session_res = await db.execute(
        select(RefreshToken.id).where(RefreshToken.user_id == user.id).limit(1)
    )
    device_res = await db.execute(
        select(RefreshToken.id)
        .where(
            RefreshToken.user_id == user.id,
            RefreshToken.device_fingerprint == session_metadata.get("device_fingerprint"),
        )
        .limit(1)
    )
    should_alert_new_device = (
        existing_session_res.scalar_one_or_none() is not None
        and device_res.scalar_one_or_none() is None
    )

    # Save Refresh Token
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    db_token = RefreshToken(
        school_id=user.school_id,
        user_id=user.id,
        token_hash=token_hash,
        family_id=family_id,
        **session_metadata,
        last_used_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(db_token)
    if should_alert_new_device and user.school_id:
        from app.utils.notifications import create_notification

        await create_notification(
            db,
            user_id=user.id,
            title="Nouvelle connexion",
            content="Une connexion a ete detectee depuis un nouvel appareil.",
            type="SECURITY",
            school_id=user.school_id,
        )
    await _enforce_session_limit(db, user.id)
    await _audit_auth(db, request, action="auth.login_success", user=user)
    await db.commit()

    return {"access_token": access_token, "refresh_token": refresh_token}

@router.post("/set-password")
async def set_password(req: SetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Initial password setup for migrated or invited users."""
    require_terms_accepted(req.terms_accepted)

    await set_auth_lookup_email(db, str(req.email).lower())
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")

    if user.password_hash is not None:
        raise HTTPException(
            status_code=409, 
            detail="Un mot de passe est déjà défini. Utilisez la procédure de changement de mot de passe."
        )

    await set_request_rls_context(
        db,
        school_id=user.school_id,
        is_system_admin=user.role == UserRole.system_admin,
    )

    # Set password
    user.password_hash = get_password_hash(req.password)
    mark_terms_accepted(user)
    await db.commit()

    return {"message": "Mot de passe défini avec succès. Vous pouvez maintenant vous connecter."}

@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    """Strict rotation: invalidate old, issue new."""
    try:
        new_access, new_refresh = await rotate_refresh_token(db, refresh_token, _session_metadata(request))
    except HTTPException as exc:
        await _audit_auth(
            db,
            request,
            action="auth.refresh_failed",
            status_code=exc.status_code,
            metadata={"detail": str(exc.detail)},
        )
        await db.commit()
        raise
    return {"access_token": new_access, "refresh_token": new_refresh}

@router.post("/logout")
async def logout(
    request: Request,
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    """Invalidate a specific refresh token."""
    token_hash = await set_refresh_token_lookup(db, refresh_token)
    token_res = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    token = token_res.scalar_one_or_none()
    if token:
        if token.school_id:
            await set_request_rls_context(db, school_id=token.school_id)
        else:
            await set_auth_user_id(db, token.user_id)
    user = await db.get(User, token.user_id) if token else None
    if user and user.role == UserRole.system_admin:
        await set_request_rls_context(db, is_system_admin=True)
    await db.execute(delete(RefreshToken).where(RefreshToken.token_hash == token_hash))
    await _audit_auth(
        db,
        request,
        action="auth.logout",
        user=user,
        school_id=token.school_id if token else None,
        metadata={"family_id": token.family_id if token else None},
    )
    await db.commit()
    return {"message": "Déconnexion réussie."}


# ─── Code / QR Based Authentication ──────────────────────────────────────────

@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RefreshToken)
        .where(
            RefreshToken.school_id == current_user.school_id,
            RefreshToken.user_id == current_user.id,
        )
        .order_by(RefreshToken.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/sessions/{family_id}")
async def revoke_session(
    family_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.school_id == current_user.school_id,
            RefreshToken.user_id == current_user.id,
            RefreshToken.family_id == family_id,
        )
    )
    tokens = result.scalars().all()
    if not tokens:
        raise HTTPException(status_code=404, detail="Session introuvable.")

    await db.execute(
        delete(RefreshToken).where(
            RefreshToken.school_id == current_user.school_id,
            RefreshToken.user_id == current_user.id,
            RefreshToken.family_id == family_id,
        )
    )
    await _audit_auth(
        db,
        request,
        action="auth.session_revoked",
        user=current_user,
        metadata={"family_id": family_id},
    )
    await db.commit()
    return {"status": "success"}


class VerifyCodeRequest(BaseModel):
    code: str | None = None
    student_id: str | None = None
    pin: str | None = None

class VerifyCodeResponse(BaseModel):
    type: str
    email: str | None = None
    name: str | None = None
    label: str | None = None
    role: str | None = None

@router.post("/verify-code", response_model=VerifyCodeResponse)
async def verify_code(req: VerifyCodeRequest, db: AsyncSession = Depends(get_db)):
    from app.models import PendingLink, Student
    
    # 1. Is it a QR Token or Invite Code?
    if req.code:
        # Check staff invite
        await set_auth_invite_code(db, req.code)
        user_res = await db.execute(
            select(User).where(
                User.invite_code == req.code,
                User.role.in_([UserRole.teacher, UserRole.secretary]),
            )
        )
        user = user_res.scalar_one_or_none()
        if user:
            invite_type = "teacher_invite" if user.role == UserRole.teacher else "staff_invite"
            return VerifyCodeResponse(
                type=invite_type,
                email=user.email,
                name=user.full_name,
                role=user.role.value,
            )
        
        # Check Parent QR Token (PendingLink)
        await set_pending_link_token(db, req.code)
        link_res = await db.execute(
            select(PendingLink).where(
                PendingLink.token == req.code,
                PendingLink.status == "pending",
                PendingLink.revoked_at.is_(None),
            )
        )
        link = link_res.scalar_one_or_none()
        if link:
            # Check expiration
            if link.expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Ce QR Code a expiré.")
            await set_request_rls_context(db, school_id=link.school_id)
            student_res = await db.execute(
                select(Student).where(
                    Student.school_id == link.school_id,
                    Student.id == link.student_id,
                    Student.archived_at.is_(None),
                )
            )
            if not student_res.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Ce lien n'est plus actif.")
            return VerifyCodeResponse(type="parent_qr", label=link.label)

    # 2. Is it a Student ID + PIN?
    if req.student_id and req.pin:
        await set_student_pin_lookup(db, student_id=req.student_id, pin=req.pin)
        student_res = await db.execute(
            select(Student).where(
                Student.student_id == req.student_id,
                Student.linking_pin == req.pin,
                Student.archived_at.is_(None),
            )
        )
        student = student_res.scalar_one_or_none()
        if student:
            return VerifyCodeResponse(type="student_pin", name=student.full_name)

    raise HTTPException(status_code=404, detail="Code invalide ou expiré.")

class ParentRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    terms_accepted: bool = False
    code: str | None = None        # QR Token
    student_id: str | None = None
    pin: str | None = None

@router.post("/register-parent-code", response_model=TokenResponse)
async def register_parent_code(
    req: ParentRegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    from app.models import PendingLink, Student, StudentParent
    require_terms_accepted(req.terms_accepted)
    
    # Verify Email is not taken
    await set_auth_lookup_email(db, str(req.email).lower())
    exist_res = await db.execute(select(User).where(User.email == req.email))
    if exist_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Cet email est déjà utilisé.")
        
    student = None
    school_id = None
    pending_link = None
    
    if req.code: # QR Flow
        await set_pending_link_token(db, req.code)
        link_res = await db.execute(
            select(PendingLink)
            .where(
                PendingLink.token == req.code,
                PendingLink.status == "pending",
                PendingLink.revoked_at.is_(None),
            )
            .with_for_update()
        )
        pending_link = link_res.scalar_one_or_none()
        if not pending_link or pending_link.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Code QR invalide ou expiré.")
        await set_request_rls_context(db, school_id=pending_link.school_id)
        student_res = await db.execute(
            select(Student).where(
                Student.school_id == pending_link.school_id,
                Student.id == pending_link.student_id,
            )
        )
        student = student_res.scalar_one_or_none()
        if not student or student.archived_at:
            raise HTTPException(status_code=400, detail="Ce lien n'est plus actif.")
        school_id = pending_link.school_id
    elif req.student_id and req.pin: # PIN Flow
        await set_student_pin_lookup(db, student_id=req.student_id, pin=req.pin)
        student_res = await db.execute(
            select(Student).where(
                Student.student_id == req.student_id,
                Student.linking_pin == req.pin,
                Student.archived_at.is_(None),
            )
        )
        student = student_res.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=400, detail="ID ou Code PIN incorrect.")
        school_id = student.school_id
        await set_request_rls_context(db, school_id=school_id)
    else:
        raise HTTPException(status_code=400, detail="Méthode d'identification manquante.")

    # Create Parent User
    new_user = User(
        id=str(uuid.uuid4()),
        email=req.email,
        full_name=req.full_name,
        role=UserRole.parent,
        password_hash=get_password_hash(req.password),
        school_id=school_id,
        terms_accepted_at=datetime.now(timezone.utc),
        terms_version=TERMS_VERSION,
    )
    db.add(new_user)
    
    # Create Link
    new_link = StudentParent(school_id=school_id, student_id=student.id, parent_id=new_user.id)
    db.add(new_link)

    if pending_link:
        pending_link.status = "used"
        pending_link.used_at = datetime.now(timezone.utc)
        pending_link.parent_id = new_user.id

    await db.commit()
    await db.refresh(new_user)

    # Issue Tokens
    family_id = str(uuid.uuid4())
    access_token = create_access_token_for_user(new_user)
    refresh_token = create_refresh_token(new_user.id, family_id)
    
    db_token = RefreshToken(
        school_id=new_user.school_id,
        user_id=new_user.id,
        token_hash=hashlib.sha256(refresh_token.encode()).hexdigest(),
        family_id=family_id,
        **_session_metadata(request),
        last_used_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(db_token)
    await _audit_auth(
        db,
        request,
        action="auth.parent_registered",
        user=new_user,
        metadata={"student_id": student.id},
    )
    await db.commit()
    
    return {"access_token": access_token, "refresh_token": refresh_token}


class TeacherCompleteRequest(BaseModel):
    invite_code: str
    password: str
    terms_accepted: bool = False


async def _complete_staff_invite_code(
    req: TeacherCompleteRequest,
    request: Request,
    db: AsyncSession,
) -> dict[str, str]:
    require_terms_accepted(req.terms_accepted)

    await set_auth_invite_code(db, req.invite_code)
    user_res = await db.execute(
        select(User).where(
            User.invite_code == req.invite_code,
            User.role.in_([UserRole.teacher, UserRole.secretary]),
        )
    )
    user = user_res.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Code d'invitation invalide.")

    await set_request_rls_context(db, school_id=user.school_id)
        
    # Update user password and clear invite code
    user.password_hash = get_password_hash(req.password)
    user.invite_code = None
    mark_terms_accepted(user)
    
    await db.commit()
    
    # Issue Tokens
    family_id = str(uuid.uuid4())
    access_token = create_access_token_for_user(user)
    refresh_token = create_refresh_token(user.id, family_id)
    
    db_token = RefreshToken(
        school_id=user.school_id,
        user_id=user.id,
        token_hash=hashlib.sha256(refresh_token.encode()).hexdigest(),
        family_id=family_id,
        **_session_metadata(request),
        last_used_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(db_token)
    action = "auth.teacher_completed" if user.role == UserRole.teacher else "auth.secretary_completed"
    await _audit_auth(db, request, action=action, user=user)
    await db.commit()
    
    return {"access_token": access_token, "refresh_token": refresh_token}


@router.post("/complete-teacher-code", response_model=TokenResponse)
async def complete_teacher_code(
    req: TeacherCompleteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await _complete_staff_invite_code(req, request, db)


@router.post("/complete-staff-code", response_model=TokenResponse)
async def complete_staff_code(
    req: TeacherCompleteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await _complete_staff_invite_code(req, request, db)
