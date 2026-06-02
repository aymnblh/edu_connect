from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import List, Optional, Any
from app.models import UserRole, AttendanceStatus, RemarkType, ConversationType
from app.modules.users.schemas import UserOut, StudentOut

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

class JoinClassRequest(BaseModel):
    join_code: str

class ClassCourseAssign(BaseModel):
    course_id: str
    teacher_id: str
    coefficient: float | None = Field(default=None, gt=0)

class ClassCourseOut(BaseModel):
    class_id: str
    course_id: str
    teacher_id: str
    coefficient: float = 1.0
    course_name: str | None = None
    teacher_name: str | None = None
    model_config = ConfigDict(from_attributes=True)

class ClassStudentEnroll(BaseModel):
    student_ids: list[str]

class GradeCreate(BaseModel):
    student_id: str
    student_name: str
    course_id: str | None = None
    subject: str
    score: float
    max_score: float = 20.0
    comment: str | None = None

class GradeOut(GradeCreate):
    id: str
    class_id: str
    coefficient: float = 1.0
    normalized_score: float = 0.0
    is_approved: bool = False
    approved_by: str | None = None
    approved_at: datetime | None = None
    date: datetime
    student: StudentOut
    model_config = ConfigDict(from_attributes=True)

class GradeApprovalOut(BaseModel):
    status: str
    grade_id: str
    is_approved: bool

class LessonEntryCreate(BaseModel):
    subject: str
    content: str
    homework_summary: str | None = None
    session_date: datetime | None = None
    course_id: str | None = None

class LessonEntryOut(LessonEntryCreate):
    id: str
    school_id: str
    class_id: str
    teacher_id: str | None = None
    created_at: datetime
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

class CourseCreate(BaseModel):
    name: str
    school_id: str | None = None
    coefficient: float = Field(default=1.0, gt=0)

class CourseOut(BaseModel):
    id: str
    name: str
    school_id: str
    coefficient: float = 1.0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


