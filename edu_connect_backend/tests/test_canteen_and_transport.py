"""Canteen & school transport: roles, module toggle, headcount, billing, check-ins and safety alerts."""
from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.responses import JSONResponse

from app.core import security
from app.core.middleware import RoleScopeMiddleware, canteen_may_call, driver_may_call, nurse_may_call, role_may_call
from app.core.modules import enabled_modules, require_module
from app.models import (
    AttendanceStatus,
    AuditEvent,
    CanteenEnrollment,
    CanteenMenu,
    Notification,
    School,
    StudentHealthRecord,
    TransportAssignment,
    TransportException,
    TransportRoute,
    TransportStop,
    TransportTrip,
    TransportTripEvent,
    TuitionInvoice,
    User,
    UserRole,
)
from app.modules.canteen import logic as canteen_logic
from app.modules.canteen.routers import canteen as canteen_router
from app.modules.schools.calendar import ALGERIA_TZ
from app.modules.schools.routers import admin, branding
from app.modules.transport import logic as transport_logic
from app.modules.transport.routers import transport as transport_router
from tests.test_access_control_boundaries import FakeResult, make_request, make_user, run
from tests.test_growth_features import LenientDb


def _school(canteen: bool = True, transport: bool = True, **extra) -> School:
    config = {"modules": {"canteen": canteen, "transport": transport}, **extra}
    return School(id="school-a", name="Ecole El Amal", student_id_prefix="EA", tenant_config=config)


def _parent(user_id="parent-a") -> User:
    return User(id=user_id, school_id="school-a", email=f"{user_id}@wasel-edu.dz", full_name="Parent", role=UserRole.parent)


def _notification_results(*users):
    results = []
    for user in users:
        results += [FakeResult([user]), FakeResult([])]
    return results


# ── Lot 0: role scoping, invitations, module switches ────────────────────────

def test_role_scope_middleware_isolates_nurse_canteen_and_driver():
    for allowed in ("/canteen/menus", "/canteen/headcount", "/auth/sessions", "/users/me", "/notifications/", "/schools/branding"):
        assert canteen_may_call(allowed), allowed
    for denied in ("/transport/driver/today", "/grades/", "/finance/ledger", "/admin/students", "/infirmary/students"):
        assert not canteen_may_call(denied), denied

    for allowed in ("/transport/driver/today", "/transport/driver/trips/t1/events", "/auth/sessions", "/users/me", "/notifications/", "/schools/branding"):
        assert driver_may_call(allowed), allowed
    for denied in ("/transport/routes", "/canteen/headcount", "/grades/", "/finance/ledger", "/students/s1/health"):
        assert not driver_may_call(denied), denied

    assert nurse_may_call("/students/s1/health")
    assert not nurse_may_call("/canteen/menus")
    assert role_may_call("teacher", "/grades/")

    middleware = RoleScopeMiddleware(app=None)

    async def ok_next(_request):
        return JSONResponse({"ok": True}, status_code=200)

    def dispatch_as(role: str, path: str) -> int:
        token = security.create_access_token({"sub": f"u-{role}", "role": role, "school_id": "school-a", "tv": 0})
        req = SimpleNamespace(
            url=SimpleNamespace(path=path),
            headers={"Authorization": f"Bearer {token}"},
            state=SimpleNamespace(),
        )
        resp = run(middleware.dispatch(req, ok_next))
        return resp.status_code

    assert dispatch_as("driver", "/transport/driver/today") == 200
    assert dispatch_as("driver", "/grades/") == 403
    assert dispatch_as("driver", "/finance/ledger") == 403
    assert dispatch_as("driver", "/canteen/headcount") == 403

    assert dispatch_as("canteen", "/canteen/headcount") == 200
    assert dispatch_as("canteen", "/transport/driver/today") == 403
    assert dispatch_as("canteen", "/grades/") == 403

    assert dispatch_as("principal", "/grades/") == 200


