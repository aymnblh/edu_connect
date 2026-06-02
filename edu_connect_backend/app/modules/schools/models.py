import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, ForeignKey, Text, DateTime, Enum as SAEnum, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class School(Base):
    __tablename__ = "schools"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    student_id_prefix: Mapped[str] = mapped_column(String(10), default="EDU")
    prefix_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    subscription_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    tenant_config: Mapped[dict] = mapped_column(
        JSONB, 
        default={"max_parents_per_student": 2, "offline_scope": "current_trimester"},
        server_default='{"max_parents_per_student": 2, "offline_scope": "current_trimester"}'
    )

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="school", cascade="all, delete-orphan")
    students: Mapped[list["Student"]] = relationship("Student", back_populates="school", cascade="all, delete-orphan")
    classes: Mapped[list["Class"]] = relationship("Class", back_populates="school", cascade="all, delete-orphan")
    courses: Mapped[list["Course"]] = relationship("Course", back_populates="school", cascade="all, delete-orphan")
    semesters: Mapped[list["Semester"]] = relationship("Semester", back_populates="school", cascade="all, delete-orphan")

class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    months_added: Mapped[int] = mapped_column(Integer, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), default="cash") # "cash", "virement", etc.
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


    # Relationships
    school: Mapped["School"] = relationship("School")

class Semester(Base):
    __tablename__ = "semesters"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)   # e.g. "Trimester 1"
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    school: Mapped["School"] = relationship("School", back_populates="semesters")
    grades: Mapped[list["Grade"]] = relationship("Grade", back_populates="semester")
    attendances: Mapped[list["Attendance"]] = relationship("Attendance", back_populates="semester")

