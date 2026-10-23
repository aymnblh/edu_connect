"""School fees: bulk billing, payments, reminders and the parent view."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models import (
    AuditEvent,
    Class,
    Notification,
    School,
    Student,
    TuitionInvoice,
    TuitionInvoiceStatus,
    TuitionPayment,
    User,
    UserRole,
)
from app.modules.finance import fees
from app.modules.finance.routers import finance
from app.modules.schools.calendar import ALGERIA_TZ
from app.schemas import BulkInvoiceCreate, FeeSettings, InvoiceUpdate, PaymentCancel, ReminderRequest, TuitionPaymentCreate
from tests.test_access_control_boundaries import FakeResult, make_request, make_user, run
from tests.test_growth_features import LenientDb

NOW = datetime(2026, 10, 20, 10, 0, tzinfo=ALGERIA_TZ)


def _invoice(**overrides):
    data = dict(id="inv-1", school_id="school-a", student_id="s1", label="Frais T1", amount_due=8500.0,
                amount_paid=0.0, status=TuitionInvoiceStatus.unpaid, reminder_count=0, last_reminded_at=None,
                due_date=datetime(2026, 10, 10, 23, 59, tzinfo=ALGERIA_TZ), created_at=NOW)
    data.update(overrides)
    invoice = TuitionInvoice(**data)
    invoice.payments = []
    return invoice


def _parent(user_id="parent-a"):
    return User(id=user_id, school_id="school-a", email=f"{user_id}@wasel-edu.dz", full_name="Parent",
                role=UserRole.parent, push_token=None)


def _student():
    return Student(id="s1", school_id="school-a", student_id="EDU26-001", full_name="Amina Benali")


def _notification_results(*parents):
    """What create_notification reads for each parent: the user, then their preferences."""
    results = []
    for parent in parents:
        results += [FakeResult([parent]), FakeResult([])]
    return results


DIRECTOR = make_user("director-a", UserRole.principal)


# ── Rules ────────────────────────────────────────────────────────────────────

def test_amounts_read_like_algerian_dinars():
    assert fees.format_da(8500) == "8 500 DA"
    assert fees.format_da(8500.5) == "8 500,50 DA"
    assert fees.format_da(1234567) == "1 234 567 DA"


def test_overdue_days_count_in_algeria_time_and_stop_once_paid():
    invoice = _invoice()
    assert fees.days_overdue(invoice, NOW) == 10
    assert fees.remaining(invoice) == 8500.0
    invoice.amount_paid = 8500.0
    assert fees.days_overdue(invoice, NOW) == 0
    assert fees.days_overdue(_invoice(due_date=None), NOW) == 0


def test_automatic_reminders_follow_the_schedule():
    soon = datetime(2026, 10, 22, 23, 59, tzinfo=ALGERIA_TZ)
    assert fees.due_for_auto_reminder(_invoice(due_date=soon), NOW)  # heads-up 2 days before
    assert not fees.due_for_auto_reminder(_invoice(due_date=soon, reminder_count=1), NOW)
    assert not fees.due_for_auto_reminder(_invoice(due_date=soon + timedelta(days=5)), NOW)
    assert fees.due_for_auto_reminder(_invoice(), NOW)  # overdue, never reminded
    assert not fees.due_for_auto_reminder(_invoice(last_reminded_at=NOW - timedelta(days=3), reminder_count=1), NOW)
    assert fees.due_for_auto_reminder(_invoice(last_reminded_at=NOW - timedelta(days=8), reminder_count=1), NOW)
    assert not fees.due_for_auto_reminder(_invoice(reminder_count=4), NOW)  # capped
    assert not fees.due_for_auto_reminder(_invoice(), NOW.replace(hour=22))  # not at night
    assert not fees.due_for_auto_reminder(_invoice(amount_paid=8500.0), NOW)


def test_reminder_text_is_polite_and_precise():
    title, content = fees.reminder_text(_invoice(amount_paid=4000.0), "Amina", NOW)
    assert title == "Rappel : frais de scolarité"
    assert "reste à payer 4 500 DA" in content and "10/10/2026" in content and "Amina" in content


def test_payment_methods_are_a_fixed_list():
    assert TuitionPaymentCreate(amount=100, payment_method="ccp").payment_method == "ccp"
    with pytest.raises(ValidationError):
        TuitionPaymentCreate(amount=100, payment_method="bitcoin")
    with pytest.raises(ValidationError):
        TuitionPaymentCreate(amount=0)


# ── Administration ───────────────────────────────────────────────────────────

def test_only_school_administration_manages_fees():
    teacher = make_user("teacher-a", UserRole.teacher)
    with pytest.raises(HTTPException) as exc:
        run(finance.fee_ledger(current_user=teacher, db=LenientDb()))
    assert exc.value.status_code == 403
    with pytest.raises(HTTPException):
        run(finance.create_invoices_for_class(BulkInvoiceCreate(label="Frais", amount_due=100), make_request("/finance/invoices/bulk"),
                                              current_user=teacher, db=LenientDb()))
    with pytest.raises(HTTPException) as exc:
        run(finance.update_fee_settings(FeeSettings(auto_reminders=True), make_request("/finance/settings", "PUT"),
                                        current_user=make_user("secretary-a", UserRole.secretary), db=LenientDb()))
    assert exc.value.status_code == 403


def test_bulk_billing_skips_students_already_billed():
    db = LenientDb(results=[FakeResult(["s1", "s2", "s3"]), FakeResult(["s2"])])
    payload = BulkInvoiceCreate(label=" Frais T1 ", amount_due=8500, due_date="2026-11-05")
    result = run(finance.create_invoices_for_class(payload, make_request("/finance/invoices/bulk"), current_user=DIRECTOR, db=db))
    assert result == {"created": 2, "skipped": 1}
    invoices = [item for item in db.added if isinstance(item, TuitionInvoice)]
    assert sorted(invoice.student_id for invoice in invoices) == ["s1", "s3"]
    assert invoices[0].label == "Frais T1" and invoices[0].school_id == "school-a"
    assert invoices[0].due_date == datetime(2026, 11, 5, 23, 59, tzinfo=ALGERIA_TZ)
    audit = next(item for item in db.added if isinstance(item, AuditEvent))
    assert audit.action == "fees.invoices_created" and audit.event_metadata["created"] == 2


def test_bulk_billing_refuses_another_schools_class():
    db = LenientDb(get_map={(Class, "c9"): Class(id="c9", school_id="school-b", name="1AM", join_code="X")})
    with pytest.raises(HTTPException) as exc:
        run(finance.create_invoices_for_class(BulkInvoiceCreate(label="Frais", amount_due=100, class_id="c9"),
                                              make_request("/finance/invoices/bulk"), current_user=DIRECTOR, db=db))
    assert exc.value.status_code == 404


def test_a_payment_updates_the_balance_tells_the_parents_and_is_audited():
    invoice = _invoice()
    parent = _parent()
    db = LenientDb(get_map={(Student, "s1"): _student()},
                   results=[FakeResult([invoice]), FakeResult(["parent-a"])] + _notification_results(parent))
    payment = run(finance.record_payment("inv-1", TuitionPaymentCreate(amount=4000, payment_method="ccp"),
                                         make_request("/finance/invoices/inv-1/payments"), current_user=DIRECTOR, db=db))
    assert payment.amount == 4000 and payment.receipt_number.startswith("REC-")
    assert invoice.amount_paid == 4000 and invoice.status == TuitionInvoiceStatus.partial
    note = next(item for item in db.added if isinstance(item, Notification))
    assert note.user_id == "parent-a" and "4 000 DA" in note.content and "4 500 DA" in note.content
    audit = next(item for item in db.added if isinstance(item, AuditEvent))
    assert audit.action == "fees.payment_recorded" and audit.event_metadata["method"] == "ccp"


def test_a_payment_cannot_exceed_what_is_left():
    db = LenientDb(results=[FakeResult([_invoice(amount_paid=8000.0)])])
    with pytest.raises(HTTPException) as exc:
        run(finance.record_payment("inv-1", TuitionPaymentCreate(amount=600), make_request("/x"), current_user=DIRECTOR, db=db))
    assert exc.value.status_code == 400


def test_cancelling_a_payment_restores_the_balance_and_keeps_the_reason():
    invoice = _invoice(amount_paid=8500.0, status=TuitionInvoiceStatus.paid)
    payment = TuitionPayment(id="p1", school_id="school-a", invoice_id="inv-1", student_id="s1", amount=8500.0,
                             payment_method="cash", receipt_number="REC-1")
    db = LenientDb(get_map={(TuitionPayment, "p1"): payment}, results=[FakeResult([invoice])])
    result = run(finance.cancel_payment("p1", PaymentCancel(reason="Saisi deux fois"), make_request("/x"),
                                        current_user=DIRECTOR, db=db))
    assert result == {"cancelled": True, "remaining": 8500.0}
    assert invoice.status == TuitionInvoiceStatus.unpaid and db.deleted_instances == [payment]
    audit = next(item for item in db.added if isinstance(item, AuditEvent))
    assert audit.event_metadata["reason"] == "Saisi deux fois" and audit.event_metadata["receipt_number"] == "REC-1"


def test_another_schools_payment_cannot_be_cancelled():
    payment = TuitionPayment(id="p1", school_id="school-b", invoice_id="inv-1", student_id="s1", amount=1.0,
                             payment_method="cash", receipt_number="REC-1")
    db = LenientDb(get_map={(TuitionPayment, "p1"): payment})
    with pytest.raises(HTTPException) as exc:
        run(finance.cancel_payment("p1", PaymentCancel(reason="erreur"), make_request("/x"), current_user=DIRECTOR, db=db))
    assert exc.value.status_code == 404


def test_fees_with_payments_cannot_be_deleted_and_amounts_cannot_drop_below_paid():
    invoice = _invoice(amount_paid=1000.0)
    invoice.payments = [TuitionPayment(id="p1", amount=1000.0)]
    with pytest.raises(HTTPException):
        run(finance.delete_invoice("inv-1", make_request("/x", "DELETE"), current_user=DIRECTOR,
                                   db=LenientDb(results=[FakeResult([invoice])])))
    with pytest.raises(HTTPException):
        run(finance.update_invoice("inv-1", InvoiceUpdate(amount_due=500), make_request("/x", "PATCH"), current_user=DIRECTOR,
                                   db=LenientDb(results=[FakeResult([invoice])])))


def test_reminders_skip_recent_ones_and_count_students_without_parents():
    recent = _invoice(id="inv-r", last_reminded_at=datetime.now(timezone.utc) - timedelta(days=1), reminder_count=1)
    lonely = _invoice(id="inv-l", student_id="s2")
    due = _invoice(id="inv-d")
    db = LenientDb(
        get_map={(Student, "s1"): _student(), (Student, "s2"): Student(id="s2", school_id="school-a", full_name="Yacine")},
        results=[FakeResult([recent, lonely, due]), FakeResult([]), FakeResult(["parent-a"])] + _notification_results(_parent()),
    )
    result = run(finance.send_payment_reminders(ReminderRequest(all_overdue=True), make_request("/finance/reminders"),
                                                current_user=DIRECTOR, db=db))
    assert result == {"sent": 1, "skipped_recent": 1, "no_parent": 1}
    assert due.reminder_count == 1 and due.last_reminded_at is not None
    assert lonely.reminder_count == 0
    note = next(item for item in db.added if isinstance(item, Notification))
    assert note.type == "FEES" and "8 500 DA" in note.content


def test_the_director_turns_automatic_reminders_on():
    school = School(id="school-a", name="A", tenant_config={"max_parents_per_student": 2})
    db = LenientDb(get_map={(School, "school-a"): school})
    run(finance.update_fee_settings(FeeSettings(auto_reminders=True), make_request("/finance/settings", "PUT"),
                                    current_user=DIRECTOR, db=db))
    assert school.tenant_config == {"max_parents_per_student": 2, "fee_auto_reminders": True}


# ── Parents ──────────────────────────────────────────────────────────────────

def test_parents_only_see_their_own_childs_fees():
    with pytest.raises(HTTPException) as exc:
        run(finance.my_fees(student_id="s1", current_user=make_user("parent-z", UserRole.parent), db=LenientDb(results=[FakeResult()])))
    assert exc.value.status_code == 404
    with pytest.raises(HTTPException):
        run(finance.my_fees(student_id="s1", current_user=make_user("teacher-a", UserRole.teacher), db=LenientDb()))


def test_parent_view_lists_balance_and_receipts():
    invoice = _invoice(amount_paid=4000.0, status=TuitionInvoiceStatus.partial)
    invoice.payments = [TuitionPayment(id="p1", amount=4000.0, payment_method="cash", receipt_number="REC-1", paid_at=NOW)]
    db = LenientDb(
        get_map={(School, "school-a"): School(id="school-a", name="Les Oliviers"), (Student, "s1"): _student()},
        results=[FakeResult(["s1"]), FakeResult([invoice])],
    )
    view = run(finance.my_fees(student_id="s1", current_user=make_user("parent-a", UserRole.parent), db=db))
    assert view["school_name"] == "Les Oliviers" and view["total_remaining"] == 4500.0
    row = view["invoices"][0]
    assert row["remaining"] == 4500.0 and row["payments"][0]["receipt_number"] == "REC-1"


def test_ledger_totals_overdue_and_classes():
    late = _invoice(id="inv-1", amount_paid=2000.0, status=TuitionInvoiceStatus.partial,
                    due_date=datetime.now(timezone.utc) - timedelta(days=5))
    late.payments = [TuitionPayment(id="p1", amount=2000.0, payment_method="cash", receipt_number="R1",
                                    paid_at=datetime.now(timezone.utc))]
    paid = _invoice(id="inv-2", student_id="s2", amount_paid=8500.0, status=TuitionInvoiceStatus.paid)
    db = LenientDb(
        get_map={(School, "school-a"): School(id="school-a", name="A", tenant_config={"fee_auto_reminders": True})},
        results=[
            FakeResult([late, paid]),
            FakeResult([("s1", "Amina", "EDU26-001", None), ("s2", "Yacine", "EDU26-002", None)]),
            FakeResult([("s1", "c1", "1AM-A"), ("s2", "c1", "1AM-A")]),
            FakeResult([("s1", 1)]),
        ],
    )
    ledger = run(finance.fee_ledger(current_user=DIRECTOR, db=db))
    summary = ledger["summary"]
    assert summary["billed"] == 17000 and summary["collected"] == 10500 and summary["outstanding"] == 6500
    assert summary["overdue"] == 6500 and summary["overdue_students"] == 1 and summary["collection_rate"] == 61.8
    assert summary["collected_this_month"] >= 2000
    assert ledger["auto_reminders"] is True
    assert ledger["by_class"] == [{"class_id": "c1", "class_name": "1AM-A", "billed": 17000, "collected": 10500, "outstanding": 6500}]
    row = next(item for item in ledger["invoices"] if item["id"] == "inv-1")
    assert row["student_name"] == "Amina" and row["days_overdue"] >= 4 and row["parents_linked"] == 1
