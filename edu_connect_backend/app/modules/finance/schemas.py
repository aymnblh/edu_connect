from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import TuitionInvoiceStatus


class TuitionInvoiceCreate(BaseModel):
    student_id: str
    label: str
    amount_due: float = Field(gt=0)
    due_date: datetime | None = None


PaymentMethod = Literal["cash", "bank_transfer", "ccp", "cheque"]
MAX_AMOUNT = 10_000_000


class TuitionPaymentCreate(BaseModel):
    amount: float = Field(gt=0, le=MAX_AMOUNT)
    payment_method: PaymentMethod = "cash"
    notes: str | None = Field(default=None, max_length=500)


class BulkInvoiceCreate(BaseModel):
    """The same fee for every active student of a class, or of the whole school."""
    label: str = Field(min_length=2, max_length=255)
    amount_due: float = Field(gt=0, le=MAX_AMOUNT)
    due_date: date | None = None
    class_id: str | None = Field(default=None, max_length=36)


class InvoiceUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=2, max_length=255)
    amount_due: float | None = Field(default=None, gt=0, le=MAX_AMOUNT)
    due_date: date | None = None
    clear_due_date: bool = False


class PaymentCancel(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


class ReminderRequest(BaseModel):
    """Either explicit invoices, or every overdue one."""
    invoice_ids: list[str] = Field(default_factory=list, max_length=500)
    all_overdue: bool = False


class FeeSettings(BaseModel):
    auto_reminders: bool


class TuitionPaymentOut(BaseModel):
    id: str
    school_id: str
    invoice_id: str
    student_id: str
    amount: float
    payment_method: str
    receipt_number: str
    notes: str | None
    paid_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TuitionInvoiceOut(BaseModel):
    # Amounts are exact decimals in the database and plain numbers in JSON.
    id: str
    school_id: str
    student_id: str
    label: str
    amount_due: float
    amount_paid: float
    status: TuitionInvoiceStatus
    due_date: datetime | None
    created_at: datetime
    payments: list[TuitionPaymentOut] = []
    model_config = ConfigDict(from_attributes=True)
