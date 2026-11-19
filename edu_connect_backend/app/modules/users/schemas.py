from urllib.parse import urlparse
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from datetime import datetime
from typing import List, Optional, Any
from app.models import UserRole, AttendanceStatus, RemarkType, ConversationType

class PushTokenRequest(BaseModel):
    token: str | None = Field(default=None, max_length=128)
    push_token: str | None = Field(default=None, max_length=128)

class PushDeviceRequest(BaseModel):
    token: str = Field(min_length=20, max_length=512)
    platform: str = Field(default="unknown", max_length=20)

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
    # True for the shared, read-only public demo accounts.
    is_demo: bool = False
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    phone: str | None = Field(default=None, max_length=40)
    avatar_url: str | None = Field(default=None, max_length=2048)

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if any(ch.isspace() or ord(ch) < 32 for ch in cleaned):
            raise ValueError("Avatar URL contains invalid characters.")
        parsed = urlparse(cleaned)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("Avatar URL must use an explicit https:// URL.")
        return cleaned

# ─── Students ─────────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    full_name: str
    school_id: str

class StudentOut(BaseModel):
    id: str
    school_id: str
    student_id: str | None = None
    full_name: str
    created_at: datetime
    archived_at: datetime | None = None
    archive_reason: str | None = None
    archived_by: str | None = None
    model_config = ConfigDict(from_attributes=True)


class StudentAdminOut(StudentOut):
    """PINs are returned only from the authenticated administration view."""
    linking_pin: str | None = None

class TeacherSimpleOut(BaseModel):
    id: str
    full_name: str
    email: str
    model_config = ConfigDict(from_attributes=True)

