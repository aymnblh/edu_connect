import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, ForeignKey, Text, DateTime, Enum as SAEnum, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"


class RemarkType(str, enum.Enum):
    information = "information"
    warning = "warning"
    praise = "praise"


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # e.g. "uid_2024-01-15"
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"))
    semester_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id"))
    student_name: Mapped[str] = mapped_column(String(255))
    status: Mapped[AttendanceStatus] = mapped_column(SAEnum(AttendanceStatus))
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_justified: Mapped[bool] = mapped_column(Boolean, default=False)
    justification_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    justification_attachment_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    cls: Mapped["Class"] = relationship("Class", back_populates="attendances")
    student: Mapped["Student"] = relationship("Student", back_populates="attendances")
    semester: Mapped["Semester"] = relationship("Semester", back_populates="attendances")



class Remark(Base):
    __tablename__ = "remarks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id"))
    student_name: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[RemarkType] = mapped_column(SAEnum(RemarkType), default=RemarkType.information)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    cls: Mapped["Class"] = relationship("Class", back_populates="remarks")
    student: Mapped["Student"] = relationship("Student", back_populates="remarks")

