import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from .config import settings
from .database import get_db
from .models import User, RefreshToken

# ─── Password Hashing ────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# ─── JWT Security ──────────────────────────────────────────────────────────
bearer_scheme = HTTPBearer()

def create_access_token(data: dict) -> str:
    """Issue a short-lived access token (RS256)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.private_key, algorithm="RS256")

def create_refresh_token(user_id: str, family_id: str) -> str:
    """Issue a long-lived refresh token (RS256)."""
    to_encode = {
        "sub": user_id, 
        "family": family_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    }
    return jwt.encode(to_encode, settings.private_key, algorithm="RS256")

async def get_token_claims(
    token: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Verify local Access JWT token and return claims.
    Support Bi-Key rotation: check current key, then previous key.
    """
    # 1. Try Current Public Key
    try:
        payload = jwt.decode(token.credentials, settings.public_key, algorithms=["RS256"])
        return payload
    except JWTError:
        # 2. Key failed, try Previous Public Key (Rotation Support)
        if settings.previous_public_key:
            try:
                payload = jwt.decode(token.credentials, settings.previous_public_key, algorithms=["RS256"])
                return payload
            except JWTError:
                pass # Both failed
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    claims: dict = Depends(get_token_claims),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Return the local User profile based on verified Access JWT claims."""
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token claims.")

    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User).options(selectinload(User.school)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if user.school and not user.school.is_active:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your school's subscription has expired.",
        )
        
    return user

async def invalidate_token_family(db: AsyncSession, user_id: str, family_id: str):
    """Safety measure: if reuse detected, kill all sessions for this specific family."""
    await db.execute(
        delete(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.family_id == family_id
        )
    )
    await db.commit()

async def rotate_refresh_token(db: AsyncSession, old_refresh_token_str: str) -> tuple[str, str]:
    """
    Perform strict rotation:
    1. Verify old token.
    2. Check if hash exists in DB.
    3. If NOT in DB -> REUSE DETECTED -> Invalidate family.
    4. If IN DB -> Invalidate current one, issue new pair.
    """
    try:
        payload = jwt.decode(old_refresh_token_str, settings.refresh_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        family_id = payload.get("family")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    # 1. Look for this token's hash
    token_hash = hashlib.sha256(old_refresh_token_str.encode()).hexdigest()
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    db_token = result.scalar_one_or_none()

    if not db_token:
        # POTENTIAL THEFT: Token already used or deleted
        await invalidate_token_family(db, user_id, family_id)
        raise HTTPException(
            status_code=401, 
            detail="Session breach detected. All devices for this session have been logged out."
        )

    # 2. Consume current token
    await db.delete(db_token)
    
    # 3. Issue new pair (keep same family_id)
    new_access = create_access_token({"sub": user_id, "role": "TODO"}) # Injected from User lookup later
    new_refresh = create_refresh_token(user_id, family_id)
    
    # 4. Save new refresh hash
    new_hash = hashlib.sha256(new_refresh.encode()).hexdigest()
    new_db_token = RefreshToken(
        user_id=user_id,
        token_hash=new_hash,
        family_id=family_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(new_db_token)
    await db.commit()

    return new_access, new_refresh
