from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models import AuditEvent, Class, Student, User, UserRole
from app.modules.health.models import StudentHealthRecord
from app.modules.health.routers import health as health_router
from app.modules.schools.routers import director_views
from tests.test_access_control_boundaries import FakeDb, FakeResult, compiled_sql, make_request, make_user, run


def _student(school_id="school-a"):
    return Student(id="s1", school_id=school_id, student_id="EDU26-001", full_name="Amine",
                   created_at=datetime(2026, 9, 1, tzinfo=timezone.utc))


def _payload(**overrides):
    data = {
        "emergency_contacts": [{"name": "Mme Benali", "relationship": "mere", "phone": "+213 555 12 34 56"}],
        "allergies": "Arachides",
        "teacher_alert": "Allergie arachides - EpiPen dans le cartable",
        "blood_group": "O+",
    }
    data.update(overrides)
    return health_router.HealthRecordIn(**data)


def test_health_input_is_validated():
    with pytest.raises(ValidationError):
        _payload(blood_group="Z+")
    with pytest.raises(ValidationError):
        _payload(emergency_contacts=[{"name": "X", "phone": "call me"}])
    with pytest.raises(ValidationError):
        _payload(emergency_contacts=[{"name": f"c{i}", "phone": "0555123456"} for i in range(5)])


def test_teachers_never_get_the_full_health_record():
    with pytest.raises(HTTPException) as exc:
        run(health_router.get_health_record(
            "s1", request=make_request("/students/s1/health", method="GET"),
            current_user=make_user("teacher-a", UserRole.teacher), db=FakeDb(),
        ))
    assert exc.value.status_code == 403


def test_unlinked_parent_cannot_read_another_childs_health_record():
    db = FakeDb(get_map={(Student, "s1"): _student()}, results=[FakeResult()])
    with pytest.raises(HTTPException) as exc:
        run(health_router.get_health_record(
            "s1", request=make_request("/students/s1/health", method="GET"),
            current_user=make_user("parent-z", UserRole.parent), db=db,
        ))
    assert exc.value.status_code == 404


def test_first_save_requires_consent_and_records_it():
    request = make_request("/students/s1/health", method="PUT")
    parent = make_user("parent-a", UserRole.parent)
    db = FakeDb(get_map={(Student, "s1"): _student()}, results=[FakeResult(["s1"])])
    with pytest.raises(HTTPException) as exc:
        run(health_router.save_health_record("s1", _payload(), request=request, current_user=parent, db=db))
    assert exc.value.status_code == 400
    assert db.added == []

    db = FakeDb(get_map={(Student, "s1"): _student()}, results=[FakeResult(["s1"]), FakeResult()])
    out = run(health_router.save_health_record("s1", _payload(consent=True), request=request, current_user=parent, db=db))
    assert out.exists and out.consent_method == "app" and out.blood_group == "O+"
    record = [item for item in db.added if isinstance(item, StudentHealthRecord)][0]
    assert record.consent_by == "parent-a" and record.school_id == "school-a"
    audit = [item for item in db.added if isinstance(item, AuditEvent)][0]
    assert audit.action == "health.updated"
    # Only field names are logged, never the medical values.
    assert "Arachides" not in str(audit.event_metadata)
    assert "allergies" in audit.event_metadata["fields"]


def test_staff_views_of_a_health_record_are_audited():
    record = StudentHealthRecord(student_id="s1", school_id="school-a", emergency_contacts=[],
                                 consent_given_at=datetime.now(timezone.utc), consent_method="paper")
    db = FakeDb(get_map={(Student, "s1"): _student(), (StudentHealthRecord, "s1"): record}, results=[FakeResult()])
    out = run(health_router.get_health_record(
        "s1", request=make_request("/students/s1/health", method="GET"),
        current_user=make_user("secretary-a", UserRole.secretary), db=db,
    ))
    assert out.exists
    assert [e.action for e in db.added if isinstance(e, AuditEvent)] == ["health.viewed"]


