from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import record_audit_event
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import (
    Class,
    ClassMember,
    School,
    Student,
    StudentParent,
    TuitionInvoice,
    TuitionInvoiceStatus,
    TuitionPayment,
    User,
    UserRole,
)
from app.modules.finance.fees import (
    PAYMENT_METHODS,
    days_overdue,
    format_da,
    money,
    recently_reminded,
    remaining,
    send_reminder,
)
from app.modules.schools.calendar import ALGERIA_TZ
from app.schemas import (
    BulkInvoiceCreate,
    FeeSettings,
    InvoiceUpdate,
    PaymentCancel,
    ReminderRequest,
    TuitionInvoiceCreate,
    TuitionInvoiceOut,
    TuitionPaymentCreate,
    TuitionPaymentOut,
)
from app.utils.notifications import create_notification

router = APIRouter(prefix="/finance", tags=["Finance / Ecolage"])

ADMIN_ROLES = [UserRole.principal, UserRole.secretary]


def _require_admin(user: User) -> str:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Reserve a l'administration de l'etablissement.")
    if not user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")
    return user.school_id


def _due_at(day: date | None) -> datetime | None:
    """A due date is the end of that day in Algeria."""
    return datetime.combine(day, time(23, 59), tzinfo=ALGERIA_TZ) if day else None


def _update_invoice_status(invoice: TuitionInvoice) -> None:
    if invoice.amount_paid <= 0:
        invoice.status = TuitionInvoiceStatus.unpaid
    elif invoice.amount_paid < invoice.amount_due:
        invoice.status = TuitionInvoiceStatus.partial
    else:
        invoice.status = TuitionInvoiceStatus.paid


