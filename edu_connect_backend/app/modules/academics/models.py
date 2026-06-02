import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, ForeignKey, Text, DateTime, Enum as SAEnum, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Course(Base):
    __tablename__ = "courses"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    coefficient: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    school: Mapped["School"] = relationship("School", back_populates="courses")

class ClassCourse(Base):
    __tablename__ = "class_courses"
    
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True)
    teacher_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    coefficient: Mapped[float] = mapped_column(Float, default=1.0)

    cls: Mapped["Class"] = relationship("Class", back_populates="courses_association")
    course: Mapped["Course"] = relationship("Course")
    teacher: Mapped["User"] = relationship("User")


class Class(Base):
    __tablename__ = "classes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    join_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    school: Mapped["School"] = relationship("School", back_populates="classes")

    teachers: Mapped[list["User"]] = relationship(
        "User", 
        secondary="class_teachers", 
        back_populates="classes_teaching"
    )
    members: Mapped[list["ClassMember"]] = relationship("ClassMember", back_populates="cls", cascade="all, delete-orphan")
    courses_association: Mapped[list["ClassCourse"]] = relationship("ClassCourse", back_populates="cls", cascade="all, delete-orphan")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="cls", cascade="all, delete-orphan")
    grades: Mapped[list["Grade"]] = relationship("Grade", back_populates="cls", cascade="all, delete-orphan")
    homework: Mapped[list["Homework"]] = relationship("Homework", back_populates="cls", cascade="all, delete-orphan")
    attendances: Mapped[list["Attendance"]] = relationship("Attendance", back_populates="cls", cascade="all, delete-orphan")

    remarks: Mapped[list["Remark"]] = relationship("Remark", back_populates="cls", cascade="all, delete-orphan")


class ClassMember(Base):
    __tablename__ = "class_members"

    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)

    cls: Mapped["Class"] = relationship("Class", back_populates="members")
    student: Mapped["Student"] = relationship("Student", back_populates="memberships")


class ClassTemporaryAccess(Base):
    __tablename__ = "class_temporary_access"

    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    access_level: Mapped[str] = mapped_column(String(20), default="read")  # read or write
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    granted_by: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"))
    semester_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id"))
    student_name: Mapped[str] = mapped_column(String(255))
    course_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True) # Fallback / Legacy
    score: Mapped[float] = mapped_column(nullable=False)
    max_score: Mapped[float] = mapped_column(default=20.0)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    cls: Mapped["Class"] = relationship("Class", back_populates="grades")
    student: Mapped["Student"] = relationship("Student", back_populates="grades")
    semester: Mapped["Semester"] = relationship("Semester", back_populates="grades")


class LessonEntry(Base):
    __tablename__ = "lesson_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    course_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    homework_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    session_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    cls: Mapped["Class"] = relationship("Class")
    teacher: Mapped["User"] = relationship("User")


class Homework(Base):
    __tablename__ = "homework"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"))
    course_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    subject: Mapped[str] = mapped_column(String(255))
    lesson_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    homework_content: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    cls: Mapped["Class"] = relationship("Class", back_populates="homework")


