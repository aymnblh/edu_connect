import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_push(push_token: str, title: str, body: str) -> None:
    """Publish a private/local push notification through ntfy."""
    if not settings.ntfy_base_url:
        logger.info("Local push disabled: %s | %s - %s", push_token, title, body)
        return

    topic = push_token.strip().strip("/")
    if not topic:
        logger.info("Local push skipped because the topic is empty: %s - %s", title, body)
        return

    headers = {"Title": title, "Priority": "default"}
    if settings.ntfy_auth_token:
        headers["Authorization"] = f"Bearer {settings.ntfy_auth_token}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.ntfy_base_url.rstrip('/')}/{topic}",
                content=body.encode("utf-8"),
                headers=headers,
            )
            response.raise_for_status()
    except Exception:
        logger.exception("Failed to send local ntfy push notification")
