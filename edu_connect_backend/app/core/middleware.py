import hashlib
import logging
from datetime import datetime, timezone
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from app.core.config import settings
from app.core.rls import set_request_rls_context
from app.core.security_alerts import record_security_response_if_needed
from app.db.database import AsyncSessionLocal
from app.models import AuditEvent, User
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.context import system_admin_context, tenant_id_context

logger = logging.getLogger(__name__)

# Routes that are always public — skip activation / tenant checks
_PUBLIC_PREFIXES = ("/onboarding", "/auth", "/health", "/platform", "/docs", "/openapi.json")
_PUBLIC_EXACT   = {"/users/me"}
_AUDIT_GET_MARKERS = (
    "/grades",
    "/attendance",
    "/remarks",
    "/admin/students",
    "/links",
    "/export",
    "/media/attachments",
)


def _try_decode_jwt(request: Request) -> dict | None:
    """
    Decode the Bearer JWT once and cache the result in request.state.
    Returns the payload dict or None if the token is absent / invalid.
    """
    cached = getattr(request.state, "jwt_payload", ...)
    if cached is not ...:
        return cached

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        request.state.jwt_payload = None
        return None

    token = auth_header[7:]
    try:
        payload = jwt.decode(token, settings.public_key, algorithms=["RS256"])
        request.state.jwt_payload = payload
        return payload
    except JWTError:
        request.state.jwt_payload = None
        return None


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        device_id = request.headers.get("X-Device-Id", "unknown")
        platform  = request.headers.get("X-Device-Platform", "unknown")
        ip        = request.client.host if request.client else "unknown"

        fingerprint_raw = f"{device_id}:{platform}:{settings.server_fingerprint_salt}"
        request.state.device_fingerprint = (
            __import__("hashlib").sha256(fingerprint_raw.encode()).hexdigest()
        )
        request.state.device_platform = platform
        request.state.ip_address      = ip

        response = await call_next(request)
        await self._record_request_audit(request, response)
        await self._record_security_alert(request, response)
        return response

    async def _record_request_audit(self, request: Request, response: Response):
        path = request.url.path
        method = request.method.upper()
        if not self._should_audit(method, path):
            return

        payload = _try_decode_jwt(request)
        if not payload:
            return

        try:
            async with AsyncSessionLocal() as db:
                await set_request_rls_context(
                    db,
                    school_id=payload.get("school_id"),
                    is_system_admin=payload.get("role") == "system_admin",
                )
                db.add(
                    AuditEvent(
                        school_id=payload.get("school_id"),
                        actor_id=payload.get("sub"),
                        actor_role=payload.get("role"),
                        action=f"http.{method.lower()}",
                        resource_type=self._resource_type(path),
                        method=method,
                        path=path,
                        status_code=response.status_code,
                        ip_address=getattr(request.state, "ip_address", None),
                        device_fingerprint=getattr(request.state, "device_fingerprint", None),
                        device_platform=getattr(request.state, "device_platform", None),
                        user_agent=request.headers.get("user-agent"),
                    )
                )
                await db.commit()
        except Exception:
            logger.exception("Audit event write failed")

    async def _record_security_alert(self, request: Request, response: Response):
        path = request.url.path
        if path.startswith(("/health", "/docs", "/openapi.json")):
            return

        payload = _try_decode_jwt(request)
        try:
            async with AsyncSessionLocal() as db:
                alerted = await record_security_response_if_needed(
                    db,
                    status_code=response.status_code,
                    path=path,
                    method=request.method.upper(),
                    ip_address=getattr(request.state, "ip_address", None),
                    device_fingerprint=getattr(request.state, "device_fingerprint", None),
                    device_platform=getattr(request.state, "device_platform", None),
                    user_agent=request.headers.get("user-agent"),
                    actor_id=payload.get("sub") if payload else None,
                    actor_role=payload.get("role") if payload else None,
                    school_id=payload.get("school_id") if payload else None,
                )
                if alerted:
                    await db.commit()
        except Exception:
            logger.exception("Security response alert write failed")

    @staticmethod
    def _should_audit(method: str, path: str) -> bool:
        if path.startswith(("/health", "/docs", "/openapi.json")):
            return False
        if method in {"POST", "PUT", "PATCH", "DELETE"}:
            return True
        return method == "GET" and any(marker in path for marker in _AUDIT_GET_MARKERS)

    @staticmethod
    def _resource_type(path: str) -> str | None:
        parts = [part for part in path.split("/") if part]
        if not parts:
            return None
        if parts[0] == "classes" and len(parts) >= 3:
            return parts[2]
        return parts[0]


class SchoolActivationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip public routes AND WebSocket upgrades (no Authorization header on WS)
        if (
            path in _PUBLIC_EXACT
            or any(path.startswith(p) for p in _PUBLIC_PREFIXES)
            or request.headers.get("upgrade", "").lower() == "websocket"
        ):
            return await call_next(request)

        payload = _try_decode_jwt(request)
        if not payload:
            return await call_next(request)  # let auth deps raise 401

        user_id = payload.get("sub")
        if user_id:
            async with AsyncSessionLocal() as db:
                await set_request_rls_context(
                    db,
                    school_id=payload.get("school_id"),
                    is_system_admin=payload.get("role") == "system_admin",
                )
                stmt   = select(User).options(selectinload(User.school)).where(User.id == user_id)
                result = await db.execute(stmt)
                user   = result.scalar_one_or_none()

                if user and user.school:
                    if not user.school.is_active:
                        return Response(
                            content='{"detail": {"code": "school_inactive", "message": "Votre établissement est en attente d\'activation."}}',
                            status_code=403,
                            media_type="application/json",
                        )
                    exp = user.school.subscription_expires_at
                    if exp and exp < datetime.now(timezone.utc):
                        return Response(
                            content='{"detail": {"code": "subscription_expired", "message": "L\'abonnement de votre établissement a expiré."}}',
                            status_code=402,
                            media_type="application/json",
                        )

        return await call_next(request)


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Reads the already-decoded JWT payload from request.state (set by
    _try_decode_jwt) and injects school_id into the async context so
    database.py can apply row-level tenant filtering — zero extra DB round-trip.
    """
    async def dispatch(self, request: Request, call_next):
        payload   = _try_decode_jwt(request)
        school_id = payload.get("school_id") if payload else None
        is_system_admin = payload.get("role") == "system_admin" if payload else False

        if school_id or is_system_admin:
            ctx_token = tenant_id_context.set(school_id)
            admin_token = system_admin_context.set(is_system_admin)
            try:
                return await call_next(request)
            finally:
                tenant_id_context.reset(ctx_token)
                system_admin_context.reset(admin_token)

        return await call_next(request)
