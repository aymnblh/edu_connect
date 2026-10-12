import uuid
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import and_, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import Class, ClassMember, ClassTeacher, Student, StudentParent, User, UserRole
from app.modules.meetings.models import MeetingSlot
from app.modules.schools.calendar import ALGERIA_TZ
from app.utils.notifications import create_notification

router = APIRouter(prefix="/meetings", tags=["Parent-teacher meetings"])

ADMIN_ROLES = {UserRole.principal, UserRole.secretary}
MAX_SLOTS_PER_BATCH = 40


class SlotBatchCreate(BaseModel):
    date: date
    start_time: time
    end_time: time
    slot_minutes: int = Field(default=15, ge=5, le=120)
    location: str | None = Field(default=None, max_length=120)
    class_id: str | None = None

    @model_validator(mode="after")
    def check_range(self):
        start = datetime.combine(self.date, self.start_time)
        end = datetime.combine(self.date, self.end_time)
        if end <= start:
            raise ValueError("L'heure de fin doit suivre l'heure de debut.")
        if (end - start) // timedelta(minutes=self.slot_minutes) > MAX_SLOTS_PER_BATCH:
            raise ValueError(f"{MAX_SLOTS_PER_BATCH} creneaux maximum a la fois.")
        return self


class BookRequest(BaseModel):
    student_id: str
    note: str | None = Field(default=None, max_length=500)


class SlotOut(BaseModel):
    id: str
    teacher_id: str
    teacher_name: str | None
    class_id: str | None
    class_name: str | None
    starts_at: datetime
    ends_at: datetime
    location: str | None
    is_booked: bool
    booked_by_me: bool
    # Booking details: only for the teacher, school admins and the booking parent.
    parent_name: str | None = None
    student_id: str | None = None
    student_name: str | None = None
    note: str | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _local(moment: datetime) -> str:
    return moment.astimezone(ALGERIA_TZ).strftime("%d/%m/%Y a %H:%M")


def _school(user: User) -> str:
    if not user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")
    return user.school_id


async def _names(db: AsyncSession, model, ids: set[str], column) -> dict[str, str]:
    ids = {value for value in ids if value}
    if not ids:
        return {}
    rows = (await db.execute(select(model.id, column).where(model.id.in_(sorted(ids))))).all()
    return {row[0]: row[1] for row in rows}


async def _serialize(db: AsyncSession, slots: list[MeetingSlot], viewer: User) -> list[SlotOut]:
    users = await _names(db, User, {s.teacher_id for s in slots} | {s.parent_id for s in slots}, User.full_name)
    classes = await _names(db, Class, {s.class_id for s in slots}, Class.name)
    students = await _names(db, Student, {s.student_id for s in slots}, Student.full_name)
    out = []
    for slot in slots:
        sees_details = (
            viewer.role in ADMIN_ROLES or slot.teacher_id == viewer.id or slot.parent_id == viewer.id
        )
        out.append(
            SlotOut(
                id=slot.id,
                teacher_id=slot.teacher_id,
                teacher_name=users.get(slot.teacher_id),
                class_id=slot.class_id,
                class_name=classes.get(slot.class_id) if slot.class_id else None,
                starts_at=slot.starts_at,
                ends_at=slot.ends_at,
                location=slot.location,
                is_booked=slot.parent_id is not None,
                booked_by_me=slot.parent_id is not None and slot.parent_id == viewer.id,
                parent_name=users.get(slot.parent_id) if sees_details and slot.parent_id else None,
                student_id=slot.student_id if sees_details else None,
                student_name=students.get(slot.student_id) if sees_details and slot.student_id else None,
                note=slot.note if sees_details else None,
            )
        )
    return out


async def _parent_class_ids(db: AsyncSession, parent: User) -> set[str]:
    rows = await db.execute(
        select(ClassMember.class_id)
        .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
        .where(
            StudentParent.parent_id == parent.id,
            StudentParent.school_id == parent.school_id,
            ClassMember.school_id == parent.school_id,
        )
        .distinct()
    )
    return set(rows.scalars().all())


