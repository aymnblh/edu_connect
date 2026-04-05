from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from datetime import datetime
from .models import UserRole, AttendanceStatus, RemarkType, VerificationStatus


# ─── Schools & Courses ────────────────────────────────────────────────────────

class SchoolCreate(BaseModel):
    name: str
    student_id_prefix: str | None = "EDU"

class SchoolOut(BaseModel):
    id: str
    name: str
    student_id_prefix: str
    prefix_locked: bool
    is_active: bool
    created_at: datetime
    subscription_expires_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)

class CourseCreate(BaseModel):
    name: str
    school_id: str

class CourseOut(BaseModel):
    id: str
    name: str
    school_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SemesterOut(BaseModel):
    id: str
    school_id: str
    name: str
    start_date: datetime
    end_date: datetime
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SemesterUpdate(BaseModel):
    name: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None


# ─── Users ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    """Sent by Flutter right after Firebase account creation."""
    id: str           # Firebase UID
    school_id: str | None = None
    email: EmailStr
    full_name: str
    role: UserRole
    phone: str | None = None

class UserOut(BaseModel):
    id: str
    school_id: str | None
    email: str
    full_name: str
    role: UserRole
    phone: str | None
    avatar_url: str | None
    created_at: datetime
    students_linking: list["StudentOut"] = []
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None

# ─── Students ─────────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    full_name: str
    school_id: str

class StudentOut(BaseModel):
    id: str
    school_id: str
    student_id: str | None = None
    linking_pin: str | None = None
    full_name: str
    created_at: datetime
    parents: list[UserOut] = []
    model_config = ConfigDict(from_attributes=True)

class StudentRegeneratePin(BaseModel):
    notify: bool = False


class VerificationRequestOut(BaseModel):
    id: str
    school_id: str
    student_id: str
    parent_id: str
    status: VerificationStatus
    created_at: datetime
    student_name: str | None = None
    parent_name: str | None = None
    model_config = ConfigDict(from_attributes=True)


class LinkStudentRequest(BaseModel):
    student_id: str   # Human readable code
    linking_pin: str

class LinkByQrRequest(BaseModel):
    token: str
    label: str | None = None # e.g. "Maman", "Papa"

class SchoolRegistration(BaseModel):
    school_name: str
    admin_full_name: str
    admin_email: str
    admin_password: str

    @field_validator("admin_email")
    @classmethod
    def email_must_be_valid(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Email invalide")
        return v.lower()
    model_config = ConfigDict(from_attributes=True)

class ClassPerformance(BaseModel):
    class_name: str
    average_score: float

class AnalyticsOverview(BaseModel):
    school_avg: float
    class_performance: list[ClassPerformance]
    adoption_rate: float

    @field_validator("school_avg", "adoption_rate", mode="before")
    @classmethod
    def handle_none(cls, v):
        return v or 0.0
    model_config = ConfigDict(from_attributes=True)

class ParentLinkAuditOut(BaseModel):
    id: str
    label: str | None
    device_platform: str | None
    device_fingerprint: str | None
    ip_address: str | None
    used_at: datetime | None
    revoked_at: datetime | None
    parent_name: str | None = None
    model_config = ConfigDict(from_attributes=True)

class TokenGenerationRequest(BaseModel):
    labels: list[str] = ["Père", "Mère"]


# ─── Classes ──────────────────────────────────────────────────────────────────

class ClassCreate(BaseModel):
    name: str
    school_id: str
    subject: str | None = None

class ClassOut(BaseModel):
    id: str
    school_id: str
    name: str
    subject: str | None
    join_code: str
    created_at: datetime
    teachers: list[UserOut] = []
    members: list[StudentOut] = []
    model_config = ConfigDict(from_attributes=True)

class NotificationOut(BaseModel):
    id: str
    title: str
    content: str
    type: str
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class JoinClassRequest(BaseModel):
    join_code: str

class FcmTokenRequest(BaseModel):
    token: str


# ─── Messages ─────────────────────────────────────────────────────────────────

class MessageOut(BaseModel):
    id: str
    class_id: str
    sender_id: str
    sender_name: str
    content: str
    is_announcement: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Grades ───────────────────────────────────────────────────────────────────

class GradeCreate(BaseModel):
    student_id: str
    student_name: str
    subject: str
    score: float
    max_score: float = 20.0
    comment: str | None = None

class GradeOut(GradeCreate):
    id: str
    class_id: str
    date: datetime
    student: StudentOut
    model_config = ConfigDict(from_attributes=True)


# ─── Homework ─────────────────────────────────────────────────────────────────

class HomeworkCreate(BaseModel):
    subject: str
    lesson_content: str | None = None
    homework_content: str
    due_date: datetime

class HomeworkOut(HomeworkCreate):
    id: str
    class_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ─── Attendance ───────────────────────────────────────────────────────────────

class AttendanceCreate(BaseModel):
    student_id: str
    student_name: str
    status: AttendanceStatus
    note: str | None = None

class AttendanceOut(BaseModel):
    id: str
    class_id: str
    student_id: str
    student_name: str
    status: AttendanceStatus
    date: datetime
    note: str | None
    is_justified: bool
    justification_text: str | None
    student: StudentOut
    model_config = ConfigDict(from_attributes=True)

class JustifyRequest(BaseModel):
    text: str



# ─── Remarks ──────────────────────────────────────────────────────────────────

class RemarkCreate(BaseModel):
    student_id: str
    student_name: str
    title: str
    content: str
    type: RemarkType = RemarkType.information

class RemarkOut(RemarkCreate):
    id: str
    class_id: str
    date: datetime
    student: StudentOut
    model_config = ConfigDict(from_attributes=True)