def test_class_alerts_are_for_staff_and_only_contain_the_short_alert():
    with pytest.raises(HTTPException) as exc:
        run(health_router.class_health_alerts("class-a", current_user=make_user("parent-a", UserRole.parent), db=FakeDb()))
    assert exc.value.status_code == 403

    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")
    db = FakeDb(get_map={(Class, "class-a"): cls},
                results=[FakeResult(["teacher-a"]), FakeResult([("s1", "Amine", "Allergie arachides")])])
    out = run(health_router.class_health_alerts("class-a", current_user=make_user("teacher-a", UserRole.teacher), db=db))
    assert [(a.student_name, a.alert) for a in out] == [("Amine", "Allergie arachides")]
    sql = compiled_sql(db.executed[-1])
    assert "allergies" not in sql and "medications" not in sql


def test_teacher_history_is_admin_only_and_same_school():
    with pytest.raises(HTTPException) as exc:
        run(director_views.teacher_history("teacher-a", days=30, current_user=make_user("teacher-b", UserRole.teacher), db=FakeDb()))
    assert exc.value.status_code == 403
    other = make_user("teacher-z", UserRole.teacher, school_id="school-z")
    with pytest.raises(HTTPException) as exc:
        run(director_views.teacher_history("teacher-z", days=30, current_user=make_user("principal-a", UserRole.principal),
                                           db=FakeDb(get_map={(User, "teacher-z"): other})))
    assert exc.value.status_code == 404


def test_teacher_history_counts_their_own_work():
    teacher = make_user("teacher-a", UserRole.teacher)
    results = [FakeResult([("3A", "Math")]), FakeResult([datetime(2026, 10, 20, tzinfo=timezone.utc)])]
    results += [FakeResult([n]) for n in (12, 3, 40, 5, 8, 2, 1)]
    results += [FakeResult()]
    db = FakeDb(get_map={(User, "teacher-a"): teacher}, results=results)
    out = run(director_views.teacher_history("teacher-a", days=30, current_user=make_user("principal-a", UserRole.principal), db=db))
    assert out["assignments"] == [{"class_name": "3A", "subject": "Math"}]
    assert out["stats"] == {
        "grades_entered": 12, "grades_pending_approval": 3, "attendance_records": 40, "homework_posted": 5,
        "lessons_logged": 8, "corrections": 2, "failed_sign_ins": 1,
    }
    assert "grades.created_by = 'teacher-a'" in compiled_sql(db.executed[2])


def test_student_file_is_admin_only_and_scoped():
    with pytest.raises(HTTPException) as exc:
        run(director_views.student_file("s1", request=make_request("/admin/students/s1/file", method="GET"),
                                        current_user=make_user("parent-a", UserRole.parent), db=FakeDb()))
    assert exc.value.status_code == 403
    with pytest.raises(HTTPException) as exc:
        run(director_views.student_file("s1", request=make_request("/admin/students/s1/file", method="GET"),
                                        current_user=make_user("principal-a", UserRole.principal),
                                        db=FakeDb(get_map={(Student, "s1"): _student("school-z")})))
    assert exc.value.status_code == 404


def test_student_file_gathers_everything_and_audits_health_view():
    from app.models import AttendanceStatus

    record = StudentHealthRecord(student_id="s1", school_id="school-a", emergency_contacts=[
        {"name": "Mme Benali", "relationship": "mere", "phone": "0555123456"}], allergies="Arachides",
        consent_given_at=datetime.now(timezone.utc), consent_method="app")
    db = FakeDb(
        get_map={(Student, "s1"): _student(), (StudentHealthRecord, "s1"): record},
        results=[
            FakeResult([("class-a", "3A")]),
            FakeResult([("parent-a", "Mme Benali", "benali@example.dz", "0555123456")]),
            FakeResult(),  # no active term: whole history
            FakeResult(),  # grades
            FakeResult([(AttendanceStatus.absent, True), (AttendanceStatus.absent, False), (AttendanceStatus.late, False)]),
            FakeResult(),  # remarks
            FakeResult(),  # report cards
            FakeResult(),  # audit rls context
        ],
    )
    out = run(director_views.student_file("s1", request=make_request("/admin/students/s1/file", method="GET"),
                                          current_user=make_user("principal-a", UserRole.principal), db=db))
    assert out["student"]["student_number"] == "EDU26-001"
    assert out["classes"] == [{"id": "class-a", "name": "3A"}]
    assert out["parents"][0]["phone"] == "0555123456"
    assert out["attendance"] == {"absences": 2, "justified_absences": 1, "lates": 1, "records": 3}
    assert out["health"]["exists"] and out["health"]["allergies"] == "Arachides"
    assert [e.action for e in db.added if isinstance(e, AuditEvent)] == ["health.viewed"]
