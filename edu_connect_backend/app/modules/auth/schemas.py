from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import List, Optional, Any
from app.models import UserRole, AttendanceStatus, RemarkType, ConversationType, VerificationStatus

class UserCreate(BaseModel):
    """Profile payload for local EduConnect accounts."""
    id: str
    school_id: str | None = None
    email: EmailStr
    full_name: str
    role: UserRole
    phone: str | None = None

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
    student_id: str
    linking_pin: str

class LinkByQrRequest(BaseModel):
    token: str
    label: Optional[str] = None