def test_only_director_invites_canteen_or_driver_and_toggles_modules():
    secretary = make_user("sec-a", UserRole.secretary)
    director = make_user("dir-a", UserRole.principal)

    for role in (UserRole.canteen, UserRole.driver):
        with pytest.raises(HTTPException) as exc:
            run(admin.create_staff(
                admin.CreateStaffRequest(email=f"{role.value}@wasel-edu.dz", full_name="Staff", role=role),
                current_user=secretary,
                db=LenientDb(),
            ))
        assert exc.value.status_code == 403

    with pytest.raises(HTTPException) as exc:
        run(branding.update_modules(
            branding.ModulesUpdate(canteen=True, transport=False),
            make_request("/schools/modules", "PUT"),
            current_user=secretary,
            db=LenientDb(),
        ))
    assert exc.value.status_code == 403

    school = _school(canteen=False, transport=False)
    db = LenientDb(get_map={(School, "school-a"): school})
    out = run(branding.update_modules(
        branding.ModulesUpdate(canteen=True, transport=False),
        make_request("/schools/modules", "PUT"),
        current_user=director,
        db=db,
    ))
    assert out == {"modules": {"canteen": True, "transport": False}}
    assert enabled_modules(school) == {"canteen": True, "transport": False}
    assert any(isinstance(item, AuditEvent) and item.action == "school.modules_updated" for item in db.added)


def test_disabled_modules_return_403():
    school = _school(canteen=False, transport=False)
    db = LenientDb(get_map={(School, "school-a"): school})
    director = make_user("dir-a", UserRole.principal)
    driver = make_user("drv-a", UserRole.driver)

    with pytest.raises(HTTPException) as exc:
        run(require_module("canteen", director, db))
    assert exc.value.status_code == 403

    with pytest.raises(HTTPException) as exc:
        run(canteen_router.week_menus(week=None, current_user=director, db=db))
    assert exc.value.status_code == 403

    with pytest.raises(HTTPException) as exc:
        run(transport_router.list_routes(current_user=director, db=db))
    assert exc.value.status_code == 403

    with pytest.raises(HTTPException) as exc:
        run(transport_router.driver_today(make_request("/transport/driver/today", "GET"), day=None, current_user=driver, db=db))
    assert exc.value.status_code == 403


# ── Lot 1: Canteen rules, headcount, menu publication & billing ──────────────

def test_algerian_school_week_and_monthly_billing_rules():
    sunday = date(2026, 11, 15)
    thursday = date(2026, 11, 19)
    friday = date(2026, 11, 20)
    saturday = date(2026, 11, 21)

    assert canteen_logic.school_weekday(sunday) == 0
    assert canteen_logic.school_weekday(thursday) == 4
    assert canteen_logic.school_weekday(friday) is None
    assert canteen_logic.school_weekday(saturday) is None
    assert canteen_logic.week_days(date(2026, 11, 18))[0] == sunday
    assert canteen_logic.week_days(date(2026, 11, 18))[-1] == thursday

    # November 2026 has 5 Sundays (1, 8, 15, 22, 29) and 4 Tuesdays (3, 10, 17, 24).
    # With 1 holiday on Nov 1, a Sun+Tue enrollment has 8 billable days.
    holidays = canteen_logic.holiday_dates([(date(2026, 11, 1), date(2026, 11, 1))])
    partial = CanteenEnrollment(
        id="e-days", school_id="school-a", student_id="s1", plan="days", weekdays=[0, 2],
        diet="none", start_date=date(2026, 11, 1), end_date=None,
    )
    monthly = CanteenEnrollment(
        id="e-month", school_id="school-a", student_id="s2", plan="monthly", weekdays=[0, 1, 2, 3, 4],
        diet="none", start_date=date(2026, 11, 1), end_date=None,
    )
    assert canteen_logic.billable_days(partial, 2026, 11, holidays) == 8
    assert canteen_logic.monthly_amount(
        partial, 2026, 11, monthly_price=Decimal("4500"), daily_price=Decimal("250"), holidays=holidays
    ) == Decimal("2000.00")
    assert canteen_logic.monthly_amount(
        monthly, 2026, 11, monthly_price=Decimal("4500"), daily_price=Decimal("250"), holidays=holidays
    ) == Decimal("4500.00")