@router.post("/slots", response_model=list[SlotOut], status_code=201)
async def create_slots(
    payload: SlotBatchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A teacher opens bookable meeting slots for one day."""
    school_id = _school(current_user)
    if current_user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Seuls les enseignants proposent des rendez-vous.")
    if payload.class_id:
        taught = await db.execute(
            select(ClassTeacher.class_id).where(
                ClassTeacher.school_id == school_id,
                ClassTeacher.teacher_id == current_user.id,
                ClassTeacher.class_id == payload.class_id,
            )
        )
        if taught.scalar_one_or_none() is None:
            raise HTTPException(status_code=403, detail="Vous n'enseignez pas dans cette classe.")

    start = datetime.combine(payload.date, payload.start_time, tzinfo=ALGERIA_TZ)
    end = datetime.combine(payload.date, payload.end_time, tzinfo=ALGERIA_TZ)
    if start <= _now():
        raise HTTPException(status_code=400, detail="Les creneaux doivent etre dans le futur.")
    step = timedelta(minutes=payload.slot_minutes)
    bounds = []
    cursor = start
    while cursor + step <= end:
        bounds.append((cursor, cursor + step))
        cursor += step
    if not bounds:
        raise HTTPException(status_code=400, detail="La plage est plus courte qu'un creneau.")

    overlap = await db.execute(
        select(MeetingSlot.id)
        .where(
            MeetingSlot.school_id == school_id,
            MeetingSlot.teacher_id == current_user.id,
            MeetingSlot.starts_at < bounds[-1][1],
            MeetingSlot.ends_at > bounds[0][0],
        )
        .limit(1)
    )
    if overlap.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Vous avez deja des creneaux sur cette plage horaire.")

    slots = [
        MeetingSlot(
            id=str(uuid.uuid4()),
            school_id=school_id,
            teacher_id=current_user.id,
            class_id=payload.class_id,
            starts_at=slot_start,
            ends_at=slot_end,
            location=(payload.location or "").strip() or None,
            created_at=_now(),
        )
        for slot_start, slot_end in bounds
    ]
    for slot in slots:
        db.add(slot)
    await db.commit()
    return await _serialize(db, slots, current_user)


@router.get("/slots", response_model=list[SlotOut])
async def list_slots(
    include_past_days: int = Query(1, ge=0, le=60, description="Also return slots that started this many days ago."),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Teachers: their slots. Admins: the school's. Parents: free or own slots of their children's teachers."""
    school_id = _school(current_user)
    since = _now() - timedelta(days=include_past_days)
    stmt = select(MeetingSlot).where(MeetingSlot.school_id == school_id, MeetingSlot.starts_at >= since)
    if current_user.role == UserRole.teacher:
        stmt = stmt.where(MeetingSlot.teacher_id == current_user.id)
    elif current_user.role == UserRole.parent:
        class_ids = sorted(await _parent_class_ids(db, current_user))
        teachers = (
            select(ClassTeacher.teacher_id)
            .join(User, User.id == ClassTeacher.teacher_id)
            .where(
                ClassTeacher.school_id == school_id,
                ClassTeacher.class_id.in_(class_ids),
                User.deactivated_at.is_(None),
            )
        )
        stmt = stmt.where(
            MeetingSlot.teacher_id.in_(teachers),
            or_(MeetingSlot.class_id.is_(None), MeetingSlot.class_id.in_(class_ids)),
            or_(
                and_(MeetingSlot.parent_id.is_(None), MeetingSlot.starts_at > _now()),
                MeetingSlot.parent_id == current_user.id,
            ),
        )
    elif current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    slots = (await db.execute(stmt.order_by(MeetingSlot.starts_at).limit(500))).scalars().all()
    return await _serialize(db, list(slots), current_user)


async def _slot_in_school(db: AsyncSession, slot_id: str, school_id: str) -> MeetingSlot:
    slot = await db.get(MeetingSlot, slot_id)
    if not slot or slot.school_id != school_id:
        raise HTTPException(status_code=404, detail="Creneau introuvable.")
    return slot


@router.post("/slots/{slot_id}/book", response_model=SlotOut)
async def book_slot(
    slot_id: str,
    payload: BookRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school(current_user)
    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Seuls les parents reservent un rendez-vous.")
    slot = await _slot_in_school(db, slot_id, school_id)
    if slot.starts_at <= _now():
        raise HTTPException(status_code=400, detail="Ce creneau est passe.")

    # The child must be the parent's and be taught by this teacher (in the slot's class if restricted).
    eligible = await db.execute(
        select(ClassMember.class_id)
        .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
        .join(ClassTeacher, ClassTeacher.class_id == ClassMember.class_id)
        .where(
            StudentParent.parent_id == current_user.id,
            StudentParent.student_id == payload.student_id,
            StudentParent.school_id == school_id,
            ClassMember.school_id == school_id,
            ClassTeacher.school_id == school_id,
            ClassTeacher.teacher_id == slot.teacher_id,
            *([ClassMember.class_id == slot.class_id] if slot.class_id else []),
        )
        .limit(1)
    )
    if eligible.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Cet enseignant n'a pas votre enfant dans cette classe.")

    already = await db.execute(
        select(MeetingSlot.id)
        .where(
            MeetingSlot.school_id == school_id,
            MeetingSlot.teacher_id == slot.teacher_id,
            MeetingSlot.student_id == payload.student_id,
            MeetingSlot.starts_at > _now(),
        )
        .limit(1)
    )
    if already.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Vous avez deja un rendez-vous a venir avec cet enseignant pour cet enfant.")

    # Atomic claim: only succeeds if nobody booked the slot in the meantime.
    note = (payload.note or "").strip() or None
    claimed = await db.execute(
        update(MeetingSlot)
        .where(MeetingSlot.id == slot.id, MeetingSlot.school_id == school_id, MeetingSlot.parent_id.is_(None))
        .values(parent_id=current_user.id, student_id=payload.student_id, note=note, booked_at=_now())
        .execution_options(synchronize_session="fetch")
    )
    if not claimed.rowcount:
        raise HTTPException(status_code=409, detail="Ce creneau vient d'etre reserve par un autre parent.")
    slot.parent_id, slot.student_id, slot.note = current_user.id, payload.student_id, note

    student_name = (await _names(db, Student, {payload.student_id}, Student.full_name)).get(payload.student_id, "")
    await create_notification(
        db,
        user_id=slot.teacher_id,
        title="Nouveau rendez-vous",
        content=f"{current_user.full_name} ({student_name}) le {_local(slot.starts_at)}.",
        type="INFO",
        school_id=school_id,
    )
    await db.commit()
    return (await _serialize(db, [slot], current_user))[0]


@router.post("/slots/{slot_id}/cancel", response_model=SlotOut)
async def cancel_booking(
    slot_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Free a booked slot: by the parent who booked it, the teacher or the school administration."""
    school_id = _school(current_user)
    slot = await _slot_in_school(db, slot_id, school_id)
    if slot.parent_id is None:
        raise HTTPException(status_code=400, detail="Ce creneau n'est pas reserve.")
    is_parent = slot.parent_id == current_user.id
    is_owner = slot.teacher_id == current_user.id or current_user.role in ADMIN_ROLES
    if not (is_parent or is_owner):
        raise HTTPException(status_code=403, detail="Not authorized")

    notify_id = slot.teacher_id if is_parent else slot.parent_id
    who = current_user.full_name
    when = _local(slot.starts_at)
    slot.parent_id = slot.student_id = slot.note = slot.booked_at = None
    await create_notification(
        db,
        user_id=notify_id,
        title="Rendez-vous annule",
        content=f"{who} a annule le rendez-vous du {when}.",
        type="WARNING",
        school_id=school_id,
    )
    await db.commit()
    return (await _serialize(db, [slot], current_user))[0]


@router.delete("/slots/{slot_id}")
async def delete_slot(
    slot_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school(current_user)
    slot = await _slot_in_school(db, slot_id, school_id)
    if slot.teacher_id != current_user.id and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    if slot.parent_id:
        await create_notification(
            db,
            user_id=slot.parent_id,
            title="Rendez-vous annule",
            content=f"Le rendez-vous du {_local(slot.starts_at)} a ete annule par l'etablissement.",
            type="WARNING",
            school_id=school_id,
        )
    await db.delete(slot)
    await db.commit()
    return {"status": "deleted"}
