from firebase_admin import messaging
import logging

logger = logging.getLogger(__name__)

def send_push(fcm_token: str, title: str, body: str) -> None:
    """Fire-and-forget push notification via Firebase Cloud Messaging."""
    if not fcm_token:
        return
        
    try:
        msg = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=fcm_token,
        )
        response = messaging.send(msg)
        logger.info(f"Successfully sent FCM message: {response}")
    except Exception as e:
        logger.error(f"FCM send failed: {e}")
