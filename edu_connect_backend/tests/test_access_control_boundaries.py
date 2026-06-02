import asyncio
from types import SimpleNamespace
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.dialects import postgresql

from app.core import security
from app.core.access import assert_class_read_access, assert_parent_linked_to_student, assert_teacher_for_class
from app.core.middleware import AuditMiddleware
from app.models import (
    AuditEvent,
    Attendance,
    AttendanceStatus,
    Class,
    ClassMember,
    ClassTemporaryAccess,
    Conversation,
    ConversationParticipant,
    ConversationType,
    DirectMessage,
    Grade,
    MediaAttachment,
    MessageBlock,
    Message,
    Remark,
    RemarkType,
    School,
    Student,
    StudentParent,
    RefreshToken,
    User,
    UserRole,
)
from app.modules.auth.routers import auth
from app.modules.academics.routers import grades as grades_router
from app.modules.academics.routers import homework as homework_router
from app.modules.academics.routers import lessons as lessons_router
from app.modules.academics.routers import classes as classes_router
from app.modules.attendance.routers import attendance as attendance_router
from app.modules.attendance.routers import remarks as remarks_router
from app.modules.core.routers import media
from app.modules.finance.routers import finance as finance_router
from app.modules.core.routers.security import export_student_record, purge_audit_retention
from app.modules.messaging.routers import chat, dm
from app.modules.notifications.routers import notifications as notifications_router
from app.modules.schedule.routers import schedule as schedule_router
from app.modules.schools.routers import admin, system
from app.core.rate_limit import check_rate_limit
from app.utils import notifications


def run(coro):
    return asyncio.run(coro)


def compiled_sql(statement) -> str:
    return str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )


def make_user(user_id: str, role: UserRole, school_id: str = "school-a") -> User:
    return User(
        id=user_id,
        school_id=school_id,
        email=f"{user_id}@example.test",
        full_name=user_id.replace("-", " ").title(),
        role=role,
    )


class FakeResult:
    def __init__(self, rows=None):
        self.rows = rows or []

    def scalar_one(self):
        if not self.rows:
            raise AssertionError("Expected one row")
        return self.rows[0]

    def scalar_one_or_none(self):
        return self.rows[0] if self.rows else None

    def scalars(self):
        return self

    def unique(self):
        return self

    def all(self):
        return self.rows


class FakeDb:
    def __init__(self, *, get_map=None, results=None):
        self.get_map = get_map or {}
        self.results = list(results or [])
        self.executed = []
        self.added = []
        self.deleted_instances = []
        self.commits = 0
        self.flushes = 0
        self.refreshed = []

    async def get(self, model, key):
        return self.get_map.get((model, key))

    async def execute(self, _stmt, *_args, **_kwargs):
        self.executed.append(_stmt)
        if not self.results:
            raise AssertionError("Unexpected database query")
        return self.results.pop(0)

    def add(self, instance):
        self.added.append(instance)

    async def delete(self, instance):
        self.deleted_instances.append(instance)

    async def flush(self):
        self.flushes += 1

    async def commit(self):
        self.commits += 1

    async def refresh(self, instance):
        self.refreshed.append(instance)


def make_request(path: str, method: str = "POST"):
    return SimpleNamespace(
        method=method,
        url=SimpleNamespace(path=path),
        headers={"user-agent": "pytest-agent"},
        state=SimpleNamespace(
            device_fingerprint="fingerprint-a",
            device_platform="pytest",
            ip_address="203.0.113.10",
        ),
    )


def test_class_message_with_explicit_recipients_is_visible_only_to_recipients():
    message = Message(
        id="message-1",
        school_id="school-a",
        class_id="class-a",
        sender_id="teacher-a",
        sender_name="Teacher A",
        content="Private note",
        recipient_ids=["teacher-a", "parent-a"],
    )

    assert chat._can_view_message(message, make_user("parent-a", UserRole.parent))
    assert not chat._can_view_message(message, make_user("parent-b", UserRole.parent))
    assert not chat._can_view_message(message, make_user("teacher-b", UserRole.teacher))


def test_legacy_parent_class_message_is_not_visible_to_other_parents():
    message = Message(
        id="message-1",
        school_id="school-a",
        class_id="class-a",
        sender_id="parent-a",
        sender_name="Parent A",
        content="Legacy parent message",
        recipient_ids=None,
        is_announcement=False,
    )

    assert chat._can_view_message(message, make_user("parent-a", UserRole.parent))
    assert chat._can_view_message(message, make_user("teacher-a", UserRole.teacher))
    assert not chat._can_view_message(message, make_user("parent-b", UserRole.parent))


