"""School transport admin endpoints: routes, stops, assignments, live overview, and billing."""
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import record_audit_event
from app.core.modules import require_module
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import (
    Announcement,
    Class,
    ClassMember,
    Student,
    StudentParent,
    User,
    UserRole,
)
from app.modules.canteen.logic import holiday_dates, school_weekday
from app.modules.finance.fees import bill_students, dec, format_da, money
from app.modules.health.models import StudentHealthRecord
from app.modules.schools.calendar import ALGERIA_TZ
from app.modules.transport import logic
from app.modules.transport.models import (
    TRANSPORT_DIRECTIONS,
    TRIP_DIRECTIONS,
    TRIP_EVENT_KINDS,
    TransportAssignment,
    TransportException,
    TransportRoute,
    TransportStop,
    TransportTrip,
    TransportTripEvent,
)
from app.utils.notifications import create_notification

from .transport_shared import (
    ADMIN_ROLES,
    DRIVER_ACCESS_ROLES,
    NOTIFICATION_TYPE,
    TransportDirection,
    TripDirection,
    TripEventKind,
    RouteIn,
    RoutePatch,
    StopIn,
    AssignmentIn,
    TripEventIn,
    TripEventsBatch,
    DelayIn,
    TripCompleteIn,
    ExceptionIn,
    BillingRequest,
    _today,
    _parse_day,
    _school_id,
    _audit,
    _holidays,
    _parent_ids,
    _student_classes,
    _staff_user_in_school,
    _route_in_school,
    _stop_out,
    _route_out,
    _assignment_out,
    _trip_out,
    _assert_driver_can_access_route,
    _excepted_ids_for,
    _load_driver_trip,
)

router = APIRouter()


@router.get("/routes")
async def list_routes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    routes = (
        await db.execute(
            select(TransportRoute)
            .where(TransportRoute.school_id == school_id)
            .options(selectinload(TransportRoute.stops))
            .order_by(TransportRoute.name)
        )
    ).scalars().all()
    staff_ids = {r.driver_id for r in routes if r.driver_id} | {r.assistant_id for r in routes if r.assistant_id}
    staff_names: dict[str, str] = {}
    if staff_ids:
        staff_names = {
            uid: name
            for uid, name in (
                await db.execute(select(User.id, User.full_name).where(User.school_id == school_id, User.id.in_(staff_ids)))
            ).all()
        }
    return [_route_out(route, staff_names) for route in routes]


