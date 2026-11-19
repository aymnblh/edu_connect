import hashlib
import logging
import re

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_NTFY_TOPIC_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")


def expected_ntfy_topic(user_id: str) -> str:
    """Derive the deterministic, user-bound ntfy topic for a user."""
    user_hash = hashlib.sha256(user_id.encode("utf-8")).hexdigest()[:16]
    prefix = re.sub(r"[^A-Za-z0-9_-]", "", settings.ntfy_topic_prefix) or "educonnect"
    return f"{prefix}-{user_hash}"


def validate_ntfy_topic(push_token: str) -> str | None:
    """Return a validated single-segment ntfy topic, or None if unsafe."""
    topic = push_token.strip()
    if not topic or not _NTFY_TOPIC_RE.fullmatch(topic):
        return None
    return topic


def _safe_header_value(value: str, *, max_length: int = 200) -> str:
    return value.replace("\r", " ").replace("\n", " ").strip()[:max_length]


async def send_push(push_token: str, title: str, body: str) -> None:
    """Publish a private/local push notification through ntfy."""
    topic = validate_ntfy_topic(push_token)
    if not topic:
        logger.warning("Local push skipped because the topic failed validation.")
        return

    if not settings.ntfy_base_url:
        logger.info("Local push disabled: %s | %s", topic, _safe_header_value(title))
        return

    headers = {"Title": _safe_header_value(title), "Priority": "default"}
    if settings.ntfy_auth_token:
        headers["Authorization"] = f"Bearer {settings.ntfy_auth_token}"

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            response = await client.post(
                f"{settings.ntfy_base_url.rstrip('/')}/{topic}",
                content=body.encode("utf-8"),
                headers=headers,
            )
            response.raise_for_status()
    except Exception:
        logger.exception("Failed to send local ntfy push notification")