def test_parent_cannot_address_other_parent_in_class_chat(monkeypatch):
    async def fake_audience(*_args, **_kwargs):
        return {"teacher-a", "admin-a", "parent-a", "parent-b"}

    async def fake_parent_ids(*_args, **_kwargs):
        return {"parent-a", "parent-b"}

    monkeypatch.setattr(chat, "_class_audience_ids", fake_audience)
    monkeypatch.setattr(chat, "_class_parent_ids", fake_parent_ids)

    with pytest.raises(HTTPException) as exc:
        run(
            chat._resolve_class_message_recipients(
                class_id="class-a",
                school_id="school-a",
                sender=make_user("parent-a", UserRole.parent),
                is_announcement=False,
                requested_ids=["parent-b"],
                db=FakeDb(),
            )
    )

    assert exc.value.status_code == 403


def test_group_broadcasts_are_one_way_for_parents():
    conversation = Conversation(
        id="conversation-a",
        school_id="school-a",
        type=ConversationType.group,
        created_by="teacher-a",
    )

    with pytest.raises(HTTPException) as exc:
        dm._assert_can_send_in_conversation(conversation, make_user("parent-a", UserRole.parent))

    assert exc.value.status_code == 403

    dm._assert_can_send_in_conversation(conversation, make_user("teacher-a", UserRole.teacher))


def test_dm_block_prevents_direct_message_send():
    block = MessageBlock(
        id="block-a",
        school_id="school-a",
        blocker_id="parent-a",
        blocked_user_id="teacher-a",
    )
    db = FakeDb(results=[FakeResult([block])])

    with pytest.raises(HTTPException) as exc:
        run(
            dm._assert_not_message_blocked(
                make_user("teacher-a", UserRole.teacher),
                make_user("parent-a", UserRole.parent),
                db,
            )
        )

    assert exc.value.status_code == 403


def test_parent_cannot_block_admin_account():
    db = FakeDb(results=[FakeResult([make_user("principal-a", UserRole.principal)])])

    with pytest.raises(HTTPException) as exc:
        run(
            dm.block_message_user(
                "principal-a",
                current_user=make_user("parent-a", UserRole.parent),
                db=db,
            )
        )

    assert exc.value.status_code == 400


def test_report_requires_reported_user_to_be_conversation_participant():
    conversation = Conversation(
        id="conversation-a",
        school_id="school-a",
        type=ConversationType.direct,
        created_by="teacher-a",
    )
    participant = ConversationParticipant(
        conversation_id="conversation-a",
        school_id="school-a",
        user_id="parent-a",
    )
    db = FakeDb(results=[FakeResult([conversation]), FakeResult([participant]), FakeResult()])

    with pytest.raises(HTTPException) as exc:
        run(
            dm.report_conversation_message(
                "conversation-a",
                dm.CreateMessageReportRequest(
                    reported_user_id="teacher-a",
                    reason="spam",
                ),
                current_user=make_user("parent-a", UserRole.parent),
                db=db,
            )
        )

    assert exc.value.status_code == 400


def test_direct_messages_require_explicit_conversation_participant():
    conversation = Conversation(
        id="conversation-a",
        school_id="school-a",
        type=ConversationType.direct,
        created_by="teacher-a",
    )
    db = FakeDb(results=[FakeResult([conversation]), FakeResult()])

    with pytest.raises(HTTPException) as exc:
        run(
            dm._assert_participant(
                make_user("parent-b", UserRole.parent),
                "conversation-a",
                db,
            )
        )

    assert exc.value.status_code == 403


def test_bulk_dm_fanout_has_recipient_cap_before_any_write():
    request = dm.CreateBulkConversationsRequest(
        recipient_ids=[f"parent-{index}" for index in range(51)],
        initial_message="Hello",
    )

    with pytest.raises(HTTPException) as exc:
        run(
            dm.create_bulk_direct_conversations(
                request,
                current_user=make_user("teacher-a", UserRole.teacher),
                db=FakeDb(),
            )
        )

    assert exc.value.status_code == 400
    assert "50" in exc.value.detail


def test_temporary_teacher_read_access_is_time_bounded_and_read_only():
    now = datetime.now(timezone.utc)
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")
    temp_access = ClassTemporaryAccess(
        school_id="school-a",
        class_id="class-a",
        user_id="teacher-a",
        access_level="read",
        starts_at=now - timedelta(hours=1),
        expires_at=now + timedelta(hours=1),
        granted_by="admin-a",
    )

    read_db = FakeDb(
        get_map={(Class, "class-a"): cls},
        results=[FakeResult(), FakeResult([temp_access])],
    )
    assert run(
        assert_teacher_for_class(
            "class-a",
            make_user("teacher-a", UserRole.teacher),
            read_db,
            write=False,
        )
    ) is cls

    write_db = FakeDb(
        get_map={(Class, "class-a"): cls},
        results=[FakeResult(), FakeResult([temp_access])],
    )
    with pytest.raises(HTTPException) as exc:
        run(
            assert_teacher_for_class(
                "class-a",
                make_user("teacher-a", UserRole.teacher),
                write_db,
                write=True,
            )
        )

    assert exc.value.status_code == 403


