import asyncio

from app.core import security_alerts
from app.models import AuditEvent, Notification, User, UserRole


def run(coro):
    return asyncio.run(coro)


class FakeResult:
    def __init__(self, rows=None):
        self.rows = rows or []

    def scalar_one_or_none(self):
        return self.rows[0] if self.rows else None

    def scalars(self):
        return self

    def all(self):
        return self.rows


class FakeDb:
    def __init__(self, results=None):
        self.results = list(results or [])
        self.added = []
        self.executed = []
        self.flushes = 0

    async def execute(self, stmt, *_args, **_kwargs):
        self.executed.append(stmt)
        if self.results:
            return self.results.pop(0)
        return FakeResult()

    async def get(self, _model, _key):
        return None

    def add(self, value):
        self.added.append(value)

    async def flush(self):
        self.flushes += 1


def _reset_alert_state(monkeypatch, *, threshold=2):
    security_alerts._memory_counters.clear()
    security_alerts._memory_cooldowns.clear()
    monkeypatch.setattr(security_alerts.settings, "app_env", "test")
    monkeypatch.setattr(security_alerts.settings, "security_alert_status_codes", "401,403,429")
    monkeypatch.setattr(security_alerts.settings, "security_alert_threshold", threshold)
    monkeypatch.setattr(security_alerts.settings, "security_alert_window_seconds", 300)
    monkeypatch.setattr(security_alerts.settings, "security_alert_cooldown_seconds", 900)


def test_security_alert_triggers_once_at_threshold(monkeypatch):
    _reset_alert_state(monkeypatch, threshold=2)
    db = FakeDb()

    first = run(
        security_alerts.record_security_response_if_needed(
            db,
            status_code=401,
            path="/auth/login",
            method="POST",
            ip_address="203.0.113.10",
        )
    )
    second = run(
        security_alerts.record_security_response_if_needed(
            db,
            status_code=401,
            path="/auth/login",
            method="POST",
            ip_address="203.0.113.10",
        )
    )
    third = run(
        security_alerts.record_security_response_if_needed(
            db,
            status_code=401,
            path="/auth/login",
            method="POST",
            ip_address="203.0.113.10",
        )
    )

    assert first is False
    assert second is True
    assert third is False
    audit_events = [event for event in db.added if isinstance(event, AuditEvent)]
    assert len(audit_events) == 1
    assert audit_events[0].action == "security.response_spike"
    assert audit_events[0].status_code == 401


def test_security_alert_notifies_school_admins(monkeypatch):
    _reset_alert_state(monkeypatch, threshold=1)
    admin = User(
        id="principal-a",
        school_id="school-a",
        email="principal-a@example.test",
        full_name="Principal A",
        role=UserRole.principal,
    )
    db = FakeDb(
        results=[
            FakeResult(),
            FakeResult(),
            FakeResult([admin]),
            FakeResult([admin]),
            FakeResult(),
        ]
    )

    alerted = run(
        security_alerts.record_security_response_if_needed(
            db,
            status_code=403,
            path="/security/audit-events",
            method="GET",
            ip_address="203.0.113.20",
            school_id="school-a",
        )
    )

    assert alerted is True
    assert any(isinstance(item, AuditEvent) for item in db.added)
    notifications = [item for item in db.added if isinstance(item, Notification)]
    assert len(notifications) == 1
    assert notifications[0].user_id == "principal-a"
    assert notifications[0].type == "SECURITY"