@router.post("/routes", status_code=201)
async def create_route(
    payload: RouteIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    driver = await _staff_user_in_school(db, payload.driver_id, school_id)
    assistant = await _staff_user_in_school(db, payload.assistant_id, school_id)
    route = TransportRoute(
        school_id=school_id,
        name=payload.name.strip(),
        vehicle_plate=(payload.vehicle_plate or "").strip() or None,
        capacity=payload.capacity,
        driver_id=driver.id if driver else None,
        assistant_id=assistant.id if assistant else None,
        monthly_price=dec(payload.monthly_price),
        active=payload.active,
    )
    db.add(route)
    await db.flush()
    route.stops = []
    await _audit(db, request, current_user, "transport.route_created", route.id, {"name": route.name})
    await db.commit()
    names = {u.id: u.full_name for u in (driver, assistant) if u is not None}
    return _route_out(route, names)


@router.patch("/routes/{route_id}")
async def update_route(
    route_id: str,
    payload: RoutePatch,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    route = await _route_in_school(db, route_id, school_id)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        route.name = data["name"].strip()
    if "vehicle_plate" in data:
        route.vehicle_plate = (data["vehicle_plate"] or "").strip() or None
    if "capacity" in data and data["capacity"] is not None:
        route.capacity = data["capacity"]
    if "driver_id" in data:
        driver = await _staff_user_in_school(db, data["driver_id"], school_id)
        route.driver_id = driver.id if driver else None
    if "assistant_id" in data:
        assistant = await _staff_user_in_school(db, data["assistant_id"], school_id)
        route.assistant_id = assistant.id if assistant else None
    if "monthly_price" in data and data["monthly_price"] is not None:
        route.monthly_price = dec(data["monthly_price"])
    if "active" in data and data["active"] is not None:
        route.active = data["active"]
    await _audit(db, request, current_user, "transport.route_updated", route.id, {"name": route.name})
    await db.commit()
    return _route_out(route)


@router.delete("/routes/{route_id}")
async def delete_route(
    route_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    route = await _route_in_school(db, route_id, school_id)
    await db.delete(route)
    await _audit(db, request, current_user, "transport.route_deleted", route_id)
    await db.commit()
    return {"deleted": True}


@router.post("/routes/{route_id}/stops", status_code=201)
async def create_stop(
    route_id: str,
    payload: StopIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    route = await _route_in_school(db, route_id, school_id)
    stop = TransportStop(
        school_id=school_id,
        route_id=route.id,
        name=payload.name.strip(),
        position=payload.position,
        morning_time=payload.morning_time,
        evening_time=payload.evening_time,
    )
    db.add(stop)
    await db.flush()
    await _audit(db, request, current_user, "transport.stop_created", stop.id, {"route_id": route.id, "name": stop.name})
    await db.commit()
    return _stop_out(stop)


@router.put("/stops/{stop_id}")
async def update_stop(
    stop_id: str,
    payload: StopIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    stop = await db.get(TransportStop, stop_id)
    if stop is None or stop.school_id != school_id:
        raise HTTPException(status_code=404, detail="Arret introuvable.")
    stop.name = payload.name.strip()
    stop.position = payload.position
    stop.morning_time = payload.morning_time
    stop.evening_time = payload.evening_time
    await _audit(db, request, current_user, "transport.stop_updated", stop.id, {"name": stop.name})
    await db.commit()
    return _stop_out(stop)


@router.delete("/stops/{stop_id}")
async def delete_stop(
    stop_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    stop = await db.get(TransportStop, stop_id)
    if stop is None or stop.school_id != school_id:
        raise HTTPException(status_code=404, detail="Arret introuvable.")
    await db.delete(stop)
    await _audit(db, request, current_user, "transport.stop_deleted", stop_id)
    await db.commit()
    return {"deleted": True}


@router.get("/assignments")
async def list_assignments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    students = (
        await db.execute(
            select(Student.id, Student.full_name, Student.student_id)
            .where(Student.school_id == school_id, Student.archived_at.is_(None))
            .order_by(Student.full_name)
        )
    ).all()
    classes = await _student_classes(db, school_id)
    routes = {
        r.id: r
        for r in (await db.execute(select(TransportRoute).where(TransportRoute.school_id == school_id))).scalars().all()
    }
    stops = {
        s.id: s
        for s in (await db.execute(select(TransportStop).where(TransportStop.school_id == school_id))).scalars().all()
    }
    assignments = {
        a.student_id: a
        for a in (await db.execute(select(TransportAssignment).where(TransportAssignment.school_id == school_id))).scalars().all()
    }
    return [
        {
            "student_id": student_id,
            "student_name": name,
            "student_code": code,
            "class_name": classes.get(student_id, "-"),
            "assignment": _assignment_out(assignments.get(student_id), routes, stops),
        }
        for student_id, name, code in students
    ]


@router.put("/assignments/{student_id}")
async def save_assignment(
    student_id: str,
    payload: AssignmentIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    student = await db.get(Student, student_id)
    if student is None or student.school_id != school_id or student.archived_at is not None:
        raise HTTPException(status_code=404, detail="Eleve introuvable.")
    route = await _route_in_school(db, payload.route_id, school_id)
    stop = await db.get(TransportStop, payload.stop_id)
    if stop is None or stop.school_id != school_id or stop.route_id != route.id:
        raise HTTPException(status_code=404, detail="Arret introuvable sur cette ligne.")

    assignment = (
        await db.execute(
            select(TransportAssignment).where(
                TransportAssignment.school_id == school_id, TransportAssignment.student_id == student_id
            )
        )
    ).scalar_one_or_none()
    created = assignment is None
    if created:
        assignment = TransportAssignment(school_id=school_id, student_id=student_id)
        db.add(assignment)
    assignment.route_id = route.id
    assignment.stop_id = stop.id
    assignment.direction = payload.direction
    assignment.start_date = payload.start_date
    assignment.end_date = payload.end_date
    await db.flush()

    title = "Transport scolaire"
    content = (
        f"{student.full_name} est affecte(e) a la ligne {route.name} (arret {stop.name})."
        if created
        else f"L'affectation transport de {student.full_name} a ete mise a jour ({route.name}, {stop.name})."
    )
    for parent_id in (await _parent_ids(db, school_id, [student_id])).get(student_id, []):
        await create_notification(db, parent_id, title, content, type=NOTIFICATION_TYPE, school_id=school_id)

    await _audit(db, request, current_user, "transport.assignment_saved", student_id, {
        "route_id": route.id, "stop_id": stop.id, "direction": payload.direction,
    })
    await db.commit()
    return _assignment_out(assignment, {route.id: route}, {stop.id: stop})


@router.delete("/assignments/{student_id}")
async def delete_assignment(
    student_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    student = await db.get(Student, student_id)
    if student is None or student.school_id != school_id:
        raise HTTPException(status_code=404, detail="Eleve introuvable.")
    result = await db.execute(
        delete(TransportAssignment).where(
            TransportAssignment.school_id == school_id, TransportAssignment.student_id == student_id
        )
    )
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Cet eleve n'est pas inscrit au transport.")
    for parent_id in (await _parent_ids(db, school_id, [student_id])).get(student_id, []):
        await create_notification(
            db, parent_id, "Transport scolaire", f"{student.full_name} n'est plus inscrit(e) au transport scolaire.",
            type=NOTIFICATION_TYPE, school_id=school_id,
        )
    await _audit(db, request, current_user, "transport.assignment_deleted", student_id)
    await db.commit()
    return {"deleted": True}


@router.get("/live")
async def live_overview(
    day: str | None = Query(default=None, alias="date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    target = _parse_day(day) if day else _today()
    holidays = await _holidays(db, school_id, target, target)
    routes = (
        await db.execute(select(TransportRoute).where(TransportRoute.school_id == school_id).order_by(TransportRoute.name))
    ).scalars().all()
    assignments = (
        await db.execute(select(TransportAssignment).where(TransportAssignment.school_id == school_id))
    ).scalars().all()
    exceptions = (
        await db.execute(
            select(TransportException).where(TransportException.school_id == school_id, TransportException.day == target)
        )
    ).scalars().all()
    trips = (
        await db.execute(select(TransportTrip).where(TransportTrip.school_id == school_id, TransportTrip.day == target))
    ).scalars().all()
    trip_ids = [trip.id for trip in trips]
    events_by_trip: dict[str, list[TransportTripEvent]] = {}
    if trip_ids:
        for ev in (
            await db.execute(select(TransportTripEvent).where(TransportTripEvent.school_id == school_id, TransportTripEvent.trip_id.in_(trip_ids)))
        ).scalars().all():
            events_by_trip.setdefault(ev.trip_id, []).append(ev)

    trips_by_key = {(t.route_id, t.direction): t for t in trips}
    by_route: dict[str, list[TransportAssignment]] = {}
    for assignment in assignments:
        by_route.setdefault(assignment.route_id, []).append(assignment)

    out_routes = []
    for route in routes:
        route_assignments = by_route.get(route.id, [])
        directions = {}
        for direction in TRIP_DIRECTIONS:
            excepted = _excepted_ids_for(exceptions, direction)
            expected = sum(1 for a in route_assignments if logic.rides_on(a, target, direction, excepted, holidays))
            trip = trips_by_key.get((route.id, direction))
            evs = events_by_trip.get(trip.id, []) if trip else []
            states = logic.student_trip_states(evs)
            directions[direction] = {
                "trip": _trip_out(trip),
                "expected": expected,
                "boarded": sum(1 for s in states.values() if s == "boarded"),
                "dropped": sum(1 for s in states.values() if s == "dropped"),
                "no_show": sum(1 for s in states.values() if s == "no_show"),
                "unaccounted": len(logic.unaccounted_boarded_students(evs)),
                "exceptions": sum(
                    1 for a in route_assignments if logic.rides_on(a, target, direction, frozenset(), holidays) and a.student_id in excepted
                ),
            }
        out_routes.append({
            "route_id": route.id,
            "route_name": route.name,
            "vehicle_plate": route.vehicle_plate,
            "active": route.active,
            "directions": directions,
        })
    return {
        "date": target.isoformat(),
        "is_school_day": school_weekday(target) is not None and target not in holidays,
        "routes": out_routes,
    }


@router.post("/billing")
async def bill_month(
    payload: BillingRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("transport", current_user, db)
    first, last = logic.month_bounds(payload.year, payload.month)
    holidays = await _holidays(db, school_id, first, last)
    routes = {
        r.id: r
        for r in (await db.execute(select(TransportRoute).where(TransportRoute.school_id == school_id))).scalars().all()
    }
    assignments = (
        await db.execute(select(TransportAssignment).where(TransportAssignment.school_id == school_id))
    ).scalars().all()
    active_ids = set(
        (
            await db.execute(select(Student.id).where(Student.school_id == school_id, Student.archived_at.is_(None)))
        ).scalars().all()
    )
    amounts: dict[str, Decimal] = {}
    for assignment in assignments:
        if assignment.student_id not in active_ids:
            continue
        route = routes.get(assignment.route_id)
        if not route or dec(route.monthly_price) <= 0:
            continue
        if logic.rides_in_month(assignment, payload.year, payload.month, holidays):
            amounts[assignment.student_id] = dec(route.monthly_price)
    label = logic.billing_label(payload.year, payload.month)
    due = datetime.combine(payload.due_date, time(23, 59), tzinfo=ALGERIA_TZ) if payload.due_date else None
    created, skipped = await bill_students(db, school_id, amounts, label, due)
    total = sum(amounts.values(), Decimal("0"))
    await _audit(db, request, current_user, "transport.month_billed", school_id, {
        "label": label, "created": created, "skipped": skipped, "total": money(total),
    })
    await db.commit()
    return {"label": label, "created": created, "skipped": skipped, "total": money(total), "total_text": format_da(total)}
