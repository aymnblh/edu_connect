from datetime import date, timedelta

import pytest
from fastapi import HTTPException

from app.models import UserRole
from app.modules.schools.insights import (
    AttendanceFact,
    attendance_weeks,
    class_attendance,
    students_at_risk,
    week_start,
)
from app.modules.schools.routers import admin
from tests.test_access_control_boundaries import FakeDb, make_user, run


def _fact(student, day, status, justified=False, class_id="class-a"):
    return AttendanceFact(student_id=student, class_id=class_id, day=day, status=status, is_justified=justified)


def test_school_week_starts_on_sunday():
    thursday = date(2026, 10, 15)
    assert thursday.weekday() == 3
    assert week_start(thursday) == date(2026, 10, 11)
    assert week_start(date(2026, 10, 11)) == date(2026, 10, 11)


def test_weekly_trend_includes_empty_weeks_and_separates_lates():
    today = date(2026, 10, 15)
    facts = [
        _fact("s1", date(2026, 10, 12), "absent"),
        _fact("s2", date(2026, 10, 12), "late"),
        _fact("s3", date(2026, 10, 13), "present"),
        _fact("s4", date(2026, 10, 14), "present"),
        _fact("s1", date(2026, 1, 5), "absent"),  # outside the window
    ]
    weeks = attendance_weeks(facts, today=today, weeks=3)
    assert [w["week_start"] for w in weeks] == ["2026-09-27", "2026-10-04", "2026-10-11"]
    assert weeks[0]["records"] == 0 and weeks[0]["absence_rate"] == 0.0
    assert (weeks[-1]["records"], weeks[-1]["absences"], weeks[-1]["lates"]) == (4, 1, 1)
    assert (weeks[-1]["absence_rate"], weeks[-1]["late_rate"]) == (25.0, 25.0)


def test_class_attendance_sorted_by_worst_absence_rate():
    facts = [
        _fact("s1", date(2026, 10, 12), "absent", class_id="A"),
        _fact("s2", date(2026, 10, 12), "present", class_id="A"),
        _fact("s3", date(2026, 10, 12), "present", class_id="B"),
    ]
    rows = class_attendance(facts, {"A": "3A", "B": "3B"})
    assert [(row["class_name"], row["absence_rate"]) for row in rows] == [("3A", 50.0), ("3B", 0.0)]


def test_students_at_risk_rules_and_order():
    today = date(2026, 10, 15)
    recent = [_fact("s3", today - timedelta(days=d), "absent") for d in range(3)]
    recent += [_fact("s3", today, "absent", justified=True)]
    recent += [_fact("s4", today - timedelta(days=d), "late") for d in range(5)]
    students = {(f"s{i}", "class-a"): f"Eleve {i}" for i in range(1, 6)}

    rows = students_at_risk(
        students=students,
        class_names={"class-a": "3A"},
        current_averages={("s1", "class-a"): 8.5, ("s2", "class-a"): 12.0, ("s3", "class-a"): 9.0, ("s5", "class-a"): 15.0},
        previous_averages={("s2", "class-a"): 14.5, ("s3", "class-a"): 9.5, ("s5", "class-a"): 16.0},
        recent_facts=recent,
    )
    by_student = {row["student_id"]: row for row in rows}

    assert set(by_student) == {"s1", "s2", "s3", "s4"}
    assert by_student["s1"]["reasons"] == ["low_average"]
    assert by_student["s2"]["reasons"] == ["dropping"]
    assert by_student["s3"]["reasons"] == ["low_average", "absences"]
    assert by_student["s3"]["unjustified_absences_30d"] == 3
    assert by_student["s4"]["reasons"] == ["lateness"] and by_student["s4"]["average"] is None
    assert rows[0]["student_id"] == "s3"


def test_insights_are_for_school_administration_only():
    with pytest.raises(HTTPException) as exc:
        run(admin.analytics_insights(semester_id=None, current_user=make_user("teacher-a", UserRole.teacher), db=FakeDb()))
    assert exc.value.status_code == 403


def test_insights_endpoint_uses_active_term_and_previous_term():
    from datetime import datetime, timezone

    from app.models import AttendanceStatus, Semester
    from tests.test_access_control_boundaries import FakeResult

    t1 = Semester(id="t1", school_id="school-a", name="Trimester 1", is_active=False,
                  start_date=datetime(2026, 9, 15, tzinfo=timezone.utc), end_date=datetime(2026, 12, 15, tzinfo=timezone.utc))
    t2 = Semester(id="t2", school_id="school-a", name="Trimester 2", is_active=True,
                  start_date=datetime(2027, 1, 5, tzinfo=timezone.utc), end_date=datetime(2027, 3, 25, tzinfo=timezone.utc))
    from datetime import time

    from app.modules.schools.calendar import ALGERIA_TZ

    # Noon of the school's today: never crosses a day or week boundary.
    now = datetime.combine(datetime.now(ALGERIA_TZ).date(), time(12), tzinfo=timezone.utc)
    db = FakeDb(results=[
        FakeResult([t1, t2]),
        FakeResult([("class-a", "3A")]),
        FakeResult([("s1", "class-a", "Amine")]),
        FakeResult(),  # current term grades
        FakeResult(),  # previous term grades
        FakeResult([("s1", "class-a", now, AttendanceStatus.absent, False)] * 3),
        FakeResult([4]),
    ])

    out = run(admin.analytics_insights(semester_id=None, current_user=make_user("principal-a", UserRole.principal), db=db))

    assert out["semester"] == {"id": "t2", "name": "Trimester 2"}
    assert out["previous_semester"] == {"id": "t1", "name": "Trimester 1"}
    assert out["pending_grade_approvals"] == 4
    assert out["unjustified_absences_30d"] == 3
    assert out["at_risk"][0]["reasons"] == ["absences"]
    assert len(out["attendance_weeks"]) == 12
    assert out["attendance_weeks"][-1]["absences"] == 3