def test_parent_class_read_access_requires_same_school():
    cls = Class(id="class-b", school_id="school-b", name="3B", join_code="XYZ987")
    db = FakeDb(get_map={(Class, "class-b"): cls})

    with pytest.raises(HTTPException) as exc:
        run(
            assert_class_read_access(
                "class-b",
                make_user("parent-a", UserRole.parent, school_id="school-a"),
                db,
            )
        )

    assert exc.value.status_code == 403
    assert db.executed == []


def test_parent_relationship_helpers_filter_by_school_id():
    db = FakeDb(results=[FakeResult(["student-a"])])

    run(
        assert_parent_linked_to_student(
            "student-a",
            "parent-a",
            db,
            school_id="school-a",
        )
    )

    assert "student_parents.school_id = 'school-a'" in compiled_sql(db.executed[0])


def test_parent_class_payload_filters_members_to_linked_children():
    linked = Student(
        id="student-a",
        school_id="school-a",
        student_id="S-001",
        full_name="Linked Student",
    )
    other = Student(
        id="student-b",
        school_id="school-a",
        student_id="S-002",
        full_name="Other Student",
    )
    cls = Class(
        id="class-a",
        school_id="school-a",
        name="3A",
        join_code="ABC123",
        members=[
            ClassMember(school_id="school-a", class_id="class-a", student_id="student-a", student=linked),
            ClassMember(school_id="school-a", class_id="class-a", student_id="student-b", student=other),
        ],
    )

    payload = classes_router._class_out(cls, member_filter={"student-a"})

    assert [member.id for member in payload["members"]] == ["student-a"]


def test_teachers_cannot_write_grades_or_attendance_for_unassigned_classes():
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")
    teacher = make_user("teacher-a", UserRole.teacher)

    with pytest.raises(HTTPException) as grade_exc:
        run(
            grades_router.add_grade(
                "class-a",
                grades_router.GradeCreate(
                    student_id="student-a",
                    student_name="Student A",
                    subject="Math",
                    score=14,
                ),
                current_user=teacher,
                db=FakeDb(
                    get_map={(Class, "class-a"): cls},
                    results=[FakeResult(), FakeResult()],
                ),
            )
        )

    assert grade_exc.value.status_code == 403

    with pytest.raises(HTTPException) as attendance_exc:
        run(
            attendance_router.mark_attendance(
                "class-a",
                attendance_router.AttendanceCreate(
                    student_id="student-a",
                    student_name="Student A",
                    status=AttendanceStatus.present,
                ),
                current_user=teacher,
                db=FakeDb(
                    get_map={(Class, "class-a"): cls},
                    results=[FakeResult(), FakeResult()],
                ),
            )
        )

    assert attendance_exc.value.status_code == 403


def test_parent_grade_queries_are_limited_to_linked_students_in_same_school():
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")
    student = Student(
        id="student-a",
        school_id="school-a",
        student_id="S-001",
        full_name="Student A",
    )
    db = FakeDb(
        get_map={(Class, "class-a"): cls},
        results=[
            FakeResult(["student-a"]),
            FakeResult([student]),
            FakeResult(["student-a"]),
            FakeResult(),
        ],
    )

    grades = run(
        grades_router.student_grades(
            "class-a",
            "student-a",
            current_user=make_user("parent-a", UserRole.parent),
            db=db,
        )
    )

    assert grades == []
    executed_sql = [compiled_sql(statement) for statement in db.executed]
    assert "class_members.school_id = 'school-a'" in executed_sql[0]
    assert "student_parents.school_id = 'school-a'" in executed_sql[0]
    assert "class_members.school_id = 'school-a'" in executed_sql[1]
    assert "students.school_id = 'school-a'" in executed_sql[1]
    assert "student_parents.school_id = 'school-a'" in executed_sql[2]
    assert "grades.school_id = 'school-a'" in executed_sql[3]
    assert "student_parents.school_id = 'school-a'" in executed_sql[3]


