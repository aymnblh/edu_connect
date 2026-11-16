"""School canteen: weekly menus, registrations, the kitchen's daily headcount and monthly billing."""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_event
from app.core.modules import require_module
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import (
    Announcement,
    Attendance,
    AttendanceStatus,
    Class,
    ClassMember,
    School,
    Student,
    StudentParent,
    User,
    UserRole,
)
from app.modules.canteen import logic
from app.modules.canteen.models import CANTEEN_ALLERGENS, CANTEEN_DIETS, CanteenEnrollment, CanteenMenu
from app.modules.finance.fees import bill_students, dec, format_da, money
from app.modules.health.models import StudentHealthRecord
from app.modules.schools.calendar import ALGERIA_TZ
from app.utils.notifications import create_notification

router = APIRouter(prefix="/canteen", tags=["Canteen"])

ADMIN_ROLES = {UserRole.principal, UserRole.secretary}
# Who writes menus and reads the kitchen headcount.
KITCHEN_ROLES = ADMIN_ROLES | {UserRole.canteen}
NOTIFICATION_TYPE = "CANTEEN"
DEFAULT_PRICES = {"monthly_price": "0.00", "daily_price": "0.00"}

Allergen = Literal[CANTEEN_ALLERGENS]  # type: ignore[valid-type]
Diet = Literal[CANTEEN_DIETS]  # type: ignore[valid-type]


# ── Schemas ──────────────────────────────────────────────────────────────────

class MenuIn(BaseModel):
    starter: str | None = Field(default=None, max_length=200)
    main: str = Field(min_length=1, max_length=200)
    dessert: str | None = Field(default=None, max_length=200)
    allergens: list[Allergen] = Field(default_factory=list)
    note: str | None = Field(default=None, max_length=1000)


class EnrollmentIn(BaseModel):
    plan: Literal["monthly", "days"] = "monthly"
    weekdays: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    diet: Diet = "none"
    diet_note: str | None = Field(default=None, max_length=200)
    start_date: date
    end_date: date | None = None

    @field_validator("weekdays")
    @classmethod
    def _school_days_only(cls, value: list[int]) -> list[int]:
        days = sorted(set(value))
        if any(day not in logic.ALL_SCHOOL_DAYS for day in days):
            raise ValueError("Weekdays are 0 (Sunday) to 4 (Thursday).")
        return days

    @model_validator(mode="after")
    def _coherent(self):
        if self.plan == "monthly":
            self.weekdays = list(logic.ALL_SCHOOL_DAYS)
        elif not self.weekdays:
            raise ValueError("Choose at least one day.")
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("The end date is before the start date.")
        return self


class CanteenSettings(BaseModel):
    monthly_price: Decimal = Field(ge=0, le=Decimal("1000000"))
    daily_price: Decimal = Field(ge=0, le=Decimal("100000"))


class BillingRequest(BaseModel):
    year: int = Field(ge=2020, le=2100)
    month: int = Field(ge=1, le=12)
    due_date: date | None = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _today() -> date:
    return datetime.now(timezone.utc).astimezone(ALGERIA_TZ).date()


def _school_id(user: User, roles: set[UserRole]) -> str:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")
    return user.school_id


def _prices(school: School) -> dict[str, Decimal]:
    config = (school.tenant_config or {}).get("canteen") or {}
    result = {}
    for key, default in DEFAULT_PRICES.items():
        try:
            result[key] = dec(config.get(key, default))
        except (InvalidOperation, ValueError):
            result[key] = dec(default)
    return result


def _menu_out(menu: CanteenMenu | None, day: date) -> dict:
    return {
        "day": day.isoformat(),
        "weekday": logic.school_weekday(day),
        "menu": None if menu is None else {
            "id": menu.id,
            "starter": menu.starter,
            "main": menu.main,
            "dessert": menu.dessert,
            "allergens": list(menu.allergens or []),
            "note": menu.note,
            "published": menu.published_at is not None,
        },
    }


def _enrollment_out(enrollment: CanteenEnrollment | None) -> dict | None:
    if enrollment is None:
        return None
    return {
        "id": enrollment.id,
        "student_id": enrollment.student_id,
        "plan": enrollment.plan,
        "weekdays": list(enrollment.weekdays or []),
        "diet": enrollment.diet,
        "diet_note": enrollment.diet_note,
        "start_date": enrollment.start_date.isoformat() if enrollment.start_date else None,
        "end_date": enrollment.end_date.isoformat() if enrollment.end_date else None,
        "active": enrollment.end_date is None or enrollment.end_date >= _today(),
    }


