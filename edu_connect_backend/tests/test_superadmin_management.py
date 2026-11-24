"""Unit tests for expanded SuperAdmin backend capabilities."""
import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi import HTTPException
import pytest

from app.core.security import (
    create_impersonation_token,
    decode_token,
    get_current_user,
    verify_password,
)
from app.models import (
    Announcement,
    AuditEvent,
    Course,
    School,
    Semester,
    SubscriptionPayment,
    User,
    UserRole,
)
from app.modules.core.routers import security as security_router
from app.modules.schools.routers import system, system_broadcasts, system_users
from app.modules.users.routers import users as users_router


def _run(coro):
    return asyncio.run(coro)


def _request(path: str, method: str = "POST"):
    return SimpleNamespace(
        method=method,
        url=SimpleNamespace(path=path),
        headers={"user-agent": "pytest"},
        state=SimpleNamespace(ip_address="127.0.0.1", device_fingerprint="fp", device_platform="web"),
    )


def _make_user(
    user_id: str,
    role: UserRole,
    *,
    school_id: str | None = None,
    email: str | None = None,
    full_name: str = "Test User",
    deactivated_at: datetime | None = None,
    token_version: int = 0,
) -> User:
    return User(
        id=user_id,
        school_id=school_id,
        email=email or f"{user_id}@waseledu.dz",
        full_name=full_name,
        role=role,
        password_hash="hashed-secret",
        deactivated_at=deactivated_at,
        token_version=token_version,
        created_at=datetime(2026, 10, 1, 8, 0, tzinfo=timezone.utc),
    )


def _make_school(school_id: str = "school-1", name: str = "Ecole El Amal", is_active: bool = True) -> School:
    return School(
        id=school_id,
        name=name,
        student_id_prefix="ELA",
        is_active=is_active,
        tenant_config={"plan": "pro", "max_parents_per_student": 2, "modules": {"canteen": False, "transport": False}},
        created_at=datetime(2026, 10, 1, 8, 0, tzinfo=timezone.utc),
    )


class _FakeScalars:
    def __init__(self, items):
        self._items = list(items)

    def all(self):
        return list(self._items)


class _FakeResult:
    def __init__(self, rows=None, *, rowcount: int = 0):
        self._rows = list(rows or [])
        self.rowcount = rowcount

    def all(self):
        return list(self._rows)

    def scalars(self):
        return _FakeScalars(self._rows)

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None


class _FakeDb:
    def __init__(self, *, objects: dict[tuple[type, str], object] | None = None, results=None, scalars=None):
        self.objects = dict(objects or {})
        self._results = list(results or [])
        self._scalars = list(scalars or [])
        self.added = []
        self.deleted = []
        self.executed = []
        self.committed = False
        self.flushed = False

    async def get(self, model, key):
        return self.objects.get((model, key))

    async def execute(self, stmt, *args, **kwargs):
        self.executed.append(stmt)
        return self._results.pop(0) if self._results else _FakeResult()

    async def scalar(self, stmt, *args, **kwargs):
        self.executed.append(stmt)
        return self._scalars.pop(0) if self._scalars else 0

    def add(self, obj):
        self.added.append(obj)
        if getattr(obj, "id", None) is None:
            obj.id = f"gen-{len(self.added)}"
        self.objects[(type(obj), obj.id)] = obj

    async def delete(self, obj):
        self.deleted.append(obj)

    async def flush(self):
        self.flushed = True

    async def commit(self):
        self.committed = True

    async def refresh(self, obj):
        return obj


def _sql(stmt) -> str:
    return str(stmt.compile(compile_kwargs={"literal_binds": True}))


def test_create_school_full_creates_school_courses_semesters_and_principal():
    admin = _make_user("super-1", UserRole.system_admin)
    db = _FakeDb(results=[_FakeResult([]), _FakeResult([])])  # email lookup + audit RLS config

    payload = system.SystemSchoolCreateRequest(
        name="Lycee Ibn Khaldoun",
        student_id_prefix="IKH",
        is_active=True,
        plan="enterprise",
        max_parents_per_student=3,
        modules=system.SchoolModulesPayload(canteen=True, transport=True),
        subscription_months=12,
        principal_email="directeur@ikh.dz",
        principal_full_name="Karim Benali",
        principal_password="StrongPassword#2026",
    )

    out = _run(system.create_school_full(payload, _request("/system/schools"), current_user=admin, db=db))

    assert out["name"] == "Lycee Ibn Khaldoun"
    assert out["student_id_prefix"] == "IKH"
    assert out["is_active"] is True
    assert out["plan"] == "enterprise"
    assert out["modules"] == {"canteen": True, "transport": True}
    assert out["principal_email"] == "directeur@ikh.dz"
    assert out["subscription_expires_at"] is not None

    schools = [o for o in db.added if isinstance(o, School)]
    principals = [o for o in db.added if isinstance(o, User)]
    courses = [o for o in db.added if isinstance(o, Course)]
    semesters = [o for o in db.added if isinstance(o, Semester)]
    audits = [o for o in db.added if isinstance(o, AuditEvent)]
    assert len(schools) == 1
    assert len(principals) == 1 and principals[0].role == UserRole.principal
    assert verify_password("StrongPassword#2026", principals[0].password_hash)
    assert len(courses) >= 10
    assert len(semesters) == 3
    assert [a.action for a in audits] == ["system.school_created"]


