from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import List, Optional, Any
from app.models import UserRole, AttendanceStatus, RemarkType, ConversationType

class SchoolSettingsUpdate(BaseModel):
    tenant_config: dict[str, Any]

class StudentRegeneratePin(BaseModel):
    notify: bool = False

class SemesterOut(BaseModel):
    id: str
    name: str
    start_date: datetime
    end_date: datetime
    is_active: bool
    school_id: str
    model_config = ConfigDict(from_attributes=True)

class SemesterUpdate(BaseModel):
    name: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None

class TokenGenerationRequest(BaseModel):
    labels: List[str]
    expires_in_hours: int = Field(default=168, ge=1, le=720)

class ParentLinkAuditOut(BaseModel):
    id: str
    label: str | None = None
    device_platform: str | None = None
    device_fingerprint: str | None = None
    ip_address: str | None = None
    used_at: datetime | None = None
    revoked_at: datetime | None = None
    parent_name: str | None = None
    model_config = ConfigDict(from_attributes=True)

class ClassPerformance(BaseModel):
    class_name: str
    average_score: float

class AnalyticsOverview(BaseModel):
    school_avg: float
    class_performance: List[ClassPerformance]
    adoption_rate: float
    subject_performance: List[dict]
    top_students: List[dict]
    struggling_students: List[dict]
    absence_rate: float

class SchoolRegistration(BaseModel):
    school_name: str
    admin_email: EmailStr
    admin_full_name: str
    admin_password: str
    terms_accepted: bool = False

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

