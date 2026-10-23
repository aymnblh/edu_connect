"""Teacher import and other fixes from the remaining-work list."""
import io

from fastapi import UploadFile

from app.models import AuditEvent, User, UserRole
from app.modules.schools.routers import admin
from tests.test_access_control_boundaries import FakeResult, make_request, make_user, run
from tests.test_growth_features import LenientDb


def test_teacher_import_invites_new_teachers_and_reports_the_rest():
    csv_file = (
        "prenom;nom;email\n"
        "Amina;Rahmani;amina@wasel-edu.dz\n"
        "Yacine;Benali;yacine@wasel-edu.dz\n"
        "Sans;Email;\n"
        "Bad;Mail;not-an-email\n"
        "Amina;Again;AMINA@wasel-edu.dz\n"
    ).encode("utf-8")
    # amina: free; yacine: already has an account (maybe in another school).
    db = LenientDb(results=[FakeResult([]), FakeResult(["user-x"])])
    result = run(admin.import_teachers(
        make_request("/admin/import/teachers"),
        file=UploadFile(file=io.BytesIO(csv_file), filename="profs.csv"),
        current_user=make_user("director-a", UserRole.principal),
        db=db,
    ))
    assert [item["email"] for item in result["invited"]] == ["amina@wasel-edu.dz"]
    assert len(result["invited"][0]["invite_code"]) == 32
    assert {(item["line"], item["reason"]) for item in result["skipped"]} == {
        (3, "exists"), (4, "missing"), (5, "invalid_email"), (6, "duplicate"),
    }
    teacher = next(item for item in db.added if isinstance(item, User))
    assert teacher.role == UserRole.teacher and teacher.school_id == "school-a" and teacher.password_hash is None
    audit = next(item for item in db.added if isinstance(item, AuditEvent))
    # The codes are credentials: never in the activity log.
    assert result["invited"][0]["invite_code"] not in str(audit.event_metadata)


def test_existing_email_check_sees_other_schools():
    db = LenientDb(results=[FakeResult(["user-x"])])
    run(admin.import_teachers(
        make_request("/admin/import/teachers"),
        file=UploadFile(file=io.BytesIO(b"full_name,email\nKarim,karim@wasel-edu.dz\n"), filename="p.csv"),
        current_user=make_user("director-a", UserRole.principal),
        db=db,
    ))
    lookups = [str(stmt) for stmt in db.executed if "auth_lookup_email" in str(stmt)]
    assert lookups, "the lookup email must be declared before searching"


def test_only_administration_imports_teachers():
    import pytest
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        run(admin.import_teachers(
            make_request("/admin/import/teachers"),
            file=UploadFile(file=io.BytesIO(b""), filename="p.csv"),
            current_user=make_user("teacher-a", UserRole.teacher),
            db=LenientDb(),
        ))
    assert exc.value.status_code == 403


def test_logo_accepts_only_small_raster_images():
    import pytest
    from fastapi import HTTPException

    from app.models import School
    from app.modules.schools.routers import branding

    png = b"\x89PNG\r\n\x1a\n" + b"0" * 100
    assert branding.logo_media_type(png) == "image/png"
    assert branding.logo_media_type(b"RIFF\x00\x00\x00\x00WEBPVP8 ") == "image/webp"
    assert branding.logo_media_type(b"<svg onload=alert(1)>") is None

    school = School(id="school-a", name="Les Oliviers", tenant_config={})
    director = make_user("director-a", UserRole.principal)
    db = LenientDb(get_map={(School, "school-a"): school})
    out = run(branding.upload_logo(make_request("/schools/branding/logo", "PUT"),
                                   file=UploadFile(file=io.BytesIO(png), filename="logo.png"), current_user=director, db=db))
    assert out["logo"].startswith("data:image/png;base64,") and school.logo_data == out["logo"]

    with pytest.raises(HTTPException) as exc:
        run(branding.upload_logo(make_request("/x", "PUT"), file=UploadFile(file=io.BytesIO(b"<svg/>"), filename="x.svg"),
                                 current_user=director, db=db))
    assert exc.value.status_code == 400
    with pytest.raises(HTTPException) as exc:
        run(branding.upload_logo(make_request("/x", "PUT"), file=UploadFile(file=io.BytesIO(png + b"0" * 210_000), filename="big.png"),
                                 current_user=director, db=db))
    assert exc.value.status_code == 413
    with pytest.raises(HTTPException) as exc:
        run(branding.upload_logo(make_request("/x", "PUT"), file=UploadFile(file=io.BytesIO(png), filename="l.png"),
                                 current_user=make_user("secretary-a", UserRole.secretary), db=db))
    assert exc.value.status_code == 403


def test_profile_says_whether_the_session_is_the_public_demo(monkeypatch):
    from app.core.config import settings
    from app.modules.users.routers import users

    demo = User(id="d1", school_id="s", email="parent.nadia@demo.educonnect.dz", full_name="Nadia", role=UserRole.parent,
                created_at=__import__("datetime").datetime.now())
    demo.students_linking = []
    monkeypatch.setattr(settings, "public_demo_enabled", True)
    assert run(users.get_me(current_user=demo)).is_demo is True
    monkeypatch.setattr(settings, "public_demo_enabled", False)
    assert run(users.get_me(current_user=demo)).is_demo is False