async def _load_invoice(
    db: AsyncSession,
    invoice_id: str,
    *,
    school_id: str | None = None,
) -> TuitionInvoice:
    stmt = select(TuitionInvoice).where(TuitionInvoice.id == invoice_id)
    if school_id:
        stmt = stmt.where(TuitionInvoice.school_id == school_id)
    result = await db.execute(
        stmt.options(selectinload(TuitionInvoice.payments))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


async def _audit(db: AsyncSession, request: Request, user: User, action: str, resource_id: str | None, metadata: dict):
    await record_audit_event(
        db,
        action=action,
        actor=user,
        school_id=user.school_id,
        resource_type="fees",
        resource_id=resource_id,
        method=request.method,
        path=request.url.path,
        metadata=metadata,
    )


@router.post("/invoices", response_model=TuitionInvoiceOut, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    payload: TuitionInvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Only school administration can create tuition invoices")

    student = await db.get(Student, payload.student_id)
    if not student or student.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Student not found")

    invoice = TuitionInvoice(
        school_id=current_user.school_id,
        student_id=student.id,
        label=payload.label,
        amount_due=payload.amount_due,
        due_date=payload.due_date,
    )
    db.add(invoice)
    await db.commit()
    return await _load_invoice(db, invoice.id, school_id=current_user.school_id)


@router.post("/invoices/bulk", status_code=status.HTTP_201_CREATED)
async def create_invoices_for_class(
    payload: BulkInvoiceCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bill every active student of a class (or of the school) the same fee.

    Students who already have a fee with the same label are skipped, so running
    it twice never bills anyone twice.
    """
    school_id = _require_admin(current_user)
    students = select(Student.id).where(Student.school_id == school_id, Student.archived_at.is_(None))
    if payload.class_id:
        cls = await db.get(Class, payload.class_id)
        if cls is None or cls.school_id != school_id:
            raise HTTPException(status_code=404, detail="Classe introuvable.")
        students = students.where(
            Student.id.in_(
                select(ClassMember.student_id).where(
                    ClassMember.school_id == school_id, ClassMember.class_id == payload.class_id
                )
            )
        )
    student_ids = (await db.execute(students)).scalars().all()
    label = payload.label.strip()
    already_billed = set(
        (
            await db.execute(
                select(TuitionInvoice.student_id).where(
                    TuitionInvoice.school_id == school_id,
                    func.lower(TuitionInvoice.label) == label.lower(),
                )
            )
        ).scalars().all()
    )
    created = 0
    for student_id in student_ids:
        if student_id in already_billed:
            continue
        db.add(
            TuitionInvoice(
                school_id=school_id,
                student_id=student_id,
                label=label,
                amount_due=money(payload.amount_due),
                amount_paid=0.0,
                status=TuitionInvoiceStatus.unpaid,
                due_date=_due_at(payload.due_date),
            )
        )
        created += 1
    await _audit(db, request, current_user, "fees.invoices_created", payload.class_id or school_id, {
        "label": label, "amount": money(payload.amount_due), "created": created, "class_id": payload.class_id,
    })
    await db.commit()
    return {"created": created, "skipped": len(student_ids) - created}


@router.get("/invoices", response_model=list[TuitionInvoiceOut])
async def list_invoices(
    student_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(TuitionInvoice).options(selectinload(TuitionInvoice.payments))

    if current_user.role in [UserRole.principal, UserRole.secretary]:
        stmt = stmt.where(TuitionInvoice.school_id == current_user.school_id)
        if student_id:
            stmt = stmt.where(TuitionInvoice.student_id == student_id)
    elif current_user.role == UserRole.parent:
        stmt = (
            stmt.join(StudentParent, StudentParent.student_id == TuitionInvoice.student_id)
            .where(
                TuitionInvoice.school_id == current_user.school_id,
                StudentParent.school_id == current_user.school_id,
                StudentParent.parent_id == current_user.id,
            )
        )
        if student_id:
            stmt = stmt.where(TuitionInvoice.student_id == student_id)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(stmt.order_by(TuitionInvoice.created_at.desc()))
    return result.scalars().unique().all()


def _payment_out(payment: TuitionPayment) -> dict:
    return {
        "id": payment.id,
        "amount": money(payment.amount),
        "payment_method": payment.payment_method,
        "receipt_number": payment.receipt_number,
        "notes": payment.notes,
        "paid_at": payment.paid_at,
    }


def _invoice_out(invoice: TuitionInvoice, now: datetime) -> dict:
    return {
        "id": invoice.id,
        "student_id": invoice.student_id,
        "label": invoice.label,
        "amount_due": money(invoice.amount_due),
        "amount_paid": money(invoice.amount_paid),
        "remaining": remaining(invoice),
        "status": invoice.status.value if hasattr(invoice.status, "value") else invoice.status,
        "due_date": invoice.due_date,
        "days_overdue": days_overdue(invoice, now),
        "last_reminded_at": invoice.last_reminded_at,
        "reminder_count": invoice.reminder_count or 0,
        "created_at": invoice.created_at,
        "payments": [_payment_out(payment) for payment in sorted(invoice.payments, key=lambda p: p.paid_at)],
    }


@router.get("/ledger")
async def fee_ledger(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Every fee of the school with its student, class and balance, plus the totals."""
    school_id = _require_admin(current_user)
    now = datetime.now(timezone.utc)
    invoices = (
        await db.execute(
            select(TuitionInvoice)
            .options(selectinload(TuitionInvoice.payments))
            .where(TuitionInvoice.school_id == school_id)
            .order_by(TuitionInvoice.created_at.desc())
        )
    ).scalars().unique().all()
    students = {
        row[0]: {"name": row[1], "code": row[2], "archived": row[3] is not None}
        for row in (
            await db.execute(
                select(Student.id, Student.full_name, Student.student_id, Student.archived_at).where(
                    Student.school_id == school_id
                )
            )
        ).all()
    }
    classes: dict[str, list[tuple[str, str]]] = {}
    for student_id, class_id, class_name in (
        await db.execute(
            select(ClassMember.student_id, Class.id, Class.name)
            .join(Class, Class.id == ClassMember.class_id)
            .where(ClassMember.school_id == school_id)
        )
    ).all():
        classes.setdefault(student_id, []).append((class_id, class_name))
    parents = dict(
        (
            await db.execute(
                select(StudentParent.student_id, func.count())
                .where(StudentParent.school_id == school_id)
                .group_by(StudentParent.student_id)
            )
        ).all()
    )
    school = await db.get(School, school_id)

    local_now = now.astimezone(ALGERIA_TZ)
    month_start = datetime(local_now.year, local_now.month, 1, tzinfo=ALGERIA_TZ)
    rows = []
    by_class: dict[str, dict] = {}
    totals = {"billed": 0.0, "collected": 0.0, "outstanding": 0.0, "overdue": 0.0, "collected_this_month": 0.0}
    overdue_students: set[str] = set()
    for invoice in invoices:
        out = _invoice_out(invoice, now)
        student = students.get(invoice.student_id, {"name": "?", "code": None, "archived": False})
        student_classes = classes.get(invoice.student_id, [])
        out.update(
            student_name=student["name"],
            student_code=student["code"],
            student_archived=student["archived"],
            classes=[{"id": class_id, "name": name} for class_id, name in student_classes],
            parents_linked=parents.get(invoice.student_id, 0),
        )
        rows.append(out)
        totals["billed"] += out["amount_due"]
        totals["collected"] += out["amount_paid"]
        totals["outstanding"] += out["remaining"]
        totals["collected_this_month"] += sum(
            payment["amount"] for payment in out["payments"] if payment["paid_at"] and payment["paid_at"] >= month_start
        )
        if out["days_overdue"] > 0:
            totals["overdue"] += out["remaining"]
            overdue_students.add(invoice.student_id)
        for class_id, name in student_classes[:1] or [(None, None)]:
            entry = by_class.setdefault(class_id or "", {"class_id": class_id, "class_name": name, "billed": 0.0, "collected": 0.0, "outstanding": 0.0})
            entry["billed"] += out["amount_due"]
            entry["collected"] += out["amount_paid"]
            entry["outstanding"] += out["remaining"]

    summary = {key: money(value) for key, value in totals.items()}
    summary.update(
        collection_rate=round(totals["collected"] * 100 / totals["billed"], 1) if totals["billed"] else None,
        overdue_students=len(overdue_students),
        overdue_invoices=sum(1 for row in rows if row["days_overdue"] > 0),
    )
    return {
        "school_name": school.name if school else "",
        "auto_reminders": bool((school.tenant_config or {}).get("fee_auto_reminders")) if school else False,
        "summary": summary,
        "by_class": sorted(
            ({**entry, **{k: money(entry[k]) for k in ("billed", "collected", "outstanding")}} for entry in by_class.values()),
            key=lambda entry: (entry["class_name"] is None, entry["class_name"] or ""),
        ),
        "invoices": rows,
    }


@router.patch("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    payload: InvoiceUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = _require_admin(current_user)
    invoice = await _load_invoice(db, invoice_id, school_id=school_id)
    changes = {}
    if payload.label is not None:
        invoice.label = payload.label.strip()
        changes["label"] = invoice.label
    if payload.amount_due is not None:
        if money(payload.amount_due) < money(invoice.amount_paid):
            raise HTTPException(status_code=400, detail="Le montant ne peut pas etre inferieur a ce qui a deja ete paye.")
        changes["amount_due"] = {"from": money(invoice.amount_due), "to": money(payload.amount_due)}
        invoice.amount_due = money(payload.amount_due)
    if payload.clear_due_date:
        invoice.due_date = None
        changes["due_date"] = None
    elif payload.due_date is not None:
        invoice.due_date = _due_at(payload.due_date)
        changes["due_date"] = payload.due_date.isoformat()
    _update_invoice_status(invoice)
    await _audit(db, request, current_user, "fees.invoice_updated", invoice.id, {"student_id": invoice.student_id, **changes})
    await db.commit()
    return _invoice_out(invoice, datetime.now(timezone.utc))


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a fee billed by mistake. Fees with payments must have them cancelled first."""
    school_id = _require_admin(current_user)
    invoice = await _load_invoice(db, invoice_id, school_id=school_id)
    if invoice.payments:
        raise HTTPException(status_code=400, detail="Annulez d'abord les paiements de ces frais.")
    await _audit(db, request, current_user, "fees.invoice_deleted", invoice.id, {
        "student_id": invoice.student_id, "label": invoice.label, "amount": money(invoice.amount_due),
    })
    await db.delete(invoice)
    await db.commit()
    return {"deleted": True}


@router.post("/invoices/{invoice_id}/payments", response_model=TuitionPaymentOut, status_code=status.HTTP_201_CREATED)
async def record_payment(
    invoice_id: str,
    payload: TuitionPaymentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Only school administration can record tuition payments")

    invoice = await _load_invoice(db, invoice_id, school_id=current_user.school_id)

    if money(payload.amount) > remaining(invoice):
        raise HTTPException(status_code=400, detail="Payment amount exceeds remaining balance")

    receipt_number = f"REC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{invoice.id[:8].upper()}-{len(invoice.payments) + 1:02d}"
    payment = TuitionPayment(
        school_id=invoice.school_id,
        invoice_id=invoice.id,
        student_id=invoice.student_id,
        amount=money(payload.amount),
        payment_method=payload.payment_method,
        receipt_number=receipt_number,
        notes=payload.notes,
    )
    invoice.amount_paid = money(invoice.amount_paid + payload.amount)
    _update_invoice_status(invoice)

    db.add(payment)
    # The parents get the receipt in the app straight away.
    student = await db.get(Student, invoice.student_id)
    for parent_id in (
        await db.execute(
            select(StudentParent.parent_id).where(
                StudentParent.school_id == invoice.school_id, StudentParent.student_id == invoice.student_id
            )
        )
    ).scalars().all():
        left = remaining(invoice)
        await create_notification(
            db,
            user_id=parent_id,
            title="Paiement reçu",
            content=(
                f"{format_da(payment.amount)} reçus pour « {invoice.label} » ({student.full_name if student else ''}), "
                f"reçu n° {receipt_number}. " + (f"Reste à payer : {format_da(left)}." if left else "Frais entièrement réglés. Merci !")
            ),
            type="FEES",
            school_id=invoice.school_id,
        )
    await _audit(db, request, current_user, "fees.payment_recorded", invoice.id, {
        "student_id": invoice.student_id, "amount": money(payload.amount),
        "method": payload.payment_method, "receipt_number": receipt_number,
    })
    await db.commit()
    await db.refresh(payment)
    return payment


@router.post("/payments/{payment_id}/cancel")
async def cancel_payment(
    payment_id: str,
    payload: PaymentCancel,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Undo a payment entered by mistake; the reason stays in the activity log."""
    school_id = _require_admin(current_user)
    payment = await db.get(TuitionPayment, payment_id)
    if payment is None or payment.school_id != school_id:
        raise HTTPException(status_code=404, detail="Paiement introuvable.")
    invoice = await _load_invoice(db, payment.invoice_id, school_id=school_id)
    invoice.amount_paid = max(money(invoice.amount_paid - payment.amount), 0.0)
    _update_invoice_status(invoice)
    await _audit(db, request, current_user, "fees.payment_cancelled", invoice.id, {
        "student_id": invoice.student_id, "amount": money(payment.amount),
        "receipt_number": payment.receipt_number, "reason": payload.reason.strip(),
    })
    await db.delete(payment)
    await db.commit()
    return {"cancelled": True, "remaining": remaining(invoice)}


@router.post("/reminders")
async def send_payment_reminders(
    payload: ReminderRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remind the parents of unpaid fees. The same fee is not reminded twice within 3 days."""
    school_id = _require_admin(current_user)
    if not payload.invoice_ids and not payload.all_overdue:
        raise HTTPException(status_code=400, detail="Choisissez des frais a rappeler.")
    now = datetime.now(timezone.utc)
    stmt = select(TuitionInvoice).where(
        TuitionInvoice.school_id == school_id, TuitionInvoice.amount_paid < TuitionInvoice.amount_due
    )
    if payload.invoice_ids:
        stmt = stmt.where(TuitionInvoice.id.in_(payload.invoice_ids))
    invoices = (await db.execute(stmt)).scalars().all()
    if payload.all_overdue:
        invoices = [invoice for invoice in invoices if days_overdue(invoice, now) > 0]

    sent = recent = no_parent = 0
    for invoice in invoices:
        if recently_reminded(invoice, now):
            recent += 1
        elif await send_reminder(db, invoice, now):
            sent += 1
        else:
            no_parent += 1
    await _audit(db, request, current_user, "fees.reminders_sent", school_id, {
        "sent": sent, "skipped_recent": recent, "no_parent": no_parent, "all_overdue": payload.all_overdue,
    })
    await db.commit()
    return {"sent": sent, "skipped_recent": recent, "no_parent": no_parent}


@router.put("/settings")
async def update_fee_settings(
    payload: FeeSettings,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Turn automatic reminders on or off (director only)."""
    if current_user.role != UserRole.principal:
        raise HTTPException(status_code=403, detail="Reserve au directeur.")
    school = await db.get(School, current_user.school_id)
    if school is None:
        raise HTTPException(status_code=404, detail="School not found")
    school.tenant_config = {**(school.tenant_config or {}), "fee_auto_reminders": payload.auto_reminders}
    await _audit(db, request, current_user, "fees.settings_updated", school.id, {"auto_reminders": payload.auto_reminders})
    await db.commit()
    return {"auto_reminders": payload.auto_reminders}


@router.get("/my-fees")
async def my_fees(
    student_id: str = Query(..., max_length=36),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A parent's view of one child's fees, payments and receipts."""
    if current_user.role != UserRole.parent or not current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    linked = (
        await db.execute(
            select(StudentParent.student_id).where(
                StudentParent.school_id == current_user.school_id,
                StudentParent.parent_id == current_user.id,
                StudentParent.student_id == student_id,
            )
        )
    ).scalar_one_or_none()
    if linked is None:
        raise HTTPException(status_code=404, detail="Student not found")
    now = datetime.now(timezone.utc)
    invoices = (
        await db.execute(
            select(TuitionInvoice)
            .options(selectinload(TuitionInvoice.payments))
            .where(TuitionInvoice.school_id == current_user.school_id, TuitionInvoice.student_id == student_id)
            .order_by(TuitionInvoice.created_at.desc())
        )
    ).scalars().unique().all()
    school = await db.get(School, current_user.school_id)
    student = await db.get(Student, student_id)
    rows = [_invoice_out(invoice, now) for invoice in invoices]
    return {
        "school_name": school.name if school else "",
        "student_name": student.full_name if student else "",
        "total_remaining": money(sum(row["remaining"] for row in rows)),
        "invoices": rows,
        "payment_methods": PAYMENT_METHODS,
    }


@router.get("/payments/{payment_id}/receipt", response_model=TuitionPaymentOut)
async def get_receipt(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await db.get(TuitionPayment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Receipt not found")

    if current_user.role in [UserRole.principal, UserRole.secretary]:
        if payment.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == UserRole.parent:
        if payment.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Access denied")
        linked = await db.execute(
            select(StudentParent).where(
                StudentParent.school_id == payment.school_id,
                StudentParent.parent_id == current_user.id,
                StudentParent.student_id == payment.student_id,
            )
        )
        if not linked.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    return payment
