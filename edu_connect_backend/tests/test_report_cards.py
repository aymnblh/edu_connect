from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models import Class, Semester, UserRole
from app.modules.reports.compute import (
    AttendanceRow,
    CourseRow,
    StudentRow,
    build_report_cards,
    competition_ranks,
)
from app.modules.reports.routers import report_cards as report_router
from app.modules.schools.calendar import algerian_trimesters, school_year_start
from tests.test_access_control_boundaries import FakeDb, FakeResult, compiled_sql, make_request, make_user, run


def _grade(grade_id, student_id, score, *, course_id=None, subject="", max_score=20.0):
    return SimpleNamespace(
        id=grade_id, student_id=student_id, score=score, max_score=max_score, course_id=course_id, subject=subject
    )


def _cards():
    students = [StudentRow("s1", "Amine", "EDU26-001"), StudentRow("s2", "Bilal", None), StudentRow("s3", "Chahra", None)]
    courses = [CourseRow("math", "Math", 4), CourseRow("fr", "Francais", 2), CourseRow("art", "Dessin", 1)]
    grades = [
        _grade("g1", "s1", 16, course_id="math"),
        _grade("g2", "s1", 12, course_id="math"),
        _grade("g3", "s1", 10, course_id="fr"),
        # legacy free-text subject matched to the course by name; scored /40
        _grade("g4", "s2", 32, subject="  math ", max_score=40),
        _grade("g5", "s2", 14, course_id="fr"),
        # subject that is not a class course stays a separate line
        _grade("g6", "s2", 18, subject="Sport"),
    ]
    attendance = [
        AttendanceRow("s1", "absent", True),
        AttendanceRow("s1", "absent", False),
        AttendanceRow("s1", "late", False),
    ]
    return build_report_cards(
        students=students,
        courses=courses,
        grades=grades,
        coefficients={"g6": 1.0},
        attendance=attendance,
        meta={"class_name": "3A", "semester_name": "Trimester 1"},
    )


def test_report_card_averages_coefficients_and_attendance():
    amine, bilal, chahra = _cards()
    subjects = {line["subject"]: line for line in amine["subjects"]}

    assert list(subjects) == ["Dessin", "Francais", "Math", "Sport"]
    assert subjects["Math"]["average"] == 14.0 and subjects["Math"]["grades_count"] == 2
    assert subjects["Dessin"]["average"] is None
    # (14*4 + 10*2) / 6
    assert amine["overall_average"] == 12.67
    assert amine["attendance"] == {"absences": 2, "justified_absences": 1, "lates": 1}
    assert amine["class_name"] == "3A" and amine["student_number"] == "EDU26-001"

    bilal_subjects = {line["subject"]: line for line in bilal["subjects"]}
    assert bilal_subjects["Math"]["average"] == 16.0
    # (16*4 + 14*2 + 18*1) / 7
    assert bilal["overall_average"] == 15.71
    assert subjects["Math"]["class_average"] == 15.0

    assert (bilal["rank"], amine["rank"], chahra["rank"]) == (1, 2, None)
    assert chahra["overall_average"] is None
    assert amine["class_size"] == 2


def test_competition_ranking_shares_ties():
    ranks = competition_ranks({"a": 15.0, "b": 12.004, "c": 12.0, "d": 9.0, "e": None})
    assert ranks == {"a": 1, "b": 2, "c": 2, "d": 4, "e": None}


def test_trimesters_follow_the_current_school_year():
    assert school_year_start(datetime(2027, 3, 1)) == 2026
    assert school_year_start(datetime(2026, 9, 1)) == 2026

    terms = algerian_trimesters(datetime(2027, 2, 10, tzinfo=timezone.utc))
    assert [(name, start.date().isoformat(), active) for name, start, _end, active in terms] == [
        ("Trimester 1", "2026-09-15", False),
        ("Trimester 2", "2027-01-05", True),
        ("Trimester 3", "2027-04-05", False),
    ]
    summer = algerian_trimesters(datetime(2026, 8, 1, tzinfo=timezone.utc))
    assert [active for *_rest, active in summer] == [True, False, False]


def test_only_school_admins_preview_or_publish():
    for role in (UserRole.teacher, UserRole.parent):
        with pytest.raises(HTTPException) as exc:
            run(report_router.publish_report_cards(
                report_router.PublishRequest(class_id="class-a", semester_id="sem-a"),
                request=make_request("/report-cards/publish"),
                current_user=make_user(f"{role.value}-a", role),
                db=FakeDb(),
            ))
        assert exc.value.status_code == 403


def test_publish_rejects_other_schools_class_or_term():
    other_class = Class(id="class-z", school_id="school-z", name="Z", join_code="ZZZ999")
    semester = Semester(
        id="sem-a", school_id="school-a", name="Trimester 1",
        start_date=datetime(2026, 9, 15), end_date=datetime(2026, 12, 15),
    )
    db = FakeDb(get_map={(Class, "class-z"): other_class, (Semester, "sem-a"): semester})
    with pytest.raises(HTTPException) as exc:
        run(report_router.preview_report_cards(
            class_id="class-z", semester_id="sem-a",
            current_user=make_user("principal-a", UserRole.principal), db=db,
        ))
    assert exc.value.status_code == 404


