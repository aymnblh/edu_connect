"""
Schedule / Planning Router
==========================
Manages the weekly timetable (ScheduleSlot) and session cancellations.

Authorization:
  - Principal / Secretary  → full CRUD on schedule slots
  - Teacher                → can cancel their own sessions only
  - Parent                 → read-only access to their children's schedules
  - All authenticated      → GET endpoints (filtered by role)

Notifications:
  - Slot created     → parents of the class are notified
  - Slot updated     → parents notified
  - Slot deleted     → parents notified
  - Session cancelled → parents notified with date + reason
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, field_validator

from app.db.database import get_db
from app.models import (
    ScheduleSlot, SessionCancellation,
    Class, ClassMember, Student, StudentParent,
    User, UserRole
)
from app.core.access import assert_class_read_access
from app.core.security import get_current_user
from app.utils.notifications import create_notification

router = APIRouter(prefix="/schedule", tags=["Schedule / Planning"])

DAY_NAMES_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class SlotCreate(BaseModel):
    class_id: str
    course_name: str
    teacher_id: str
    day_of_week: int          # 0=Mon … 6=Sun
    start_time: str           # "HH:MM"
    end_time: str             # "HH:MM"
    room: Optional[str] = None

    @field_validator("day_of_week")
    @classmethod
    def valid_day(cls, v: int) -> int:
        if not (0 <= v <= 6):
            raise ValueError("day_of_week doit être entre 0 (Lundi) et 6 (Dimanche)")
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def valid_time(cls, v: str) -> str:
        parts = v.split(":")
        if len(parts) != 2 or not all(p.isdigit() for p in parts):
            raise ValueError("Le format de l'heure doit être HH:MM")
        return v


class SlotUpdate(BaseModel):
    course_name: Optional[str] = None
    teacher_id: Optional[str] = None
    day_of_week: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None


class CancellationCreate(BaseModel):
    cancelled_date: str       # "YYYY-MM-DD"
    reason: Optional[str] = None

    @field_validator("cancelled_date")
    @classmethod
    def valid_date(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Le format de la date doit être YYYY-MM-DD")
        return v


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


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _notify_class_parents(
    db: AsyncSession,
    class_id: str,
    school_id: str,
    title: str,
    content: str,
    notif_type: str = "INFO",
):
    """Send an in-app notification to all parents of students in a class."""
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
        await create_notification(db, user_id=parent.id, title=title, content=content, type=notif_type, school_id=school_id)


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
        raise HTTPException(status_code=404, detail="Créneau introuvable.")
    return slot


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/", response_model=SlotOut, status_code=status.HTTP_201_CREATED)
async def create_slot(
    payload: SlotCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Principal/Secretary only: Add a slot to the weekly timetable."""
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Seule la direction peut gérer le planning.")

    # Verify class belongs to user's school
    cls_res = await db.execute(
        select(Class).where(
            Class.id == payload.class_id,
            Class.school_id == current_user.school_id,
        )
    )
    cls = cls_res.scalar_one_or_none()
    if not cls or cls.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Classe introuvable dans cet établissement.")

    # Verify teacher exists and belongs to this school
    teacher_res = await db.execute(
        select(User).where(
            User.id == payload.teacher_id,
            User.school_id == current_user.school_id,
            User.role == UserRole.teacher,
        )
    )
    teacher = teacher_res.scalar_one_or_none()
    if not teacher or teacher.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Enseignant introuvable dans cet établissement.")

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

    # Notify parents
    day = DAY_NAMES_FR[payload.day_of_week]
    await _notify_class_parents(
        db, payload.class_id, current_user.school_id,
        title="Nouveau créneau ajouté",
        content=(
            f"La direction a ajouté un cours de {payload.course_name} "
            f"le {day} de {payload.start_time} à {payload.end_time}"
            + (f" (salle {payload.room})" if payload.room else "") + "."
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
    """
    Get the full weekly timetable for a class, sorted by day then start_time.
    - Principal / Secretary / Teacher : direct access
    - Parent : only if their child is in this class
    """
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
    return [_build_slot_out(s) for s in slots]


@router.put("/{slot_id}", response_model=SlotOut)
async def update_slot(
    slot_id: str,
    payload: SlotUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Principal/Secretary only: Modify an existing slot. Notifies parents."""
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Seule la direction peut modifier le planning.")

    slot = await _load_slot(db, slot_id, school_id=current_user.school_id)
    if slot.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Accès refusé.")

    changes: list[str] = []
    if payload.course_name and payload.course_name != slot.course_name:
        changes.append(f"matière : {slot.course_name} → {payload.course_name}")
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
        changes.append("enseignant modifié")
    if payload.day_of_week is not None and payload.day_of_week != slot.day_of_week:
        changes.append(f"jour : {DAY_NAMES_FR[slot.day_of_week]} → {DAY_NAMES_FR[payload.day_of_week]}")
        slot.day_of_week = payload.day_of_week
    if payload.start_time and payload.start_time != slot.start_time:
        changes.append(f"heure début : {slot.start_time} → {payload.start_time}")
        slot.start_time = payload.start_time
    if payload.end_time and payload.end_time != slot.end_time:
        changes.append(f"heure fin : {slot.end_time} → {payload.end_time}")
        slot.end_time = payload.end_time
    if payload.room is not None:
        slot.room = payload.room

    slot.updated_at = datetime.now(timezone.utc)
    await db.commit()

    if changes:
        await _notify_class_parents(
            db, slot.class_id, slot.school_id,
            title="📅 Planning modifié",
            content=(
                f"Le cours de {slot.course_name} a été modifié par la direction. "
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
    """Principal/Secretary only: Remove a slot from the timetable. Notifies parents."""
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Seule la direction peut supprimer un créneau.")

    slot = await _load_slot(db, slot_id, school_id=current_user.school_id)
    if slot.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Accès refusé.")

    class_id = slot.class_id
    course_name = slot.course_name
    day_name = DAY_NAMES_FR[slot.day_of_week]
    start_time = slot.start_time

    await db.delete(slot)
    await db.commit()

    await _notify_class_parents(
        db, class_id, slot.school_id,
        title="❌ Créneau supprimé",
        content=(
            f"Le cours de {course_name} du {day_name} à {start_time} "
            f"a été retiré du planning par la direction."
        ),
        notif_type="WARNING",
    )
    await db.commit()
    return {"status": "success", "message": "Créneau supprimé."}


@router.post("/{slot_id}/cancel", response_model=CancellationOut, status_code=201)
async def cancel_session(
    slot_id: str,
    payload: CancellationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Teacher cancels a specific session date for their slot.
    Principal/Secretary can cancel any slot in their school.
    Notifies all parents of the class automatically.
    """
    slot = await _load_slot(db, slot_id, school_id=current_user.school_id)
    if slot.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Accès refusé.")

    # Teacher must own this slot
    if current_user.role == UserRole.teacher:
        if slot.teacher_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Vous ne pouvez annuler que vos propres séances."
            )
    elif current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Non autorisé.")

    # Prevent duplicate cancellation for same slot + date
    existing_res = await db.execute(
        select(SessionCancellation).where(
            SessionCancellation.school_id == slot.school_id,
            SessionCancellation.slot_id == slot_id,
            SessionCancellation.cancelled_date == payload.cancelled_date,
        )
    )
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"La séance du {payload.cancelled_date} est déjà annulée."
        )

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

    # Notify parents
    reason_text = f" Motif : {payload.reason}." if payload.reason else ""
    day_name = DAY_NAMES_FR[slot.day_of_week]
    await _notify_class_parents(
        db, slot.class_id, slot.school_id,
        title=f"⚠️ Cours annulé — {slot.course_name}",
        content=(
            f"Le cours de {slot.course_name} prévu le {payload.cancelled_date} "
            f"({day_name} {slot.start_time}–{slot.end_time}) est annulé.{reason_text}"
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
        raise HTTPException(status_code=403, detail="Accès refusé.")

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
