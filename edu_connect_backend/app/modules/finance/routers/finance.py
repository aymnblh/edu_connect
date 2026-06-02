from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import Student, StudentParent, TuitionInvoice, TuitionInvoiceStatus, TuitionPayment, User, UserRole
from app.schemas import TuitionInvoiceCreate, TuitionInvoiceOut, TuitionPaymentCreate, TuitionPaymentOut

router = APIRouter(prefix="/finance", tags=["Finance / Ecolage"])


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


@router.post("/invoices/{invoice_id}/payments", response_model=TuitionPaymentOut, status_code=status.HTTP_201_CREATED)
async def record_payment(
    invoice_id: str,
    payload: TuitionPaymentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Only school administration can record tuition payments")

    invoice = await _load_invoice(db, invoice_id, school_id=current_user.school_id)

    remaining = max(invoice.amount_due - invoice.amount_paid, 0)
    if payload.amount > remaining:
        raise HTTPException(status_code=400, detail="Payment amount exceeds remaining balance")

    receipt_number = f"REC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{invoice.id[:8].upper()}-{len(invoice.payments) + 1:02d}"
    payment = TuitionPayment(
        school_id=invoice.school_id,
        invoice_id=invoice.id,
        student_id=invoice.student_id,
        amount=payload.amount,
        payment_method=payload.payment_method,
        receipt_number=receipt_number,
        notes=payload.notes,
    )
    invoice.amount_paid += payload.amount
    _update_invoice_status(invoice)

    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


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