def test_canteen_headcount_excludes_absentees_and_audits_health_alerts():
    sunday = date(2026, 11, 15)
    e1 = CanteenEnrollment(id="e1", school_id="school-a", student_id="s1", plan="monthly", weekdays=[0, 1, 2, 3, 4],
                           diet="gluten_free", diet_note="Sans pain", start_date=date(2026, 9, 1))
    e2 = CanteenEnrollment(id="e2", school_id="school-a", student_id="s2", plan="monthly", weekdays=[0, 1, 2, 3, 4],
                           diet="none", start_date=date(2026, 9, 1))
    e3 = CanteenEnrollment(id="e3", school_id="school-a", student_id="s3", plan="days", weekdays=[2, 4],  # Tue/Thu only
                           diet="none", start_date=date(2026, 9, 1))

    school = _school(canteen=True)
    db = LenientDb(
        get_map={(School, "school-a"): school},
        results=[
            FakeResult([]),  # holidays
            FakeResult([e1, e2, e3]),  # enrollments
            FakeResult([("s1", "Amina"), ("s2", "Yacine")]),  # student names (s1, s2 eat on Sunday)
            FakeResult([("s2", "c1", AttendanceStatus.absent)]),  # s2 absent -> excluded; c1 roll taken
            FakeResult([("s1", "Allergie arachides")]),  # teacher_alert only
            FakeResult([("s1", "c1", "1AM-A"), ("s2", "c1", "1AM-A")]),  # class map
        ],
    )
    canteen_staff = make_user("canteen-a", UserRole.canteen)
    out = run(canteen_router.daily_headcount(
        make_request("/canteen/headcount", "GET"),
        day=sunday.isoformat(),
        current_user=canteen_staff,
        db=db,
    ))
    assert out["total"] == 1
    assert out["absent"] == 1
    assert out["by_diet"] == {"gluten_free": 1}
    assert out["by_class"] == [
        {"class_id": "c1", "class_name": "1AM-A", "expected": 1, "absent": 1, "attendance_taken": True}
    ]
    assert out["students"] == [{
        "student_id": "s1",
        "student_name": "Amina",
        "class_name": "1AM-A",
        "diet": "gluten_free",
        "diet_note": "Sans pain",
        "alert": "Allergie arachides",
    }]
    assert any(isinstance(item, AuditEvent) and item.action == "canteen.headcount_viewed" for item in db.added)


def test_canteen_menu_publish_and_idempotent_billing():
    school = _school(canteen=True, canteen_cfg=True)
    school.tenant_config["canteen"] = {"monthly_price": "4000.00", "daily_price": "250.00"}
    parent = _parent("parent-1")
    sunday = date(2026, 11, 15)
    menu = CanteenMenu(id="m1", school_id="school-a", day=sunday, main="Couscous", allergens=["gluten"], published_at=None)
    e1 = CanteenEnrollment(id="e1", school_id="school-a", student_id="s1", plan="monthly", weekdays=[0, 1, 2, 3, 4],
                           diet="none", start_date=date(2026, 9, 1))

    db_pub = LenientDb(
        get_map={(School, "school-a"): school},
        results=[
            FakeResult([menu]),  # menus of the week
            FakeResult([]),  # holidays
            FakeResult([e1]),  # enrollments
            FakeResult([("s1", "parent-1")]),  # StudentParent links
            *_notification_results(parent),
        ],
    )
    pub_res = run(canteen_router.publish_week(
        make_request("/canteen/menus/publish"),
        week=sunday.isoformat(),
        current_user=make_user("canteen-a", UserRole.canteen),
        db=db_pub,
    ))
    assert pub_res == {"published": 1, "notified": 1}
    assert menu.published_at is not None
    note = next(item for item in db_pub.added if isinstance(item, Notification))
    assert note.type == "CANTEEN"

    # Billing November 2026: s1 already billed, s2 gets billed 4000 DA.
    e2 = CanteenEnrollment(id="e2", school_id="school-a", student_id="s2", plan="monthly", weekdays=[0, 1, 2, 3, 4],
                           diet="none", start_date=date(2026, 9, 1))
    db_bill = LenientDb(
        get_map={(School, "school-a"): school},
        results=[
            FakeResult([]),  # holidays
            FakeResult([e1, e2]),  # enrollments
            FakeResult(["s1", "s2"]),  # active students
            FakeResult(["s1"]),  # already billed for "Cantine novembre 2026"
        ],
    )
    bill_res = run(canteen_router.bill_month(
        canteen_router.BillingRequest(year=2026, month=11, due_date=date(2026, 11, 10)),
        make_request("/canteen/billing"),
        current_user=make_user("dir-a", UserRole.principal),
        db=db_bill,
    ))
    assert bill_res["label"] == "Cantine novembre 2026"
    assert bill_res["created"] == 1 and bill_res["skipped"] == 1
    invoices = [item for item in db_bill.added if isinstance(item, TuitionInvoice)]
    assert len(invoices) == 1 and invoices[0].student_id == "s2" and invoices[0].amount_due == Decimal("4000.00")


# ── Lot 2: Transport manifest, check-in idempotency, safety & exceptions ─────