async def _audit(db: AsyncSession, request: Request, user: User, action: str, resource_id: str | None, metadata: dict | None = None):
    await record_audit_event(
        db,
        action=action,
        actor=user,
        school_id=user.school_id,
        resource_type="canteen",
        resource_id=resource_id,
        method=request.method,
        path=request.url.path,
        metadata=metadata,
    )


async def _holidays(db: AsyncSession, school_id: str, start: date, end: date) -> set[date]:
    rows = (
        await db.execute(
            select(Announcement.starts_on, Announcement.ends_on).where(
                Announcement.school_id == school_id,
                Announcement.category == "holiday",
                Announcement.whole_school.is_(True),
                Announcement.starts_on.is_not(None),
                Announcement.starts_on <= end,
            )
        )
    ).all()
    return {day for day in logic.holiday_dates(rows) if start <= day <= end}


async def _parent_ids(db: AsyncSession, school_id: str, student_ids: list[str]) -> dict[str, list[str]]:
    if not student_ids:
        return {}
    links: dict[str, list[str]] = {}
    for student_id, parent_id in (
        await db.execute(
            select(StudentParent.student_id, StudentParent.parent_id).where(
                StudentParent.school_id == school_id, StudentParent.student_id.in_(student_ids)
            )
        )
    ).all():
        links.setdefault(student_id, []).append(parent_id)
    return links


async def _student_in_school(db: AsyncSession, student_id: str, school_id: str) -> Student:
    student = await db.get(Student, student_id)
    if student is None or student.school_id != school_id or student.archived_at is not None:
        raise HTTPException(status_code=404, detail="Eleve introuvable.")
    return student


def _parse_day(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=400, detail="Date attendue au format AAAA-MM-JJ.")


# ── Menus ────────────────────────────────────────────────────────────────────

