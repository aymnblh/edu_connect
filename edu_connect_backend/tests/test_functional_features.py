import asyncio
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.models import (
    Attendance,
    AttendanceStatus,
    Class,
    Grade,
    Notification,
    NotificationPreference,
    Student,
    User,
    UserRole,
)
from app.modules.academics.averages import (
    grade_score_on_twenty,
    weighted_average_for_grades,
    weighted_averages_by_group,
)
from app.modules.academics.routers import homework as homework_router
from app.modules.academics.schemas import GradeCreate
from app.modules.attendance.routers import attendance as attendance_router
from app.modules.schedule.routers.schedule import ExamCreate, SlotCreate
from app.utils.notifications import create_notification


def run(coro):
    return asyncio.run(coro)


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

    def all(self):
        return self.rows


class FakeDb:
    def __init__(self, *, get_map=None, results=None):
        self.get_map = get_map or {}
        self.results = list(results or [])
        self.executed = []
        self.added = []
        self.commits = 0
        self.flushes = 0
        self.refreshed = []

    async def get(self, model, key):
        return self.get_map.get((model, key))

    async def execute(self, statement, *_args, **_kwargs):
        self.executed.append(statement)
        if not self.results:
            raise AssertionError("Unexpected database query")
        return self.results.pop(0)

    def add(self, instance):
        self.added.append(instance)

    async def flush(self):
        self.flushes += 1

    async def commit(self):
        self.commits += 1

    async def refresh(self, instance):
        self.refreshed.append(instance)


def make_grade(grade_id, *, course_id, subject, score, max_score=20):
    return Grade(
        id=grade_id,
        school_id="school-a",
        class_id="class-a",
        student_id="student-a",
        student_name="Student A",
        course_id=course_id,
        subject=subject,
        score=score,
        max_score=max_score,
        date=datetime.now(timezone.utc),
    )


def test_weighted_average_normalizes_scores_and_weights_modules_once():
    grades = [
        make_grade("math-1", course_id="math", subject="Mathematiques", score=10),
        make_grade("math-2", course_id="math", subject="Mathematiques", score=14),
        make_grade("arabic-1", course_id="arabic", subject="Arabe", score=16),
        make_grade("science-1", course_id="science", subject="Sciences", score=15, max_score=30),
    ]
    coefficients = {"math-1": 2, "math-2": 2, "arabic-1": 1, "science-1": 3}

    assert grade_score_on_twenty(grades[-1]) == pytest.approx(10)
    # Math average is 12/20, science is 10/20: (12*2 + 16*1 + 10*3) / 6.
    assert weighted_average_for_grades(grades, coefficients) == pytest.approx(11.6666667)


def test_weighted_averages_by_group_keeps_groups_independent():
    grades = [
        make_grade("student-a-math", course_id="math", subject="Math", score=12),
        make_grade("student-b-math", course_id="math", subject="Math", score=18),
    ]
    grades[0].student_id = "student-a"
    grades[1].student_id = "student-b"

    averages = weighted_averages_by_group(
        grades,
        {"student-a-math": 2, "student-b-math": 2},
        lambda grade: grade.student_id,
    )

    assert averages == {"student-a": pytest.approx(12), "student-b": pytest.approx(18)}


def test_grade_input_rejects_invalid_scale_and_accepts_exam_scale():
    grade = GradeCreate(
        student_id="student-a",
        student_name="Student A",
        subject="Mathematiques",
        score=32,
        max_score=40,
    )
    assert grade.max_score == 40

    with pytest.raises(ValidationError):
        GradeCreate(
            student_id="student-a",
            student_name="Student A",
            subject="Mathematiques",
            score=21,
            max_score=20,
        )

    with pytest.raises(ValidationError):
        GradeCreate(
            student_id="student-a",
            student_name="Student A",
            subject="Mathematiques",
            score=10,
            max_score=0,
        )


def test_schedule_input_validates_dates_and_time_ranges():
    slot = SlotCreate(
        class_id="class-a",
        course_name="Mathematiques",
        teacher_id="teacher-a",
        day_of_week=1,
        start_time="8:05",
        end_time="09:00",
    )
    assert slot.start_time == "08:05"

    with pytest.raises(ValidationError):
        SlotCreate(
            class_id="class-a",
            course_name="Mathematiques",
            teacher_id="teacher-a",
            day_of_week=1,
            start_time="10:00",
            end_time="09:00",
        )

    with pytest.raises(ValidationError):
        ExamCreate(
            class_id="class-a",
            course_name="Mathematiques",
            exam_date="2026-02-30",
            start_time="09:00",
            end_time="10:00",
        )


