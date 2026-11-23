"""School transport driver endpoints: daily manifest, trip lifecycle, boarding events, and delays."""
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


@router.get("/driver/today")
async def driver_today(
    request: Request,
    day: str | None = Query(default=None, alias="date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manifest for today's morning & evening runs: students grouped by stop, short health alert & 1st emergency contact."""
    school_id = _school_id(current_user, DRIVER_ACCESS_ROLES)
    await require_module("transport", current_user, db)
    target = _parse_day(day) if day else _today()
    holidays = await _holidays(db, school_id, target, target)

    stmt = (
        select(TransportRoute)
        .where(TransportRoute.school_id == school_id, TransportRoute.active.is_(True))
        .options(selectinload(TransportRoute.stops))
        .order_by(TransportRoute.name)
    )
    if current_user.role == UserRole.driver:
        stmt = stmt.where((TransportRoute.driver_id == current_user.id) | (TransportRoute.assistant_id == current_user.id))
    routes = (await db.execute(stmt)).scalars().all()
    route_ids = [r.id for r in routes]

    assignments = (
        await db.execute(
            select(TransportAssignment).where(
                TransportAssignment.school_id == school_id,
                TransportAssignment.route_id.in_(route_ids) if route_ids else TransportAssignment.route_id == "",
            )
        )
    ).scalars().all() if route_ids else []

    student_ids = sorted({a.student_id for a in assignments})
    names: dict[str, str] = {}
    classes: dict[str, str] = {}
    health_alerts: dict[str, str | None] = {}
    emergency_contacts: dict[str, dict | None] = {}
    if student_ids:
        names = {
            sid: name
            for sid, name in (
                await db.execute(
                    select(Student.id, Student.full_name).where(
                        Student.school_id == school_id, Student.id.in_(student_ids), Student.archived_at.is_(None)
                    )
                )
            ).all()
        }
        classes = await _student_classes(db, school_id)
        for rec in (
            await db.execute(
                select(StudentHealthRecord).where(
                    StudentHealthRecord.school_id == school_id, StudentHealthRecord.student_id.in_(student_ids)
                )
            )
        ).scalars().all():
            health_alerts[rec.student_id] = rec.teacher_alert
            emergency_contacts[rec.student_id] = logic.first_emergency_contact(rec.emergency_contacts)

    exceptions = (
        await db.execute(
            select(TransportException).where(
                TransportException.school_id == school_id,
                TransportException.day == target,
                TransportException.student_id.in_(student_ids) if student_ids else TransportException.student_id == "",
            )
        )
    ).scalars().all() if student_ids else []

    trips = (
        await db.execute(
            select(TransportTrip).where(
                TransportTrip.school_id == school_id,
                TransportTrip.day == target,
                TransportTrip.route_id.in_(route_ids) if route_ids else TransportTrip.route_id == "",
            )
        )
    ).scalars().all() if route_ids else []
    trip_ids = [t.id for t in trips]
    events_by_trip: dict[str, list[TransportTripEvent]] = {}
    if trip_ids:
        for ev in (
            await db.execute(select(TransportTripEvent).where(TransportTripEvent.school_id == school_id, TransportTripEvent.trip_id.in_(trip_ids)))
        ).scalars().all():
            events_by_trip.setdefault(ev.trip_id, []).append(ev)

    trips_by_key = {(t.route_id, t.direction): t for t in trips}
    by_route: dict[str, list[TransportAssignment]] = {}
    for assignment in assignments:
        if assignment.student_id in names:
            by_route.setdefault(assignment.route_id, []).append(assignment)

    out_routes = []
    for route in routes:
        ordered_stops = sorted(route.stops, key=lambda s: (s.position, s.name))
        stop_map = {s.id: s for s in ordered_stops}
        route_assignments = by_route.get(route.id, [])
        directions = {}
        for direction in TRIP_DIRECTIONS:
            excepted_map = {e.student_id: e.reason for e in exceptions if e.direction in ("both", direction)}
            trip = trips_by_key.get((route.id, direction))
            states = logic.student_trip_states(events_by_trip.get(trip.id, [])) if trip else {}
            by_stop: dict[str, list[dict]] = {s.id: [] for s in ordered_stops}
            exc_list: list[dict] = []
            for a in route_assignments:
                if logic.rides_on(a, target, direction, frozenset(), holidays):
                    if a.student_id in excepted_map:
                        stop_obj = stop_map.get(a.stop_id)
                        exc_list.append({
                            "student_id": a.student_id,
                            "student_name": names.get(a.student_id, ""),
                            "stop_name": stop_obj.name if stop_obj else "",
                            "reason": excepted_map[a.student_id],
                        })
                        continue
                    by_stop.setdefault(a.stop_id, []).append({
                        "student_id": a.student_id,
                        "student_name": names.get(a.student_id, ""),
                        "class_name": classes.get(a.student_id, "-"),
                        "state": states.get(a.student_id, "pending"),
                        "health_alert": health_alerts.get(a.student_id),
                        "emergency_contact": emergency_contacts.get(a.student_id),
                    })
            for items in by_stop.values():
                items.sort(key=lambda item: item["student_name"])
            directions[direction] = {
                "trip": _trip_out(trip),
                "stops": [
                    {
                        **_stop_out(stop),
                        "time": stop.morning_time if direction == "morning" else stop.evening_time,
                        "students": by_stop.get(stop.id, []),
                    }
                    for stop in ordered_stops
                ],
                "exceptions": sorted(exc_list, key=lambda item: item["student_name"]),
            }
        out_routes.append({
            "id": route.id,
            "name": route.name,
            "vehicle_plate": route.vehicle_plate,
            "capacity": route.capacity,
            "directions": directions,
        })

    await _audit(db, request, current_user, "transport.driver_manifest_viewed", None, {
        "date": target.isoformat(), "routes": len(out_routes),
    })
    await db.commit()
    return {
        "date": target.isoformat(),
        "is_school_day": school_weekday(target) is not None and target not in holidays,
        "routes": out_routes,
    }


@router.post("/driver/trips/{route_id}/{direction}/start")
async def start_trip(
    route_id: str,
    direction: TripDirection,
    request: Request,
    day: str | None = Query(default=None, alias="date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, DRIVER_ACCESS_ROLES)
    await require_module("transport", current_user, db)
    route = await _route_in_school(db, route_id, school_id)
    _assert_driver_can_access_route(current_user, route)
    target = _parse_day(day) if day else _today()
    trip = (
        await db.execute(
            select(TransportTrip).where(
                TransportTrip.school_id == school_id,
                TransportTrip.route_id == route.id,
                TransportTrip.day == target,
                TransportTrip.direction == direction,
            )
        )
    ).scalar_one_or_none()
    if trip is None:
        trip = TransportTrip(
            school_id=school_id,
            route_id=route.id,
            day=target,
            direction=direction,
            status="in_progress",
            driver_id=current_user.id,
        )
        db.add(trip)
        await db.flush()
        await _audit(db, request, current_user, "transport.trip_started", trip.id, {
            "route_id": route.id, "day": target.isoformat(), "direction": direction,
        })
        await db.commit()
    return _trip_out(trip)


@router.post("/driver/trips/{trip_id}/events")
async def record_trip_events(
    trip_id: str,
    payload: TripEventsBatch,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Record boarding/drop-off/no-show events idempotently (supports offline sync)."""
    school_id = _school_id(current_user, DRIVER_ACCESS_ROLES)
    await require_module("transport", current_user, db)
    trip, route = await _load_driver_trip(db, trip_id, current_user, school_id)

    incoming_ids = [ev.client_event_id for ev in payload.events]
    existing_client_ids = set(
        (
            await db.execute(
                select(TransportTripEvent.client_event_id).where(
                    TransportTripEvent.school_id == school_id,
                    TransportTripEvent.trip_id == trip.id,
                    TransportTripEvent.client_event_id.in_(incoming_ids),
                )
            )
        ).scalars().all()
    )
    fresh = []
    seen_in_batch: set[str] = set()
    for ev in payload.events:
        if ev.client_event_id in existing_client_ids or ev.client_event_id in seen_in_batch:
            continue
        seen_in_batch.add(ev.client_event_id)
        fresh.append(ev)

    if not fresh:
        return {"recorded": 0, "skipped": len(payload.events)}
    if trip.status == "completed":
        raise HTTPException(status_code=400, detail="Ce trajet est deja termine.")

    student_ids = sorted({ev.student_id for ev in fresh})
    students = {
        sid: name
        for sid, name in (
            await db.execute(
                select(Student.id, Student.full_name).where(
                    Student.school_id == school_id, Student.id.in_(student_ids), Student.archived_at.is_(None)
                )
            )
        ).all()
    }
    if len(students) != len(student_ids):
        raise HTTPException(status_code=404, detail="Eleve introuvable.")

    parents_by_student = await _parent_ids(db, school_id, student_ids)
    stop_names_by_student: dict[str, str] = {}
    for sid, stop_name in (
        await db.execute(
            select(TransportAssignment.student_id, TransportStop.name)
            .join(TransportStop, TransportStop.id == TransportAssignment.stop_id)
            .where(TransportAssignment.school_id == school_id, TransportAssignment.student_id.in_(student_ids))
        )
    ).all():
        stop_names_by_student[sid] = stop_name

    now = datetime.now(timezone.utc)
    recorded = 0
    for ev in fresh:
        event_at = ev.recorded_at or now
        db.add(
            TransportTripEvent(
                school_id=school_id,
                trip_id=trip.id,
                student_id=ev.student_id,
                kind=ev.kind,
                recorded_at=event_at,
                recorded_by=current_user.id,
                client_event_id=ev.client_event_id,
            )
        )
        recorded += 1
        local_hhmm = event_at.astimezone(ALGERIA_TZ).strftime("%H:%M")
        student_name = students[ev.student_id]
        msg: str | None = None
        if ev.kind == "boarded":
            msg = f"{student_name} est monte(e) dans le bus ({route.name}) a {local_hhmm}."
        elif ev.kind == "dropped":
            if trip.direction == "morning":
                msg = f"{student_name} est bien arrive(e) a l'ecole a {local_hhmm}."
            else:
                stop_name = stop_names_by_student.get(ev.student_id)
                where = f"a l'arret {stop_name}" if stop_name else "a son arret"
                msg = f"{student_name} a ete depose(e) {where} a {local_hhmm}."
        if msg:
            for parent_id in parents_by_student.get(ev.student_id, []):
                await create_notification(db, parent_id, "Transport scolaire", msg, type=NOTIFICATION_TYPE, school_id=school_id)

    await _audit(db, request, current_user, "transport.trip_events_recorded", trip.id, {"recorded": recorded})
    await db.commit()
    return {"recorded": recorded, "skipped": len(payload.events) - recorded}


@router.post("/driver/trips/{trip_id}/delay")
async def report_delay(
    trip_id: str,
    payload: DelayIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, DRIVER_ACCESS_ROLES)
    await require_module("transport", current_user, db)
    trip, route = await _load_driver_trip(db, trip_id, current_user, school_id)
    trip.delay_minutes = payload.minutes

    holidays = await _holidays(db, school_id, trip.day, trip.day)
    assignments = (
        await db.execute(
            select(TransportAssignment).where(
                TransportAssignment.school_id == school_id, TransportAssignment.route_id == route.id
            )
        )
    ).scalars().all()
    exceptions = (
        await db.execute(
            select(TransportException).where(TransportException.school_id == school_id, TransportException.day == trip.day)
        )
    ).scalars().all()
    excepted = _excepted_ids_for(exceptions, trip.direction)
    rider_ids = [a.student_id for a in assignments if logic.rides_on(a, trip.day, trip.direction, excepted, holidays)]
    parent_ids = sorted({p for ids in (await _parent_ids(db, school_id, rider_ids)).values() for p in ids})

    note_suffix = f" ({payload.note.strip()})" if payload.note and payload.note.strip() else ""
    msg = f"Le bus {route.name} a environ {payload.minutes} min de retard{note_suffix}."
    notified = 0
    for parent_id in parent_ids:
        if await create_notification(db, parent_id, "Retard du transport", msg, type=NOTIFICATION_TYPE, school_id=school_id):
            notified += 1

    await _audit(db, request, current_user, "transport.trip_delayed", trip.id, {
        "minutes": payload.minutes, "notified": notified,
    })
    await db.commit()
    return {"trip": _trip_out(trip), "notified": notified}


@router.post("/driver/trips/{trip_id}/complete")
async def complete_trip(
    trip_id: str,
    request: Request,
    payload: TripCompleteIn | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Complete a trip; blocks with 409 if any boarded student has not been dropped off unless ``force=True``."""
    school_id = _school_id(current_user, DRIVER_ACCESS_ROLES)
    await require_module("transport", current_user, db)
    trip, route = await _load_driver_trip(db, trip_id, current_user, school_id)
    force = payload.force if payload else False

    events = (
        await db.execute(
            select(TransportTripEvent).where(TransportTripEvent.school_id == school_id, TransportTripEvent.trip_id == trip.id)
        )
    ).scalars().all()
    unaccounted = logic.unaccounted_boarded_students(events)
    if unaccounted and not force:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Eleve(s) monte(s) non pointe(s) a la descente.",
                "unaccounted_student_ids": unaccounted,
            },
        )

    trip.status = "completed"
    trip.completed_at = datetime.now(timezone.utc)
    if unaccounted:
        names = [
            name
            for name in (
                await db.execute(
                    select(Student.full_name).where(Student.school_id == school_id, Student.id.in_(unaccounted))
                )
            ).scalars().all()
        ]
        admins = (
            await db.execute(
                select(User.id).where(
                    User.school_id == school_id,
                    User.role.in_([UserRole.principal, UserRole.secretary]),
                    User.deactivated_at.is_(None),
                )
            )
        ).scalars().all()
        label = ", ".join(names) if names else ", ".join(unaccounted)
        alert_msg = f"Alerte trajet {route.name} ({trip.direction}) : eleve(s) monte(s) sans descente pointee ({label})."
        for admin_id in admins:
            await create_notification(db, admin_id, "Alerte transport scolaire", alert_msg, type="SECURITY", school_id=school_id)
        await _audit(db, request, current_user, "transport.unaccounted_student_alert", trip.id, {
            "route_id": route.id, "unaccounted_student_ids": unaccounted,
        })
    else:
        await _audit(db, request, current_user, "transport.trip_completed", trip.id, {"route_id": route.id})

    await db.commit()
    return {"trip": _trip_out(trip), "unaccounted_student_ids": unaccounted}
