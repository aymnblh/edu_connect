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
