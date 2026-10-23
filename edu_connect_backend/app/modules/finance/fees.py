"""School fees: balances, overdue rules and payment reminders to parents."""
import logging
import secrets
from datetime import date, datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rls import set_request_rls_context
from app.db.database import AsyncSessionLocal
from app.models import School, Student, StudentParent, TuitionInvoice
from app.modules.schools.calendar import ALGERIA_TZ
from app.utils.notifications import create_notification

logger = logging.getLogger(__name__)

# A manual reminder is refused if the same invoice was reminded this recently.
MANUAL_REMINDER_GAP = timedelta(days=3)
# Automatic reminders: once up to 3 days before the due date, then weekly once
# overdue, at most this many in total, and only at a decent hour.
AUTO_BEFORE_DUE_DAYS = 3
AUTO_OVERDUE_GAP = timedelta(days=7)
AUTO_MAX_REMINDERS = 4
AUTO_HOURS = range(8, 20)

PAYMENT_METHODS = {
    "cash": "Espèces",
    "bank_transfer": "Virement bancaire",
    "ccp": "CCP / BaridiMob",
    "cheque": "Chèque",
}


def new_receipt_number(now: datetime) -> str:
    """REC-20261024-7F3A9C21: dated and random, so it never repeats even after a cancellation."""
    return f"REC-{now.astimezone(ALGERIA_TZ):%Y%m%d}-{secrets.token_hex(4).upper()}"


CENT = Decimal("0.01")


def dec(value) -> Decimal:
    """An exact amount in dinars, rounded to the cent (accepts Decimal, int, float or str)."""
    return Decimal(str(value or 0)).quantize(CENT, rounding=ROUND_HALF_UP)


def money(value) -> float:
    """For JSON output only; all arithmetic stays in Decimal."""
    return float(dec(value))


def remaining_dec(invoice: TuitionInvoice) -> Decimal:
    return max(dec(invoice.amount_due) - dec(invoice.amount_paid), Decimal("0"))


def remaining(invoice: TuitionInvoice) -> float:
    return float(remaining_dec(invoice))


def format_da(value) -> str:
    """8500 -> '8 500 DA', 8500.5 -> '8 500,50 DA'."""
    whole = f"{dec(value):,.2f}".replace(",", " ").replace(".", ",")
    if whole.endswith(",00"):
        whole = whole[:-3]
    return f"{whole} DA"


def local_due_day(due: datetime | None) -> date | None:
    return due.astimezone(ALGERIA_TZ).date() if due else None


def days_overdue(invoice: TuitionInvoice, now: datetime) -> int:
    """Whole days past the due date (0 when not due yet or fully paid)."""
    due = local_due_day(invoice.due_date)
    if due is None or remaining(invoice) <= 0:
        return 0
    return max((now.astimezone(ALGERIA_TZ).date() - due).days, 0)


def recently_reminded(invoice: TuitionInvoice, now: datetime, gap: timedelta = MANUAL_REMINDER_GAP) -> bool:
    last = invoice.last_reminded_at
    if last is None:
        return False
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    return now - last < gap


def due_for_auto_reminder(invoice: TuitionInvoice, now: datetime) -> bool:
    """Whether the daily job should remind the parents about this invoice now."""
    due = local_due_day(invoice.due_date)
    if due is None or remaining(invoice) <= 0 or (invoice.reminder_count or 0) >= AUTO_MAX_REMINDERS:
        return False
    local_now = now.astimezone(ALGERIA_TZ)
    if local_now.hour not in AUTO_HOURS:
        return False
    days_left = (due - local_now.date()).days
    if 0 <= days_left <= AUTO_BEFORE_DUE_DAYS:
        # One heads-up before the deadline.
        return (invoice.reminder_count or 0) == 0
    if days_left < 0:
        return not recently_reminded(invoice, now, AUTO_OVERDUE_GAP)
    return False


def reminder_text(invoice: TuitionInvoice, student_name: str, now: datetime) -> tuple[str, str]:
    due = local_due_day(invoice.due_date)
    late = days_overdue(invoice, now)
    title = "Rappel : frais de scolarité" if late else "Échéance proche : frais de scolarité"
    when = ""
    if due:
        when = f" (échéance dépassée le {due:%d/%m/%Y})" if late else f" (échéance le {due:%d/%m/%Y})"
    content = (
        f"« {invoice.label} » pour {student_name} : reste à payer {format_da(remaining(invoice))}{when}. "
        "Si vous avez déjà réglé, merci de ne pas tenir compte de ce message ; sinon, rapprochez-vous du secrétariat."
    )
    return title, content


async def send_reminder(db: AsyncSession, invoice: TuitionInvoice, now: datetime) -> int:
    """Notify every parent linked to the invoice's student. Returns the number notified."""
    student = await db.get(Student, invoice.student_id)
    parent_ids = (
        await db.execute(
            select(StudentParent.parent_id).where(
                StudentParent.school_id == invoice.school_id,
                StudentParent.student_id == invoice.student_id,
            )
        )
    ).scalars().all()
    if not parent_ids:
        return 0
    title, content = reminder_text(invoice, student.full_name if student else "votre enfant", now)
    for parent_id in parent_ids:
        await create_notification(db, user_id=parent_id, title=title, content=content, type="FEES", school_id=invoice.school_id)
    invoice.last_reminded_at = now
    invoice.reminder_count = (invoice.reminder_count or 0) + 1
    return len(parent_ids)


async def send_automatic_reminders(now: datetime | None = None) -> int:
    """Daily-style job (runs hourly; each invoice is reminded at most once a week)."""
    now = now or datetime.now(timezone.utc)
    if now.astimezone(ALGERIA_TZ).hour not in AUTO_HOURS:
        return 0
    async with AsyncSessionLocal() as db:
        await set_request_rls_context(db, is_system_admin=True)
        school_ids = [
            school_id
            for school_id, config in (
                await db.execute(select(School.id, School.tenant_config).where(School.is_active.is_(True)))
            ).all()
            if (config or {}).get("fee_auto_reminders") and not (config or {}).get("demo_data")
        ]

    sent = 0
    for school_id in school_ids:
        try:
            async with AsyncSessionLocal() as db:
                await set_request_rls_context(db, school_id=school_id, is_system_admin=True)
                invoices = (
                    await db.execute(
                        select(TuitionInvoice)
                        .where(
                            TuitionInvoice.school_id == school_id,
                            TuitionInvoice.due_date.is_not(None),
                            TuitionInvoice.amount_paid < TuitionInvoice.amount_due,
                        )
                        # Another worker handling the same school skips the rows we hold.
                        .with_for_update(skip_locked=True)
                    )
                ).scalars().all()
                for invoice in invoices:
                    if due_for_auto_reminder(invoice, now) and await send_reminder(db, invoice, now):
                        sent += 1
                await db.commit()
        except Exception:
            logger.exception("Automatic fee reminders failed for school %s", school_id)
    return sent
