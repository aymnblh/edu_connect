"""Server logging: level/format from settings, request IDs, secret redaction."""
import json
import logging
import re
import sys
import time
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)

_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{8,64}$")

# Values that must never reach a log line, whatever logged them.
_REDACTIONS = [
    (re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._~+/=-]+"), r"\1[REDACTED]"),
    (re.compile(r"\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}"), "[REDACTED_JWT]"),
    (
        re.compile(
            r"(?i)([\"']?(?:password|new_password|current_password|refresh_token|access_token|token|"
            r"invite_code|linking_pin|pin|secret|authorization)[\"']?\s*[:=]\s*[\"']?)[^\"'\s,&}]+"
        ),
        r"\1[REDACTED]",
    ),
]


def redact(text: str) -> str:
    for pattern, replacement in _REDACTIONS:
        text = pattern.sub(replacement, text)
    return text


class RedactingFilter(logging.Filter):
    """Masks secrets in the final message and in exception text."""

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        record.msg = redact(message)
        record.args = None
        if record.exc_info and not record.exc_text:
            record.exc_text = logging.Formatter().formatException(record.exc_info)
        if record.exc_text:
            record.exc_text = redact(record.exc_text)
        record.request_id = request_id_var.get() or "-"
        return True


_STANDARD_ATTRS = set(vars(logging.LogRecord("", 0, "", 0, "", None, None))) | {"message", "request_id", "asctime"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "time": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        for key, value in vars(record).items():
            if key not in _STANDARD_ATTRS and not key.startswith("_"):
                if not isinstance(value, (int, float, bool, type(None))):
                    value = redact(str(value))
                payload[key] = value
        if record.exc_text:
            payload["exception"] = redact(record.exc_text)
        payload["message"] = redact(payload["message"])
        # Redact values before serializing: rewriting the JSON text could break its escaping.
        return json.dumps(payload, ensure_ascii=False)


TEXT_FORMAT = "%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"


def configure_logging(level: str = "INFO", fmt: str = "json") -> None:
    """Install one redacting handler on the root logger (idempotent)."""
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RedactingFilter())
    handler.setFormatter(JsonFormatter() if fmt == "json" else logging.Formatter(TEXT_FORMAT))
    root = logging.getLogger()
    for existing in list(root.handlers):
        if getattr(existing, "_educonnect", False):
            root.removeHandler(existing)
    handler._educonnect = True  # type: ignore[attr-defined]
    root.addHandler(handler)
    root.setLevel(level.upper())
    # Our access log replaces uvicorn's (which prints full URLs with query strings).
    logging.getLogger("uvicorn.access").disabled = True
    for name in ("uvicorn", "uvicorn.error"):
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True


access_logger = logging.getLogger("educonnect.access")
_QUIET_PATHS = ("/health", "/metrics")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Assigns a request ID, returns it as X-Request-ID and writes one access line."""

    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("x-request-id", "")
        request_id = incoming if _SAFE_REQUEST_ID.match(incoming) else uuid.uuid4().hex
        token = request_id_var.set(request_id)
        request.state.request_id = request_id
        started = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            duration_ms = round((time.perf_counter() - started) * 1000, 1)
            payload = getattr(request.state, "jwt_payload", None) or {}
            level = logging.DEBUG if request.url.path.startswith(_QUIET_PATHS) else (
                logging.ERROR if status_code >= 500 else logging.WARNING if status_code >= 400 else logging.INFO
            )
            access_logger.log(
                level,
                "%s %s %s %sms",
                request.method,
                request.url.path,  # never the query string: it may carry codes or tokens
                status_code,
                duration_ms,
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status": status_code,
                    "duration_ms": duration_ms,
                    "user_id": payload.get("sub") if isinstance(payload, dict) else None,
                    "client_ip": getattr(request.state, "ip_address", None)
                    or (request.client.host if request.client else None),
                },
            )
            request_id_var.reset(token)
