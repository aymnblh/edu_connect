import hashlib
import logging

import httpx

from .base import NotificationService
from app.core.config import settings

logger = logging.getLogger(__name__)


class NtfyService(NotificationService):
    def __init__(self):
        self.base_url = settings.ntfy_base_url.rstrip("/")
        self.auth_token = settings.ntfy_auth_token
        self.topic_prefix = settings.ntfy_topic_prefix

    def _get_topic(self, user_id: str) -> str:
        """Generate an opaque topic for the user."""
        user_hash = hashlib.sha256(user_id.encode()).hexdigest()[:16]
        return f"{self.topic_prefix}-{user_hash}"

    async def _publish(self, topic: str, title: str, body: str, priority: str = "default") -> bool:
        """Internal helper to publish to ntfy."""
        headers = {"Title": title, "Priority": priority}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/{topic}",
                    content=body.encode("utf-8"),
                    headers=headers,
                    timeout=10.0,
                )
                response.raise_for_status()
                return True
            except Exception as e:
                logger.error("Failed to send ntfy notification: %s", e)
                return False

    async def send(self, user_id: str, title: str, body: str, priority: str = "default") -> bool:
        topic = self._get_topic(user_id)
        return await self._publish(topic, title, body, priority)

    async def send_absence_alert(self, user_id: str, student_name: str, date_str: str) -> bool:
        topic = self._get_topic(user_id)
        title = "Alerte Absence"
        body = f"Votre enfant {student_name} a ete marque absent le {date_str}."
        return await self._publish(topic, title, body, priority="high")

    async def revoke_subscription(self, user_id: str) -> bool:
        logger.info("Revoking notification channel for user %s", user_id)
        return True
