from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.models import AuditEvent, User, UserRole
from app.modules.auth.routers import auth
from app.modules.core.routers import security as security_router
from app.modules.schools.routers import admin
from tests.test_access_control_boundaries import FakeDb, FakeResult, compiled_sql, make_request, make_user, run


def _event(action="auth.login_failed", **overrides):
    data = {
        "id": "ev-1",
        "school_id": "school-a",
        "actor_id": "teacher-a",
        "actor_role": "teacher",
        "action": action,
        "ip_address": "203.0.113.10",
        "device_platform": "android",
        "event_metadata": {"reason": "bad_password"},
        "created_at": datetime(2026, 10, 20, 8, 30, tzinfo=timezone.utc),
    }
    data.update(overrides)
    return AuditEvent(**data)


def _list(user, db, **filters):
    params = {
        "actor_id": None, "action": None, "category": None, "include_http": True,
        "resource_type": None, "resource_id": None, "date_from": None, "date_to": None,
        "limit": 100, "offset": 0,
    }
    params.update(filters)
    return run(security_router.list_audit_events(**params, current_user=user, db=db))


def test_audit_log_is_admin_only_and_school_scoped():
    with pytest.raises(HTTPException) as exc:
        _list(make_user("teacher-a", UserRole.teacher), FakeDb())
    assert exc.value.status_code == 403

    db = FakeDb(results=[FakeResult([(_event(), "Teacher A")])])
    out = _list(make_user("principal-a", UserRole.principal), db, category="auth", include_http=False, offset=50)

    assert out[0].actor_name == "Teacher A" and out[0].action == "auth.login_failed"
    sql = compiled_sql(db.executed[0]).replace("%%", "%")  # the driver escapes % in literals
    assert "audit_events.school_id = 'school-a'" in sql
    assert "audit_events.action LIKE 'auth.%'" in sql
    assert "audit_events.action NOT LIKE 'http.%'" in sql
    assert "OFFSET 50" in sql


def test_audit_export_is_csv_and_itself_audited():
    db = FakeDb(results=[FakeResult([(_event(), "Teacher A")]), FakeResult()])
    response = run(security_router.export_audit_events(
        request=make_request("/security/audit-events/export", method="GET"),
        actor_id=None, action=None, category="auth", include_http=False,
        resource_type=None, resource_id=None, date_from=None, date_to=None,
        current_user=make_user("principal-a", UserRole.principal), db=db,
    ))

    async def body():
        return b"".join([chunk async for chunk in response.body_iterator])

    text = run(body()).decode("utf-8-sig")
    header, row = text.strip().splitlines()
    assert header.startswith("date_utc;person;role;action")
    assert "Teacher A;teacher;auth.login_failed" in row and "reason=bad_password" in row
    assert response.headers["content-disposition"].startswith("attachment; filename=journal_audit_")
    assert [e.action for e in db.added if isinstance(e, AuditEvent)] == ["audit.exported"]


def test_sign_out_all_other_devices_keeps_this_one(monkeypatch):
    user = make_user("parent-a", UserRole.parent)
    user.password_hash = "hash-a"
    user.token_version = 2
    db = FakeDb(results=[FakeResult() for _ in range(4)])

    tokens = run(auth.revoke_other_sessions(
        request=make_request("/auth/sessions/revoke-others"),
        response=None,
        req=auth.RevokeOthersRequest(),
        current_user=user,
        db=db,
    ))

    assert user.token_version == 3
    assert compiled_sql(db.executed[0]).startswith("DELETE FROM refresh_tokens")
    assert set(tokens) == {"access_token", "refresh_token"}
    import jwt

    # Only the claim matters here; other tests may swap signing keys.
    assert jwt.decode(tokens["access_token"], options={"verify_signature": False})["tv"] == 3
    actions = [e.action for e in db.added if isinstance(e, AuditEvent)]
    assert actions == ["auth.sessions_revoked_all"]


def test_admin_sign_out_rules():
    request = make_request("/admin/users/x/sign-out")
    parent = make_user("parent-a", UserRole.parent)
    parent.token_version = 0
    secretary = make_user("secretary-b", UserRole.secretary)
    outsider = make_user("parent-z", UserRole.parent, school_id="school-z")
    get_map = {(User, "parent-a"): parent, (User, "secretary-b"): secretary, (User, "parent-z"): outsider}

    secretary_actor = make_user("secretary-a", UserRole.secretary)
    with pytest.raises(HTTPException) as exc:
        run(admin.sign_out_user("secretary-b", request=request, current_user=secretary_actor, db=FakeDb(get_map=get_map)))
    assert exc.value.status_code == 403
    with pytest.raises(HTTPException) as exc:
        run(admin.sign_out_user("parent-z", request=request, current_user=secretary_actor, db=FakeDb(get_map=get_map)))
    assert exc.value.status_code == 404
    with pytest.raises(HTTPException) as exc:
        run(admin.sign_out_user("secretary-a", request=request, current_user=secretary_actor, db=FakeDb(get_map=get_map)))
    assert exc.value.status_code == 400

    db = FakeDb(get_map=get_map, results=[FakeResult(), FakeResult()])
    assert run(admin.sign_out_user("parent-a", request=request, current_user=secretary_actor, db=db)) == {"status": "signed_out"}
    assert parent.token_version == 1
    assert compiled_sql(db.executed[0]).startswith("DELETE FROM refresh_tokens")
    assert [e.action for e in db.added if isinstance(e, AuditEvent)] == ["user.signed_out"]
