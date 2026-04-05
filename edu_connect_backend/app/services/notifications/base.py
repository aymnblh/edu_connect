from abc import ABC, abstractmethod
from typing import Optional

class NotificationService(ABC):
    @abstractmethod
    async def send(self, user_id: str, title: str, body: str, priority: str = "default") -> bool:
        """Send a general notification."""
        pass

    @abstractmethod
    async def send_absence_alert(self, user_id: str, student_name: str, date_str: str) -> bool:
        """Send a high-priority absence alert."""
        pass

    @abstractmethod
    async def revoke_subscription(self, user_id: str) -> bool:
        """Clean up notification subscriptions for a revoked user."""
        pass
