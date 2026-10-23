"""Public demo, setup checklist and monthly report."""
import io
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.testclient import TestClient
from sqlalchemy.sql.elements import TextClause

from app.core import security
from app.core.config import settings
from app.core.middleware import DemoReadOnlyMiddleware
from app.models import AttendanceStatus, AuditEvent, ClassMember, School, Student, User, UserRole
from app.modules.auth.routers import auth
from app.modules.core.routers import security as security_router
from app.modules.demo.access import DEMO_DOMAIN, DEMO_READ_ONLY_MESSAGE
from app.modules.demo.refresh import demo_is_stale
from app.modules.reports import monthly
from app.modules.schools.calendar import ALGERIA_TZ
from app.modules.schools.routers import admin, setup
from tests.test_access_control_boundaries import FakeDb, FakeResult, make_request, make_user, run


class LenientDb(FakeDb):
    """Answers RLS set_config statements itself; ORM queries pop the scripted results."""

    async def get(self, model, key):
        # Match by name: other test modules may reload app.models.
        return next((value for (kind, id_), value in self.get_map.items()
                     if kind.__name__ == model.__name__ and id_ == key), None)

    async def execute(self, stmt, *args, **kwargs):
        if isinstance(stmt, TextClause):
            return FakeResult()
        return await super().execute(stmt, *args, **kwargs)


class CountResult(FakeResult):
    def scalar(self):
        return self.rows[0] if self.rows else None


def _demo_user(role=UserRole.principal):
    return User(id="demo-director", school_id="demo-school", email=f"director@{DEMO_DOMAIN}",
                full_name="Nora Benali", role=role, password_hash="x", token_version=0)


# ── Public demo ──────────────────────────────────────────────────────────────

def test_demo_tokens_are_marked_only_while_the_public_demo_is_open(monkeypatch):
    monkeypatch.setattr(settings, "public_demo_enabled", False)
    assert "demo" not in security.access_payload_for_user(_demo_user())
    monkeypatch.setattr(settings, "public_demo_enabled", True)
    assert security.access_payload_for_user(_demo_user())["demo"] is True
    real = make_user("director-a", UserRole.principal)
    assert "demo" not in security.access_payload_for_user(real)


def _demo_app():
    app = FastAPI()
    app.add_middleware(DemoReadOnlyMiddleware)

    @app.get("/grades")
    async def read():
        return {"ok": True}

    @app.post("/grades")
    async def write():
        return {"ok": True}

    @app.post("/auth/logout")
    async def logout():
        return {"ok": True}

    return app


def _token(**extra):
    return security.create_access_token({"sub": "u1", "role": "principal", "school_id": "s1", "tv": 0, **extra})


def test_demo_sessions_can_read_but_never_write():
    client = TestClient(_demo_app())
    demo = {"Authorization": f"Bearer {_token(demo=True)}"}
    assert client.get("/grades", headers=demo).status_code == 200
    blocked = client.post("/grades", headers=demo)
    assert blocked.status_code == 403
    assert blocked.json()["detail"] == DEMO_READ_ONLY_MESSAGE
    assert blocked.headers["X-Demo-Read-Only"] == "1"
    # Leaving the demo still works.
    assert client.post("/auth/logout", headers=demo).status_code == 200
    # Real sessions are untouched.
    assert client.post("/grades", headers={"Authorization": f"Bearer {_token()}"}).status_code == 200


def test_demo_login_is_closed_unless_enabled(monkeypatch):
    monkeypatch.setattr(settings, "public_demo_enabled", False)
    assert run(auth.demo_availability())["enabled"] is False
    with pytest.raises(HTTPException) as exc:
        run(auth.demo_login(auth.DemoLoginRequest(role="parent"), make_request("/auth/demo-login"), db=FakeDb()))
    assert exc.value.status_code == 404


def test_demo_login_opens_a_session_without_identifying_the_visitor(monkeypatch):
    monkeypatch.setattr(settings, "public_demo_enabled", True)
    user = _demo_user()
    db = LenientDb(results=[FakeResult([user])])
    tokens = run(auth.demo_login(auth.DemoLoginRequest(role="principal"), make_request("/auth/demo-login"), db=db))
    claims = security.decode_token(tokens["access_token"])
    assert claims["demo"] is True and claims["sub"] == user.id
    session = db.added[0]
    assert session.ip_address is None and session.user_agent is None and session.device_fingerprint is None
    assert (session.expires_at - datetime.now(timezone.utc)).days < 2