def test_parent_attendance_and_remark_queries_are_limited_to_same_school_links():
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")
    student = Student(
        id="student-a",
        school_id="school-a",
        student_id="S-001",
        full_name="Student A",
    )

    attendance_db = FakeDb(
        get_map={(Class, "class-a"): cls},
        results=[
            FakeResult(["student-a"]),
            FakeResult([student]),
            FakeResult(["student-a"]),
            FakeResult(),
        ],
    )
    attendance = run(
        attendance_router.student_attendance(
            "class-a",
            "student-a",
            current_user=make_user("parent-a", UserRole.parent),
            db=attendance_db,
        )
    )

    assert attendance == []
    attendance_sql = compiled_sql(attendance_db.executed[-1])
    assert "attendance.school_id = 'school-a'" in attendance_sql
    assert "student_parents.school_id = 'school-a'" in attendance_sql

    remarks_db = FakeDb(
        get_map={(Class, "class-a"): cls},
        results=[
            FakeResult(["student-a"]),
            FakeResult([student]),
            FakeResult(["student-a"]),
            FakeResult(),
        ],
    )
    remarks = run(
        remarks_router.student_remarks(
            "class-a",
            "student-a",
            current_user=make_user("parent-a", UserRole.parent),
            db=remarks_db,
        )
    )

    assert remarks == []
    remarks_sql = compiled_sql(remarks_db.executed[-1])
    assert "remarks.school_id = 'school-a'" in remarks_sql
    assert "student_parents.school_id = 'school-a'" in remarks_sql


def test_parent_justification_waits_for_admin_acceptance():
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")
    record = Attendance(
        id="attendance-a",
        school_id="school-a",
        class_id="class-a",
        student_id="student-a",
        student_name="Student A",
        status=AttendanceStatus.absent,
        date=datetime.now(timezone.utc),
        is_justified=False,
    )
    db = FakeDb(
        get_map={(Class, "class-a"): cls, (Attendance, "attendance-a"): record},
        results=[
            FakeResult(["student-a"]),
            FakeResult(["student-a"]),
            FakeResult([record]),
        ],
    )

    run(
        attendance_router.justify_absence(
            "class-a",
            "attendance-a",
            attendance_router.JustifyRequest(justification="Certificat medical transmis."),
            current_user=make_user("parent-a", UserRole.parent),
            db=db,
        )
    )

    assert record.justification_text == "Certificat medical transmis."
    assert record.is_justified is False
    assert db.commits == 1


def test_admin_acceptance_marks_attendance_justified():
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")
    record = Attendance(
        id="attendance-a",
        school_id="school-a",
        class_id="class-a",
        student_id="student-a",
        student_name="Student A",
        status=AttendanceStatus.absent,
        date=datetime.now(timezone.utc),
        is_justified=False,
        justification_text="Parent reason",
    )
    db = FakeDb(
        get_map={(Class, "class-a"): cls, (Attendance, "attendance-a"): record},
        results=[FakeResult([record])],
    )

    run(
        attendance_router.justify_absence(
            "class-a",
            "attendance-a",
            attendance_router.JustifyRequest(justification="Parent reason"),
            current_user=make_user("principal-a", UserRole.principal),
            db=db,
        )
    )

    assert record.justification_text == "Parent reason"
    assert record.is_justified is True
    assert db.commits == 1


def test_pending_attendance_dashboard_filters_to_unaccepted_absences():
    row = {
        "id": "attendance-a",
        "class_id": "class-a",
        "class_name": "3A",
        "student_id": "student-a",
        "student_name": "Student A",
        "status": AttendanceStatus.absent,
        "date": datetime.now(timezone.utc),
        "note": None,
        "is_justified": False,
        "justification_text": "Parent reason",
        "justification_attachment_url": None,
    }
    db = FakeDb(results=[FakeResult([row])])

    pending = run(
        admin.pending_attendance(
            current_user=make_user("principal-a", UserRole.principal),
            db=db,
        )
    )

    assert len(pending) == 1
    assert pending[0].student_name == "Student A"
    sql = compiled_sql(db.executed[0])
    assert "attendance.school_id = 'school-a'" in sql
    assert "classes.school_id = 'school-a'" in sql
    assert "attendance.status IN ('absent', 'late')" in sql
    assert "attendance.is_justified IS false" in sql


