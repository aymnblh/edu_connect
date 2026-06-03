"""
Schedule / Planning Router
==========================
Manages the weekly timetable, one-off exam events, and session cancellations.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.access import assert_class_read_access, assert_class_write_access
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import (
    Class,
    ClassCourse,
    ClassMember,
    ScheduleExam,
    ScheduleSlot,
    SessionCancellation,
    StudentParent,
    User,
    UserRole,
)
from app.utils.notifications import create_notification

router = APIRouter(prefix="/schedule", tags=["Schedule / Planning"])

DAY_NAMES_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]


def _valid_time_string(value: str) -> str:
    parts = value.split(":")
    if len(parts) != 2 or not all(part.isdigit() for part in parts):
        raise ValueError("Le format de l'heure doit etre HH:MM")
    hours, minutes = (int(part) for part in parts)
    if not (0 <= hours <= 23 and 0 <= minutes <= 59):
        raise ValueError("Le format de l'heure doit etre HH:MM")
    return f"{hours:02d}:{minutes:02d}"


def _valid_date_string(value: str) -> str:
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        raise ValueError("Le format de la date doit etre YYYY-MM-DD")
    return value


def _date_label(value: str) -> str:
    try:
        return datetime.strptime(value, "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        return value


class SlotCreate(BaseModel):
    class_id: str
    course_name: str
    teacher_id: str
    day_of_week: int
    start_time: str
    end_time: str
    room: Optional[str] = None

    @field_validator("day_of_week")
    @classmethod
    def valid_day(cls, value: int) -> int:
        if not (0 <= value <= 6):
            raise ValueError("day_of_week doit etre entre 0 (Lundi) et 6 (Dimanche)")
        return value

    @field_validator("start_time", "end_time")
    @classmethod
    def valid_time(cls, value: str) -> str:
        return _valid_time_string(value)

    @model_validator(mode="after")
    def valid_time_range(self):
        if self.start_time >= self.end_time:
            raise ValueError("L'heure de fin doit etre apres l'heure de debut")
        return self


class SlotUpdate(BaseModel):
    course_name: Optional[str] = None
    teacher_id: Optional[str] = None
    day_of_week: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None

    @field_validator("day_of_week")
    @classmethod
    def valid_optional_day(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and not (0 <= value <= 6):
            raise ValueError("day_of_week doit etre entre 0 (Lundi) et 6 (Dimanche)")
        return value

    @field_validator("start_time", "end_time")
    @classmethod
    def valid_optional_time(cls, value: Optional[str]) -> Optional[str]:
        return _valid_time_string(value) if value else value


class CancellationCreate(BaseModel):
    cancelled_date: str
    reason: Optional[str] = None

    @field_validator("cancelled_date")
    @classmethod
    def valid_date(cls, value: str) -> str:
        return _valid_date_string(value)


class CancellationOut(BaseModel):
    id: str
    slot_id: str
    cancelled_date: str
    reason: Optional[str]
    cancelled_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SlotOut(BaseModel):
    id: str
    school_id: str
    class_id: str
    course_name: str
    teacher_id: str
    teacher_name: Optional[str] = None
    day_of_week: int
    day_name: str = ""
    start_time: str
    end_time: str
    room: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime
    cancellations: list[CancellationOut] = []

    model_config = {"from_attributes": True}


class ExamCreate(BaseModel):
    class_id: str
    course_id: Optional[str] = None
    course_name: str
    exam_date: str
    start_time: str
    end_time: str
    room: Optional[str] = None
    description: Optional[str] = None

    @field_validator("course_name")
    @classmethod
    def valid_course_name(cls, value: str) -> str:
        normalized = " ".join(value.strip().split())
        if not normalized:
            raise ValueError("Le module est obligatoire")
        return normalized

    @field_validator("exam_date")
    @classmethod
    def valid_exam_date(cls, value: str) -> str:
        return _valid_date_string(value)

    @field_validator("start_time", "end_time")
    @classmethod
    def valid_exam_time(cls, value: str) -> str:
        return _valid_time_string(value)

    @field_validator("room", "description")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = " ".join(value.strip().split())
        return normalized or None

    @model_validator(mode="after")
    def valid_exam_time_range(self):
        if self.start_time >= self.end_time:
            raise ValueError("L'heure de fin doit etre apres l'heure de debut")
        return self


class ExamOut(BaseModel):
    id: str
    school_id: str
    class_id: str
    course_id: Optional[str] = None
    course_name: str
    exam_date: str
    start_time: str
    end_time: str
    room: Optional[str] = None
    description: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


async def _notify_class_parents(
    db: AsyncSession,
    class_id: str,
    school_id: str,
    title: str,
    content: str,
    notif_type: str = "INFO",
) -> None:
    parents_res = await db.execute(
        select(User)
        .join(StudentParent, StudentParent.parent_id == User.id)
        .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
        .where(
            ClassMember.school_id == school_id,
            ClassMember.class_id == class_id,
            StudentParent.school_id == school_id,
            User.school_id == school_id,
        )
        .distinct()
    )
    parents = parents_res.scalars().all()
    for parent in parents:
        await create_notification(
            db,
            user_id=parent.id,
            title=title,
            content=content,
            type=notif_type,
            school_id=school_id,
        )


def _build_slot_out(slot: ScheduleSlot) -> SlotOut:
    return SlotOut(
        id=slot.id,
        school_id=slot.school_id,
        class_id=slot.class_id,
        course_name=slot.course_name,
        teacher_id=slot.teacher_id,
        teacher_name=slot.teacher.full_name if slot.teacher else None,
        day_of_week=slot.day_of_week,
        day_name=DAY_NAMES_FR[slot.day_of_week] if 0 <= slot.day_of_week <= 6 else "",
        start_time=slot.start_time,
        end_time=slot.end_time,
        room=slot.room,
        created_by=slot.created_by,
        created_at=slot.created_at,
        updated_at=slot.updated_at,
        cancellations=[
            CancellationOut(
                id=c.id,
                slot_id=c.slot_id,
                cancelled_date=c.cancelled_date,
                reason=c.reason,
                cancelled_by=c.cancelled_by,
                created_at=c.created_at,
            )
            for c in slot.cancellations
        ],
    )


def _build_exam_out(exam: ScheduleExam) -> ExamOut:
    return ExamOut(
        id=exam.id,
        school_id=exam.school_id,
        class_id=exam.class_id,
        course_id=exam.course_id,
        course_name=exam.course_name,
        exam_date=exam.exam_date,
        start_time=exam.start_time,
        end_time=exam.end_time,
        room=exam.room,
        description=exam.description,
        created_by=exam.created_by,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
    )


async def _load_slot(db: AsyncSession, slot_id: str, *, school_id: str | None = None) -> ScheduleSlot:
    stmt = select(ScheduleSlot).where(ScheduleSlot.id == slot_id)
    if school_id:
        stmt = stmt.where(ScheduleSlot.school_id == school_id)

    res = await db.execute(
        stmt.options(
            selectinload(ScheduleSlot.teacher),
            selectinload(ScheduleSlot.cancellations),
        )
    )
    slot = res.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Creneau introuvable.")
    return slot


@router.post("/", response_model=SlotOut, status_code=status.HTTP_201_CREATED)
async def create_slot(
    payload: SlotCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Principal/Secretary only: add a slot to the weekly timetable."""
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Seule la direction peut gerer le planning.")

    cls_res = await db.execute(
        select(Class).where(
            Class.id == payload.class_id,
            Class.school_id == current_user.school_id,
        )
    )
    cls = cls_res.scalar_one_or_none()
    if not cls or cls.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Classe introuvable dans cet etablissement.")

    teacher_res = await db.execute(
        select(User).where(
            User.id == payload.teacher_id,
            User.school_id == current_user.school_id,
            User.role == UserRole.teacher,
        )
    )
    teacher = teacher_res.scalar_one_or_none()
    if not teacher or teacher.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Enseignant introuvable dans cet etablissement.")

    slot = ScheduleSlot(
        id=str(uuid.uuid4()),
        school_id=current_user.school_id,
        class_id=payload.class_id,
        course_name=payload.course_name,
        teacher_id=payload.teacher_id,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room,
        created_by=current_user.id,
    )
    db.add(slot)
    await db.commit()

    day = DAY_NAMES_FR[payload.day_of_week]
    await _notify_class_parents(
        db,
        payload.class_id,
        current_user.school_id,
        title="Nouveau creneau ajoute",
        content=(
            f"La direction a ajoute un cours de {payload.course_name} "
            f"le {day} de {payload.start_time} a {payload.end_time}"
            + (f" (salle {payload.room})" if payload.room else "")
            + "."
        ),
        notif_type="INFO",
    )
    await db.commit()

    slot = await _load_slot(db, slot.id, school_id=current_user.school_id)
    return _build_slot_out(slot)


