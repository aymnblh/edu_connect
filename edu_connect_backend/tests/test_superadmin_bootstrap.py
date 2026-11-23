import asyncio
from datetime import datetime, timezone

from app.core.bootstrap import bootstrap_superadmin_if_configured
from app.core.config import settings
from app.core.security import verify_password
from app.modules.users.models import User, UserRole


class _FakeResult:
    def __init__(self, user):
        self._user = user

    def scalar_one_or_none(self):
        return self._user


class _FakeSession:
    def __init__(self, store: dict[str, User]):
        self._store = store
        self.committed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def execute(self, stmt, *args, **kwargs):
        compiled = stmt.compile()
        email = next((v for k, v in compiled.params.items() if "email" in k), None)
        if email is not None:
            return _FakeResult(self._store.get(email))
        return _FakeResult(None)

    def add(self, obj):
        if isinstance(obj, User):
            self._store[obj.email] = obj

    async def commit(self):
        self.committed = True


def _run(coro):
    return asyncio.run(coro)


def test_bootstrap_skips_when_unset(monkeypatch):
    monkeypatch.setattr(settings, "superadmin_bootstrap_email", "")
    monkeypatch.setattr(settings, "superadmin_bootstrap_password", "")
    assert _run(bootstrap_superadmin_if_configured()) is None


def test_bootstrap_rejects_demo_domain_and_weak_password(monkeypatch):
    monkeypatch.setattr(settings, "superadmin_bootstrap_email", "system.admin@demo.educonnect.dz")
    monkeypatch.setattr(settings, "superadmin_bootstrap_password", "StrongPassword123!")
    assert _run(bootstrap_superadmin_if_configured()) == "skipped_invalid_email"

    monkeypatch.setattr(settings, "superadmin_bootstrap_email", "admin@waseledu.dz")
    monkeypatch.setattr(settings, "superadmin_bootstrap_password", "short")
    assert _run(bootstrap_superadmin_if_configured()) == "skipped_weak_password"


def test_bootstrap_creates_updates_and_never_escalates(monkeypatch):
    store: dict[str, User] = {}

    def session_factory():
        return _FakeSession(store)

    async def _noop_rls(*args, **kwargs):
        return None

    monkeypatch.setattr("app.core.bootstrap.set_request_rls_context", _noop_rls)

    # 1. Create new superadmin
    monkeypatch.setattr(settings, "superadmin_bootstrap_email", "owner@waseledu.dz")
    monkeypatch.setattr(settings, "superadmin_bootstrap_password", "FirstSecret#2026")
    monkeypatch.setattr(settings, "superadmin_bootstrap_name", "Platform Owner")
    assert _run(bootstrap_superadmin_if_configured(session_factory=session_factory)) == "created"

    user = store["owner@waseledu.dz"]
    assert user.role == UserRole.system_admin
    assert user.school_id is None
    assert verify_password("FirstSecret#2026", user.password_hash)
    assert user.token_version in (None, 0)

    # Simulate deactivation before reset
    user.deactivated_at = datetime.now(timezone.utc)
    user.token_version = 0

    # 2. Reset password & reactivate existing superadmin
    monkeypatch.setattr(settings, "superadmin_bootstrap_password", "SecondSecret#2026")
    assert _run(bootstrap_superadmin_if_configured(session_factory=session_factory)) == "updated"
    assert verify_password("SecondSecret#2026", user.password_hash)
    assert user.deactivated_at is None
    assert user.token_version == 1

    # 3. Refuse to escalate non-admin account
    store["teacher@school.dz"] = User(
        id="teacher-1",
        school_id=None,
        email="teacher@school.dz",
        full_name="Teacher One",
        role=UserRole.teacher,
        password_hash="x",
    )
    monkeypatch.setattr(settings, "superadmin_bootstrap_email", "teacher@school.dz")
    monkeypatch.setattr(settings, "superadmin_bootstrap_password", "AnotherSecret#2026")
    assert _run(bootstrap_superadmin_if_configured(session_factory=session_factory)) == "refused_non_admin"