def test_notification_preferences_are_scoped_and_can_suppress_info():
    user = User(
        id="parent-a",
        school_id="school-a",
        email="parent-a@example.test",
        full_name="Parent A",
        role=UserRole.parent,
    )
    preference = NotificationPreference(
        school_id="school-a",
        user_id="parent-a",
        notification_type="INFO",
        in_app_enabled=False,
        push_enabled=False,
    )
    db = FakeDb(results=[FakeResult([user]), FakeResult([preference])])

    result = run(
        create_notification(
            db,
            user_id="parent-a",
            title="Information",
            content="Message",
            type="INFO",
            school_id="school-a",
        )
    )

    assert result is None
    assert db.added == []
    assert "notification_preferences.school_id = 'school-a'" in str(db.executed[1].compile(compile_kwargs={"literal_binds": True}))


def test_critical_notification_is_not_suppressed_by_in_app_preference():
    user = User(
        id="principal-a",
        school_id="school-a",
        email="principal-a@example.test",
        full_name="Principal A",
        role=UserRole.principal,
    )
    preference = NotificationPreference(
        school_id="school-a",
        user_id="principal-a",
        notification_type="SECURITY",
        in_app_enabled=False,
        push_enabled=False,
    )
    db = FakeDb(results=[FakeResult([user]), FakeResult([preference])])

    notification = run(
        create_notification(
            db,
            user_id="principal-a",
            title="Alerte",
            content="Tentatives anormales",
            type="SECURITY",
            school_id="school-a",
        )
    )

    assert isinstance(notification, Notification)
    assert notification.type == "SECURITY"
    assert db.added == [notification]


def test_marking_absence_notifies_linked_parent_once(monkeypatch):
    teacher = User(
        id="teacher-a",
        school_id="school-a",
        email="teacher-a@example.test",
        full_name="Teacher A",
        role=UserRole.teacher,
    )
    parent = User(
        id="parent-a",
        school_id="school-a",
        email="parent-a@example.test",
        full_name="Parent A",
        role=UserRole.parent,
    )
    student = Student(
        id="student-a",
        school_id="school-a",
        student_id="S-001",
        full_name="Student A",
    )
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")
    calls = []

    async def fake_notification(*_args, **kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(attendance_router, "create_notification", fake_notification)
    today = datetime.now(timezone.utc).date().isoformat()
    db = FakeDb(
        get_map={(Class, "class-a"): cls},
        results=[
            FakeResult(["teacher-a"]),
            FakeResult([student]),
            FakeResult(),
            FakeResult([parent]),
            FakeResult([Attendance(
                id=f"student-a_{today}",
                school_id="school-a",
                class_id="class-a",
                student_id="student-a",
                student_name="Student A",
                status=AttendanceStatus.absent,
                date=datetime.now(timezone.utc),
            )]),
        ],
    )

    run(
        attendance_router.mark_attendance(
            "class-a",
            attendance_router.AttendanceCreate(
                student_id="student-a",
                student_name="Student A",
                status=AttendanceStatus.absent,
            ),
            current_user=teacher,
            db=db,
        )
    )

    assert len(calls) == 1
    assert calls[0]["user_id"] == "parent-a"
    assert calls[0]["type"] == "WARNING"


def test_homework_notification_fanout_targets_only_class_parents(monkeypatch):
    parent = User(
        id="parent-a",
        school_id="school-a",
        email="parent-a@example.test",
        full_name="Parent A",
        role=UserRole.parent,
    )
    payload = homework_router.HomeworkCreate(
        kind="homework",
        subject="Mathematiques",
        homework_content="Exercices 1 a 5",
        due_date=datetime(2026, 8, 14, tzinfo=timezone.utc),
    )
    calls = []

    async def fake_notification(*_args, **kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(homework_router, "create_notification", fake_notification)
    db = FakeDb(results=[FakeResult([parent])])

    run(
        homework_router._notify_class_parents(
            class_id="class-a",
            school_id="school-a",
            payload=payload,
            db=db,
        )
    )

    assert calls == [
        {
            "user_id": "parent-a",
            "title": "Nouveau devoir maison",
            "content": "Mathematiques - Exercices 1 a 5 (a remettre le 14/08/2026).",
            "type": "INFO",
            "school_id": "school-a",
        }
    ]
