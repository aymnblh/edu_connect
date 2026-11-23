"""School transport parent endpoints: child transport view and no-bus notices."""
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


@router.get("/my")
async def my_transport(
    day: str | None = Query(default=None, alias="date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, {UserRole.parent})
    await require_module("transport", current_user, db)
    target = _parse_day(day) if day else _today()

    children = (
        await db.execute(
            select(Student.id, Student.full_name)
            .join(StudentParent, StudentParent.student_id == Student.id)
            .where(
                StudentParent.parent_id == current_user.id,
                StudentParent.school_id == school_id,
                Student.archived_at.is_(None),
            )
            .order_by(Student.full_name)
        )
    ).all()
    child_ids = [cid for cid, _ in children]
    if not child_ids:
        return {"date": target.isoformat(), "children": []}

    assignments = {
        a.student_id: a
        for a in (
            await db.execute(
                select(TransportAssignment).where(
                    TransportAssignment.school_id == school_id, TransportAssignment.student_id.in_(child_ids)
                )
            )
        ).scalars().all()
    }
    route_ids = sorted({a.route_id for a in assignments.values()})
    stop_ids = sorted({a.stop_id for a in assignments.values()})
    routes = {
        r.id: r
        for r in (
            await db.execute(
                select(TransportRoute).where(TransportRoute.school_id == school_id, TransportRoute.id.in_(route_ids))
            )
        ).scalars().all()
    } if route_ids else {}
    stops = {
        s.id: s
        for s in (
            await db.execute(
                select(TransportStop).where(TransportStop.school_id == school_id, TransportStop.id.in_(stop_ids))
            )
        ).scalars().all()
    } if stop_ids else {}
    driver_ids = sorted({r.driver_id for r in routes.values() if r.driver_id})
    drivers = {
        u.id: u
        for u in (
            await db.execute(select(User).where(User.school_id == school_id, User.id.in_(driver_ids)))
        ).scalars().all()
    } if driver_ids else {}

    trips = (
        await db.execute(
            select(TransportTrip).where(
                TransportTrip.school_id == school_id,
                TransportTrip.day == target,
                TransportTrip.route_id.in_(route_ids),
            )
        )
    ).scalars().all() if route_ids else []
    trips_by_key = {(t.route_id, t.direction): t for t in trips}
    trip_ids = [t.id for t in trips]
    events_by_trip_student: dict[tuple[str, str], list[TransportTripEvent]] = {}
    if trip_ids:
        for ev in (
            await db.execute(
                select(TransportTripEvent).where(
                    TransportTripEvent.school_id == school_id,
                    TransportTripEvent.trip_id.in_(trip_ids),
                    TransportTripEvent.student_id.in_(child_ids),
                )
            )
        ).scalars().all():
            events_by_trip_student.setdefault((ev.trip_id, ev.student_id), []).append(ev)

    exceptions_by_student: dict[str, list[dict]] = {}
    for exc in (
        await db.execute(
            select(TransportException)
            .where(
                TransportException.school_id == school_id,
                TransportException.student_id.in_(child_ids),
                TransportException.day >= target,
            )
            .order_by(TransportException.day)
        )
    ).scalars().all():
        exceptions_by_student.setdefault(exc.student_id, []).append({
            "id": exc.id,
            "day": exc.day.isoformat(),
            "direction": exc.direction,
            "reason": exc.reason,
        })

    out_children = []
    for child_id, child_name in children:
        a = assignments.get(child_id)
        if a is None:
            out_children.append({
                "student_id": child_id,
                "student_name": child_name,
                "assignment": None,
                "today": {"morning": None, "evening": None},
                "exceptions": exceptions_by_student.get(child_id, []),
            })
            continue
        route = routes.get(a.route_id)
        stop = stops.get(a.stop_id)
        driver = drivers.get(route.driver_id) if route and route.driver_id else None
        today_status = {}
        for direction in TRIP_DIRECTIONS:
            trip = trips_by_key.get((a.route_id, direction))
            evs = events_by_trip_student.get((trip.id, child_id), []) if trip else []
            ordered = sorted(evs, key=lambda e: e.recorded_at)
            today_status[direction] = None if trip is None else {
                "trip_status": trip.status,
                "delay_minutes": trip.delay_minutes,
                "student_state": ordered[-1].kind if ordered else "pending",
                "last_event_at": ordered[-1].recorded_at.isoformat() if ordered else None,
            }
        out_children.append({
            "student_id": child_id,
            "student_name": child_name,
            "assignment": {
                "route_id": a.route_id,
                "route_name": route.name if route else None,
                "vehicle_plate": route.vehicle_plate if route else None,
                "driver_name": driver.full_name if driver else None,
                "driver_phone": driver.phone if driver else None,
                "stop_id": a.stop_id,
                "stop_name": stop.name if stop else None,
                "morning_time": stop.morning_time if stop else None,
                "evening_time": stop.evening_time if stop else None,
                "direction": a.direction,
                "start_date": a.start_date.isoformat(),
                "end_date": a.end_date.isoformat() if a.end_date else None,
                "monthly_price": money(route.monthly_price) if route else 0.0,
            },
            "today": today_status,
            "exceptions": exceptions_by_student.get(child_id, []),
        })
    return {"date": target.isoformat(), "children": out_children}


@router.post("/exceptions", status_code=201)
async def declare_exception(
    payload: ExceptionIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, {UserRole.parent})
    await require_module("transport", current_user, db)

    link = (
        await db.execute(
            select(StudentParent.student_id).where(
                StudentParent.school_id == school_id,
                StudentParent.student_id == payload.student_id,
                StudentParent.parent_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="Eleve introuvable.")

    assignment = (
        await db.execute(
            select(TransportAssignment).where(
                TransportAssignment.school_id == school_id, TransportAssignment.student_id == payload.student_id
            )
        )
    ).scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=400, detail="Cet eleve n'est pas inscrit au transport scolaire.")

    stop = await db.get(TransportStop, assignment.stop_id)
    stop_time: str | None = None
    if stop is not None:
        if payload.direction == "morning":
            stop_time = stop.morning_time
        elif payload.direction == "evening":
            stop_time = stop.evening_time
        else:
            stop_time = stop.morning_time or stop.evening_time

    if not logic.can_parent_declare_exception(datetime.now(timezone.utc), payload.day, stop_time):
        raise HTTPException(
            status_code=400,
            detail="Delai depasse : merci de prevenir au moins 30 minutes avant le passage du bus.",
        )

    exc = (
        await db.execute(
            select(TransportException).where(
                TransportException.school_id == school_id,
                TransportException.student_id == payload.student_id,
                TransportException.day == payload.day,
                TransportException.direction == payload.direction,
            )
        )
    ).scalar_one_or_none()
    if exc is None:
        exc = TransportException(
            school_id=school_id,
            student_id=payload.student_id,
            day=payload.day,
            direction=payload.direction,
            created_by=current_user.id,
        )
        db.add(exc)
    exc.reason = (payload.reason or "").strip() or None
    await db.flush()
    await _audit(db, request, current_user, "transport.exception_created", exc.id, {
        "student_id": payload.student_id, "day": payload.day.isoformat(), "direction": payload.direction,
    })
    await db.commit()
    return {
        "id": exc.id,
        "student_id": exc.student_id,
        "day": exc.day.isoformat(),
        "direction": exc.direction,
        "reason": exc.reason,
    }


@router.delete("/exceptions/{exception_id}")
async def cancel_exception(
    exception_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, {UserRole.parent})
    await require_module("transport", current_user, db)
    exc = await db.get(TransportException, exception_id)
    if exc is None or exc.school_id != school_id:
        raise HTTPException(status_code=404, detail="Signalement introuvable.")
    link = (
        await db.execute(
            select(StudentParent.student_id).where(
                StudentParent.school_id == school_id,
                StudentParent.student_id == exc.student_id,
                StudentParent.parent_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if link is None and exc.created_by != current_user.id:
        raise HTTPException(status_code=404, detail="Signalement introuvable.")
    await db.delete(exc)
    await _audit(db, request, current_user, "transport.exception_deleted", exception_id)
    await db.commit()
    return {"deleted": True}
