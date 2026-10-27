"""Push notifications to phones through Firebase Cloud Messaging (HTTP v1).

Needs a Firebase service account (FCM_SERVICE_ACCOUNT_FILE or
FCM_SERVICE_ACCOUNT_JSON). Without it every call is a no-op, so the app keeps
working with the in-app notification list and the optional ntfy transport.
"""
import asyncio
import json
import logging
import time
from pathlib import Path

import httpx
import jwt
from sqlalchemy import delete

from app.core.config import settings
from app.core.rls import set_request_rls_context
from app.db.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
SEND_URL = "https://fcm.googleapis.com/v1/projects/{project}/messages:send"

_access_token: tuple[str, float] | None = None
_token_lock = asyncio.Lock()
# Notification types the phone may open a screen for (everything else opens the list).
_DATA_TYPES = {"INFO", "SUCCESS", "WARNING", "ATTENDANCE", "FEES", "REPORT", "SECURITY", "LINKING_PIN"}


def load_service_account() -> dict | None:
    """The service account JSON, from the configured file or inline value."""
    raw = settings.fcm_service_account_json.strip()
    if not raw and settings.fcm_service_account_file.strip():
        path = Path(settings.fcm_service_account_file.strip())
        if not path.exists():
            logger.error("FCM service account file not found: %s", path)
            return None
        raw = path.read_text(encoding="utf-8")
    if not raw:
        return None
    try:
        account = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("FCM service account is not valid JSON")
        return None
    return account if account.get("private_key") and account.get("client_email") else None


def fcm_enabled() -> bool:
    return load_service_account() is not None


async def _get_access_token(client: httpx.AsyncClient, account: dict) -> str:
    """OAuth token for the Firebase API, cached until shortly before it expires."""
    global _access_token
    async with _token_lock:
        if _access_token and _access_token[1] > time.time() + 60:
            return _access_token[0]
        now = int(time.time())
        assertion = jwt.encode(
            {"iss": account["client_email"], "scope": SCOPE, "aud": TOKEN_URL, "iat": now, "exp": now + 3600},
            account["private_key"],
            algorithm="RS256",
        )
        response = await client.post(
            TOKEN_URL,
            data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion},
        )
        response.raise_for_status()
        body = response.json()
        _access_token = (body["access_token"], time.time() + int(body.get("expires_in", 3600)))
        return _access_token[0]


def build_message(token: str, title: str, body: str, notification_type: str) -> dict:
    return {
        "message": {
            "token": token,
            "notification": {"title": title[:120], "body": body[:500]},
            "data": {"type": notification_type if notification_type in _DATA_TYPES else "INFO"},
            "android": {"priority": "HIGH", "notification": {"channel_id": "wasel_edu_notifications"}},
            "apns": {"headers": {"apns-priority": "10"}, "payload": {"aps": {"sound": "default"}}},
        }
    }


def is_dead_token(status_code: int, body: dict) -> bool:
    """Firebase says the device no longer exists (app removed or token rotated)."""
    if status_code == 404:
        return True
    error = body.get("error", {}) if isinstance(body, dict) else {}
    details = " ".join(str(item.get("errorCode", "")) for item in error.get("details", []) if isinstance(item, dict))
    return "UNREGISTERED" in details or error.get("status") == "NOT_FOUND"


async def _forget_tokens(school_id: str, tokens: list[str]) -> None:
    from app.modules.notifications.models import PushDevice

    try:
        async with AsyncSessionLocal() as db:
            await set_request_rls_context(db, school_id=school_id)
            await db.execute(delete(PushDevice).where(PushDevice.token.in_(tokens)))
            await db.commit()
    except Exception:
        logger.exception("Could not remove dead push tokens")


async def send_to_devices(school_id: str, tokens: list[str], title: str, body: str, notification_type: str = "INFO") -> int:
    """Send one notification to each device token. Returns how many were accepted."""
    account = load_service_account()
    if account is None or not tokens:
        return 0
    project = settings.fcm_project_id.strip() or account.get("project_id", "")
    if not project:
        logger.error("FCM project id missing (FCM_PROJECT_ID)")
        return 0

    sent = 0
    dead: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            access_token = await _get_access_token(client, account)
            for token in tokens:
                response = await client.post(
                    SEND_URL.format(project=project),
                    json=build_message(token, title, body, notification_type),
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if response.status_code == 200:
                    sent += 1
                    continue
                try:
                    payload = response.json()
                except ValueError:
                    payload = {}
                if is_dead_token(response.status_code, payload):
                    dead.append(token)
                else:
                    logger.warning("FCM refused a message: HTTP %s", response.status_code)
    except Exception:
        logger.exception("FCM send failed")
    if dead:
        await _forget_tokens(school_id, dead)
    return sent
