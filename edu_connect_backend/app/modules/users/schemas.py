from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import List, Optional, Any
from app.models import UserRole, AttendanceStatus, RemarkType, ConversationType

class PushTokenRequest(BaseModel):
    token: str | None = None
    push_token: str | None = None

class UserOut(BaseModel):
    id: str
    school_id: str | None
    email: str
    full_name: str
    role: UserRole
    phone: str | None
    avatar_url: str | None
    push_token: str | None = None
    created_at: datetime
    students_linking: list["StudentOut"] = []
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    phone: str | None = None
    avatar_url: str | None = None

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
    archived_at: datetime | None = None
    archive_reason: str | None = None
    archived_by: str | None = None
    model_config = ConfigDict(from_attributes=True)

class TeacherSimpleOut(BaseModel):
    id: str
    full_name: str
    email: str
    model_config = ConfigDict(from_attributes=True)