def test_driver_manifest_shows_only_first_emergency_contact_and_filters_exceptions():
    school = _school(transport=True)
    driver = make_user("driver-1", UserRole.driver)
    sunday = date(2026, 11, 15)
    route = TransportRoute(id="r1", school_id="school-a", name="Ligne Nord", driver_id="driver-1", active=True)
    stop = TransportStop(id="st1", school_id="school-a", route_id="r1", name="Hydra", position=1, morning_time="07:15", evening_time="16:30")
    route.stops = [stop]
    a1 = TransportAssignment(id="a1", school_id="school-a", student_id="s1", route_id="r1", stop_id="st1", direction="both", start_date=date(2026, 9, 1))
    a2 = TransportAssignment(id="a2", school_id="school-a", student_id="s2", route_id="r1", stop_id="st1", direction="both", start_date=date(2026, 9, 1))
    rec1 = StudentHealthRecord(
        student_id="s1",
        school_id="school-a",
        emergency_contacts=[
            {"name": "Mme Benali", "relationship": "Mere", "phone": "0550112233"},
            {"name": "M. Benali", "relationship": "Pere", "phone": "0550998877"},
        ],
        allergies="Secret medical detail",
        teacher_alert="Asthme",
        consent_given_at=datetime.now(timezone.utc),
        consent_method="app",
    )
    exc2 = TransportException(id="ex2", school_id="school-a", student_id="s2", day=sunday, direction="evening", reason="Recupere par maman")

    db = LenientDb(
        get_map={(School, "school-a"): school},
        results=[
            FakeResult([]),  # holidays
            FakeResult([route]),  # routes
            FakeResult([a1, a2]),  # assignments
            FakeResult([("s1", "Amina"), ("s2", "Yacine")]),  # student names
            FakeResult([("s1", "1AM-A"), ("s2", "1AM-A")]),  # classes
            FakeResult([rec1]),  # health records
            FakeResult([exc2]),  # exceptions
            FakeResult([]),  # trips
        ],
    )
    out = run(transport_router.driver_today(
        make_request("/transport/driver/today", "GET"),
        day=sunday.isoformat(),
        current_user=driver,
        db=db,
    ))
    evening = out["routes"][0]["directions"]["evening"]
    assert [s["student_id"] for s in evening["stops"][0]["students"]] == ["s1"]
    s1_entry = evening["stops"][0]["students"][0]
    assert s1_entry["health_alert"] == "Asthme"
    assert s1_entry["emergency_contact"] == {"name": "Mme Benali", "relationship": "Mere", "phone": "0550112233"}
    assert "allergies" not in s1_entry
    assert evening["exceptions"] == [{"student_id": "s2", "student_name": "Yacine", "stop_name": "Hydra", "reason": "Recupere par maman"}]


def test_trip_events_are_idempotent_notify_parents_and_guard_forgotten_child():
    school = _school(transport=True)
    driver = make_user("driver-1", UserRole.driver)
    director = make_user("dir-a", UserRole.principal)
    parent = _parent("parent-1")
    route = TransportRoute(id="r1", school_id="school-a", name="Ligne Nord", driver_id="driver-1", active=True)
    route.stops = []
    trip = TransportTrip(id="trip-1", school_id="school-a", route_id="r1", day=date(2026, 11, 15), direction="morning", status="in_progress")

    # Send 2 events where 1 client_event_id already exists on server.
    db_ev = LenientDb(
        get_map={(School, "school-a"): school, (TransportTrip, "trip-1"): trip, (TransportRoute, "r1"): route},
        results=[
            FakeResult(["ev-dup"]),  # existing client_event_ids
            FakeResult([("s1", "Amina")]),  # active students
            FakeResult([("s1", "parent-1")]),  # parents
            FakeResult([("s1", "Hydra")]),  # stop names
            *_notification_results(parent),
        ],
    )
    batch = transport_router.TripEventsBatch(events=[
        transport_router.TripEventIn(student_id="s1", kind="boarded", client_event_id="ev-dup"),
        transport_router.TripEventIn(
            student_id="s1",
            kind="boarded",
            client_event_id="ev-new",
            recorded_at=datetime(2026, 11, 15, 7, 12, tzinfo=ALGERIA_TZ),
        ),
    ])
    ev_res = run(transport_router.record_trip_events("trip-1", batch, make_request("/transport/driver/trips/trip-1/events"), current_user=driver, db=db_ev))
    assert ev_res == {"recorded": 1, "skipped": 1}
    assert any(isinstance(item, Notification) and item.type == "TRANSPORT" and "07:12" in item.content for item in db_ev.added)

    # Complete blocked with 409 if s1 boarded without dropped.
    boarded_only = [
        TransportTripEvent(id="1", school_id="school-a", trip_id="trip-1", student_id="s1", kind="boarded",
                           recorded_at=datetime(2026, 11, 15, 7, 12, tzinfo=ALGERIA_TZ), client_event_id="ev-new")
    ]
    db_block = LenientDb(
        get_map={(School, "school-a"): school, (TransportTrip, "trip-1"): trip, (TransportRoute, "r1"): route},
        results=[FakeResult(boarded_only)],
    )
    with pytest.raises(HTTPException) as exc:
        run(transport_router.complete_trip(
            "trip-1", make_request("/transport/driver/trips/trip-1/complete"),
            payload=transport_router.TripCompleteIn(force=False),
            current_user=driver, db=db_block,
        ))
    assert exc.value.status_code == 409
    assert exc.value.detail["unaccounted_student_ids"] == ["s1"]

    # Force complete triggers SECURITY alert to administration + audit.
    db_force = LenientDb(
        get_map={(School, "school-a"): school, (TransportTrip, "trip-1"): trip, (TransportRoute, "r1"): route},
        results=[
            FakeResult(boarded_only),
            FakeResult(["Amina"]),  # unaccounted student names
            FakeResult(["dir-a"]),  # school admins
            *_notification_results(director),
        ],
    )
    done = run(transport_router.complete_trip(
        "trip-1", make_request("/transport/driver/trips/trip-1/complete"),
        payload=transport_router.TripCompleteIn(force=True),
        current_user=driver, db=db_force,
    ))
    assert done["trip"]["status"] == "completed"
    assert done["unaccounted_student_ids"] == ["s1"]
    assert any(isinstance(item, Notification) and item.type == "SECURITY" and item.user_id == "dir-a" for item in db_force.added)
    assert any(isinstance(item, AuditEvent) and item.action == "transport.unaccounted_student_alert" for item in db_force.added)


