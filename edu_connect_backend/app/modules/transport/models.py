import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def utc_now():
    return datetime.now(timezone.utc)


TRANSPORT_DIRECTIONS = ("both", "morning", "evening")
TRIP_DIRECTIONS = ("morning", "evening")
TRIP_EVENT_KINDS = ("boarded", "dropped", "no_show")


class TransportRoute(Base):
    """A school bus line with its vehicle, driver and monthly fee."""

    __tablename__ = "transport_routes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    vehicle_plate: Mapped[str | None] = mapped_column(String(40), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    driver_id: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assistant_id: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    monthly_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    stops: Mapped[list["TransportStop"]] = relationship(
        "TransportStop", back_populates="route", cascade="all, delete-orphan", order_by="TransportStop.position"
    )


class TransportStop(Base):
    """An ordered stop along a bus route with morning and evening pickup/drop-off times."""

    __tablename__ = "transport_stops"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    route_id: Mapped[str] = mapped_column(String(36), ForeignKey("transport_routes.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    morning_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    evening_time: Mapped[str | None] = mapped_column(String(5), nullable=True)

    route: Mapped["TransportRoute"] = relationship("TransportRoute", back_populates="stops")


class TransportAssignment(Base):
    """Assigns a student to a route and stop (one active assignment per student)."""

    __tablename__ = "transport_assignments"
    __table_args__ = (UniqueConstraint("school_id", "student_id", name="uq_transport_assignments_student"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    route_id: Mapped[str] = mapped_column(String(36), ForeignKey("transport_routes.id", ondelete="CASCADE"), nullable=False, index=True)
    stop_id: Mapped[str] = mapped_column(String(36), ForeignKey("transport_stops.id", ondelete="CASCADE"), nullable=False, index=True)
    direction: Mapped[str] = mapped_column(String(10), nullable=False, default="both")
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    student: Mapped["Student"] = relationship("Student")


class TransportTrip(Base):
    """One morning or evening bus run on a given day."""

    __tablename__ = "transport_trips"
    __table_args__ = (
        UniqueConstraint("school_id", "route_id", "day", "direction", name="uq_transport_trips_route_day_dir"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    route_id: Mapped[str] = mapped_column(String(36), ForeignKey("transport_routes.id", ondelete="CASCADE"), nullable=False, index=True)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delay_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    driver_id: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class TransportTripEvent(Base):
    """Idempotent boarding / drop-off / no-show check-in event during a trip."""

    __tablename__ = "transport_trip_events"
    __table_args__ = (UniqueConstraint("trip_id", "client_event_id", name="uq_transport_trip_events_client"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("transport_trips.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(15), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    recorded_by: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    client_event_id: Mapped[str] = mapped_column(String(64), nullable=False)


class TransportException(Base):
    """Parent notice that a child will not take the bus on a given day/direction."""

    __tablename__ = "transport_exceptions"
    __table_args__ = (
        UniqueConstraint("school_id", "student_id", "day", "direction", name="uq_transport_exceptions_student_day"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False, default="evening")
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