def test_parents_only_list_their_childrens_report_cards():
    db = FakeDb(results=[FakeResult()])
    run(report_router.list_report_cards(
        class_id=None, semester_id=None, student_id=None,
        current_user=make_user("parent-a", UserRole.parent), db=db,
    ))
    sql = compiled_sql(db.executed[0])
    assert "report_cards.school_id = 'school-a'" in sql
    assert "student_parents.parent_id = 'parent-a'" in sql


def test_teachers_only_see_report_cards_of_classes_they_teach():
    db = FakeDb(results=[FakeResult()])
    with pytest.raises(HTTPException) as exc:
        run(report_router.get_report_card(
            "card-a", current_user=make_user("teacher-a", UserRole.teacher), db=db,
        ))
    assert exc.value.status_code == 404
    assert "class_teachers.teacher_id = 'teacher-a'" in compiled_sql(db.executed[0])


def test_publish_saves_snapshots_and_notifies_linked_parents(monkeypatch):
    cls = Class(id="class-a", school_id="school-a", name="3A", join_code="ABC123")
    semester = Semester(
        id="sem-a", school_id="school-a", name="Trimester 1",
        start_date=datetime(2026, 9, 15), end_date=datetime(2026, 12, 15),
    )
    cards = [
        {"student_id": "s1", "student_name": "Amine", "overall_average": 12.67, "rank": 2, "class_size": 2},
        {"student_id": "s2", "student_name": "Bilal", "overall_average": 15.71, "rank": 1, "class_size": 2},
    ]
    notified = []

    async def fake_compute(_db, _cls, _semester):
        return cards

    async def fake_notification(*_args, **kwargs):
        notified.append(kwargs)

    monkeypatch.setattr(report_router, "compute_class_report_cards", fake_compute)
    monkeypatch.setattr(report_router, "create_notification", fake_notification)

    previous = [("s1", "kept-code-s1"), ("s2", "kept-code-s2")]
    for existing, expected_title in ((0, "Bulletin disponible"), (2, "Bulletin mis a jour")):
        notified.clear()
        db = FakeDb(
            get_map={(Class, "class-a"): cls, (Semester, "sem-a"): semester},
            results=[FakeResult(previous[:existing]), FakeResult(), FakeResult([("parent-a", "s1")]), FakeResult()],
        )
        result = run(report_router.publish_report_cards(
            report_router.PublishRequest(class_id="class-a", semester_id="sem-a"),
            request=make_request("/report-cards/publish"),
            current_user=make_user("principal-a", UserRole.principal),
            db=db,
        ))
        saved = [item for item in db.added if isinstance(item, report_router.ReportCard)]
        assert [(card.student_id, card.rank, card.data["student_name"]) for card in saved] == [
            ("s1", 2, "Amine"),
            ("s2", 1, "Bilal"),
        ]
        assert compiled_sql(db.executed[1]).startswith("DELETE FROM report_cards")
        assert [(n["user_id"], n["title"]) for n in notified] == [("parent-a", expected_title)]
        assert "Amine" in notified[0]["content"]
        assert result == {"published": 2, "republished": bool(existing), "parents_notified": 1}
        codes = [card.verify_code for card in saved]
        if existing:
            # Re-publishing keeps the codes already printed on paper.
            assert codes == ["kept-code-s1", "kept-code-s2"]
        else:
            assert all(len(code) >= 16 for code in codes) and codes[0] != codes[1]


def test_mentions_follow_the_general_average():
    from app.modules.reports.compute import mention_for

    assert mention_for(16.5) == "felicitations"
    assert mention_for(14) == "encouragements"
    assert mention_for(12.01) == "tableau_honneur"
    assert mention_for(11.99) is None
    assert mention_for(None) is None
    # A school with its own rules.
    assert mention_for(15, {"felicitations": 15}) == "felicitations"


def test_public_verification_shows_only_the_published_summary():
    import pytest
    from fastapi import HTTPException

    card = report_router.ReportCard(
        id="rc1", school_id="school-a", class_id="c", semester_id="s", student_id="s1",
        overall_average=14.2, rank=3, class_size=28, verify_code="abcdefghijklmnop",
        published_at=datetime(2026, 12, 20),
        data={"school_name": "Les Oliviers", "student_name": "Amine", "class_name": "3A",
              "semester_name": "Trimestre 1", "mention": "encouragements",
              "subjects": [{"subject": "Maths", "average": 15}], "attendance": {"absences": 2}},
    )
    db = FakeDb(results=[FakeResult(), FakeResult([card])])
    out = run(report_router.verify_report_card("abcdefghijklmnop", make_request("/public/report-cards/x", "GET"), db=db))
    assert out["student_name"] == "Amine" and out["mention"] == "encouragements" and out["overall_average"] == 14.2
    # Subject grades and attendance stay private.
    assert "subjects" not in out and "attendance" not in out
    with pytest.raises(HTTPException):
        run(report_router.verify_report_card("short", make_request("/x", "GET"), db=FakeDb()))
    with pytest.raises(HTTPException):
        run(report_router.verify_report_card("unknowncode12345", make_request("/x", "GET"), db=FakeDb(results=[FakeResult(), FakeResult()])))

