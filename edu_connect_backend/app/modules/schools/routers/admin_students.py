"""Student lifecycle, CSV import, PIN, and parent-linking admin endpoints."""
import csv
import io
import secrets
import string
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import DIRECTOR_MANAGED_ROLES, INVITABLE_STAFF_ROLES
from app.core.audit import record_audit_event
from app.core.config import settings
from app.core.rls import set_auth_lookup_email
from app.core.security import get_current_user, get_password_hash
from app.db.database import get_db
from app.models import (
    Attendance,
    AttendanceStatus,
    Class,
    ClassMember,
    Course,
    Grade,
    PendingLink,
    RefreshToken,
    School,
    Semester,
    Student,
    StudentParent,
    User,
    UserRole,
)
from app.modules.academics.averages import (
    grade_score_on_twenty,
    load_grade_coefficients,
    weighted_averages_by_group,
)
from app.modules.schools.calendar import ALGERIA_TZ, algerian_trimesters
from app.modules.schools.insights import (
    AVERAGE_DROP,
    LATES_30D,
    LOW_AVERAGE,
    UNJUSTIFIED_ABSENCES_30D,
    AttendanceFact,
    attendance_weeks,
    class_attendance,
    students_at_risk,
    week_start,
)
from app.schemas import (
    AnalyticsOverview,
    ClassPerformance,
    CourseCreate,
    CourseOut,
    ParentLinkAuditOut,
    SchoolCreate,
    SchoolOut,
    SemesterOut,
    SemesterUpdate,
    StudentAdminOut,
    StudentRegeneratePin,
    TokenGenerationRequest,
)
from app.utils.notifications import create_notification

from .admin_shared import (
    ALLOWED_STUDENT_ARCHIVE_REASONS,
    ArchiveStudentRequest,
    STUDENT_IMPORT_MAX_ROWS,
    StudentParentOut,
    _class_name_from_csv_row,
    _normalized_csv_row,
    _student_name_from_csv_row,
)

router = APIRouter()


@router.get("/students", response_model=list[StudentAdminOut])
async def list_students(
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin: list all students in the school."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can list all students")
    if not current_user.school_id:
        return []
    stmt = select(Student).where(Student.school_id == current_user.school_id)
    if not include_archived:
        stmt = stmt.where(Student.archived_at.is_(None))
    result = await db.execute(
        stmt.order_by(Student.full_name)
    )
    return result.scalars().all()


@router.post("/students/{student_id}/archive")
async def archive_student(
    student_id: str,
    payload: ArchiveStudentRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Archive a student for graduation/transfer without deleting academic records."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can archive students")
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    reason = payload.reason.strip().lower()
    if reason not in ALLOWED_STUDENT_ARCHIVE_REASONS:
        raise HTTPException(status_code=400, detail="Archive reason must be graduated, transferred, or other.")

    student = await db.get(Student, student_id)
    if not student or student.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.archived_at:
        return {
            "status": "already_archived",
            "archived_at": student.archived_at,
            "archive_reason": student.archive_reason,
        }

    now = datetime.now(timezone.utc)
    student.archived_at = now
    student.archive_reason = reason
    student.archived_by = current_user.id
    student.linking_pin = None

    await db.execute(
        update(PendingLink)
        .where(
            PendingLink.student_id == student.id,
            PendingLink.school_id == student.school_id,
            PendingLink.status == "pending",
        )
        .values(status="revoked", revoked_at=now)
    )
    await record_audit_event(
        db,
        action="student.archived",
        actor=current_user,
        school_id=student.school_id,
        resource_type="student",
        resource_id=student.id,
        method=request.method,
        path=request.url.path,
        metadata={"reason": reason},
    )
    await db.commit()
    return {"status": "success", "archived_at": now, "archive_reason": reason}


@router.post("/students/{student_id}/restore")
async def restore_student_archive(
    student_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Restore an archived student when an archive was applied in error."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can restore students")
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    student = await db.get(Student, student_id)
    if not student or student.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Student not found")
    if not student.archived_at:
        return {"status": "already_active"}

    previous_reason = student.archive_reason
    student.archived_at = None
    student.archive_reason = None
    student.archived_by = None
    await record_audit_event(
        db,
        action="student.archive_restored",
        actor=current_user,
        school_id=student.school_id,
        resource_type="student",
        resource_id=student.id,
        method=request.method,
        path=request.url.path,
        metadata={"previous_reason": previous_reason},
    )
    await db.commit()
    return {"status": "success"}


