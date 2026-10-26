from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models import AuditEvent, UserRole
from app.modules.announcements.models import Announcement, AnnouncementClass
from app.modules.announcements.routers import announcements as announcements_router
from tests.test_access_control_boundaries import FakeDb, FakeResult, compiled_sql, make_request, make_user, run


def _payload(**overrides):
    data = {"title": "Sortie au musee", "body": "Rendez-vous a 8h devant l'ecole.", "class_ids": ["class-a"]}
    data.update(overrides)
    return announcements_router.AnnouncementCreate(**data)


def test_calendar_entries_need_a_date_and_an_audience():
    with pytest.raises(ValidationError):
        _payload(category="holiday")
    with pytest.raises(ValidationError):
        _payload(class_ids=[])
    with pytest.raises(ValidationError):
        _payload(category="event", starts_on=date(2026, 11, 3), ends_on=date(2026, 11, 1))
    assert _payload(category="holiday", starts_on=date(2026, 12, 20), ends_on=date(2027, 1, 4)).whole_school is False


def test_teacher_cannot_post_to_whole_school_or_other_classes():
    request = make_request("/announcements/")
    teacher = make_user("teacher-a", UserRole.teacher)

    with pytest.raises(HTTPException) as exc:
        run(announcements_router.create_announcement(
            _payload(whole_school=True, class_ids=[]), request=request, current_user=teacher, db=FakeDb(),
        ))
    assert exc.value.status_code == 403

    db = FakeDb(results=[FakeResult(["class-a"])])
    with pytest.raises(HTTPException) as exc:
        run(announcements_router.create_announcement(
            _payload(class_ids=["class-b"]), request=request, current_user=teacher, db=db,
        ))
    assert exc.value.status_code == 403
    assert db.added == []


def test_parents_cannot_post_announcements():
    with pytest.raises(HTTPException) as exc:
        run(announcements_router.create_announcement(
            _payload(), request=make_request("/announcements/"),
            current_user=make_user("parent-a", UserRole.parent), db=FakeDb(),
        ))
    assert exc.value.status_code == 403


def test_admin_class_announcement_notifies_class_parents_and_teachers(monkeypatch):
    notified = []

    async def fake_notification(*_args, **kwargs):
        notified.append(kwargs)

    monkeypatch.setattr(announcements_router, "create_notification", fake_notification)
    db = FakeDb(results=[FakeResult(["class-a"]), FakeResult(["parent-a", "teacher-a"]), FakeResult()])

    out = run(announcements_router.create_announcement(
        _payload(category="meeting", starts_on=date(2026, 11, 5)),
        request=make_request("/announcements/"),
        current_user=make_user("principal-a", UserRole.principal),
        db=db,
    ))

    assert out.recipient_count == 2
    assert out.class_ids == ["class-a"]
    assert [call["user_id"] for call in notified] == ["parent-a", "teacher-a"]
    assert notified[0]["title"] == "Reunion : Sortie au musee"
    assert notified[0]["type"] == "ANNOUNCEMENT"
    saved = [item for item in db.added if isinstance(item, Announcement)]
    targets = [item for item in db.added if isinstance(item, AnnouncementClass)]
    assert saved[0].recipient_count == 2
    assert [(t.announcement_id, t.class_id) for t in targets] == [(saved[0].id, "class-a")]
    assert [e.action for e in db.added if isinstance(e, AuditEvent)] == ["announcement.created"]
    recipients_sql = compiled_sql(db.executed[1])
    assert "users.deactivated_at IS NULL" in recipients_sql
    assert "users.id != 'principal-a'" in recipients_sql


def test_parent_only_sees_school_wide_and_own_children_class_announcements():
    db = FakeDb(results=[FakeResult(["class-a"]), FakeResult()])
    result = run(announcements_router.list_announcements(
        calendar_only=False, limit=200, current_user=make_user("parent-a", UserRole.parent), db=db,
    ))
    assert result == []
    sql = compiled_sql(db.executed[1])
    assert "announcements.school_id = 'school-a'" in sql
    assert "announcements.whole_school IS true" in sql
    assert "announcement_classes.class_id IN ('class-a')" in sql


def test_teacher_cannot_delete_someone_elses_announcement():
    announcement = Announcement(
        id="ann-a", school_id="school-a", title="T", body="B", category="announcement",
        whole_school=True, created_by="principal-a",
    )
    db = FakeDb(results=[FakeResult(["class-a"]), FakeResult([announcement])])
    with pytest.raises(HTTPException) as exc:
        run(announcements_router.delete_announcement(
            "ann-a", request=make_request("/announcements/ann-a", method="DELETE"),
            current_user=make_user("teacher-a", UserRole.teacher), db=db,
        ))
    assert exc.value.status_code == 403
    assert db.deleted_instances == []