def test_homework_and_lesson_reads_filter_by_class_school():
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")

    homework_db = FakeDb(
        get_map={(Class, "class-a"): cls},
        results=[
            FakeResult(["teacher-a"]),
            FakeResult(),
        ],
    )
    homework = run(
        homework_router.list_homework(
            "class-a",
            current_user=make_user("teacher-a", UserRole.teacher),
            db=homework_db,
        )
    )

    assert homework == []
    assert "homework.school_id = 'school-a'" in compiled_sql(homework_db.executed[-1])

    lessons_db = FakeDb(
        get_map={(Class, "class-a"): cls},
        results=[
            FakeResult(["teacher-a"]),
            FakeResult(),
        ],
    )
    lessons = run(
        lessons_router.list_lesson_entries(
            "class-a",
            current_user=make_user("teacher-a", UserRole.teacher),
            db=lessons_db,
        )
    )

    assert lessons == []
    assert "lesson_entries.school_id = 'school-a'" in compiled_sql(lessons_db.executed[-1])


def test_notification_reads_and_updates_filter_by_user_school():
    user = make_user("parent-a", UserRole.parent)

    list_db = FakeDb(results=[FakeResult()])
    notifications = run(notifications_router.get_notifications(current_user=user, db=list_db))
    assert notifications == []
    assert "notifications.school_id = 'school-a'" in compiled_sql(list_db.executed[0])

    pref_db = FakeDb(results=[FakeResult()])
    preferences = run(notifications_router.get_notification_preferences(current_user=user, db=pref_db))
    assert preferences == []
    assert "notification_preferences.school_id = 'school-a'" in compiled_sql(pref_db.executed[0])

    read_db = FakeDb(results=[FakeResult()])
    result = run(notifications_router.mark_read("notification-a", current_user=user, db=read_db))
    assert result == {"status": "success"}
    assert "notifications.school_id = 'school-a'" in compiled_sql(read_db.executed[0])


def test_parent_finance_queries_filter_by_school_and_relationship():
    db = FakeDb(results=[FakeResult()])

    invoices = run(
        finance_router.list_invoices(
            current_user=make_user("parent-a", UserRole.parent),
            db=db,
        )
    )

    assert invoices == []
    sql = compiled_sql(db.executed[0])
    assert "tuition_invoices.school_id = 'school-a'" in sql
    assert "student_parents.school_id = 'school-a'" in sql


def test_schedule_reads_and_notifications_filter_by_school():
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")

    schedule_db = FakeDb(
        get_map={(Class, "class-a"): cls},
        results=[
            FakeResult(["student-a"]),
            FakeResult(),
        ],
    )
    slots = run(
        schedule_router.get_class_schedule(
            "class-a",
            current_user=make_user("parent-a", UserRole.parent),
            db=schedule_db,
        )
    )

    assert slots == []
    assert "schedule_slots.school_id = 'school-a'" in compiled_sql(schedule_db.executed[-1])

    notify_db = FakeDb(results=[FakeResult()])
    run(
        schedule_router._notify_class_parents(
            notify_db,
            class_id="class-a",
            school_id="school-a",
            title="Title",
            content="Content",
        )
    )
    notify_sql = compiled_sql(notify_db.executed[0])
    assert "class_members.school_id = 'school-a'" in notify_sql
    assert "student_parents.school_id = 'school-a'" in notify_sql
    assert "users.school_id = 'school-a'" in notify_sql


def test_direct_message_relationship_checks_filter_by_school():
    recipient = make_user("parent-a", UserRole.parent)
    db = FakeDb(
        results=[
            FakeResult([recipient]),
            FakeResult(),
            FakeResult(),
        ],
    )

    with pytest.raises(HTTPException) as exc:
        run(dm._assert_can_dm(make_user("teacher-a", UserRole.teacher), "parent-a", db))

    assert exc.value.status_code == 403
    relationship_sql = compiled_sql(db.executed[1])
    assert "student_parents.school_id = 'school-a'" in relationship_sql
    assert "class_members.school_id = 'school-a'" in relationship_sql
    assert "class_teachers.school_id = 'school-a'" in relationship_sql


def test_parent_cannot_export_unlinked_student_record():
    student = Student(
        id="student-b",
        school_id="school-a",
        student_id="S-002",
        full_name="Other Student",
    )
    db = FakeDb(
        get_map={(Student, "student-b"): student},
        results=[FakeResult()],
    )

    with pytest.raises(HTTPException) as exc:
        run(
            export_student_record(
                "student-b",
                request=make_request("/security/students/student-b/export", method="GET"),
                current_user=make_user("parent-a", UserRole.parent),
                db=db,
            )
        )

    assert exc.value.status_code == 403
    assert "student_parents.school_id = 'school-a'" in compiled_sql(db.executed[0])