def test_demo_visitors_do_not_see_each_others_sessions_or_addresses(monkeypatch):
    monkeypatch.setattr(settings, "public_demo_enabled", True)
    assert run(auth.list_sessions(current_user=_demo_user(), db=FakeDb())) == []
    event = AuditEvent(id="e1", school_id="demo-school", action="auth.login_success", ip_address="198.51.100.7",
                       user_agent="Firefox", device_fingerprint="abc", created_at=datetime.now(timezone.utc))
    out = security_router._with_name(event, "Nora", hide_device=True)
    assert out.ip_address is None and out.user_agent is None and out.device_fingerprint is None


def test_demo_pins_cannot_be_used_to_join_the_demo_school():
    student = Student(id="s1", school_id="demo-school", student_id="DEMO-001", full_name="Sami", linking_pin="420001")
    school = School(id="demo-school", name="Demo", tenant_config={"demo_data": True})
    db = LenientDb(get_map={(School, "demo-school"): school}, results=[FakeResult(), FakeResult([student])])
    request = auth.ParentRegisterRequest(full_name="Visitor", email="visitor@wasel-edu.dz", password="password123",
                                         terms_accepted=True, student_id="DEMO-001", pin="420001")
    with pytest.raises(HTTPException) as exc:
        run(auth.register_parent_code(request, make_request("/auth/register-parent-code"), db=db))
    assert exc.value.status_code == 403
    assert db.added == []


def test_demo_is_rebuilt_once_a_day_after_three_in_the_morning():
    at = lambda day, hour: datetime(2026, 10, day, hour, tzinfo=ALGERIA_TZ)  # noqa: E731
    assert demo_is_stale(None, at(23, 10))
    assert not demo_is_stale("2026-10-23", at(23, 23))
    assert not demo_is_stale("2026-10-22", at(23, 1))
    assert demo_is_stale("2026-10-22", at(23, 3))
    assert demo_is_stale("2026-10-20", at(23, 1))


# ── Setup checklist ──────────────────────────────────────────────────────────

def _counts(**overrides):
    counts = {"semesters": 3, "classes": 4, "courses": 6, "students": 100, "students_without_class": 0,
              "teachers": 5, "teachers_active": 3, "classes_with_teacher": 4, "students_with_parent": 50}
    counts.update(overrides)
    return counts


def test_setup_steps_follow_the_school_state():
    steps = {step["key"]: step for step in setup.setup_steps(_counts())}
    assert all(step["done"] for step in steps.values())
    assert steps["teachers"]["pending"] == 2

    steps = {step["key"]: step for step in setup.setup_steps(_counts(
        students_without_class=7, classes_with_teacher=3, students_with_parent=49))}
    assert not steps["students"]["done"] and steps["students"]["pending"] == 7
    assert not steps["assignments"]["done"]
    assert not steps["parents"]["done"]

    empty = setup.setup_steps(_counts(classes=0, students=0, classes_with_teacher=0, students_with_parent=0))
    assert [step["key"] for step in empty if not step["done"]] == ["classes", "students", "assignments", "parents"]


def test_only_school_administration_sees_setup_tools():
    with pytest.raises(HTTPException) as exc:
        run(setup.setup_status(current_user=make_user("teacher-a", UserRole.teacher), db=FakeDb()))
    assert exc.value.status_code == 403
    with pytest.raises(HTTPException):
        run(setup.parent_codes(make_request("/admin/parent-codes", "GET"), current_user=make_user("parent-a", UserRole.parent), db=FakeDb()))


def test_dismissing_the_checklist_is_saved_for_the_school():
    school = School(id="school-a", name="A", tenant_config={"max_parents_per_student": 2})
    db = FakeDb(get_map={(School, "school-a"): school})
    run(setup.dismiss_setup(setup.SetupDismissRequest(), current_user=make_user("director-a", UserRole.principal), db=db))
    assert school.tenant_config == {"max_parents_per_student": 2, "setup_dismissed": True}
    assert db.commits == 1


def test_import_template_opens_in_excel():
    response = run(setup.student_import_template(current_user=make_user("director-a", UserRole.principal)))

    async def body():
        return b"".join([chunk async for chunk in response.body_iterator])

    content = run(body())
    assert content.startswith(b"\xef\xbb\xbf")
    assert content.decode("utf-8-sig").splitlines()[0] == "prenom;nom;classe"


