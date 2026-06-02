import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, ForeignKey, Text, DateTime, Enum as SAEnum, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    teacher = "teacher"
    parent = "parent"
    principal = "principal"
    secretary = "secretary"
    system_admin = "system_admin"


class User(Base):
    """Personal data — stored only on this private server."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    school_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True) # Nullable for migration
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    push_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    invite_code: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    terms_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    terms_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # relationships
    school: Mapped["School"] = relationship("School", back_populates="users")
    classes_teaching: Mapped[list["Class"]] = relationship(
        "Class",
        secondary="class_teachers",
        back_populates="teachers"
    )
    # NOTE: memberships removed — ClassMember links students to classes, not users.
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    # Links for parents — explicit foreign_keys required because student_parents
    # has two FKs pointing to users (parent_id) which causes ambiguity.
    students_linking: Mapped[list["Student"]] = relationship(
        "Student",
        secondary="student_parents",
        primaryjoin="User.id == StudentParent.parent_id",
        secondaryjoin="Student.id == StudentParent.student_id",
        back_populates="parents",
        lazy="selectin"
    )

class Student(Base):
    __tablename__ = "students"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=True) # e.g. "2026-001"
    linking_pin: Mapped[str] = mapped_column(String(6), nullable=True) # e.g. "123456"
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archive_reason: Mapped[str | None] = mapped_column(String(50), nullable=True)
    archived_by: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # relationships
    school: Mapped["School"] = relationship("School", back_populates="students")
    parents: Mapped[list["User"]] = relationship(
        "User",
        secondary="student_parents",
        back_populates="students_linking"
    )
    memberships: Mapped[list["ClassMember"]] = relationship("ClassMember", back_populates="student")
    grades: Mapped[list["Grade"]] = relationship("Grade", back_populates="student", cascade="all, delete-orphan")
    attendances: Mapped[list["Attendance"]] = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    remarks: Mapped[list["Remark"]] = relationship("Remark", back_populates="student", cascade="all, delete-orphan")
    verification_requests: Mapped[list["VerificationRequest"]] = relationship("VerificationRequest", back_populates="student", cascade="all, delete-orphan")


class StudentParent(Base):
    __tablename__ = "student_parents"
    
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    parent_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

class ClassTeacher(Base):
    __tablename__ = "class_teachers"
    
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True)
    teacher_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