def test_student_export_writes_domain_audit_event():
    student = Student(
        id="student-a",
        school_id="school-a",
        student_id="S-001",
        full_name="Student A",
    )
    cls = Class(
        id="class-a",
        school_id="school-a",
        name="3A",
        subject="Math",
        join_code="ABC123",
    )
    grade = Grade(
        id="grade-a",
        school_id="school-a",
        class_id="class-a",
        student_id="student-a",
        student_name="Student A",
        score=17,
        max_score=20,
        is_approved=True,
    )
    attendance = Attendance(
        id="attendance-a",
        school_id="school-a",
        class_id="class-a",
        student_id="student-a",
        student_name="Student A",
        status=AttendanceStatus.present,
        date=datetime.now(timezone.utc),
    )
    remark = Remark(
        id="remark-a",
        school_id="school-a",
        class_id="class-a",
        student_id="student-a",
        student_name="Student A",
        title="Good work",
        content="Strong participation",
        type=RemarkType.praise,
    )
    db = FakeDb(
        get_map={(Student, "student-a"): student},
        results=[
            FakeResult([StudentParent(school_id="school-a", student_id="student-a", parent_id="parent-a")]),
            FakeResult([cls]),
            FakeResult([grade]),
            FakeResult([attendance]),
            FakeResult([remark]),
            FakeResult(),
        ],
    )

    payload = run(
        export_student_record(
            "student-a",
            request=make_request("/security/students/student-a/export", method="GET"),
            current_user=make_user("parent-a", UserRole.parent),
            db=db,
        )
    )

    assert payload["student"]["id"] == "student-a"
    assert db.commits == 1
    audit_events = [item for item in db.added if isinstance(item, AuditEvent)]
    assert len(audit_events) == 1
    assert audit_events[0].action == "data_export.student"
    assert audit_events[0].actor_id == "parent-a"
    assert audit_events[0].actor_role == "parent"
    assert audit_events[0].school_id == "school-a"
    assert audit_events[0].path == "/security/students/student-a/export"
    assert audit_events[0].device_fingerprint == "fingerprint-a"
    assert audit_events[0].user_agent == "pytest-agent"
    assert audit_events[0].event_metadata["grade_count"] == 1


def test_admin_archives_student_without_hard_delete_and_audits():
    student = Student(
        id="student-a",
        school_id="school-a",
        student_id="S-001",
        full_name="Student A",
        linking_pin="123456",
    )
    db = FakeDb(
        get_map={(Student, "student-a"): student},
        results=[FakeResult(), FakeResult()],
    )

    result = run(
        admin.archive_student(
            "student-a",
            admin.ArchiveStudentRequest(reason="graduated"),
            request=make_request("/admin/students/student-a/archive"),
            current_user=make_user("principal-a", UserRole.principal),
            db=db,
        )
    )

    assert result["status"] == "success"
    assert student.archived_at is not None
    assert student.archive_reason == "graduated"
    assert student.archived_by == "principal-a"
    assert student.linking_pin is None
    assert db.commits == 1
    assert len(db.deleted_instances) == 0
    audit_events = [item for item in db.added if isinstance(item, AuditEvent)]
    assert len(audit_events) == 1
    assert audit_events[0].action == "student.archived"
    assert audit_events[0].resource_id == "student-a"
    assert audit_events[0].event_metadata["reason"] == "graduated"


def test_admin_unlink_parent_revokes_relationship_sessions_and_audits():
    student = Student(
        id="student-a",
        school_id="school-a",
        student_id="S-001",
        full_name="Student A",
    )
    link = StudentParent(school_id="school-a", student_id="student-a", parent_id="parent-a")
    db = FakeDb(
        get_map={(Student, "student-a"): student},
        results=[FakeResult([link]), FakeResult(), FakeResult(), FakeResult()],
    )

    result = run(
        admin.unlink_parent_from_student(
            "student-a",
            "parent-a",
            request=make_request("/admin/students/student-a/parents/parent-a", method="DELETE"),
            current_user=make_user("principal-a", UserRole.principal),
            db=db,
        )
    )

    assert result == {"status": "success", "sessions_revoked": True}
    assert db.commits == 1
    assert len(db.executed) == 4
    audit_events = [item for item in db.added if isinstance(item, AuditEvent)]
    assert len(audit_events) == 1
    assert audit_events[0].action == "student.parent_unlinked"
    assert audit_events[0].event_metadata["parent_id"] == "parent-a"


def test_only_system_admin_can_activate_school():
    school = School(id="school-a", name="School A", is_active=False)
    db = FakeDb(get_map={(School, "school-a"): school})

    with pytest.raises(HTTPException) as exc:
        run(
            system.activate_school(
                "school-a",
                current_user=make_user("principal-a", UserRole.principal),
                db=db,
            )
        )

    assert exc.value.status_code == 403
    assert db.commits == 0

    result = run(
        system.activate_school(
            "school-a",
            current_user=make_user("system-admin-a", UserRole.system_admin, school_id=None),
            db=db,
        )
    )

    assert result["status"] == "success"
    assert school.is_active is True
    assert school.tenant_config["active"] is True
    assert db.commits == 1


