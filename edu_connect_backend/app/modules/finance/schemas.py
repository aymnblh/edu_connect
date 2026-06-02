from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import TuitionInvoiceStatus


class TuitionInvoiceCreate(BaseModel):
    student_id: str
    label: str
    amount_due: float = Field(gt=0)
    due_date: datetime | None = None


class TuitionPaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    payment_method: str = "cash"
    notes: str | None = None


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
