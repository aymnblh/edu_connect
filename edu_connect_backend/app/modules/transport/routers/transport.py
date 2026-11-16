"""School transport: bus lines, stops, student assignments, driver check-in and parent notices."""
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

router = APIRouter(prefix="/transport", tags=["Transport"])

ADMIN_ROLES = {UserRole.principal, UserRole.secretary}
DRIVER_ACCESS_ROLES = ADMIN_ROLES | {UserRole.driver}
NOTIFICATION_TYPE = "TRANSPORT"

TransportDirection = Literal[TRANSPORT_DIRECTIONS]  # type: ignore[valid-type]
TripDirection = Literal[TRIP_DIRECTIONS]  # type: ignore[valid-type]
TripEventKind = Literal[TRIP_EVENT_KINDS]  # type: ignore[valid-type]


# ── Schemas ──────────────────────────────────────────────────────────────────

class RouteIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    vehicle_plate: str | None = Field(default=None, max_length=40)
    capacity: int = Field(default=30, ge=1, le=200)
    driver_id: str | None = None
    assistant_id: str | None = None
    monthly_price: Decimal = Field(default=Decimal("0"), ge=0, le=Decimal("1000000"))
    active: bool = True


class RoutePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    vehicle_plate: str | None = Field(default=None, max_length=40)
    capacity: int | None = Field(default=None, ge=1, le=200)
    driver_id: str | None = None
    assistant_id: str | None = None
    monthly_price: Decimal | None = Field(default=None, ge=0, le=Decimal("1000000"))
    active: bool | None = None


class StopIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    position: int = Field(default=1, ge=1, le=200)
    morning_time: str | None = Field(default=None, max_length=5)
    evening_time: str | None = Field(default=None, max_length=5)

    @field_validator("morning_time", "evening_time")
    @classmethod
    def _valid_hhmm(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        logic.parse_hhmm(value)
        return value.strip()


class AssignmentIn(BaseModel):
    route_id: str
    stop_id: str
    direction: TransportDirection = "both"
    start_date: date
    end_date: date | None = None

    @model_validator(mode="after")
    def _coherent(self):
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("The end date is before the start date.")
        return self


class TripEventIn(BaseModel):
    student_id: str
    kind: TripEventKind
    client_event_id: str = Field(min_length=1, max_length=64)
    recorded_at: datetime | None = None


class TripEventsBatch(BaseModel):
    events: list[TripEventIn] = Field(min_length=1, max_length=200)


class DelayIn(BaseModel):
    minutes: int = Field(ge=1, le=240)
    note: str | None = Field(default=None, max_length=200)


class TripCompleteIn(BaseModel):
    force: bool = False


class ExceptionIn(BaseModel):
    student_id: str
    day: date
    direction: TransportDirection = "evening"
    reason: str | None = Field(default=None, max_length=200)


class BillingRequest(BaseModel):
    year: int = Field(ge=2020, le=2100)
    month: int = Field(ge=1, le=12)
    due_date: date | None = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _today() -> date:
    return datetime.now(timezone.utc).astimezone(ALGERIA_TZ).date()


def _parse_day(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=400, detail="Date attendue au format AAAA-MM-JJ.")


def _school_id(user: User, roles: set[UserRole]) -> str:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")
    return user.school_id


async def _audit(db: AsyncSession, request: Request, user: User, action: str, resource_id: str | None, metadata: dict | None = None):
    await record_audit_event(
        db,
        action=action,
        actor=user,
        school_id=user.school_id,
        resource_type="transport",
        resource_id=resource_id,
        method=request.method,
        path=request.url.path,
        metadata=metadata,
    )


async def _holidays(db: AsyncSession, school_id: str, start: date, end: date) -> set[date]:
    rows = (
        await db.execute(
            select(Announcement.starts_on, Announcement.ends_on).where(
                Announcement.school_id == school_id,
                Announcement.category == "holiday",
                Announcement.whole_school.is_(True),
                Announcement.starts_on.is_not(None),
                Announcement.starts_on <= end,
            )
        )
    ).all()
    return {day for day in holiday_dates(rows) if start <= day <= end}


async def _parent_ids(db: AsyncSession, school_id: str, student_ids: list[str]) -> dict[str, list[str]]:
    if not student_ids:
        return {}
    links: dict[str, list[str]] = {}
    for student_id, parent_id in (
        await db.execute(
            select(StudentParent.student_id, StudentParent.parent_id).where(
                StudentParent.school_id == school_id, StudentParent.student_id.in_(student_ids)
            )
        )
    ).all():
        links.setdefault(student_id, []).append(parent_id)
    return links


async def _student_classes(db: AsyncSession, school_id: str) -> dict[str, str]:
    classes: dict[str, str] = {}
    for student_id, class_name in (
        await db.execute(
            select(ClassMember.student_id, Class.name)
            .join(Class, Class.id == ClassMember.class_id)
            .where(ClassMember.school_id == school_id)
            .order_by(Class.name)
        )
    ).all():
        classes.setdefault(student_id, class_name)
    return classes


async def _staff_user_in_school(db: AsyncSession, user_id: str | None, school_id: str) -> User | None:
    if not user_id:
        return None
    user = await db.get(User, user_id)
    if user is None or user.school_id != school_id or user.deactivated_at is not None:
        raise HTTPException(status_code=404, detail="Compte personnel introuvable dans cet etablissement.")
    return user


async def _route_in_school(db: AsyncSession, route_id: str, school_id: str) -> TransportRoute:
    route = (
        await db.execute(
            select(TransportRoute)
            .where(TransportRoute.id == route_id, TransportRoute.school_id == school_id)
            .options(selectinload(TransportRoute.stops))
        )
    ).scalar_one_or_none()
    if route is None:
        raise HTTPException(status_code=404, detail="Ligne de transport introuvable.")
    return route


def _stop_out(stop: TransportStop) -> dict:
    return {
        "id": stop.id,
        "route_id": stop.route_id,
        "name": stop.name,
        "position": stop.position,
        "morning_time": stop.morning_time,
        "evening_time": stop.evening_time,
    }


def _route_out(route: TransportRoute, staff_names: dict[str, str] | None = None) -> dict:
    staff_names = staff_names or {}
    return {
        "id": route.id,
        "name": route.name,
        "vehicle_plate": route.vehicle_plate,
        "capacity": route.capacity,
        "driver_id": route.driver_id,
        "driver_name": staff_names.get(route.driver_id or "") if route.driver_id else None,
        "assistant_id": route.assistant_id,
        "assistant_name": staff_names.get(route.assistant_id or "") if route.assistant_id else None,
        "monthly_price": money(route.monthly_price),
        "active": route.active,
        "stops": [_stop_out(s) for s in sorted(route.stops, key=lambda item: (item.position, item.name))],
    }


def _assignment_out(assignment: TransportAssignment | None, routes: dict[str, TransportRoute], stops: dict[str, TransportStop]) -> dict | None:
    if assignment is None:
        return None
    route = routes.get(assignment.route_id)
    stop = stops.get(assignment.stop_id)
    return {
        "id": assignment.id,
        "student_id": assignment.student_id,
        "route_id": assignment.route_id,
        "route_name": route.name if route else None,
        "stop_id": assignment.stop_id,
        "stop_name": stop.name if stop else None,
        "morning_time": stop.morning_time if stop else None,
        "evening_time": stop.evening_time if stop else None,
        "direction": assignment.direction,
        "start_date": assignment.start_date.isoformat(),
        "end_date": assignment.end_date.isoformat() if assignment.end_date else None,
        "active": assignment.end_date is None or assignment.end_date >= _today(),
    }


def _trip_out(trip: TransportTrip | None) -> dict | None:
    if trip is None:
        return None
    return {
        "id": trip.id,
        "route_id": trip.route_id,
        "day": trip.day.isoformat(),
        "direction": trip.direction,
        "status": trip.status,
        "delay_minutes": trip.delay_minutes,
        "started_at": trip.started_at.isoformat() if trip.started_at else None,
        "completed_at": trip.completed_at.isoformat() if trip.completed_at else None,
    }


def _assert_driver_can_access_route(user: User, route: TransportRoute) -> None:
    if user.role == UserRole.driver and user.id not in (route.driver_id, route.assistant_id):
        raise HTTPException(status_code=403, detail="Ce trajet ne vous est pas attribue.")


def _excepted_ids_for(exceptions: list[TransportException], direction: str) -> set[str]:
    return {exc.student_id for exc in exceptions if exc.direction in ("both", direction)}


# ── Routes & stops (Admin) ───────────────────────────────────────────────────

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


# ── Student assignments (Admin) ──────────────────────────────────────────────

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


# ── Live view & billing (Admin) ──────────────────────────────────────────────

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


# ── Driver / escort workspace (/transport/driver/*) ──────────────────────────

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


async def _load_driver_trip(db: AsyncSession, trip_id: str, user: User, school_id: str) -> tuple[TransportTrip, TransportRoute]:
    trip = await db.get(TransportTrip, trip_id)
    if trip is None or trip.school_id != school_id:
        raise HTTPException(status_code=404, detail="Trajet introuvable.")
    route = await db.get(TransportRoute, trip.route_id)
    if route is None or route.school_id != school_id:
        raise HTTPException(status_code=404, detail="Ligne de transport introuvable.")
    _assert_driver_can_access_route(user, route)
    return trip, route


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


# ── Parents (/transport/my, /transport/exceptions) ───────────────────────────

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