def test_import_places_students_in_their_class():
    csv_file = "prenom;nom;classe\nAmina;Benali;1am-a\nYacine;Haddad;9AM-Z\nNour;Bensaid;\n".encode("utf-8")
    school = School(id="school-a", name="A", student_id_prefix="EDU", prefix_locked=False)
    db = FakeDb(
        get_map={(School, "school-a"): school},
        results=[CountResult([0]), FakeResult([("class-1", "1AM-A")]), FakeResult(), FakeResult(), FakeResult()],
    )
    result = run(admin.import_students(
        file=UploadFile(file=io.BytesIO(csv_file), filename="eleves.csv"),
        current_user=make_user("director-a", UserRole.principal),
        db=db,
    ))
    assert result["imported"] == 3 and result["assigned"] == 1
    assert result["unknown_classes"] == ["9AM-Z"]
    amina = next(item for item in db.added if isinstance(item, Student) and item.full_name == "Amina Benali")
    member = next(item for item in db.added if isinstance(item, ClassMember))
    assert member.student_id == amina.id and member.class_id == "class-1"


def test_parent_codes_list_each_student_once_and_are_audited():
    rows = [
        ("s1", "Amina", "EDU26-001", "111111", "c1", "1AM-A"),
        ("s1", "Amina", "EDU26-001", "111111", "c2", "2AM-B"),
        ("s2", "Yacine", "EDU26-002", "222222", None, None),
    ]
    db = LenientDb(results=[FakeResult(rows), FakeResult([("s1", 2)])])
    codes = run(setup.parent_codes(make_request("/admin/parent-codes", "GET"),
                                   current_user=make_user("director-a", UserRole.principal), db=db))
    assert [code["student_id"] for code in codes] == ["s1", "s2"]
    assert codes[0]["parents_linked"] == 2 and codes[1]["parents_linked"] == 0
    audit = next(item for item in db.added if isinstance(item, AuditEvent))
    assert audit.action == "parent_codes.viewed" and "111111" not in str(audit.event_metadata)


# ── Monthly report ───────────────────────────────────────────────────────────

def test_month_bounds_wrap_the_year():
    start, end = monthly.month_bounds(2026, 12)
    assert (start.year, start.month, end.year, end.month) == (2026, 12, 2027, 1)
    assert monthly.previous_month(2027, 1) == (2026, 12)
    assert start.utcoffset().total_seconds() == 3600
    with pytest.raises(ValueError):
        monthly.parse_month("2026-13")


def test_period_activity_counts_attendance_and_engagement():
    attendance = [
        (AttendanceStatus.present, False, 90),
        (AttendanceStatus.late, False, 5),
        (AttendanceStatus.absent, True, 3),
        (AttendanceStatus.absent, False, 2),
    ]
    # attendance, then: notifications, parents, teachers, grades, homework, lessons,
    # direct messages, class messages, announcements, report cards, meetings, fees collected
    counts = [40, 30, 4, 120, 8, 9, 15, 5, 2, 0, 3, 85000.0]
    db = FakeDb(results=[FakeResult(attendance)] + [FakeResult([value]) for value in counts])
    start, end = monthly.month_bounds(2026, 10)
    activity = run(monthly.period_activity(db, "school-a", start, end))
    assert activity["attendance_rate"] == 95.0
    assert activity["absences"] == 5 and activity["unjustified_absences"] == 2 and activity["lates"] == 5
    assert activity["parent_notifications"] == 40 and activity["active_parents"] == 30
    assert activity["messages"] == 20 and activity["meetings_booked"] == 3
    assert activity["fees_collected"] == 85000.0


def test_an_empty_month_has_no_rate_instead_of_zero():
    assert monthly.rate(0, 0) is None
    assert monthly.rate(1, 3) == 33.3


def test_monthly_notification_reads_like_a_summary():
    report = {"month": "2026-09", "current": {"attendance_rate": 94.25, "parent_notifications": 1240, "active_parents": 87}}
    title, content = monthly.notification_text(report)
    assert title == "Votre bilan de septembre 2026 est prêt"
    assert "présence 94,2 %" in content and "1240 notifications" in content and "87 parents actifs" in content


def test_monthly_report_is_for_school_administration_only():
    from app.modules.reports.routers import monthly as monthly_router

    with pytest.raises(HTTPException) as exc:
        run(monthly_router.monthly_report(month=None, current_user=make_user("teacher-a", UserRole.teacher), db=FakeDb()))
    assert exc.value.status_code == 403
    with pytest.raises(HTTPException) as exc:
        run(monthly_router.monthly_report(month="2099-01", current_user=make_user("director-a", UserRole.principal), db=FakeDb()))
    assert exc.value.status_code == 400
