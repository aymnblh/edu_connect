from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import assert_class_read_access
from app.core.audit import record_audit_event
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import ClassMember, Student, StudentParent, User, UserRole
from app.modules.health.models import StudentHealthRecord

router = APIRouter(tags=["Student health"])

ADMIN_ROLES = {UserRole.principal, UserRole.secretary}
PHONE_PATTERN = r"^\+?[0-9][0-9 .-]{5,24}$"
# Fields whose names (never values) are written to the audit log on change.
FIELDS = (
    "emergency_contacts",
    "allergies",
    "conditions",
    "medications",
    "blood_group",
    "doctor_name",
    "doctor_phone",
    "emergency_instructions",
    "teacher_alert",
)


class EmergencyContact(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    relationship: str = Field(default="", max_length=60)
    phone: str = Field(pattern=PHONE_PATTERN)


class HealthRecordIn(BaseModel):
    emergency_contacts: list[EmergencyContact] = Field(default_factory=list, max_length=4)
    allergies: str | None = Field(default=None, max_length=2000)
    conditions: str | None = Field(default=None, max_length=2000)
    medications: str | None = Field(default=None, max_length=2000)
    blood_group: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] | None = None
    doctor_name: str | None = Field(default=None, max_length=120)
    doctor_phone: str | None = Field(default=None, pattern=PHONE_PATTERN)
    emergency_instructions: str | None = Field(default=None, max_length=2000)
    teacher_alert: str | None = Field(default=None, max_length=200)
    # Parent: "I agree to the school keeping this health information".
    # School: "the parent's written consent is on file".
    consent: bool = False


class HealthRecordOut(BaseModel):
    exists: bool
    student_id: str
    emergency_contacts: list[EmergencyContact] = []
    allergies: str | None = None
    conditions: str | None = None
    medications: str | None = None
    blood_group: str | None = None
    doctor_name: str | None = None
    doctor_phone: str | None = None
    emergency_instructions: str | None = None
    teacher_alert: str | None = None
    consent_given_at: datetime | None = None
    consent_method: str | None = None
    updated_at: datetime | None = None


class HealthAlertOut(BaseModel):
    student_id: str
    student_name: str
    alert: str


def _clean(value: str | None) -> str | None:
    value = (value or "").strip()
    return value or None


def _out(student_id: str, record: StudentHealthRecord | None) -> HealthRecordOut:
    if record is None:
        return HealthRecordOut(exists=False, student_id=student_id)
    return HealthRecordOut(
        exists=True,
        student_id=student_id,
        emergency_contacts=[EmergencyContact(**contact) for contact in record.emergency_contacts or []],
        **{field: getattr(record, field) for field in FIELDS if field != "emergency_contacts"},
        consent_given_at=record.consent_given_at,
        consent_method=record.consent_method,
        updated_at=record.updated_at,
    )


async def _student_for_health(student_id: str, user: User, db: AsyncSession) -> Student:
    """The student, if ``user`` may read and edit the full health record."""
    if user.role not in ADMIN_ROLES | {UserRole.parent}:
        raise HTTPException(status_code=403, detail="Fiche sante reservee a l'administration et aux parents.")
    student = await db.get(Student, student_id)
    if not student or student.school_id != user.school_id:
        raise HTTPException(status_code=404, detail="Eleve introuvable.")
    if user.role == UserRole.parent:
        link = await db.execute(
            select(StudentParent.student_id).where(
                StudentParent.school_id == student.school_id,
                StudentParent.student_id == student_id,
                StudentParent.parent_id == user.id,
            )
        )
        if link.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Eleve introuvable.")
    return student


async def _audit(db, request: Request, user: User, action: str, student: Student, metadata: dict | None = None):
    await record_audit_event(
        db,
        action=action,
        actor=user,
        school_id=student.school_id,
        resource_type="student",
        resource_id=student.id,
        method=request.method,
        path=request.url.path,
        metadata=metadata,
    )


@router.get("/students/{student_id}/health", response_model=HealthRecordOut)
async def get_health_record(
    student_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    student = await _student_for_health(student_id, current_user, db)
    record = await db.get(StudentHealthRecord, student_id)
    if record is not None and current_user.role in ADMIN_ROLES:
        # Every staff look at sensitive data leaves a trace.
        await _audit(db, request, current_user, "health.viewed", student)
        await db.commit()
    return _out(student_id, record)


@router.put("/students/{student_id}/health", response_model=HealthRecordOut)
async def save_health_record(
    student_id: str,
    payload: HealthRecordIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    student = await _student_for_health(student_id, current_user, db)
    record = await db.get(StudentHealthRecord, student_id)
    if record is None and not payload.consent:
        raise HTTPException(
            status_code=400,
            detail="Le consentement du parent est requis avant d'enregistrer des informations de sante.",
        )

    now = datetime.now(timezone.utc)
    values = {
        "emergency_contacts": [contact.model_dump() for contact in payload.emergency_contacts],
        "allergies": _clean(payload.allergies),
        "conditions": _clean(payload.conditions),
        "medications": _clean(payload.medications),
        "blood_group": payload.blood_group,
        "doctor_name": _clean(payload.doctor_name),
        "doctor_phone": _clean(payload.doctor_phone),
        "emergency_instructions": _clean(payload.emergency_instructions),
        "teacher_alert": _clean(payload.teacher_alert),
    }
    if record is None:
        record = StudentHealthRecord(student_id=student_id, school_id=student.school_id)
        db.add(record)
        changed = [field for field, value in values.items() if value]
    else:
        changed = [field for field, value in values.items() if getattr(record, field) != value]
    for field, value in values.items():
        setattr(record, field, value)
    if payload.consent:
        record.consent_given_at = now
        record.consent_by = current_user.id
        record.consent_method = "app" if current_user.role == UserRole.parent else "paper"
    record.updated_at = now
    record.updated_by = current_user.id

    await _audit(
        db, request, current_user, "health.updated", student,
        {"fields": sorted(changed), "consent_method": record.consent_method},
    )
    await db.commit()
    return _out(student_id, record)


@router.delete("/students/{student_id}/health")
async def delete_health_record(
    student_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Withdraw consent (parent) or erase the sheet (school): the record is deleted."""
    student = await _student_for_health(student_id, current_user, db)
    record = await db.get(StudentHealthRecord, student_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Aucune fiche sante.")
    await db.delete(record)
    await _audit(db, request, current_user, "health.deleted", student)
    await db.commit()
    return {"status": "deleted"}


@router.get("/classes/{class_id}/health-alerts", response_model=list[HealthAlertOut])
async def class_health_alerts(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Short alerts only (e.g. "allergic to peanuts") for the class's teachers and admins."""
    if current_user.role not in ADMIN_ROLES | {UserRole.teacher}:
        raise HTTPException(status_code=403, detail="Not authorized")
    cls = await assert_class_read_access(class_id, current_user, db)
    rows = await db.execute(
        select(Student.id, Student.full_name, StudentHealthRecord.teacher_alert)
        .join(ClassMember, ClassMember.student_id == Student.id)
        .join(StudentHealthRecord, StudentHealthRecord.student_id == Student.id)
        .where(
            ClassMember.class_id == class_id,
            ClassMember.school_id == cls.school_id,
            Student.school_id == cls.school_id,
            Student.archived_at.is_(None),
            StudentHealthRecord.school_id == cls.school_id,
            StudentHealthRecord.teacher_alert.is_not(None),
        )
        .order_by(Student.full_name)
    )
    return [HealthAlertOut(student_id=row[0], student_name=row[1], alert=row[2]) for row in rows.all()]