def test_audit_middleware_targets_mutations_and_sensitive_reads():
    assert AuditMiddleware._should_audit("POST", "/dm/conversations")
    assert AuditMiddleware._should_audit("PATCH", "/users/me")
    assert AuditMiddleware._should_audit("GET", "/security/students/student-a/export")
    assert AuditMiddleware._should_audit("GET", "/media/attachments/attachment-a/download")
    assert not AuditMiddleware._should_audit("GET", "/health")
    assert not AuditMiddleware._should_audit("GET", "/classes")


def test_rate_limit_blocks_after_limit_in_test_memory_fallback():
    key = f"test-limit-{datetime.now(timezone.utc).timestamp()}"

    run(check_rate_limit(key, limit=2, window_seconds=60))
    run(check_rate_limit(key, limit=2, window_seconds=60))

    with pytest.raises(HTTPException) as exc:
        run(check_rate_limit(key, limit=2, window_seconds=60))

    assert exc.value.status_code == 429


def test_session_limit_deletes_oldest_families(monkeypatch):
    monkeypatch.setattr(auth.settings, "max_active_session_families", 2)
    db = FakeDb(
        results=[
            FakeResult([
                ("family-new", datetime.now(timezone.utc)),
                ("family-keep", datetime.now(timezone.utc) - timedelta(minutes=1)),
                ("family-old", datetime.now(timezone.utc) - timedelta(minutes=2)),
            ]),
            FakeResult(),
        ]
    )

    run(auth._enforce_session_limit(db, "user-a"))

    assert len(db.executed) == 2


def test_user_can_list_active_sessions():
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    token = RefreshToken(
        id="token-a",
        school_id="school-a",
        user_id="parent-a",
        token_hash="hash-a",
        family_id="family-a",
        device_platform="web",
        ip_address="203.0.113.10",
        user_agent="pytest-agent",
        expires_at=expires_at,
    )
    db = FakeDb(results=[FakeResult([token])])

    sessions = run(
        auth.list_sessions(
            current_user=make_user("parent-a", UserRole.parent),
            db=db,
        )
    )

    assert sessions == [token]