def test_create_school_full_rejects_partial_principal_and_non_admin():
    teacher = _make_user("t-1", UserRole.teacher, school_id="s-1")
    with pytest.raises(HTTPException) as exc:
        _run(
            system.create_school_full(
                system.SystemSchoolCreateRequest(name="Test School"),
                _request("/system/schools"),
                current_user=teacher,
                db=_FakeDb(),
            )
        )
    assert exc.value.status_code == 403

    admin = _make_user("super-1", UserRole.system_admin)
    with pytest.raises(HTTPException) as exc2:
        _run(
            system.create_school_full(
                system.SystemSchoolCreateRequest(name="Test School", principal_email="dir@test.dz"),
                _request("/system/schools"),
                current_user=admin,
                db=_FakeDb(),
            )
        )
    assert exc2.value.status_code == 400


def test_update_and_delete_school_require_confirmation_and_audit():
    admin = _make_user("super-1", UserRole.system_admin)
    school = _make_school("s-1", "Ecole El Amal")
    db = _FakeDb(objects={(School, "s-1"): school})

    updated = _run(
        system.update_school(
            "s-1",
            system.SystemSchoolUpdateRequest(
                name="Ecole El Amal Plus",
                plan="enterprise",
                max_parents_per_student=4,
                modules=system.SchoolModulesPayload(canteen=True, transport=False),
            ),
            _request("/system/schools/s-1", "PATCH"),
            current_user=admin,
            db=db,
        )
    )
    assert updated["name"] == "Ecole El Amal Plus"
    assert updated["modules"] == {"canteen": True, "transport": False}
    assert updated["max_parents_per_student"] == 4

    # Wrong confirmation name rejected
    with pytest.raises(HTTPException) as exc:
        _run(
            system.delete_school(
                "s-1",
                _request("/system/schools/s-1", "DELETE"),
                confirm_name="Wrong Name",
                current_user=admin,
                db=db,
            )
        )
    assert exc.value.status_code == 400

    # Matching confirmation deletes school + its users and writes platform audit event
    del_db = _FakeDb(
        objects={(School, "s-1"): school},
        results=[_FakeResult(["u-1", "u-2"]), _FakeResult(), _FakeResult(), _FakeResult()],
    )
    res = _run(
        system.delete_school(
            "s-1",
            _request("/system/schools/s-1", "DELETE"),
            confirm_name="ecole el amal plus",
            current_user=admin,
            db=del_db,
        )
    )
    assert res["status"] == "deleted"
    assert res["deleted_users"] == 2
    audits = [o for o in del_db.added if isinstance(o, AuditEvent)]
    assert len(audits) == 1 and audits[0].action == "system.school_deleted" and audits[0].school_id is None


def test_impersonation_token_resolves_to_detached_principal_and_blocks_profile_edit():
    admin = _make_user("super-1", UserRole.system_admin, email="owner@waseledu.dz", token_version=2)
    school = _make_school("s-99", "Ecole Atlas", is_active=False)

    db_imp = _FakeDb(objects={(School, "s-99"): school})
    resp = _run(
        system.impersonate_school(
            "s-99",
            _request("/system/schools/s-99/impersonate"),
            current_user=admin,
            db=db_imp,
        )
    )
    claims = decode_token(resp.access_token)
    assert claims["role"] == "principal"
    assert claims["school_id"] == "s-99"
    assert claims["impersonator_role"] == "system_admin"
    assert claims["impersonator_id"] == "super-1"

    # Resolve impersonation token via get_current_user
    db_auth = _FakeDb(
        objects={(School, "s-99"): school},
        results=[_FakeResult(), _FakeResult([admin])],  # set_auth_user_id + select(User)
    )
    impersonated = _run(get_current_user(claims=claims, db=db_auth))
    assert impersonated.id == admin.id
    assert impersonated.role == UserRole.principal
    assert impersonated.school_id == "s-99"
    assert getattr(impersonated, "_is_impersonated", False) is True
    # Original admin object was NOT mutated
    assert admin.role == UserRole.system_admin
    assert admin.school_id is None

    # Profile edits must be rejected during impersonation
    with pytest.raises(HTTPException) as exc:
        _run(users_router.update_me(users_router.UserUpdate(full_name="Hacked"), current_user=impersonated, db=db_auth))
    assert exc.value.status_code == 403


