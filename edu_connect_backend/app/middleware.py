import hashlib
import time
import logging
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from .config import settings
from .database import AsyncSessionLocal
from .models import User, School
from sqlalchemy import select
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        device_id = request.headers.get("X-Device-Id", "unknown")
        platform = request.headers.get("X-Device-Platform", "unknown")
        ip = request.client.host if request.client else "unknown"

        fingerprint_raw = f"{device_id}:{platform}:{settings.server_fingerprint_salt}"
        fingerprint = hashlib.sha256(fingerprint_raw.encode()).hexdigest()

        request.state.device_fingerprint = fingerprint
        request.state.device_platform = platform
        request.state.ip_address = ip

        return await call_next(request)

class SchoolActivationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        # 1. Skip check for unrestricted routes
        if any(path.startswith(p) for p in ["/onboarding", "/auth", "/health", "/platform", "/docs", "/openapi.json"]):
            return await call_next(request)

        # 2. Extract JWT and check school status
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return await call_next(request) # Let auth dependencies handle missing token

        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, settings.public_key, algorithms=["RS256"])
            user_id = payload.get("sub")
            
            if user_id:
                async with AsyncSessionLocal() as db:
                    # In a real app, we'd cache this to avoid DB hit on every request
                    stmt = select(User).options(selectinload(User.school)).where(User.id == user_id)
                    result = await db.execute(stmt)
                    user = result.scalar_one_or_none()
                    
                    if user and user.school:
                        config = user.school.tenant_config or {}
                        if not config.get("active", False):
                            return Response(
                                content='{"detail": {"code": "school_inactive", "message": "Votre établissement est en attente d\'activation."}}',
                                status_code=403,
                                media_type="application/json"
                            )
        except JWTError:
            pass # Invalid token, let Auth dependencies handle it

        return await call_next(request)

from .context import tenant_id_context

class TenantMiddleware(BaseHTTPMiddleware):
    """
    Extracts tenant_id from JWT and sets it in the Async context.
    This allows database.py to pick it up and set the PG context.
    """
    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # Use current public key to decode and find school_id
                # In a real app, this decode is already done by SchoolActivationMiddleware,
                # we should probably share the result via request.state
                payload = jwt.decode(token, settings.public_key, algorithms=["RS256"])
                school_id = payload.get("school_id")
                if school_id:
                    token = tenant_id_context.set(school_id)
                    try:
                        return await call_next(request)
                    finally:
                        tenant_id_context.reset(token)
            except JWTError:
                pass
        
        return await call_next(request)
