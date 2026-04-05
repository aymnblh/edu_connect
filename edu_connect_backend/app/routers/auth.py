import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, EmailStr

from ..database import get_db
from ..models import User, RefreshToken, UserRole
from ..auth import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token,
    rotate_refresh_token
)
from ..config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SetPasswordRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Identifiants incorrects.")

    # Migration Check: password_hash IS NULL
    if user.password_hash is None:
        raise HTTPException(
            status_code=403, 
            detail={"code": "password_setup_required", "message": "Veuillez définir votre mot de passe pour continuer."}
        )

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Identifiants incorrects.")

    # Issue Tokens
    family_id = str(uuid.uuid4())
    access_token = create_access_token({"sub": user.id, "role": user.role.value})
    refresh_token = create_refresh_token(user.id, family_id)

    # Save Refresh Token
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    db_token = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        family_id=family_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(db_token)
    await db.commit()

    return {"access_token": access_token, "refresh_token": refresh_token}

@router.post("/set-password")
async def set_password(req: SetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Initial password setup for migrated or invited users."""
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")

    if user.password_hash is not None:
        raise HTTPException(
            status_code=409, 
            detail="Un mot de passe est déjà défini. Utilisez la procédure de changement de mot de passe."
        )

    # Set password
    user.password_hash = get_password_hash(req.password)
    await db.commit()

    return {"message": "Mot de passe défini avec succès. Vous pouvez maintenant vous connecter."}

@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str = Body(..., embed=True), db: AsyncSession = Depends(get_db)):
    """Strict rotation: invalidate old, issue new."""
    new_access, new_refresh = await rotate_refresh_token(db, refresh_token)
    return {"access_token": new_access, "refresh_token": new_refresh}

@router.post("/logout")
async def logout(refresh_token: str = Body(..., embed=True), db: AsyncSession = Depends(get_db)):
    """Invalidate a specific refresh token."""
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    await db.execute(delete(RefreshToken).where(RefreshToken.token_hash == token_hash))
    await db.commit()
    return {"message": "Déconnexion réussie."}