def test_user_can_revoke_session_family_and_audit_is_written():
    token = RefreshToken(
        id="token-a",
        school_id="school-a",
        user_id="parent-a",
        token_hash="hash-a",
        family_id="family-a",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db = FakeDb(results=[FakeResult([token]), FakeResult(), FakeResult()])

    result = run(
        auth.revoke_session(
            "family-a",
            request=make_request("/auth/sessions/family-a", method="DELETE"),
            current_user=make_user("parent-a", UserRole.parent),
            db=db,
        )
    )

    assert result == {"status": "success"}
    assert db.commits == 1
    audit_events = [item for item in db.added if isinstance(item, AuditEvent)]
    assert len(audit_events) == 1
    assert audit_events[0].action == "auth.session_revoked"


def test_refresh_token_reuse_invalidates_token_family():
    refresh_token = security.create_refresh_token("parent-a", "family-a")
    db = FakeDb(results=[FakeResult(), FakeResult(), FakeResult(), FakeResult(), FakeResult()])

    with pytest.raises(HTTPException) as exc:
        run(security.rotate_refresh_token(db, refresh_token, {}))

    assert exc.value.status_code == 401
    assert db.commits == 1
    assert len(db.executed) == 5


def test_login_from_new_device_sends_critical_security_notification(monkeypatch):
    async def fake_rate_limit(*_args, **_kwargs):
        return None

    async def fake_create_notification(*_args, **kwargs):
        notification_calls.append(kwargs)
        return None

    notification_calls = []
    monkeypatch.setattr(auth, "check_rate_limit", fake_rate_limit)
    monkeypatch.setattr(auth, "verify_password", lambda *_args: True)
    monkeypatch.setattr(auth, "create_access_token_for_user", lambda _user: "access-token")
    monkeypatch.setattr(auth, "create_refresh_token", lambda _user_id, _family_id: "refresh-token")
    monkeypatch.setattr(notifications, "create_notification", fake_create_notification)

    user = make_user("parent-a", UserRole.parent)
    user.email = "parent-a@example.com"
    user.password_hash = "hash-a"
    db = FakeDb(
        results=[
            FakeResult(),
            FakeResult([user]),
            FakeResult(),
            FakeResult(["existing-session"]),
            FakeResult(),
            FakeResult([("family-a", datetime.now(timezone.utc))]),
            FakeResult(),
        ]
    )

    response = run(
        auth.login(
                auth.LoginRequest(email="parent-a@example.com", password="secret"),
            request=make_request("/auth/login"),
            db=db,
        )
    )

    assert response == {"access_token": "access-token", "refresh_token": "refresh-token"}
    assert notification_calls
    assert notification_calls[0]["type"] == "SECURITY"


def test_attachment_school_must_match_authorized_parent_record():
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")
    grade = Grade(
        id="grade-a",
        school_id="school-a",
        class_id="class-a",
        student_id="student-a",
        student_name="Student A",
        score=12,
        max_score=20,
        is_approved=True,
    )
    attachment = MediaAttachment(
        id="attachment-a",
        school_id="school-b",
        parent_type="grade",
        parent_id="grade-a",
        storage_key="school-b/grade/attachment-a.pdf",
    )
    db = FakeDb(
        get_map={
            (MediaAttachment, "attachment-a"): attachment,
            (Grade, "grade-a"): grade,
            (Class, "class-a"): cls,
        },
        results=[FakeResult(["teacher-a"])],
    )

    with pytest.raises(HTTPException) as exc:
        run(
            media._load_authorized_attachment(
                "attachment-a",
                make_user("teacher-a", UserRole.teacher),
                db,
            )
        )

    assert exc.value.status_code == 403


def test_attachment_listing_filters_by_authorized_parent_school():
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")
    grade = Grade(
        id="grade-a",
        school_id="school-a",
        class_id="class-a",
        student_id="student-a",
        student_name="Student A",
        score=12,
        max_score=20,
        is_approved=True,
    )
    db = FakeDb(
        get_map={
            (Grade, "grade-a"): grade,
            (Class, "class-a"): cls,
        },
        results=[
            FakeResult(["teacher-a"]),
            FakeResult(),
        ],
    )

    attachments = run(
        media.list_attachments(
            "grade",
            "grade-a",
            current_user=make_user("teacher-a", UserRole.teacher),
            db=db,
        )
    )

    assert attachments == []
    assert "media_attachments.school_id = 'school-a'" in compiled_sql(db.executed[-1])


def test_parent_cannot_read_unapproved_grade_attachment(monkeypatch):
    async def fake_class_read_access(*_args, **_kwargs):
        return SimpleNamespace(school_id="school-a")

    async def fake_parent_linked(*_args, **_kwargs):
        return None

    monkeypatch.setattr(media, "assert_class_read_access", fake_class_read_access)
    monkeypatch.setattr(media, "assert_parent_linked_to_student", fake_parent_linked)

    grade = Grade(
        id="grade-a",
        school_id="school-a",
        class_id="class-a",
        student_id="student-a",
        student_name="Student A",
        score=12,
        max_score=20,
        is_approved=False,
    )
    attachment = MediaAttachment(
        id="attachment-a",
        school_id="school-a",
        parent_type="grade",
        parent_id="grade-a",
        storage_key="school-a/grade/attachment-a.pdf",
    )
    db = FakeDb(
        get_map={
            (MediaAttachment, "attachment-a"): attachment,
            (Grade, "grade-a"): grade,
        },
    )

    with pytest.raises(HTTPException) as exc:
        run(
            media._load_authorized_attachment(
                "attachment-a",
                make_user("parent-a", UserRole.parent),
                db,
            )
        )

    assert exc.value.status_code == 403


def test_non_participant_cannot_read_direct_message_attachment():
    message = DirectMessage(
        id="direct-message-a",
        school_id="school-a",
        conversation_id="conversation-a",
        sender_id="teacher-a",
        sender_name="Teacher A",
        content="Private file",
    )
    attachment = MediaAttachment(
        id="attachment-a",
        school_id="school-a",
        parent_type="direct_message",
        parent_id="direct-message-a",
        storage_key="school-a/direct_message/attachment-a.pdf",
    )
    db = FakeDb(
        get_map={
            (MediaAttachment, "attachment-a"): attachment,
            (DirectMessage, "direct-message-a"): message,
        },
        results=[FakeResult()],
    )

    with pytest.raises(HTTPException) as exc:
        run(
            media._load_authorized_attachment(
                "attachment-a",
                make_user("parent-a", UserRole.parent),
                db,
            )
        )

    assert exc.value.status_code == 403


def test_school_admin_cannot_run_audit_retention_purge():
    with pytest.raises(HTTPException) as exc:
        run(
            purge_audit_retention(
                current_user=make_user("principal-a", UserRole.principal),
                db=FakeDb(),
            )
        )

    assert exc.value.status_code == 403
