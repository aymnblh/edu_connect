from datetime import date, datetime, time, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models import UserRole
from app.modules.meetings.models import MeetingSlot
from app.modules.meetings.routers import meetings as meetings_router
from app.modules.schools.calendar import ALGERIA_TZ
from tests.test_access_control_boundaries import FakeDb, FakeResult, make_user, run

TOMORROW = (datetime.now(ALGERIA_TZ) + timedelta(days=1)).date()


def _batch(**overrides):
    data = {"date": TOMORROW, "start_time": time(16, 0), "end_time": time(17, 0), "slot_minutes": 15}
    data.update(overrides)
    return meetings_router.SlotBatchCreate(**data)


def _slot(**overrides):
    data = {
        "id": "slot-a",
        "school_id": "school-a",
        "teacher_id": "teacher-a",
        "class_id": None,
        "starts_at": datetime.now(timezone.utc) + timedelta(days=2),
        "ends_at": datetime.now(timezone.utc) + timedelta(days=2, minutes=15),
        "location": "B2",
    }
    data.update(overrides)
    return MeetingSlot(**data)


def test_slot_batches_are_validated():
    with pytest.raises(ValidationError):
        _batch(end_time=time(15, 0))
    with pytest.raises(ValidationError):
        _batch(start_time=time(8, 0), end_time=time(20, 0), slot_minutes=5)


def test_teacher_creates_consecutive_slots_in_algeria_time():
    db = FakeDb(results=[FakeResult(), FakeResult([("teacher-a", "Teacher A")])])
    out = run(meetings_router.create_slots(_batch(location=" Salle B2 "), current_user=make_user("teacher-a", UserRole.teacher), db=db))

    assert len(out) == 4
    first = out[0].starts_at.astimezone(ALGERIA_TZ)
    assert (first.date(), first.hour, first.minute) == (TOMORROW, 16, 0)
    assert out[-1].ends_at.astimezone(ALGERIA_TZ).hour == 17
    assert out[0].location == "Salle B2"
    assert not any(slot.is_booked for slot in out)


def test_slot_creation_rules():
    teacher = make_user("teacher-a", UserRole.teacher)
    with pytest.raises(HTTPException) as exc:
        run(meetings_router.create_slots(_batch(), current_user=make_user("parent-a", UserRole.parent), db=FakeDb()))
    assert exc.value.status_code == 403

    yesterday = TOMORROW - timedelta(days=2)
    with pytest.raises(HTTPException) as exc:
        run(meetings_router.create_slots(_batch(date=yesterday), current_user=teacher, db=FakeDb()))
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        run(meetings_router.create_slots(_batch(), current_user=teacher, db=FakeDb(results=[FakeResult(["slot-x"])])))
    assert exc.value.status_code == 409

    with pytest.raises(HTTPException) as exc:
        run(meetings_router.create_slots(_batch(class_id="class-b"), current_user=teacher, db=FakeDb(results=[FakeResult()])))
    assert exc.value.status_code == 403


def test_parent_cannot_book_for_a_child_the_teacher_does_not_teach():
    db = FakeDb(get_map={(MeetingSlot, "slot-a"): _slot()}, results=[FakeResult()])
    with pytest.raises(HTTPException) as exc:
        run(meetings_router.book_slot(
            "slot-a", meetings_router.BookRequest(student_id="s1"),
            current_user=make_user("parent-a", UserRole.parent), db=db,
        ))
    assert exc.value.status_code == 403


def test_one_upcoming_meeting_per_teacher_and_child():
    db = FakeDb(get_map={(MeetingSlot, "slot-a"): _slot()}, results=[FakeResult(["class-a"]), FakeResult(["slot-z"])])
    with pytest.raises(HTTPException) as exc:
        run(meetings_router.book_slot(
            "slot-a", meetings_router.BookRequest(student_id="s1"),
            current_user=make_user("parent-a", UserRole.parent), db=db,
        ))
    assert exc.value.status_code == 409


def test_booking_race_is_lost_cleanly():
    db = FakeDb(
        get_map={(MeetingSlot, "slot-a"): _slot()},
        results=[FakeResult(["class-a"]), FakeResult(), SimpleNamespace(rowcount=0)],
    )
    with pytest.raises(HTTPException) as exc:
        run(meetings_router.book_slot(
            "slot-a", meetings_router.BookRequest(student_id="s1"),
            current_user=make_user("parent-a", UserRole.parent), db=db,
        ))
    assert exc.value.status_code == 409
    assert db.commits == 0


def test_successful_booking_notifies_the_teacher(monkeypatch):
    notified = []

    async def fake_notification(*_args, **kwargs):
        notified.append(kwargs)

    monkeypatch.setattr(meetings_router, "create_notification", fake_notification)
    slot = _slot()
    db = FakeDb(
        get_map={(MeetingSlot, "slot-a"): slot},
        results=[
            FakeResult(["class-a"]),
            FakeResult(),
            SimpleNamespace(rowcount=1),
            FakeResult([("s1", "Amine")]),
            FakeResult([("teacher-a", "Teacher A"), ("parent-a", "Parent A")]),
            FakeResult([("s1", "Amine")]),
        ],
    )
    out = run(meetings_router.book_slot(
        "slot-a", meetings_router.BookRequest(student_id="s1", note="  Les maths  "),
        current_user=make_user("parent-a", UserRole.parent), db=db,
    ))
    assert out.booked_by_me and out.student_name == "Amine" and out.note == "Les maths"
    assert notified[0]["user_id"] == "teacher-a"
    assert "Amine" in notified[0]["content"]
    assert db.commits == 1


def test_other_parents_only_see_that_a_slot_is_taken():
    slot = _slot(parent_id="parent-b", student_id="s9", note="private")
    db = FakeDb(results=[FakeResult([("teacher-a", "Teacher A"), ("parent-b", "Parent B")]), FakeResult([("s9", "Yasmine")])])
    out = run(meetings_router._serialize(db, [slot], make_user("parent-a", UserRole.parent)))[0]
    assert out.is_booked and not out.booked_by_me
    assert (out.parent_name, out.student_name, out.note) == (None, None, None)


def test_cancellation_frees_the_slot_and_tells_the_other_side(monkeypatch):
    notified = []

    async def fake_notification(*_args, **kwargs):
        notified.append(kwargs)

    monkeypatch.setattr(meetings_router, "create_notification", fake_notification)
    slot = _slot(parent_id="parent-a", student_id="s1")

    with pytest.raises(HTTPException) as exc:
        run(meetings_router.cancel_booking(
            "slot-a", current_user=make_user("parent-z", UserRole.parent),
            db=FakeDb(get_map={(MeetingSlot, "slot-a"): slot}),
        ))
    assert exc.value.status_code == 403

    db = FakeDb(get_map={(MeetingSlot, "slot-a"): slot}, results=[FakeResult([("teacher-a", "Teacher A")])])
    out = run(meetings_router.cancel_booking("slot-a", current_user=make_user("teacher-a", UserRole.teacher), db=db))
    assert not out.is_booked and slot.student_id is None
    assert notified[0]["user_id"] == "parent-a"