@router.get("/class/{class_id}", response_model=list[SlotOut])
async def get_class_schedule(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_read_access(class_id, current_user, db)

    slots_res = await db.execute(
        select(ScheduleSlot)
        .where(ScheduleSlot.school_id == cls.school_id, ScheduleSlot.class_id == class_id)
        .options(
            selectinload(ScheduleSlot.teacher),
            selectinload(ScheduleSlot.cancellations),
        )
        .order_by(ScheduleSlot.day_of_week, ScheduleSlot.start_time)
    )
    slots = slots_res.scalars().all()
    return [_build_slot_out(slot) for slot in slots]


@router.post("/exams", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
async def create_exam(
    payload: ExamCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Teacher/Admin: plan a one-off exam for a class and notify parents."""
    cls = await assert_class_write_access(payload.class_id, current_user, db)

    if payload.course_id:
        course_res = await db.execute(
            select(ClassCourse).where(
                ClassCourse.school_id == cls.school_id,
                ClassCourse.class_id == payload.class_id,
                ClassCourse.course_id == payload.course_id,
            )
        )
        if not course_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Module introuvable pour cette classe.")

    exam = ScheduleExam(
        id=str(uuid.uuid4()),
        school_id=cls.school_id,
        class_id=payload.class_id,
        course_id=payload.course_id,
        course_name=payload.course_name,
        exam_date=payload.exam_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room,
        description=payload.description,
        created_by=current_user.id,
    )
    db.add(exam)
    await db.flush()

    details = (
        f"Un examen de {payload.course_name} est planifie le {_date_label(payload.exam_date)} "
        f"de {payload.start_time} a {payload.end_time}"
        + (f" en salle {payload.room}" if payload.room else "")
        + "."
    )
    if payload.description:
        details = f"{details} {payload.description}"
    await _notify_class_parents(
        db,
        payload.class_id,
        cls.school_id,
        title=f"Examen planifie - {payload.course_name}",
        content=details,
        notif_type="INFO",
    )
    await db.commit()
    await db.refresh(exam)
    return _build_exam_out(exam)


@router.get("/class/{class_id}/exams", response_model=list[ExamOut])
async def list_class_exams(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_class_read_access(class_id, current_user, db)

    exams_res = await db.execute(
        select(ScheduleExam)
        .where(ScheduleExam.school_id == cls.school_id, ScheduleExam.class_id == class_id)
        .order_by(ScheduleExam.exam_date.asc(), ScheduleExam.start_time.asc())
    )
    return [_build_exam_out(exam) for exam in exams_res.scalars().all()]


@router.put("/{slot_id}", response_model=SlotOut)
async def update_slot(
    slot_id: str,
    payload: SlotUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Principal/Secretary only: modify an existing slot and notify parents."""
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Seule la direction peut modifier le planning.")

    slot = await _load_slot(db, slot_id, school_id=current_user.school_id)
    if slot.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Acces refuse.")

    next_start_time = payload.start_time or slot.start_time
    next_end_time = payload.end_time or slot.end_time
    if next_start_time >= next_end_time:
        raise HTTPException(status_code=422, detail="L'heure de fin doit etre apres l'heure de debut.")

    changes: list[str] = []
    if payload.course_name and payload.course_name != slot.course_name:
        changes.append(f"matiere : {slot.course_name} -> {payload.course_name}")
        slot.course_name = payload.course_name
    if payload.teacher_id and payload.teacher_id != slot.teacher_id:
        teacher_res = await db.execute(
            select(User).where(
                User.id == payload.teacher_id,
                User.school_id == current_user.school_id,
                User.role == UserRole.teacher,
            )
        )
        if not teacher_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Enseignant introuvable dans cet etablissement.")
        slot.teacher_id = payload.teacher_id
        changes.append("enseignant modifie")
    if payload.day_of_week is not None and payload.day_of_week != slot.day_of_week:
        changes.append(f"jour : {DAY_NAMES_FR[slot.day_of_week]} -> {DAY_NAMES_FR[payload.day_of_week]}")
        slot.day_of_week = payload.day_of_week
    if payload.start_time and payload.start_time != slot.start_time:
        changes.append(f"heure debut : {slot.start_time} -> {payload.start_time}")
        slot.start_time = payload.start_time
    if payload.end_time and payload.end_time != slot.end_time:
        changes.append(f"heure fin : {slot.end_time} -> {payload.end_time}")
        slot.end_time = payload.end_time
    if payload.room is not None:
        slot.room = payload.room

    slot.updated_at = datetime.now(timezone.utc)
    await db.commit()

    if changes:
        await _notify_class_parents(
            db,
            slot.class_id,
            slot.school_id,
            title="Planning modifie",
            content=(
                f"Le cours de {slot.course_name} a ete modifie par la direction. "
                f"Changements : {', '.join(changes)}."
            ),
            notif_type="WARNING",
        )
        await db.commit()

    slot = await _load_slot(db, slot_id, school_id=current_user.school_id)
    return _build_slot_out(slot)


@router.delete("/{slot_id}", status_code=status.HTTP_200_OK)
async def delete_slot(
    slot_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Principal/Secretary only: remove a slot from the timetable."""
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Seule la direction peut supprimer un creneau.")

    slot = await _load_slot(db, slot_id, school_id=current_user.school_id)
    if slot.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Acces refuse.")

    class_id = slot.class_id
    course_name = slot.course_name
    day_name = DAY_NAMES_FR[slot.day_of_week]
    start_time = slot.start_time
    school_id = slot.school_id

    await db.delete(slot)
    await db.commit()

    await _notify_class_parents(
        db,
        class_id,
        school_id,
        title="Creneau supprime",
        content=(
            f"Le cours de {course_name} du {day_name} a {start_time} "
            f"a ete retire du planning par la direction."
        ),
        notif_type="WARNING",
    )
    await db.commit()
    return {"status": "success", "message": "Creneau supprime."}


@router.post("/{slot_id}/cancel", response_model=CancellationOut, status_code=201)
async def cancel_session(
    slot_id: str,
    payload: CancellationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Teacher or administration: cancel one session date and notify parents."""
    slot = await _load_slot(db, slot_id, school_id=current_user.school_id)
    if slot.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Acces refuse.")

    if current_user.role == UserRole.teacher:
        if slot.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez annuler que vos propres seances.")
    elif current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Non autorise.")

    existing_res = await db.execute(
        select(SessionCancellation).where(
            SessionCancellation.school_id == slot.school_id,
            SessionCancellation.slot_id == slot_id,
            SessionCancellation.cancelled_date == payload.cancelled_date,
        )
    )
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"La seance du {payload.cancelled_date} est deja annulee.")

    cancellation = SessionCancellation(
        id=str(uuid.uuid4()),
        school_id=current_user.school_id,
        slot_id=slot_id,
        cancelled_date=payload.cancelled_date,
        reason=payload.reason,
        cancelled_by=current_user.id,
    )
    db.add(cancellation)
    await db.commit()

    reason_text = f" Motif : {payload.reason}." if payload.reason else ""
    day_name = DAY_NAMES_FR[slot.day_of_week]
    await _notify_class_parents(
        db,
        slot.class_id,
        slot.school_id,
        title=f"Cours annule - {slot.course_name}",
        content=(
            f"Le cours de {slot.course_name} prevu le {payload.cancelled_date} "
            f"({day_name} {slot.start_time}-{slot.end_time}) est annule.{reason_text}"
        ),
        notif_type="WARNING",
    )
    await db.commit()
    await db.refresh(cancellation)

    return CancellationOut(
        id=cancellation.id,
        slot_id=cancellation.slot_id,
        cancelled_date=cancellation.cancelled_date,
        reason=cancellation.reason,
        cancelled_by=cancellation.cancelled_by,
        created_at=cancellation.created_at,
    )


@router.get("/{slot_id}/cancellations", response_model=list[CancellationOut])
async def list_cancellations(
    slot_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all cancellations for a specific slot."""
    slot = await _load_slot(db, slot_id, school_id=current_user.school_id)
    if slot.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Acces refuse.")

    res = await db.execute(
        select(SessionCancellation)
        .where(
            SessionCancellation.school_id == slot.school_id,
            SessionCancellation.slot_id == slot_id,
        )
        .order_by(SessionCancellation.cancelled_date.desc())
    )
    return [
        CancellationOut(
            id=c.id,
            slot_id=c.slot_id,
            cancelled_date=c.cancelled_date,
            reason=c.reason,
            cancelled_by=c.cancelled_by,
            created_at=c.created_at,
        )
        for c in res.scalars().all()
    ]
