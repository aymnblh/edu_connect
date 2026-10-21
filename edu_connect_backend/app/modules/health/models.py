from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class StudentHealthRecord(Base):
    """Health and emergency sheet of a student (sensitive data under Law 18-07).

    Full content: school administration and the student's linked parents.
    Teachers of the class only ever see ``teacher_alert``. Every staff view
    and every change is audited; it exists only with recorded parent consent.
    """

    __tablename__ = "student_health_records"

    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    # [{"name": ..., "relationship": ..., "phone": ...}], in calling order.
    emergency_contacts: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    medications: Mapped[str | None] = mapped_column(Text, nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(3), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    doctor_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    emergency_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    teacher_alert: Mapped[str | None] = mapped_column(String(200), nullable=True)
    consent_given_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consent_by: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    consent_method: Mapped[str] = mapped_column(String(10), nullable=False)  # "app" (parent) or "paper" (school)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_by: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