@router.get("/menus")
async def week_menus(
    week: str | None = Query(default=None, description="Any date of the week (YYYY-MM-DD); default: this week."),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sunday-to-Thursday menus. Parents only see a published week."""
    school_id = _school_id(current_user, KITCHEN_ROLES | {UserRole.parent})
    await require_module("canteen", current_user, db)
    days = logic.week_days(_parse_day(week) if week else _today())
    menus = {
        menu.day: menu
        for menu in (
            await db.execute(
                select(CanteenMenu).where(
                    CanteenMenu.school_id == school_id, CanteenMenu.day >= days[0], CanteenMenu.day <= days[-1]
                )
            )
        ).scalars().all()
    }
    if current_user.role == UserRole.parent:
        menus = {day: menu for day, menu in menus.items() if menu.published_at is not None}
    return {"week_start": days[0].isoformat(), "days": [_menu_out(menus.get(day), day) for day in days]}


@router.put("/menus/{day}")
async def save_menu(
    day: str,
    payload: MenuIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, KITCHEN_ROLES)
    await require_module("canteen", current_user, db)
    menu_day = _parse_day(day)
    if logic.school_weekday(menu_day) is None:
        raise HTTPException(status_code=400, detail="La cantine fonctionne du dimanche au jeudi.")
    menu = (
        await db.execute(select(CanteenMenu).where(CanteenMenu.school_id == school_id, CanteenMenu.day == menu_day))
    ).scalar_one_or_none()
    if menu is None:
        menu = CanteenMenu(school_id=school_id, day=menu_day, created_by=current_user.id)
        db.add(menu)
    menu.starter = (payload.starter or "").strip() or None
    menu.main = payload.main.strip()
    menu.dessert = (payload.dessert or "").strip() or None
    menu.allergens = sorted(set(payload.allergens))
    menu.note = (payload.note or "").strip() or None
    menu.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await _audit(db, request, current_user, "canteen.menu_saved", menu.id, {"day": menu_day.isoformat()})
    await db.commit()
    return _menu_out(menu, menu_day)


@router.delete("/menus/{day}")
async def delete_menu(
    day: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, KITCHEN_ROLES)
    await require_module("canteen", current_user, db)
    menu_day = _parse_day(day)
    result = await db.execute(delete(CanteenMenu).where(CanteenMenu.school_id == school_id, CanteenMenu.day == menu_day))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Aucun menu ce jour-la.")
    await _audit(db, request, current_user, "canteen.menu_deleted", None, {"day": menu_day.isoformat()})
    await db.commit()
    return {"deleted": True}


@router.post("/menus/publish")
async def publish_week(
    request: Request,
    week: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Make the week's menus visible to parents and tell the parents of students eating that week."""
    school_id = _school_id(current_user, KITCHEN_ROLES)
    await require_module("canteen", current_user, db)
    days = logic.week_days(_parse_day(week) if week else _today())
    menus = (
        await db.execute(
            select(CanteenMenu).where(
                CanteenMenu.school_id == school_id, CanteenMenu.day >= days[0], CanteenMenu.day <= days[-1]
            )
        )
    ).scalars().all()
    if not menus:
        raise HTTPException(status_code=400, detail="Aucun menu saisi pour cette semaine.")
    now = datetime.now(timezone.utc)
    newly_published = [menu for menu in menus if menu.published_at is None]
    for menu in newly_published:
        menu.published_at = now

    notified = 0
    if newly_published:
        holidays = await _holidays(db, school_id, days[0], days[-1])
        enrollments = (
            await db.execute(select(CanteenEnrollment).where(CanteenEnrollment.school_id == school_id))
        ).scalars().all()
        eating = [e.student_id for e in enrollments if any(logic.eats_on(e, day, holidays) for day in days)]
        parents = sorted({p for ids in (await _parent_ids(db, school_id, eating)).values() for p in ids})
        title = "Menu de la cantine"
        content = f"Le menu de la semaine du {days[0]:%d/%m/%Y} est disponible."
        for parent_id in parents:
            if await create_notification(db, parent_id, title, content, type=NOTIFICATION_TYPE, school_id=school_id):
                notified += 1
    await _audit(db, request, current_user, "canteen.menus_published", None, {
        "week_start": days[0].isoformat(), "published": len(newly_published), "notified": notified,
    })
    await db.commit()
    return {"published": len(newly_published), "notified": notified}


# ── Registrations ────────────────────────────────────────────────────────────

@router.get("/enrollments")
async def list_enrollments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Every active student with their class and canteen registration (null if not registered)."""
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("canteen", current_user, db)
    students = (
        await db.execute(
            select(Student.id, Student.full_name, Student.student_id)
            .where(Student.school_id == school_id, Student.archived_at.is_(None))
            .order_by(Student.full_name)
        )
    ).all()
    classes = await _student_classes(db, school_id)
    enrollments = {
        e.student_id: e
        for e in (
            await db.execute(select(CanteenEnrollment).where(CanteenEnrollment.school_id == school_id))
        ).scalars().all()
    }
    return [
        {
            "student_id": student_id,
            "student_name": name,
            "student_code": code,
            "class_name": classes.get(student_id, ("", "-"))[1],
            "enrollment": _enrollment_out(enrollments.get(student_id)),
        }
        for student_id, name, code in students
    ]


@router.put("/enrollments/{student_id}")
async def save_enrollment(
    student_id: str,
    payload: EnrollmentIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("canteen", current_user, db)
    student = await _student_in_school(db, student_id, school_id)
    enrollment = (
        await db.execute(
            select(CanteenEnrollment).where(
                CanteenEnrollment.school_id == school_id, CanteenEnrollment.student_id == student_id
            )
        )
    ).scalar_one_or_none()
    created = enrollment is None
    if created:
        enrollment = CanteenEnrollment(school_id=school_id, student_id=student_id, created_by=current_user.id)
        db.add(enrollment)
    enrollment.plan = payload.plan
    enrollment.weekdays = payload.weekdays
    enrollment.diet = payload.diet
    enrollment.diet_note = (payload.diet_note or "").strip() or None
    enrollment.start_date = payload.start_date
    enrollment.end_date = payload.end_date
    enrollment.updated_at = datetime.now(timezone.utc)
    await db.flush()

    title = "Inscription a la cantine"
    content = (
        f"{student.full_name} est inscrit(e) a la cantine a partir du {payload.start_date:%d/%m/%Y}."
        if created
        else f"L'inscription de {student.full_name} a la cantine a ete mise a jour."
    )
    for parent_id in (await _parent_ids(db, school_id, [student_id])).get(student_id, []):
        await create_notification(db, parent_id, title, content, type=NOTIFICATION_TYPE, school_id=school_id)
    await _audit(db, request, current_user, "canteen.enrollment_created" if created else "canteen.enrollment_updated",
                 student_id, {"plan": payload.plan, "weekdays": payload.weekdays, "diet": payload.diet})
    await db.commit()
    return _enrollment_out(enrollment)


@router.delete("/enrollments/{student_id}")
async def delete_enrollment(
    student_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _school_id(current_user, ADMIN_ROLES)
    await require_module("canteen", current_user, db)
    student = await _student_in_school(db, student_id, school_id)
    result = await db.execute(
        delete(CanteenEnrollment).where(
            CanteenEnrollment.school_id == school_id, CanteenEnrollment.student_id == student_id
        )
    )
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Cet eleve n'est pas inscrit a la cantine.")
    for parent_id in (await _parent_ids(db, school_id, [student_id])).get(student_id, []):
        await create_notification(
            db, parent_id, "Inscription a la cantine", f"{student.full_name} n'est plus inscrit(e) a la cantine.",
            type=NOTIFICATION_TYPE, school_id=school_id,
        )
    await _audit(db, request, current_user, "canteen.enrollment_deleted", student_id)
    await db.commit()
    return {"deleted": True}


async def _student_classes(db: AsyncSession, school_id: str) -> dict[str, tuple[str, str]]:
    classes: dict[str, tuple[str, str]] = {}
    for student_id, class_id, class_name in (
        await db.execute(
            select(ClassMember.student_id, Class.id, Class.name)
            .join(Class, Class.id == ClassMember.class_id)
            .where(ClassMember.school_id == school_id)
            .order_by(Class.name)
        )
    ).all():
        classes.setdefault(student_id, (class_id, class_name))
    return classes


# ── Kitchen headcount ────────────────────────────────────────────────────────

@router.get("/headcount")
async def daily_headcount(
    request: Request,
    day: str | None = Query(default=None, alias="date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Meals to prepare: registered for that weekday minus the students marked absent.

    Includes each diner's diet and the short health alert (never the full
    health sheet); every view is audited because of those alerts.
    """
    school_id = _school_id(current_user, KITCHEN_ROLES)
    await require_module("canteen", current_user, db)
    target = _parse_day(day) if day else _today()
    holidays = await _holidays(db, school_id, target, target)
    enrollments = (
        await db.execute(select(CanteenEnrollment).where(CanteenEnrollment.school_id == school_id))
    ).scalars().all()
    eating_ids = [e.student_id for e in enrollments if logic.eats_on(e, target, holidays)]

    names: dict[str, str] = {}
    absent_ids: set[str] = set()
    classes_with_attendance: set[str] = set()
    alerts: dict[str, str] = {}
    classes: dict[str, tuple[str, str]] = {}
    if eating_ids:
        names = {
            sid: name
            for sid, name in (
                await db.execute(
                    select(Student.id, Student.full_name).where(
                        Student.school_id == school_id, Student.id.in_(eating_ids), Student.archived_at.is_(None)
                    )
                )
            ).all()
        }
        start = datetime.combine(target, time(0, 0), tzinfo=ALGERIA_TZ)
        end = start + timedelta(days=1)
        for student_id, class_id, status in (
            await db.execute(
                select(Attendance.student_id, Attendance.class_id, Attendance.status).where(
                    Attendance.school_id == school_id, Attendance.date >= start, Attendance.date < end
                )
            )
        ).all():
            classes_with_attendance.add(class_id)
            if status == AttendanceStatus.absent:
                absent_ids.add(student_id)
        alerts = {
            sid: alert
            for sid, alert in (
                await db.execute(
                    select(StudentHealthRecord.student_id, StudentHealthRecord.teacher_alert).where(
                        StudentHealthRecord.school_id == school_id,
                        StudentHealthRecord.student_id.in_(eating_ids),
                        StudentHealthRecord.teacher_alert.is_not(None),
                    )
                )
            ).all()
        }
        classes = await _student_classes(db, school_id)
    # Archived students drop out of the count.
    enrollments = [e for e in enrollments if e.student_id in names]
    count = logic.compute_headcount(
        target, enrollments, names=names, classes=classes, absent_ids=absent_ids,
        classes_with_attendance=classes_with_attendance, alerts=alerts, holidays=holidays,
    )
    await _audit(db, request, current_user, "canteen.headcount_viewed", None, {"date": target.isoformat(), "total": count.total})
    await db.commit()
    return {
        "date": target.isoformat(),
        "is_school_day": logic.school_weekday(target) is not None and target not in holidays,
        "total": count.total,
        "absent": count.absent,
        "by_class": sorted(count.by_class.values(), key=lambda item: item["class_name"]),
        "by_diet": count.by_diet,
        "students": count.students,
    }


# ── Billing & settings ───────────────────────────────────────────────────────

@router.get("/settings")
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _school_id(current_user, KITCHEN_ROLES | {UserRole.parent})
    school = await require_module("canteen", current_user, db)
    prices = _prices(school)
    return {key: money(value) for key, value in prices.items()}


@router.put("/settings")
async def update_settings(
    payload: CanteenSettings,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.principal:
        raise HTTPException(status_code=403, detail="Reserve au directeur.")
    school = await require_module("canteen", current_user, db)
    values = {"monthly_price": str(dec(payload.monthly_price)), "daily_price": str(dec(payload.daily_price))}
    school.tenant_config = {**(school.tenant_config or {}), "canteen": values}
    await _audit(db, request, current_user, "canteen.settings_updated", school.id, values)
    await db.commit()
    return {key: money(value) for key, value in values.items()}


@router.post("/billing")
async def bill_month(
    payload: BillingRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bill the month's canteen to every registered student ("Cantine novembre 2026").

    Running it again never bills anyone twice (same label); students registered
    later in the month are billed on the next run.
    """
    school_id = _school_id(current_user, ADMIN_ROLES)
    school = await require_module("canteen", current_user, db)
    prices = _prices(school)
    if prices["monthly_price"] <= 0 and prices["daily_price"] <= 0:
        raise HTTPException(status_code=400, detail="Renseignez d'abord les tarifs de la cantine.")
    first, last = logic.month_bounds(payload.year, payload.month)
    holidays = await _holidays(db, school_id, first, last)
    enrollments = (
        await db.execute(select(CanteenEnrollment).where(CanteenEnrollment.school_id == school_id))
    ).scalars().all()
    active_ids = set(
        (
            await db.execute(
                select(Student.id).where(Student.school_id == school_id, Student.archived_at.is_(None))
            )
        ).scalars().all()
    )
    amounts = {
        e.student_id: logic.monthly_amount(
            e, payload.year, payload.month,
            monthly_price=prices["monthly_price"], daily_price=prices["daily_price"], holidays=holidays,
        )
        for e in enrollments
        if e.student_id in active_ids
    }
    amounts = {student_id: amount for student_id, amount in amounts.items() if amount > 0}
    label = logic.billing_label(payload.year, payload.month)
    due = datetime.combine(payload.due_date, time(23, 59), tzinfo=ALGERIA_TZ) if payload.due_date else None
    created, skipped = await bill_students(db, school_id, amounts, label, due)
    total = sum(amounts.values(), Decimal("0"))
    await _audit(db, request, current_user, "canteen.month_billed", school_id, {
        "label": label, "created": created, "skipped": skipped, "total": money(total),
    })
    await db.commit()
    return {"label": label, "created": created, "skipped": skipped, "total": money(total), "total_text": format_da(total)}


# ── Parents ──────────────────────────────────────────────────────────────────

@router.get("/my")
async def my_canteen(
    week: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """For a parent: each child's registration and this week's published menu."""
    school_id = _school_id(current_user, {UserRole.parent})
    school = await require_module("canteen", current_user, db)
    children = (
        await db.execute(
            select(Student.id, Student.full_name)
            .join(StudentParent, StudentParent.student_id == Student.id)
            .where(
                StudentParent.parent_id == current_user.id,
                StudentParent.school_id == school_id,
                Student.archived_at.is_(None),
            )
            .order_by(Student.full_name)
        )
    ).all()
    child_ids = [child_id for child_id, _ in children]
    enrollments = {}
    if child_ids:
        enrollments = {
            e.student_id: e
            for e in (
                await db.execute(
                    select(CanteenEnrollment).where(
                        CanteenEnrollment.school_id == school_id, CanteenEnrollment.student_id.in_(child_ids)
                    )
                )
            ).scalars().all()
        }
    menus = await week_menus(week=week, current_user=current_user, db=db)
    return {
        "children": [
            {"student_id": child_id, "student_name": name, "enrollment": _enrollment_out(enrollments.get(child_id))}
            for child_id, name in children
        ],
        "prices": {key: money(value) for key, value in _prices(school).items()},
        **menus,
    }
