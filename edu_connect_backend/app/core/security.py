import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt import InvalidTokenError, decode as decode_jwt, encode as encode_jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.config import settings
from app.core.rls import (
    set_auth_user_id,
    set_refresh_family_lookup,
    set_refresh_token_lookup,
    set_request_rls_context,
)
from app.db.database import get_db
from app.models import User, RefreshToken

# ─── Password Hashing ────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# ─── JWT Security ──────────────────────────────────────────────────────────
bearer_scheme = HTTPBearer()
JWT_ISSUER = "wasel-edu-api"
JWT_AUDIENCE = "wasel-edu-client"
JWTError = InvalidTokenError


def _decode_jwt(token: str, key: str, *, expected_type: str | None = None) -> dict:
    """Decode a token with an explicit issuer, audience and token purpose."""
    payload = decode_jwt(
        token,
        key,
        algorithms=["RS256"],
        issuer=JWT_ISSUER,
        audience=JWT_AUDIENCE,
    )
    if expected_type and payload.get("typ") != expected_type:
        raise JWTError("Unexpected token type")
    if not payload.get("sub"):
        raise JWTError("Missing subject")
    return payload

def create_access_token(data: dict) -> str:
    """Issue a short-lived access token (RS256)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "typ": "access",
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
    })
    return encode_jwt(to_encode, settings.private_key, algorithm="RS256")

def access_payload_for_user(user: User) -> dict:
    """Build the canonical access-token payload used by API and tenant middleware."""
    payload = {"sub": user.id, "role": user.role.value}
    if user.school_id:
        payload["school_id"] = user.school_id
    return payload

def create_access_token_for_user(user: User) -> str:
    return create_access_token(access_payload_for_user(user))

def create_refresh_token(user_id: str, family_id: str) -> str:
    """Issue a long-lived refresh token (RS256)."""
    to_encode = {
        "sub": user_id, 
        "family": family_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        "iat": datetime.now(timezone.utc),
        "typ": "refresh",
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
    }
    return encode_jwt(to_encode, settings.private_key, algorithm="RS256")

def decode_token(token: str) -> dict:
    """Decode and verify a raw JWT string (used for WebSocket auth)."""
    try:
        return _decode_jwt(token, settings.public_key, expected_type="access")
    except JWTError:
        if settings.previous_public_key:
            try:
                return _decode_jwt(token, settings.previous_public_key, expected_type="access")
            except JWTError:
                pass
        raise ValueError("Invalid or expired token")

async def get_token_claims(
    token: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Verify local Access JWT token and return claims.
    Support Bi-Key rotation: check current key, then previous key.
    """
    # 1. Try Current Public Key
    try:
        payload = _decode_jwt(token.credentials, settings.public_key, expected_type="access")
        return payload
    except JWTError:
        # 2. Key failed, try Previous Public Key (Rotation Support)
        if settings.previous_public_key:
            try:
                payload = _decode_jwt(token.credentials, settings.previous_public_key, expected_type="access")
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
        select(User).options(selectinload(User.school), selectinload(User.students_linking)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    expected_role = claims.get("role")
    expected_school_id = claims.get("school_id")
    if expected_role != user.role.value:
        raise HTTPException(status_code=401, detail="Session role is no longer valid.")
    if user.role.value != "system_admin" and expected_school_id != user.school_id:
        raise HTTPException(status_code=401, detail="Session tenant is no longer valid.")
    if user.password_hash is None:
        raise HTTPException(status_code=403, detail="Password setup is required.")
    
    return user

async def invalidate_token_family(db: AsyncSession, user_id: str, family_id: str):
    """Safety measure: if reuse detected, kill all sessions for this specific family."""
    await set_refresh_family_lookup(db, user_id=user_id, family_id=family_id)
    await db.execute(
        delete(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.family_id == family_id
        )
    )
    await db.commit()

async def rotate_refresh_token(
    db: AsyncSession,
    old_refresh_token_str: str,
    device_metadata: dict | None = None,
) -> tuple[str, str]:
    """
    Perform strict rotation:
    1. Verify old token.
    2. Check if hash exists in DB.
    3. If NOT in DB -> REUSE DETECTED -> Invalidate family.
    4. If IN DB -> Invalidate current one, issue new pair.
    """
    try:
        payload = _decode_jwt(old_refresh_token_str, settings.public_key, expected_type="refresh")
        user_id = payload.get("sub")
        family_id = payload.get("family")
    except JWTError:
        if settings.previous_public_key:
            try:
                payload = _decode_jwt(old_refresh_token_str, settings.previous_public_key, expected_type="refresh")
                user_id = payload.get("sub")
                family_id = payload.get("family")
            except JWTError:
                raise HTTPException(status_code=401, detail="Invalid refresh token.")
        else:
            raise HTTPException(status_code=401, detail="Invalid refresh token.")

    if not user_id or not family_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token claims.")

    # 1. Look for this token's hash
    token_hash = await set_refresh_token_lookup(db, old_refresh_token_str)
    result = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .with_for_update()
    )
    db_token = result.scalar_one_or_none()

    if not db_token:
        # POTENTIAL THEFT: Token already used or deleted
        await invalidate_token_family(db, user_id, family_id)
        raise HTTPException(
            status_code=401, 
            detail="Session breach detected. All devices for this session have been logged out."
        )

    if db_token.expires_at < datetime.now(timezone.utc):
        await db.delete(db_token)
        await db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired.")

    if db_token.school_id:
        await set_request_rls_context(db, school_id=db_token.school_id)
    else:
        await set_auth_user_id(db, user_id)

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        await invalidate_token_family(db, user_id, family_id)
        raise HTTPException(status_code=404, detail="User not found.")

    await set_request_rls_context(
        db,
        school_id=user.school_id,
        is_system_admin=bool(user.role.value == "system_admin"),
    )

    # 2. Consume current token
    await db.delete(db_token)
    
    # 3. Issue new pair (keep same family_id)
    new_access = create_access_token_for_user(user)
    new_refresh = create_refresh_token(user_id, family_id)
    
    # 4. Save new refresh hash
    new_hash = hashlib.sha256(new_refresh.encode()).hexdigest()
    new_db_token = RefreshToken(
        school_id=user.school_id,
        user_id=user_id,
        token_hash=new_hash,
        family_id=family_id,
        **(device_metadata or {}),
        last_used_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(new_db_token)
    await db.commit()

    return new_access, new_refresh
