"""Push notifications to phones (Firebase Cloud Messaging)."""
import asyncio
import json

import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.config import settings
from app.models import NotificationPreference, PushDevice, User, UserRole
from app.modules.users.routers import users as users_router
from app.modules.users.schemas import PushDeviceRequest
from app.utils import fcm, notifications
from tests.test_access_control_boundaries import FakeResult, make_user, run
from tests.test_growth_features import LenientDb

TOKEN = "d" * 40


def _account(project="wasel-edu"):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    return {"project_id": project, "client_email": "push@wasel-edu.iam.gserviceaccount.com", "private_key": pem}


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    monkeypatch.setattr(fcm, "_access_token", None)
    monkeypatch.setattr(settings, "fcm_service_account_json", "")
    monkeypatch.setattr(settings, "fcm_service_account_file", "")
    monkeypatch.setattr(settings, "fcm_project_id", "")


def test_push_is_off_without_a_service_account():
    assert fcm.fcm_enabled() is False
    assert run(fcm.send_to_devices("school-a", [TOKEN], "Titre", "Texte")) == 0


def test_service_account_can_come_from_a_file_or_inline_json(monkeypatch, tmp_path):
    account = _account()
    monkeypatch.setattr(settings, "fcm_service_account_json", json.dumps(account))
    assert fcm.load_service_account()["client_email"] == account["client_email"]
    monkeypatch.setattr(settings, "fcm_service_account_json", "")
    path = tmp_path / "sa.json"
    path.write_text(json.dumps(account), encoding="utf-8")
    monkeypatch.setattr(settings, "fcm_service_account_file", str(path))
    assert fcm.fcm_enabled()
    monkeypatch.setattr(settings, "fcm_service_account_json", "not json")
    monkeypatch.setattr(settings, "fcm_service_account_file", "")
    assert fcm.load_service_account() is None


def test_message_carries_title_body_and_a_safe_type():
    message = fcm.build_message(TOKEN, "Absence signalee", "Amina a ete marquee absente", "ATTENDANCE")["message"]
    assert message["token"] == TOKEN
    assert message["notification"] == {"title": "Absence signalee", "body": "Amina a ete marquee absente"}
    assert message["data"] == {"type": "ATTENDANCE"}
    assert fcm.build_message(TOKEN, "t", "b", "<script>")["message"]["data"]["type"] == "INFO"
    assert len(fcm.build_message(TOKEN, "t" * 500, "b" * 2000, "INFO")["message"]["notification"]["body"]) == 500


def test_dead_tokens_are_recognised():
    assert fcm.is_dead_token(404, {})
    assert fcm.is_dead_token(400, {"error": {"status": "NOT_FOUND"}})
    assert fcm.is_dead_token(400, {"error": {"details": [{"errorCode": "UNREGISTERED"}]}})
    assert not fcm.is_dead_token(500, {"error": {"status": "INTERNAL"}})


def test_sending_signs_in_once_sends_to_each_phone_and_forgets_dead_ones(monkeypatch):
    monkeypatch.setattr(settings, "fcm_service_account_json", json.dumps(_account()))
    seen = {"auth": 0, "sent": [], "forgotten": []}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "oauth2.googleapis.com":
            seen["auth"] += 1
            assert b"jwt-bearer" in request.content
            return httpx.Response(200, json={"access_token": "ya29.test", "expires_in": 3600})
        assert request.headers["Authorization"] == "Bearer ya29.test"
        assert "/projects/wasel-edu/messages:send" in request.url.path
        token = json.loads(request.content)["message"]["token"]
        seen["sent"].append(token)
        if token.startswith("dead"):
            return httpx.Response(404, json={"error": {"status": "NOT_FOUND"}})
        return httpx.Response(200, json={"name": "projects/wasel-edu/messages/1"})

    real_client = httpx.AsyncClient

    def client_with_mock(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        return real_client(*args, **kwargs)

    async def forget(school_id, tokens):
        seen["forgotten"] += tokens

    monkeypatch.setattr(fcm.httpx, "AsyncClient", client_with_mock)
    monkeypatch.setattr(fcm, "_forget_tokens", forget)
    good_1, dead, good_2 = "good" + "1" * 36, "dead" + "2" * 36, "good" + "3" * 36
    assert run(fcm.send_to_devices("school-a", [good_1, dead, good_2], "T", "B")) == 2
    assert seen["auth"] == 1 and seen["forgotten"] == [dead]
    # The access token is reused for the next notification.
    run(fcm.send_to_devices("school-a", [good_1], "T", "B"))
    assert seen["auth"] == 1


def test_a_phone_is_registered_once_and_follows_the_latest_sign_in():
    user = make_user("parent-a", UserRole.parent)
    db = LenientDb(results=[FakeResult(), FakeResult()])
    run(users_router.register_push_device(PushDeviceRequest(token=TOKEN, platform="android"), current_user=user, db=db))
    device = next(item for item in db.added if type(item).__name__ == "PushDevice")
    assert device.user_id == "parent-a" and device.school_id == "school-a" and device.platform == "android"

    again = PushDevice(school_id="school-a", user_id="parent-a", token=TOKEN, platform="android")
    db = LenientDb(results=[FakeResult(), FakeResult([again])])
    run(users_router.register_push_device(PushDeviceRequest(token=TOKEN, platform="ios"), current_user=user, db=db))
    assert db.added == [] and again.platform == "ios"


def test_the_public_demo_never_registers_phones(monkeypatch):
    monkeypatch.setattr(settings, "public_demo_enabled", True)
    demo = User(id="d", school_id="s", email="parent.nadia@demo.educonnect.dz", full_name="N", role=UserRole.parent)
    db = LenientDb()
    out = run(users_router.register_push_device(PushDeviceRequest(token=TOKEN), current_user=demo, db=db))
    assert out == {"status": "skipped"} and db.added == []


def test_notifications_reach_registered_phones_only_when_push_is_on(monkeypatch):
    calls = []

    async def fake_send(school_id, tokens, title, body, kind):
        calls.append((school_id, tokens, title, kind))

    monkeypatch.setattr(notifications, "send_to_devices", fake_send)
    monkeypatch.setattr(notifications, "fcm_enabled", lambda: True)
    user = User(id="parent-a", school_id="school-a", email="p@wasel-edu.dz", full_name="P", role=UserRole.parent, push_token=None)

    def preference(push):
        return FakeResult([NotificationPreference(user_id="parent-a", school_id="school-a", notification_type="ALL",
                                                  in_app_enabled=True, push_enabled=push)])

    async def go(push):
        db = LenientDb(results=[FakeResult([user]), preference(push), FakeResult(["t" * 30])])
        await notifications.create_notification(db, "parent-a", "Paiement recu", "Texte", type="FEES", school_id="school-a")
        await asyncio.sleep(0)

    run(go(True))
    assert calls == [("school-a", ["t" * 30], "Paiement recu", "FEES")]
    calls.clear()
    run(go(False))
    assert calls == []
