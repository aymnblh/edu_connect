import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, ForeignKey, Text, DateTime, Enum as SAEnum, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class ScheduleSlot(Base):
    """
    A recurring weekly timetable entry for a class.
    Created/modified by the principal. Teachers can cancel specific dates.

    day_of_week: 0=Monday … 6=Sunday
    start_time / end_time: stored as "HH:MM" strings (e.g. "08:30")
    """
    __tablename__ = "schedule_slots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=True, index=True)
    # Will become FK to courses in Axe ③ — kept as string for now -> Migrating now!
    course_name: Mapped[str] = mapped_column(String(255), nullable=False)
    teacher_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(nullable=False)   # 0=Mon … 6=Sun
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)  # "HH:MM"
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)    # "HH:MM"
    room: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    cls: Mapped["Class"] = relationship("Class")
    teacher: Mapped["User"] = relationship("User", foreign_keys=[teacher_id])
    created_by_user: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    cancellations: Mapped[list["SessionCancellation"]] = relationship(
        "SessionCancellation", back_populates="slot", cascade="all, delete-orphan"
    )


class SessionCancellation(Base):
    """
    Records a one-off cancellation of a ScheduleSlot on a specific date.
    Created by the teacher who owns the slot, or by the principal.
    Parents are notified automatically when this record is created.
    """
    __tablename__ = "session_cancellations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    slot_id: Mapped[str] = mapped_column(String(36), ForeignKey("schedule_slots.id", ondelete="CASCADE"), nullable=False, index=True)
    cancelled_date: Mapped[str] = mapped_column(String(10), nullable=False)  # "YYYY-MM-DD"
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancelled_by: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    slot: Mapped["ScheduleSlot"] = relationship("ScheduleSlot", back_populates="cancellations")
    cancelled_by_user: Mapped["User"] = relationship("User")


