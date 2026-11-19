"""Regression tests for defensive security hardening controls."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Response
from pydantic import ValidationError

from app.core import rate_limit, security
from app.core.config import settings
from app.core.middleware import RequestBodySizeLimitMiddleware
from app.models import AuditEvent, Class, Message, PendingLink, RefreshToken, User, UserRole
from app.modules.auth.routers import auth, onboarding, verification
from app.modules.core.routers import security as security_router
from app.modules.messaging.routers import chat as chat_router
from app.modules.users.routers import users as users_router
from app.modules.users.schemas import PushTokenRequest, UserUpdate
from app.schemas import LinkByQrRequest, SchoolRegistration
from app.utils.push import expected_ntfy_topic, validate_ntfy_topic
from tests.test_access_control_boundaries import FakeDb, FakeResult, make_request, make_user, run
from tests.test_growth_features import LenientDb


ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(autouse=True)
def _clear_rate_limit_buckets():
    rate_limit._buckets.clear()
    yield
    rate_limit._buckets.clear()


def test_push_topic_blocks_ssrf_and_cross_user_injection():
    user = make_user("parent-a", UserRole.parent)
    other = make_user("parent-b", UserRole.parent)

    for malicious in (
        "../admin/secret",
        "topic/subpath",
        "topic?priority=urgent",
        "topic#frag",
        "short",
        expected_ntfy_topic(other.id),
    ):
        with pytest.raises(HTTPException) as exc:
            run(
                users_router.register_push_token(
                    PushTokenRequest(push_token=malicious),
                    current_user=user,
                    db=FakeDb(),
                )
            )
        assert exc.value.status_code == 422

    assert validate_ntfy_topic("../escape") is None
    assert validate_ntfy_topic("valid-topic_123456") == "valid-topic_123456"

    own_topic = expected_ntfy_topic(user.id)
    out = run(
        users_router.register_push_token(
            PushTokenRequest(push_token=own_topic),
            current_user=user,
            db=FakeDb(),
        )
    )
    assert out == {"status": "ok"}
    assert user.push_token == own_topic


def test_avatar_url_rejects_non_https_schemes():
    for bad in (
        "javascript:alert(1)",
        "http://example.com/avatar.png",
        "data:image/svg+xml,<svg/>",
        "https://example.com/a b.png",
    ):
        with pytest.raises(ValidationError):
            UserUpdate(avatar_url=bad)

    valid = UserUpdate(avatar_url="https://cdn.educonnect.dz/avatars/u1.png")
    assert valid.avatar_url == "https://cdn.educonnect.dz/avatars/u1.png"
    assert UserUpdate(avatar_url="   ").avatar_url is None


def test_audit_csv_export_neutralizes_formula_injection():
    event = AuditEvent(
        id="ev-formula",
        school_id="school-a",
        actor_id="teacher-a",
        actor_role="teacher",
        action="auth.login_failed",
        ip_address="203.0.113.10",
        device_platform="+cmd|' /C calc'!A0",
        event_metadata={"note": "@SUM(1+1)"},
        created_at=datetime(2026, 10, 20, 8, 30, tzinfo=timezone.utc),
    )
    db = FakeDb(results=[FakeResult([(event, "=HYPERLINK(\"http://evil\")")]), FakeResult()])
    response = run(
        security_router.export_audit_events(
            request=make_request("/security/audit-events/export", method="GET"),
            actor_id=None,
            action=None,
            category=None,
            include_http=True,
            resource_type=None,
            resource_id=None,
            date_from=None,
            date_to=None,
            current_user=make_user("principal-a", UserRole.principal),
            db=db,
        )
    )

    async def body():
        return b"".join([chunk async for chunk in response.body_iterator])

    text = run(body()).decode("utf-8-sig")
    _, row = text.strip().splitlines()
    assert "'=HYPERLINK" in row
    assert "'+cmd|" in row
    assert "note=@SUM(1+1)" in row


def test_refresh_cookie_csrf_blocks_foreign_and_missing_prod_origins(monkeypatch):
    monkeypatch.setattr(settings, "cors_origins", "https://app.educonnect.dz")
    req_foreign = SimpleNamespace(
        headers={"origin": "https://evil.example"},
        state=SimpleNamespace(ip_address="203.0.113.5"),
    )
    with pytest.raises(HTTPException) as exc:
        run(
            auth.refresh(
                request=req_foreign,
                response=None,
                refresh_token=None,
                refresh_cookie="dummy-cookie",
                db=FakeDb(),
            )
        )
    assert exc.value.status_code == 403

    with pytest.raises(HTTPException) as exc_logout:
        run(
            auth.logout(
                request=req_foreign,
                response=None,
                refresh_token=None,
                refresh_cookie="dummy-cookie",
                db=FakeDb(),
            )
        )
    assert exc_logout.value.status_code == 403

    monkeypatch.setattr(settings, "app_env", "production")
    req_missing_origin = SimpleNamespace(
        headers={},
        state=SimpleNamespace(ip_address="203.0.113.6"),
    )
    with pytest.raises(HTTPException) as exc_prod:
        auth._assert_cookie_csrf_origin(req_missing_origin)
    assert exc_prod.value.status_code == 403


def test_rotate_refresh_token_rejects_deactivated_user():
    deactivated = make_user("parent-dead", UserRole.parent)
    deactivated.password_hash = "hash"
    deactivated.deactivated_at = datetime.now(timezone.utc)
    refresh_jwt = security.create_refresh_token(deactivated.id, "fam-1")
    token_row = RefreshToken(
        school_id=deactivated.school_id,
        user_id=deactivated.id,
        token_hash="ignored",
        family_id="fam-1",
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db = LenientDb(
        results=[
            FakeResult([token_row]),  # select RefreshToken
            FakeResult([deactivated]),  # select User
            FakeResult(),  # delete RefreshToken family
        ]
    )
    with pytest.raises(HTTPException) as exc:
        run(security.rotate_refresh_token(db, refresh_jwt))
    assert exc.value.status_code == 403


def test_link_by_qr_rejects_revoked_link_and_archived_student():
    parent = make_user("parent-a", UserRole.parent)
    revoked_link = PendingLink(
        school_id="school-a",
        student_id="student-a",
        token="qr-token-revoked-123456",
        status="pending",
        revoked_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    with pytest.raises(HTTPException) as exc:
        run(
            verification.link_student_by_qr(
                request=make_request("/verification/link-by-qr"),
                payload=LinkByQrRequest(token=revoked_link.token),
                current_user=parent,
                db=FakeDb(results=[FakeResult([revoked_link])]),
            )
        )
    assert exc.value.status_code == 400

    active_link = PendingLink(
        school_id="school-a",
        student_id="student-archived",
        token="qr-token-archived-123456",
        status="pending",
        revoked_at=None,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    with pytest.raises(HTTPException) as exc_arch:
        run(
            verification.link_student_by_qr(
                request=make_request("/verification/link-by-qr"),
                payload=LinkByQrRequest(token=active_link.token),
                current_user=parent,
                db=FakeDb(results=[FakeResult([active_link]), FakeResult([])]),
            )
        )
    assert exc_arch.value.status_code == 400


def test_onboarding_enforces_per_ip_limit_across_rotating_emails():
    for index in range(5):
        payload = SchoolRegistration(
            school_name=f"Ecole Test {index}",
            admin_full_name="Directeur Test",
            admin_email=f"dir{index}@example.com",
            admin_password="StrongPassword123!",
            terms_accepted=False,
        )
        with pytest.raises(HTTPException) as exc:
            run(onboarding.register_school(payload, make_request("/onboarding/register-school"), db=FakeDb()))
        assert exc.value.status_code == 400

    payload_sixth = SchoolRegistration(
        school_name="Ecole Test 6",
        admin_full_name="Directeur Test",
        admin_email="dir6@example.com",
        admin_password="StrongPassword123!",
        terms_accepted=False,
    )
    with pytest.raises(HTTPException) as exc_rate:
        run(onboarding.register_school(payload_sixth, make_request("/onboarding/register-school"), db=FakeDb()))
    assert exc_rate.value.status_code == 429


def test_body_size_limit_middleware_rejects_oversized_json():
    middleware = RequestBodySizeLimitMiddleware(app=None)

    async def ok_next(_request):
        return Response(status_code=200)

    req_ok = SimpleNamespace(
        headers={"content-type": "application/json", "content-length": "128"}
    )
    res_ok = run(middleware.dispatch(req_ok, ok_next))
    assert res_ok.status_code == 200

    req_large = SimpleNamespace(
        headers={
            "content-type": "application/json",
            "content-length": str(2 * 1024 * 1024),
        }
    )
    res_large = run(middleware.dispatch(req_large, ok_next))
    assert res_large.status_code == 413

    req_multipart_ok = SimpleNamespace(
        headers={
            "content-type": "multipart/form-data; boundary=abc",
            "content-length": str(5 * 1024 * 1024),
        }
    )
    res_multipart_ok = run(middleware.dispatch(req_multipart_ok, ok_next))
    assert res_multipart_ok.status_code == 200


def test_infra_and_ci_hardening_controls():
    dockerignore = (ROOT / ".dockerignore").read_text(encoding="utf-8")
    assert "render-secrets/" in dockerignore
    assert "tests/.test_keys/" in dockerignore

    start_sh = (ROOT / "scripts" / "start.sh").read_text(encoding="utf-8")
    assert "--proxy-headers" in start_sh
    assert "--forwarded-allow-ips" in start_sh
    assert "--limit-concurrency" in start_sh

    backup_sh = (ROOT / "scripts" / "backup_educonnect.sh").read_text(encoding="utf-8")
    assert "cp -a secrets/." not in backup_sh
    assert 'cp "$ENV_FILE"' not in backup_sh
    assert "keys_excluded_by_policy=true" in backup_sh

    workflow = (ROOT.parent / ".github" / "workflows" / "production-readiness.yml").read_text(encoding="utf-8")
    assert "permissions:\n  contents: read" in workflow
    assert "persist-credentials: false" in workflow


def test_class_chat_report_endpoint_audits_and_validates(monkeypatch):
    parent = make_user("parent-a", UserRole.parent)
    cls = Class(id="class-a", school_id="school-a", name="2AM-A", join_code="ABC123")
    msg = Message(
        id="msg-1",
        school_id="school-a",
        class_id="class-a",
        sender_id="teacher-a",
        sender_name="Teacher A",
        content="Contenu",
        is_announcement=True,
        recipient_ids=["parent-a"],
    )

    async def fake_access(class_id, user, db):
        return cls

    notified = []

    async def fake_notify(db, user_id, title, content, type="INFO", school_id=None):
        notified.append((user_id, type))

    monkeypatch.setattr(chat_router, "_assert_can_access_class_chat", fake_access)
    import app.utils.notifications as notif_mod
    monkeypatch.setattr(notif_mod, "create_notification", fake_notify)

    # Invalid reason rejected
    with pytest.raises(HTTPException) as exc_reason:
        run(
            chat_router.report_class_message(
                class_id="class-a",
                message_id="msg-1",
                req=chat_router.ChatMessageReportRequest(reason="invalid_reason"),
                request=make_request("/classes/class-a/messages/msg-1/report"),
                current_user=parent,
                db=FakeDb(),
            )
        )
    assert exc_reason.value.status_code == 400

    # Valid report audits and notifies school admin
    db = LenientDb(results=[FakeResult([msg]), FakeResult(["principal-a"])])
    out = run(
        chat_router.report_class_message(
            class_id="class-a",
            message_id="msg-1",
            req=chat_router.ChatMessageReportRequest(reason="harassment", details="Insulte"),
            request=make_request("/classes/class-a/messages/msg-1/report"),
            current_user=parent,
            db=db,
        )
    )
    assert out == {"status": "reported", "message_id": "msg-1"}
    assert [e.action for e in db.added if isinstance(e, AuditEvent)] == ["chat.message_reported"]
    assert notified == [("principal-a", "SECURITY")]

