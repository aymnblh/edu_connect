import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def utc_now():
    return datetime.now(timezone.utc)


# Allergens a menu can be tagged with (the 14 usual food allergen groups, simplified).
CANTEEN_ALLERGENS = (
    "gluten",
    "milk",
    "eggs",
    "peanuts",
    "nuts",
    "fish",
    "shellfish",
    "soy",
    "sesame",
    "celery",
    "mustard",
    "sulphites",
)
CANTEEN_PLANS = ("monthly", "days")
CANTEEN_DIETS = ("none", "vegetarian", "gluten_free", "diabetic", "other")


class CanteenMenu(Base):
    """The canteen meal of one school day (Sunday to Thursday)."""

    __tablename__ = "canteen_menus"
    __table_args__ = (UniqueConstraint("school_id", "day", name="uq_canteen_menus_school_day"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    starter: Mapped[str | None] = mapped_column(String(200), nullable=True)
    main: Mapped[str] = mapped_column(String(200), nullable=False)
    dessert: Mapped[str | None] = mapped_column(String(200), nullable=True)
    allergens: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Parents only see a menu once its week has been published.
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CanteenEnrollment(Base):
    """A student's canteen registration (one per student; ``end_date`` stops it).

    ``plan`` is ``monthly`` (flat monthly price, every school day) or ``days``
    (only the listed ``weekdays``, billed per day). Weekdays use the Algerian
    school week: 0 = Sunday ... 4 = Thursday.
    """

    __tablename__ = "canteen_enrollments"
    __table_args__ = (UniqueConstraint("school_id", "student_id", name="uq_canteen_enrollments_student"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    plan: Mapped[str] = mapped_column(String(10), nullable=False, default="monthly")
    weekdays: Mapped[list] = mapped_column(JSONB, nullable=False, default=lambda: [0, 1, 2, 3, 4])
    diet: Mapped[str] = mapped_column(String(20), nullable=False, default="none")
    diet_note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    student: Mapped["Student"] = relationship("Student")
