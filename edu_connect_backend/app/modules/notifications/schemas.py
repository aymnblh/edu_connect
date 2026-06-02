from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import List, Optional, Any
from app.models import UserRole, AttendanceStatus, RemarkType, ConversationType

class NotificationOut(BaseModel):
    id: str
    title: str
    content: str
    type: str
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceOut(BaseModel):
    notification_type: str
    in_app_enabled: bool
    push_enabled: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled: bool | None = None
    push_enabled: bool | None = None
