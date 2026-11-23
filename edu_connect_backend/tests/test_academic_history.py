"""Tests for multi-year student history, class archiving, and academic year rollover."""
import asyncio
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.models import AuditEvent, Class, Semester, Student, UserRole
from app.modules.academics.routers import classes as classes_router
from app.modules.reports.models import ReportCard
from app.modules.schools.routers import admin, director_views
from tests.test_access_control_boundaries import FakeDb, FakeResult, make_request, make_user


def run(coro):
    return asyncio.run(coro)


def test_archive_and_restore_class_preserves_history_and_audits():
    cls = Class(
        id="class-2026",
        school_id="school-a",
        name="1AM-A",
        join_code="ABC123",
        academic_year="2026-2027",
        created_at=datetime(2026, 9, 15, tzinfo=timezone.utc),
    )
    cls.teachers = []
    cls.members = []
    principal = make_user("principal-a", UserRole.principal)
    teacher = make_user("teacher-a", UserRole.teacher)

    with pytest.raises(HTTPException) as exc:
        run(
            classes_router.archive_class(
                "class-2026",
                request=make_request("/classes/class-2026/archive", method="POST"),
                current_user=teacher,
                db=FakeDb(),
            )
        )
    assert exc.value.status_code == 403

    db_archive = FakeDb(results=[FakeResult([cls]), FakeResult()])
    archived = run(
        classes_router.archive_class(
            "class-2026",
            request=make_request("/classes/class-2026/archive", method="POST"),
            current_user=principal,
            db=db_archive,
        )
    )
    assert archived["archived_at"] is not None
    assert archived["academic_year"] == "2026-2027"
    assert [e.action for e in db_archive.added if isinstance(e, AuditEvent)] == ["class.archived"]

    db_restore = FakeDb(results=[FakeResult([cls]), FakeResult()])
    restored = run(
        classes_router.restore_class(
            "class-2026",
            request=make_request("/classes/class-2026/restore", method="POST"),
            current_user=principal,
            db=db_restore,
        )
    )
    assert restored["archived_at"] is None
    assert [e.action for e in db_restore.added if isinstance(e, AuditEvent)] == ["class.restored"]


def test_start_academic_year_creates_trimesters_archives_old_classes_and_blocks_duplicates():
    principal = make_user("principal-a", UserRole.principal)
    secretary = make_user("secretary-a", UserRole.secretary)

    with pytest.raises(HTTPException) as exc:
        run(
            admin.start_academic_year(
                admin.StartAcademicYearRequest(start_year=2027),
                request=make_request("/admin/academic-years/start", method="POST"),
                current_user=secretary,
                db=FakeDb(),
            )
        )
    assert exc.value.status_code == 403

    old_sem = Semester(
        id="sem-2026-t3",
        school_id="school-a",
        name="Trimester 3",
        academic_year="2026-2027",
        start_date=datetime(2027, 4, 5, tzinfo=timezone.utc),
        end_date=datetime(2027, 7, 5, tzinfo=timezone.utc),
        is_active=True,
    )
    old_class = Class(
        id="class-2026",
        school_id="school-a",
        name="1AM-A",
        join_code="ABC123",
        academic_year="2026-2027",
    )
    db = FakeDb(results=[FakeResult([old_sem]), FakeResult([old_class]), FakeResult()])

    out = run(
        admin.start_academic_year(
            admin.StartAcademicYearRequest(start_year=2027, archive_previous_classes=True),
            request=make_request("/admin/academic-years/start", method="POST"),
            current_user=principal,
            db=db,
        )
    )
    assert out == {"academic_year": "2027-2028", "semesters_created": 3, "archived_classes": 1}
    assert old_sem.is_active is False
    assert old_class.archived_at is not None
    created_semesters = [item for item in db.added if isinstance(item, Semester)]
    assert len(created_semesters) == 3
    assert all(s.academic_year == "2027-2028" for s in created_semesters)
    assert [s.is_active for s in created_semesters] == [True, False, False]
    assert [e.action for e in db.added if isinstance(e, AuditEvent)] == ["school.academic_year_started"]

    # Duplicate academic year is rejected with 409
    db_dup = FakeDb(results=[FakeResult(created_semesters)])
    with pytest.raises(HTTPException) as dup_exc:
        run(
            admin.start_academic_year(
                admin.StartAcademicYearRequest(start_year=2027),
                request=make_request("/admin/academic-years/start", method="POST"),
                current_user=principal,
                db=db_dup,
            )
        )
    assert dup_exc.value.status_code == 409


def test_student_file_supports_all_history_and_term_filter():
    principal = make_user("principal-a", UserRole.principal)
    student = Student(
        id="s1",
        school_id="school-a",
        student_id="EDU26-001",
        full_name="Amina Benali",
        created_at=datetime(2026, 9, 15, tzinfo=timezone.utc),
    )
    sem_old = Semester(
        id="sem-1",
        school_id="school-a",
        name="Trimester 1",
        academic_year="2025-2026",
        start_date=datetime(2025, 9, 15, tzinfo=timezone.utc),
        end_date=datetime(2025, 12, 15, tzinfo=timezone.utc),
        is_active=False,
    )
    sem_cur = Semester(
        id="sem-2",
        school_id="school-a",
        name="Trimester 1",
        academic_year="2026-2027",
        start_date=datetime(2026, 9, 15, tzinfo=timezone.utc),
        end_date=datetime(2026, 12, 15, tzinfo=timezone.utc),
        is_active=True,
    )
    card = ReportCard(
        id="rc-1",
        school_id="school-a",
        class_id="class-old",
        semester_id="sem-1",
        student_id="s1",
        overall_average=15.5,
        rank=2,
        class_size=24,
        data={"semester_name": "Trimester 1", "class_name": "1AM-A"},
        published_at=datetime(2025, 12, 20, tzinfo=timezone.utc),
    )
    db = FakeDb(
        get_map={(Student, "s1"): student},
        results=[
            FakeResult([("class-old", "1AM-A", "2025-2026", datetime(2026, 7, 10, tzinfo=timezone.utc))]),
            FakeResult([]),
            FakeResult([sem_cur, sem_old]),
            FakeResult([]),  # grades
            FakeResult([]),  # attendance
            FakeResult([]),  # remarks
            FakeResult([card]),  # report_cards
        ],
    )

    out = run(
        director_views.student_file(
            "s1",
            request=make_request("/admin/students/s1/file?semester_id=all", method="GET"),
            semester_id="all",
            current_user=principal,
            db=db,
        )
    )
    assert out["scope"] == "all"
    assert out["term"] is None
    assert len(out["available_terms"]) == 2
    assert out["class_history"][0]["academic_year"] == "2025-2026"
    assert out["report_cards"][0]["academic_year"] == "2025-2026"
    assert out["report_cards"][0]["class_name"] == "1AM-A"

    # Unknown semester_id returns 404
    db_404 = FakeDb(
        get_map={(Student, "s1"): student},
        results=[FakeResult([]), FakeResult([]), FakeResult([sem_cur])],
    )
    with pytest.raises(HTTPException) as exc:
        run(
            director_views.student_file(
                "s1",
                request=make_request("/admin/students/s1/file?semester_id=missing", method="GET"),
                semester_id="missing",
                current_user=principal,
                db=db_404,
            )
        )
    assert exc.value.status_code == 404
