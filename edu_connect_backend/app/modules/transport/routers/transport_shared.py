"""Shared schemas, constants, and domain helpers for School Transport."""
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


ADMIN_ROLES = {UserRole.principal, UserRole.secretary}


DRIVER_ACCESS_ROLES = ADMIN_ROLES | {UserRole.driver}


NOTIFICATION_TYPE = "TRANSPORT"


TransportDirection = Literal[TRANSPORT_DIRECTIONS]  # type: ignore[valid-type]


TripDirection = Literal[TRIP_DIRECTIONS]  # type: ignore[valid-type]


TripEventKind = Literal[TRIP_EVENT_KINDS]  # type: ignore[valid-type]


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


async def _load_driver_trip(db: AsyncSession, trip_id: str, user: User, school_id: str) -> tuple[TransportTrip, TransportRoute]:
    trip = await db.get(TransportTrip, trip_id)
    if trip is None or trip.school_id != school_id:
        raise HTTPException(status_code=404, detail="Trajet introuvable.")
    route = await db.get(TransportRoute, trip.route_id)
    if route is None or route.school_id != school_id:
        raise HTTPException(status_code=404, detail="Ligne de transport introuvable.")
    _assert_driver_can_access_route(user, route)
    return trip, route