def test_health_fields_are_encrypted_at_rest_and_old_rows_still_read():
    from app.core import crypto

    stored = crypto.EncryptedText().process_bind_param("Arachides", None)
    assert stored.startswith("enc:v1:") and "Arachides" not in stored
    assert crypto.EncryptedText().process_result_value(stored, None) == "Arachides"
    contacts = [{"name": "Nadia", "phone": "0555 01 02 03"}]
    stored_json = crypto.EncryptedJSON().process_bind_param(contacts, None)
    assert "Nadia" not in stored_json
    assert crypto.EncryptedJSON().process_result_value(stored_json, None) == contacts
    # Written before encryption existed.
    assert crypto.EncryptedText().process_result_value("O+", None) == "O+"
    assert crypto.EncryptedJSON().process_result_value('[{"name": "X"}]', None) == [{"name": "X"}]


def test_health_key_can_be_rotated(monkeypatch):
    from cryptography.fernet import Fernet

    from app.core import crypto
    from app.core.config import settings

    old, new = Fernet.generate_key().decode(), Fernet.generate_key().decode()
    monkeypatch.setattr(settings, "health_data_key", old)
    crypto._cipher.cache_clear()
    stored = crypto.encrypt("Asthme")
    monkeypatch.setattr(settings, "health_data_key", new)
    monkeypatch.setattr(settings, "health_data_previous_keys", old)
    crypto._cipher.cache_clear()
    assert crypto.decrypt(stored) == "Asthme"
    monkeypatch.setattr(settings, "health_data_previous_keys", "")
    crypto._cipher.cache_clear()
    import pytest

    with pytest.raises(RuntimeError):
        crypto.decrypt(stored)
    monkeypatch.undo()
    crypto._cipher.cache_clear()


def test_nurse_tokens_only_reach_health_and_account_endpoints():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from app.core import security
    from app.core.middleware import NurseScopeMiddleware, nurse_may_call

    for allowed in ("/students/s1/health", "/classes/c1/health-alerts", "/infirmary/students", "/auth/sessions",
                    "/users/me", "/notifications/", "/schools/branding"):
        assert nurse_may_call(allowed), allowed
    for denied in ("/grades/", "/admin/students", "/finance/ledger", "/conversations", "/students/s1/file",
                   "/admin/students/s1/file", "/classes/c1/members", "/security/audit-events"):
        assert not nurse_may_call(denied), denied

    app = FastAPI()
    app.add_middleware(NurseScopeMiddleware)

    @app.get("/grades/")
    async def grades():
        return {"ok": True}

    client = TestClient(app)
    nurse = security.create_access_token({"sub": "n1", "role": "nurse", "school_id": "s", "tv": 0})
    teacher = security.create_access_token({"sub": "t1", "role": "teacher", "school_id": "s", "tv": 0})
    assert client.get("/grades/", headers={"Authorization": f"Bearer {nurse}"}).status_code == 403
    assert client.get("/grades/", headers={"Authorization": f"Bearer {teacher}"}).status_code == 200


def test_nurse_reads_records_with_audit_and_only_the_director_invites_nurses():
    import pytest
    from fastapi import HTTPException

    from app.models import Student
    from app.modules.health.routers import health as health_router

    student = Student(id="s1", school_id="school-a", student_id="EDU26-001", full_name="Amina")
    db = LenientDb(get_map={(Student, "s1"): student}, results=[])
    db.get_map[(health_router.StudentHealthRecord, "s1")] = health_router.StudentHealthRecord(
        student_id="s1", school_id="school-a", emergency_contacts=[], allergies="Arachides",
        consent_given_at=__import__("datetime").datetime.now(), consent_method="paper")
    out = run(health_router.get_health_record("s1", make_request("/students/s1/health", "GET"),
                                              current_user=make_user("nurse-a", UserRole.nurse), db=db))
    assert out.allergies == "Arachides"
    assert next(item for item in db.added if isinstance(item, AuditEvent)).action == "health.viewed"

    with pytest.raises(HTTPException) as exc:
        run(admin.create_staff(admin.CreateStaffRequest(email="infirmiere@wasel-edu.dz", full_name="Inf", role=UserRole.nurse),
                               current_user=make_user("secretary-a", UserRole.secretary), db=LenientDb()))
    assert exc.value.status_code == 403
    created = run(admin.create_staff(admin.CreateStaffRequest(email="infirmiere@wasel-edu.dz", full_name="Inf", role=UserRole.nurse),
                                     current_user=make_user("director-a", UserRole.principal), db=LenientDb(results=[FakeResult()])))
    assert created.role == UserRole.nurse and created.invite_code


def test_infirmary_directory_lists_students_with_alerts_for_health_staff_only():
    import pytest
    from fastapi import HTTPException

    from app.modules.health.routers import health as health_router

    with pytest.raises(HTTPException):
        run(health_router.health_directory(make_request("/infirmary/students", "GET"),
                                           current_user=make_user("teacher-a", UserRole.teacher), db=LenientDb()))
    db = LenientDb(results=[
        FakeResult([("s1", "Amina", "EDU26-001"), ("s2", "Yacine", "EDU26-002")]),
        FakeResult([("s1", "c1", "1AM-A")]),
        FakeResult([("s1", "Allergie arachides")]),
    ])
    rows = run(health_router.health_directory(make_request("/infirmary/students", "GET"),
                                              current_user=make_user("nurse-a", UserRole.nurse), db=db))
    assert rows[0]["has_record"] and rows[0]["alert"] == "Allergie arachides" and rows[0]["classes"][0]["name"] == "1AM-A"
    assert not rows[1]["has_record"] and rows[1]["alert"] is None