def test_delay_notification_and_parent_exception_cutoff():
    # Cutoff rule: 16:00 ok for 16:30 stop, 16:05 rejected.
    day = date(2026, 11, 15)
    assert transport_logic.can_parent_declare_exception(datetime(2026, 11, 15, 16, 0, tzinfo=ALGERIA_TZ), day, "16:30")
    assert not transport_logic.can_parent_declare_exception(datetime(2026, 11, 15, 16, 5, tzinfo=ALGERIA_TZ), day, "16:30")
    assert not transport_logic.can_parent_declare_exception(datetime(2026, 11, 16, 8, 0, tzinfo=ALGERIA_TZ), day, "16:30")

    # Parent cannot declare exception for an unlinked student.
    school = _school(transport=True)
    parent = _parent("parent-1")
    db = LenientDb(get_map={(School, "school-a"): school}, results=[FakeResult([])])
    with pytest.raises(HTTPException) as exc:
        run(transport_router.declare_exception(
            transport_router.ExceptionIn(student_id="other-student", day=date(2099, 11, 15), direction="evening"),
            make_request("/transport/exceptions"),
            current_user=parent,
            db=db,
        ))
    assert exc.value.status_code == 404

    # Driver reporting a delay notifies non-exempted riders' parents.
    driver = make_user("driver-1", UserRole.driver)
    route = TransportRoute(id="r1", school_id="school-a", name="Ligne Nord", driver_id="driver-1", active=True)
    route.stops = []
    trip = TransportTrip(id="trip-2", school_id="school-a", route_id="r1", day=day, direction="evening", status="in_progress")
    a1 = TransportAssignment(id="a1", school_id="school-a", student_id="s1", route_id="r1", stop_id="st1", direction="both", start_date=date(2026, 9, 1))
    db_delay = LenientDb(
        get_map={(School, "school-a"): school, (TransportTrip, "trip-2"): trip, (TransportRoute, "r1"): route},
        results=[
            FakeResult([]),  # holidays
            FakeResult([a1]),  # assignments
            FakeResult([]),  # exceptions
            FakeResult([("s1", "parent-1")]),  # parent links
            *_notification_results(parent),
        ],
    )
    delay_res = run(transport_router.report_delay(
        "trip-2",
        transport_router.DelayIn(minutes=15, note="Embouteillage"),
        make_request("/transport/driver/trips/trip-2/delay"),
        current_user=driver,
        db=db_delay,
    ))
    assert delay_res["notified"] == 1 and trip.delay_minutes == 15
    assert any(isinstance(item, Notification) and "15 min" in item.content for item in db_delay.added)