def test_system_users_create_update_guards_and_password_reset():
    admin = _make_user("super-1", UserRole.system_admin)
    school = _make_school("s-1", "Ecole El Amal")

    # Create principal in school
    db = _FakeDb(objects={(School, "s-1"): school}, results=[_FakeResult([]), _FakeResult()])
    created = _run(
        system_users.create_system_user(
            system_users.SystemUserCreate(
                email="dir@amal.dz",
                full_name="Nadia Mansouri",
                role=UserRole.principal,
                password="StrongPassword#2026",
                school_id="s-1",
            ),
            _request("/system/users"),
            current_user=admin,
            db=db,
        )
    )
    assert created.email == "dir@amal.dz"
    assert created.role == "principal"
    assert created.school_name == "Ecole El Amal"

    # Guard: cannot deactivate self
    db_self = _FakeDb(objects={(User, "super-1"): admin})
    with pytest.raises(HTTPException) as exc:
        _run(
            system_users.update_system_user(
                "super-1",
                system_users.SystemUserUpdate(is_active=False),
                _request("/system/users/super-1", "PATCH"),
                current_user=admin,
                db=db_self,
            )
        )
    assert exc.value.status_code == 400

    # Guard: cannot demote last active system_admin
    other_admin = _make_user("super-2", UserRole.system_admin)
    db_last = _FakeDb(objects={(User, "super-2"): other_admin}, scalars=[1])
    with pytest.raises(HTTPException) as exc2:
        _run(
            system_users.update_system_user(
                "super-2",
                system_users.SystemUserUpdate(is_active=False),
                _request("/system/users/super-2", "PATCH"),
                current_user=admin,
                db=db_last,
            )
        )
    assert exc2.value.status_code == 400

    # Reset password bumps token_version and revokes refresh tokens
    target = _make_user("u-5", UserRole.teacher, school_id="s-1", token_version=1)
    db_reset = _FakeDb(objects={(User, "u-5"): target})
    _run(
        system_users.reset_system_user_password(
            "u-5",
            system_users.SystemPasswordResetRequest(password="NewSecret#2026"),
            _request("/system/users/u-5/reset-password"),
            current_user=admin,
            db=db_reset,
        )
    )
    assert target.token_version == 2
    assert verify_password("NewSecret#2026", target.password_hash)


def test_platform_broadcast_sends_notifications_and_optional_announcements(monkeypatch):
    admin = _make_user("super-1", UserRole.system_admin, full_name="Super Admin")
    s1 = _make_school("s-1", "Ecole A")
    s2 = _make_school("s-2", "Ecole B")

    sent = []

    async def _fake_notify(db, *, user_id, title, content, type="INFO", school_id=None):
        sent.append((school_id, user_id, title, type))

    monkeypatch.setattr(system_broadcasts, "create_notification", _fake_notify)

    db = _FakeDb(
        results=[
            _FakeResult([s1, s2]),      # schools query
            _FakeResult(["u-1", "u-2"]),  # s1 users
            _FakeResult(["u-3"]),         # s2 users
            _FakeResult(),                # audit RLS
        ]
    )
    out = _run(
        system_broadcasts.send_platform_broadcast(
            system_broadcasts.PlatformBroadcastRequest(
                title="Maintenance planifiee",
                body="Une mise a jour aura lieu vendredi soir.",
                audience="all_users",
                target_schools="active",
                publish_announcement=True,
            ),
            _request("/system/broadcasts"),
            current_user=admin,
            db=db,
        )
    )
    assert out.school_count == 2
    assert out.recipient_count == 3
    assert out.announcements_created == 2
    assert len(sent) == 3
    announcements = [o for o in db.added if isinstance(o, Announcement)]
    assert len(announcements) == 2
    audits = [o for o in db.added if isinstance(o, AuditEvent)]
    assert [a.action for a in audits] == ["system.broadcast_sent"]


def test_audit_query_allows_school_filter_only_for_system_admin():
    admin = _make_user("super-1", UserRole.system_admin)
    principal = _make_user("dir-1", UserRole.principal, school_id="school-a")

    stmt_school = security_router._audit_query(
        admin, school_id="school-b", actor_id=None, action=None, category=None,
        include_http=True, resource_type=None, resource_id=None, date_from=None, date_to=None,
    )
    assert "audit_events.school_id = 'school-b'" in _sql(stmt_school)

    stmt_platform = security_router._audit_query(
        admin, school_id="__platform__", actor_id=None, action=None, category=None,
        include_http=True, resource_type=None, resource_id=None, date_from=None, date_to=None,
    )
    assert "audit_events.school_id IS NULL" in _sql(stmt_platform)

    # Principal cannot cross-query school-b
    stmt_dir = security_router._audit_query(
        principal, school_id="school-b", actor_id=None, action=None, category=None,
        include_http=True, resource_type=None, resource_id=None, date_from=None, date_to=None,
    )
    sql_dir = _sql(stmt_dir)
    assert "audit_events.school_id = 'school-a'" in sql_dir
    assert "school-b" not in sql_dir
