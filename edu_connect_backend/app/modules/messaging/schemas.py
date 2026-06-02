from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import List, Optional, Any
from app.models import UserRole, AttendanceStatus, RemarkType, ConversationType

class MessageOut(BaseModel):
    id: str
    class_id: str
    sender_id: str
    sender_name: str
    content: str
    is_announcement: bool
    recipient_ids: list[str] | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Grades ───────────────────────────────────────────────────────────────────

