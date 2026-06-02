from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import List, Optional, Any
from app.models import UserRole, AttendanceStatus, RemarkType, ConversationType
from app.modules.users.schemas import StudentOut

class JustifyRequest(BaseModel):
    justification: str
    attachment_url: str | None = None

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
    justification_attachment_url: str | None = None
    student: StudentOut
    model_config = ConfigDict(from_attributes=True)

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

