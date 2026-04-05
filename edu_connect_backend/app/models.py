import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, ForeignKey, Text, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


# ─── Enums ───────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    teacher = "teacher"
    parent = "parent"
    principal = "principal"
    secretary = "secretary"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"


class RemarkType(str, enum.Enum):
    information = "information"
    warning = "warning"
    praise = "praise"


class VerificationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


# ─── Models ──────────────────────────────────────────────────────────────────

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

class Course(Base):
    __tablename__ = "courses"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    school: Mapped["School"] = relationship("School", back_populates="courses")


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

class User(Base):
    """Personal data — stored only on this private server."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)   # = Firebase UID
    school_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True) # Nullable for migration
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    fcm_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # relationships
    school: Mapped["School"] = relationship("School", back_populates="users")
    classes_teaching: Mapped[list["Class"]] = relationship(
        "Class", 
        secondary="class_teachers", 
        back_populates="teachers"
    )
    memberships: Mapped[list["ClassMember"]] = relationship("ClassMember", back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    
    # Links for parents
    students_linking: Mapped[list["Student"]] = relationship(
        "Student",
        secondary="student_parents",
        back_populates="parents"
    )

class Student(Base):
    __tablename__ = "students"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=True) # e.g. "2026-001"
    linking_pin: Mapped[str] = mapped_column(String(6), nullable=True) # e.g. "123456"
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    
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


class VerificationRequest(Base):
    __tablename__ = "verification_requests"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    parent_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[VerificationStatus] = mapped_column(SAEnum(VerificationStatus), default=VerificationStatus.pending)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    student: Mapped["Student"] = relationship("Student", back_populates="verification_requests")
    parent: Mapped["User"] = relationship("User")

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

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), default="INFO")  # INFO, WARNING, SUCCESS
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user: Mapped["User"] = relationship("User", back_populates="notifications")


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


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"))
    sender_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id"))
    sender_name: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_announcement: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    cls: Mapped["Class"] = relationship("Class", back_populates="messages")


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"))
    semester_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id"))
    student_name: Mapped[str] = mapped_column(String(255))
    score: Mapped[float] = mapped_column(nullable=False)
    max_score: Mapped[float] = mapped_column(default=20.0)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    cls: Mapped["Class"] = relationship("Class", back_populates="grades")
    student: Mapped["Student"] = relationship("Student", back_populates="grades")
    semester: Mapped["Semester"] = relationship("Semester", back_populates="grades")


class Homework(Base):
    __tablename__ = "homework"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"))
    subject: Mapped[str] = mapped_column(String(255))
    lesson_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    homework_content: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    cls: Mapped["Class"] = relationship("Class", back_populates="homework")


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

class PendingLink(Base):
    __tablename__ = "pending_links"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, used
    label: Mapped[str | None] = mapped_column(String(50), nullable=True) # e.g. "Père", "Mère"
    device_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
    device_platform: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    scanned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    
    parent_id: Mapped[str | None] = mapped_column(String(128), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    family_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False) # For strict rotation / invalidation
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class MigrationOrphan(Base):
    __tablename__ = "migration_orphans"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    table_name: Mapped[str] = mapped_column(String(100))
    row_id: Mapped[str] = mapped_column(String(128))
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