@router.post("/import/students")
async def import_students(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Import students from a CSV file.
    Expected columns: full_name, or prenom + nom; optional classe to enrol each
    student in an existing class of that name.
    """
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can import data")
    
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    # Fetch school to get prefix
    school = await db.get(School, current_user.school_id)
    prefix = school.student_id_prefix if school and school.student_id_prefix else ""

    content = await file.read(settings.media_max_upload_bytes + 1)
    if len(content) > settings.media_max_upload_bytes:
        raise HTTPException(status_code=413, detail="CSV file is too large.")
    decoded = content.decode("utf-8-sig")
    try:
        dialect = csv.Sniffer().sniff(decoded[:4096], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    rows = list(csv.DictReader(io.StringIO(decoded), dialect=dialect))
    if len(rows) > STUDENT_IMPORT_MAX_ROWS:
        raise HTTPException(
            status_code=400,
            detail=f"Au plus {STUDENT_IMPORT_MAX_ROWS} eleves par fichier.",
        )

    current_year_suffix = str(datetime.now().year)[2:]
    count_stmt = select(func.count(Student.id)).where(Student.school_id == current_user.school_id)
    count_res = await db.execute(count_stmt)
    existing_count = count_res.scalar() or 0
    import_count = 0
    skipped_count = 0
    assigned_count = 0
    unknown_classes: set[str] = set()
    used_codes: set[str] = set()
    classes_by_name = {
        name.strip().lower(): class_id
        for class_id, name in (
            await db.execute(select(Class.id, Class.name).where(Class.school_id == current_user.school_id))
        ).all()
    }
    for row in rows:
        name = _student_name_from_csv_row(row)
        if name:
            # Generate Unique Human-Readable Student ID
            serial = existing_count + import_count + 1
            while True:
                student_id_code = f"{prefix}{current_year_suffix}-{serial:03d}"
                existing_code = await db.execute(
                    select(Student.id).where(
                        Student.school_id == current_user.school_id,
                        Student.student_id == student_id_code,
                    )
                )
                if student_id_code not in used_codes and not existing_code.scalar_one_or_none():
                    used_codes.add(student_id_code)
                    break
                serial += 1
            
            # Generate 6-digit random PIN
            pin = f"{secrets.randbelow(1_000_000):06d}"
            
            student = Student(
                id=str(uuid.uuid4()),
                full_name=name, 
                school_id=current_user.school_id,
                student_id=student_id_code,
                linking_pin=pin
            )
            db.add(student)
            import_count += 1
            class_name = _class_name_from_csv_row(row)
            if class_name:
                class_id = classes_by_name.get(class_name.lower())
                if class_id:
                    db.add(ClassMember(school_id=current_user.school_id, class_id=class_id, student_id=student.id))
                    assigned_count += 1
                else:
                    unknown_classes.add(class_name)
        else:
            skipped_count += 1
            
    # Lock the prefix after the first mass import
    if import_count > 0 and school and not school.prefix_locked:
        school.prefix_locked = True
        
    await db.commit()
    return {
        "status": "success",
        "imported": import_count,
        "skipped": skipped_count,
        "assigned": assigned_count,
        "unknown_classes": sorted(unknown_classes),
    }


@router.post("/students/{student_id}/regenerate-pin")
async def regenerate_pin(
    student_id: str,
    payload: StudentRegeneratePin = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can regenerate PINs")
    
    student = await db.get(Student, student_id)
    if not student or student.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.archived_at:
        raise HTTPException(status_code=400, detail="Archived students cannot receive new linking PINs")
        
    pin = f"{secrets.randbelow(1_000_000):06d}"
    student.linking_pin = pin
    
    if payload and payload.notify:
        parent_rows = await db.execute(
            select(StudentParent.parent_id).where(
                StudentParent.student_id == student.id,
                StudentParent.school_id == current_user.school_id,
            )
        )
        for parent_id in parent_rows.scalars().all():
            await create_notification(
                db,
                user_id=parent_id,
                title="Nouveau code de liaison",
                content=f"Un nouveau PIN a été généré pour {student.full_name}: {pin}",
                type="LINKING_PIN",
                school_id=current_user.school_id,
            )
        
    await db.commit()
    
    return {"status": "success", "new_pin": pin, "notified": payload.notify if payload else False}


@router.post("/students/{student_id}/generate-link-tokens")
async def generate_link_tokens(
    student_id: str,
    payload: TokenGenerationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate distinct one-time QR tokens for multiple parents (e.g., Mère, Père)."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")

    student = await db.get(Student, student_id)
    if not student or student.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.archived_at:
        raise HTTPException(status_code=400, detail="Archived students cannot receive new link tokens")

    tokens = []
    expires_at = datetime.now(timezone.utc) + timedelta(hours=payload.expires_in_hours)
    for label in payload.labels:
        token = str(uuid.uuid4())
        new_link = PendingLink(
            school_id=student.school_id,
            student_id=student.id,
            token=token,
            label=label,
            expires_at=expires_at
        )
        db.add(new_link)
        tokens.append({"label": label, "token": token, "expires_at": expires_at})

    await record_audit_event(
        db,
        action="student.link_tokens_generated",
        actor=current_user,
        school_id=student.school_id,
        resource_type="student",
        resource_id=student.id,
        method=request.method,
        path=request.url.path,
        metadata={
            "labels": payload.labels,
            "token_count": len(tokens),
            "expires_in_hours": payload.expires_in_hours,
        },
    )
    await db.commit()
    return {"status": "success", "tokens": tokens}


@router.get("/students/{student_id}/links", response_model=list[ParentLinkAuditOut])
async def list_student_links(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all parent links (active, used, or revoked) for a student."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")

    # Join with User to get parent names
    stmt = select(PendingLink, User.full_name).outerjoin(
        User, PendingLink.parent_id == User.id
    ).where(
        PendingLink.student_id == student_id,
        PendingLink.school_id == current_user.school_id,
        (User.id.is_(None) | (User.school_id == current_user.school_id)),
    ).order_by(PendingLink.created_at.desc())

    result = await db.execute(stmt)
    out = []
    for row in result.all():
        link, parent_name = row
        out.append(ParentLinkAuditOut(
            id=link.id,
            label=link.label,
            device_platform=link.device_platform,
            device_fingerprint=link.device_fingerprint,
            ip_address=link.ip_address,
            used_at=link.used_at,
            revoked_at=link.revoked_at,
            parent_name=parent_name
        ))
    return out


@router.get("/students/{student_id}/parents", response_model=list[StudentParentOut])
async def get_student_parents(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all parents linked to a student."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    student = await db.get(Student, student_id)
    if not student or student.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Student not found")

    stmt = (
        select(User.id, User.full_name, User.email)
        .join(StudentParent, StudentParent.parent_id == User.id)
        .where(
            StudentParent.student_id == student_id,
            StudentParent.school_id == current_user.school_id,
            User.school_id == current_user.school_id,
        )
        .order_by(User.full_name)
    )
    result = await db.execute(stmt)
    return [
        StudentParentOut(
            id=row.id,
            full_name=row.full_name,
            email=row.email,
        )
        for row in result.all()
    ]


@router.delete("/students/{student_id}/parents/{parent_id}")
async def unlink_parent_from_student(
    student_id: str,
    parent_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a parent/student relationship and force that parent to sign in again."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    student = await db.get(Student, student_id)
    if not student or student.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Student not found")

    link_res = await db.execute(
        select(StudentParent).where(
            StudentParent.school_id == current_user.school_id,
            StudentParent.student_id == student_id,
            StudentParent.parent_id == parent_id,
        )
    )
    if not link_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Parent link not found")

    await db.execute(
        delete(StudentParent).where(
            StudentParent.school_id == current_user.school_id,
            StudentParent.student_id == student_id,
            StudentParent.parent_id == parent_id,
        )
    )
    await db.execute(
        delete(RefreshToken).where(
            RefreshToken.school_id == current_user.school_id,
            RefreshToken.user_id == parent_id,
        )
    )
    await record_audit_event(
        db,
        action="student.parent_unlinked",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="student",
        resource_id=student_id,
        method=request.method,
        path=request.url.path,
        metadata={"parent_id": parent_id, "sessions_revoked": True},
    )
    await db.commit()
    return {"status": "success", "sessions_revoked": True}


@router.post("/students/{student_id}/revoke-link/{link_id}")
async def revoke_student_link(
    student_id: str,
    link_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke a parent's access.
    1. Mark link as revoked.
    2. Remove from StudentParent relationship.
    3. FORCE LOGOUT: Invalidate all active refresh tokens for that user.
    """
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")

    link = await db.get(PendingLink, link_id)
    if not link or link.student_id != student_id or link.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Link not found")

    if link.revoked_at:
        return {"message": "Droit déjà révoqué."}

    # 1. Mark Revoked
    link.revoked_at = datetime.now(timezone.utc)
    link.status = "revoked"
    parent_id = link.parent_id

    if parent_id:
        # 2. Remove Relationship
        stmt = delete(StudentParent).where(
            StudentParent.school_id == current_user.school_id,
            StudentParent.student_id == student_id,
            StudentParent.parent_id == parent_id
        )
        await db.execute(stmt)

        # 3. GLOBAL LOGOUT: Clear all sessions for this user
        # In a real environment, we'd delete based on family_id if we wanted to target one device,
        # but the user requested "Supprimer le lien device-level / invalidate tokens".
        # We delete all to be safe.
        await db.execute(
            delete(RefreshToken).where(
                RefreshToken.school_id == current_user.school_id,
                RefreshToken.user_id == parent_id,
            )
        )

    await record_audit_event(
        db,
        action="student.link_revoked",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="student",
        resource_id=student_id,
        method=request.method,
        path=request.url.path,
        metadata={"link_id": link_id, "parent_id": parent_id},
    )
    await db.commit()
    return {"status": "success", "message": "Accès révoqué. Toutes les sessions du parent ont été invalidées."}
