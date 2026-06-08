import csv
import io
import uuid
import random
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, update
from app.db.database import get_db
from app.models import User, UserRole, School, Course, Student, Class, Semester, PendingLink, StudentParent, RefreshToken, Grade, Attendance, AttendanceStatus
from app.schemas import (
    SchoolCreate, SchoolOut, CourseCreate, CourseOut, StudentOut,
    StudentRegeneratePin, SemesterOut, SemesterUpdate,
    TokenGenerationRequest, ParentLinkAuditOut, AnalyticsOverview, ClassPerformance
)
from app.modules.academics.averages import (
    grade_score_on_twenty,
    load_grade_coefficients,
    weighted_averages_by_group,
)
from app.core.audit import record_audit_event
from app.core.security import get_current_user, get_password_hash
from app.utils.notifications import create_notification
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/admin", tags=["Admin Tools"])

# ── Request / Response Models ─────────────────────────────────────────────────

class CreateTeacherRequest(BaseModel):
    email: EmailStr
    full_name: str


class CreateStaffRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.teacher


class UserSimpleOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    invite_code: str | None = None
    model_config = {"from_attributes": True}


class ArchiveStudentRequest(BaseModel):
    reason: str


class PendingAttendanceOut(BaseModel):
    id: str
    class_id: str
    class_name: str
    student_id: str
    student_name: str
    status: AttendanceStatus
    date: datetime
    note: str | None = None
    is_justified: bool
    justification_text: str | None = None
    justification_attachment_url: str | None = None


ALLOWED_STUDENT_ARCHIVE_REASONS = {"graduated", "transferred", "other"}

# ── Create Teacher (Invite-Only Flow) ─────────────────────────────────────────

import string
import random

def generate_invite_code(length=8):
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(random.choice(alphabet) for _ in range(length))


async def _create_invited_staff_user(
    *,
    payload: CreateStaffRequest,
    current_user: User,
    db: AsyncSession,
) -> User:
    if current_user.role not in [UserRole.principal, UserRole.secretary]:
        raise HTTPException(status_code=403, detail="Only school administration can invite staff accounts.")

    if payload.role not in [UserRole.teacher, UserRole.secretary]:
        raise HTTPException(status_code=400, detail="Only teacher and secretary invitations are supported.")

    if payload.role == UserRole.secretary and current_user.role != UserRole.principal:
        raise HTTPException(status_code=403, detail="Only the director can invite secretary accounts.")

    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="You are not assigned to a school.")

    stmt = select(User).where(User.email == payload.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Un compte avec cet email existe deja.")

    invited_user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        school_id=current_user.school_id,
        password_hash=None,
        invite_code=generate_invite_code(),
    )
    db.add(invited_user)
    await db.commit()
    await db.refresh(invited_user)
    return invited_user


def _normalized_csv_row(row: dict[str | None, str | None]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for key, value in row.items():
        if key is None:
            continue
        clean_key = key.lstrip("\ufeff").strip().lower().replace(" ", "_")
        normalized[clean_key] = (value or "").strip()
    return normalized


def _student_name_from_csv_row(row: dict[str | None, str | None]) -> str:
    normalized = _normalized_csv_row(row)
    full_name = (
        normalized.get("full_name")
        or normalized.get("name")
        or normalized.get("nom_complet")
        or normalized.get("الاسم_الكامل")
        or normalized.get("الإسم_الكامل")
    )
    if full_name:
        return full_name

    first_name = (
        normalized.get("prenom")
        or normalized.get("prénom")
        or normalized.get("first_name")
        or normalized.get("firstname")
        or normalized.get("الاسم")
        or normalized.get("الإسم")
        or normalized.get("اسم")
    )
    last_name = (
        normalized.get("nom")
        or normalized.get("last_name")
        or normalized.get("lastname")
        or normalized.get("اللقب")
        or normalized.get("النسب")
        or normalized.get("اسم_العائلة")
        or normalized.get("العائلة")
    )
    return " ".join(part for part in [first_name, last_name] if part)

@router.post("/create-teacher", response_model=UserSimpleOut, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    payload: CreateTeacherRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Principal creates a teacher account without a password.
    An invite_code is generated so the teacher can log in for the first time.
    """
    return await _create_invited_staff_user(
        payload=CreateStaffRequest(
            email=payload.email,
            full_name=payload.full_name,
            role=UserRole.teacher,
        ),
        current_user=current_user,
        db=db,
    )


@router.post("/create-staff", response_model=UserSimpleOut, status_code=status.HTTP_201_CREATED)
async def create_staff(
    payload: CreateStaffRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite a teacher or secretary account with a first-login code."""
    return await _create_invited_staff_user(payload=payload, current_user=current_user, db=db)


@router.get("/staff", response_model=list[UserSimpleOut])
async def list_staff(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only school administration can list staff accounts.")

    if not current_user.school_id:
        return []

    result = await db.execute(
        select(User)
        .where(
            User.school_id == current_user.school_id,
            User.role.in_([UserRole.principal, UserRole.secretary, UserRole.teacher]),
        )
        .order_by(User.role.asc(), User.full_name.asc())
    )
    return result.scalars().all()


ALGERIAN_CORE_SUBJECTS = [
    "اللغة العربية (Arabic)",
    "الرياضيات (Mathematics)",
    "اللغة الفرنسية (French)",
    "اللغة الإنجليزية (English)",
    "فيزياء وكيمياء (Physics/Chemistry)",
    "علوم الطبيعة والحياة (Life Sciences)",
    "التاريخ والجغرافيا (History/Geography)",
    "التربية الإسلامية (Islamic Education)",
    "التربية البدنية (PE)",
    "المعلوماتية (Informatics)",
    "التربية الفنية (Arts)",
    "التربية المدنية (Civic Education)",
    "الفلسفة (Philosophy)"
]

ALGERIAN_TRIMESTERS = [
    # (name, start_month, start_day, end_month, end_day)
    ("Trimester 1", 9, 15, 12, 15),
    ("Trimester 2", 1, 5, 3, 25),
    ("Trimester 3", 4, 5, 7, 5),
]

@router.post("/schools", response_model=SchoolOut, status_code=status.HTTP_201_CREATED)
async def create_school(
    payload: SchoolCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Only existing admins can create new schools, or this could be an open endpoint for platform owners."""
    # For now, let's assume any registered principal can create their school profile
    school = School(name=payload.name)
    db.add(school)
    await db.flush() # Ensure school.id is generated
    
    # Seed Algerian standard courses
    for subject_name in ALGERIAN_CORE_SUBJECTS:
        course = Course(name=subject_name, school_id=school.id)
        db.add(course)
    
    # Assign current user to this school if they don't have one
    if not current_user.school_id:
        current_user.school_id = school.id
        
    # Seed Algerian standard semesters (Trimesters)
    current_year = datetime.now().year
    for name, sm, sd, em, ed in ALGERIAN_TRIMESTERS:
        start_dt = datetime(current_year if sm > 8 else current_year + 1, sm, sd)
        end_dt = datetime(current_year if em > 8 else current_year + 1, em, ed)
        semester = Semester(
            name=name,
            start_date=start_dt,
            end_date=end_dt,
            school_id=school.id,
            is_active=(name == "Trimester 1") # Default T1 as active
        )
        db.add(semester)

    await db.commit()
    await db.refresh(school)
    return school


@router.get("/semesters", response_model=list[SemesterOut])
async def list_semesters(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.school_id:
        return []
    result = await db.execute(select(Semester).where(Semester.school_id == current_user.school_id))
    return result.scalars().all()


@router.put("/semesters/{semester_id}", response_model=SemesterOut)
async def update_semester(
    semester_id: str,
    payload: SemesterUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")
        
    stmt = select(Semester).where(Semester.id == semester_id, Semester.school_id == current_user.school_id)
    result = await db.execute(stmt)
    semester = result.scalar_one_or_none()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
        
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(semester, key, value)
        
    await db.commit()
    await db.refresh(semester)
    return semester

@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can manage courses")
    
    course = Course(
        name=payload.name,
        school_id=current_user.school_id,
        coefficient=payload.coefficient,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course

@router.get("/courses", response_model=list[CourseOut])
async def list_courses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.school_id:
        return []
    result = await db.execute(select(Course).where(Course.school_id == current_user.school_id))
    return result.scalars().all()


@router.get("/students", response_model=list[StudentOut])
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


@router.get("/attendance/pending", response_model=list[PendingAttendanceOut])
async def pending_attendance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only school administration can review attendance.")
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="You are not assigned to a school.")

    stmt = (
        select(
            Attendance.id,
            Attendance.class_id,
            Class.name.label("class_name"),
            Attendance.student_id,
            Attendance.student_name,
            Attendance.status,
            Attendance.date,
            Attendance.note,
            Attendance.is_justified,
            Attendance.justification_text,
            Attendance.justification_attachment_url,
        )
        .join(Class, Class.id == Attendance.class_id)
        .where(
            Attendance.school_id == current_user.school_id,
            Class.school_id == current_user.school_id,
            Attendance.status.in_([AttendanceStatus.absent, AttendanceStatus.late]),
            Attendance.is_justified.is_(False),
        )
        .order_by(Attendance.date.desc(), Class.name.asc(), Attendance.student_name.asc())
        .limit(200)
    )
    result = await db.execute(stmt)
    pending = []
    for row in result.all():
        mapping = row._mapping if hasattr(row, "_mapping") else row
        pending.append(PendingAttendanceOut.model_validate(mapping))
    return pending


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
    Expected columns: full_name, or prenom + nom.
    """
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can import data")
    
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    # Fetch school to get prefix
    school = await db.get(School, current_user.school_id)
    prefix = school.student_id_prefix if school and school.student_id_prefix else ""

    content = await file.read()
    decoded = content.decode("utf-8-sig")
    try:
        dialect = csv.Sniffer().sniff(decoded[:4096], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(decoded), dialect=dialect)
    
    current_year_suffix = str(datetime.now().year)[2:]
    count_stmt = select(func.count(Student.id)).where(Student.school_id == current_user.school_id)
    count_res = await db.execute(count_stmt)
    existing_count = count_res.scalar() or 0
    import_count = 0
    skipped_count = 0
    used_codes: set[str] = set()
    for row in reader:
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
            pin = "".join([str(random.randint(0, 9)) for _ in range(6)])
            
            student = Student(
                full_name=name, 
                school_id=current_user.school_id,
                student_id=student_id_code,
                linking_pin=pin
            )
            db.add(student)
            import_count += 1
        else:
            skipped_count += 1
            
    # Lock the prefix after the first mass import
    if import_count > 0 and school and not school.prefix_locked:
        school.prefix_locked = True
        
    await db.commit()
    return {"status": "success", "imported": import_count, "skipped": skipped_count}

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
        
    pin = "".join([str(random.randint(0, 9)) for _ in range(6)])
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

@router.post("/import/teachers")
async def import_teachers(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Import teachers from a CSV file.
    Expected columns: full_name, email
    Note: these teachers will receive local EduConnect invite accounts.
    """
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can import data")
    
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    
    import_count = 0
    for row in reader:
        name = row.get("full_name")
        email = row.get("email")
        if name and email:
            # Check if teacher already exists
            stmt = select(User).where(User.email == email)
            existing = await db.execute(stmt)
            if not existing.scalar_one_or_none():
                # Normal flow handles local user creation. This import is for invitations.
                pass
            import_count += 1
            
    return {"status": "feature_partially_implemented", "msg": "Teacher invites coming soon"}

# ─── Parent Linking & Audit ───────────────────────────────────────────────────

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
# ─── Analytics ────────────────────────────────────────────────────────────────

@router.get("/analytics/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    SaaS Dashboard Analytics:
    - Global school average
    - Class-by-class averages
    - Parent adoption rate
    """
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")

    school_id = current_user.school_id

    approved_grade_rows = await db.execute(
        select(Grade, Student.full_name, Class.name.label("class_name"))
        .join(Student, Student.id == Grade.student_id)
        .join(Class, Class.id == Grade.class_id)
        .where(
            Student.school_id == school_id,
            Class.school_id == school_id,
            Grade.school_id == school_id,
            Student.archived_at.is_(None),
            Grade.is_approved == True,
        )
    )
    approved_rows = approved_grade_rows.all()
    approved_grades = [row[0] for row in approved_rows]
    grade_coefficients = await load_grade_coefficients(db, approved_grades)

    class_names = {grade.class_id: class_name for grade, _, class_name in approved_rows}
    student_names = {
        (grade.student_id, grade.class_id): full_name or grade.student_name
        for grade, full_name, _ in approved_rows
    }

    student_class_averages = weighted_averages_by_group(
        approved_grades,
        grade_coefficients,
        lambda grade: (grade.student_id, grade.class_id),
    )
    school_avg = (
        sum(student_class_averages.values()) / len(student_class_averages)
        if student_class_averages
        else 0.0
    )

    class_average_scores: dict[str, list[float]] = defaultdict(list)
    for (_, class_id), average in student_class_averages.items():
        class_average_scores[class_id].append(average)

    class_performance = [
        {
            "class_name": class_names.get(class_id, class_id),
            "average_score": round(sum(scores) / len(scores), 2),
        }
        for class_id, scores in class_average_scores.items()
        if scores
    ]
    class_performance.sort(key=lambda item: item["average_score"], reverse=True)

    # 3. Adoption Rate (Students with >=1 parent / Total students)
    total_students_stmt = select(func.count(Student.id)).where(
        Student.school_id == school_id,
        Student.archived_at.is_(None),
    )
    total_res = await db.execute(total_students_stmt)
    total_count = total_res.scalar() or 1 # Avoid division by zero

    linked_students_stmt = (
        select(func.count(func.distinct(StudentParent.student_id)))
        .join(Student, Student.id == StudentParent.student_id)
        .where(
            StudentParent.school_id == school_id,
            Student.school_id == school_id,
            Student.archived_at.is_(None),
        )
    )
    linked_res = await db.execute(linked_students_stmt)
    linked_count = linked_res.scalar() or 0

    adoption_rate = (linked_count / total_count) * 100

    subject_scores: dict[str, list[float]] = defaultdict(list)
    for grade in approved_grades:
        if grade.subject:
            subject_scores[grade.subject].append(grade_score_on_twenty(grade))
    subject_performance = [
        {"subject": subject, "average_score": round(sum(scores) / len(scores), 2)}
        for subject, scores in subject_scores.items()
        if scores
    ]
    subject_performance.sort(key=lambda item: item["average_score"], reverse=True)

    student_rankings = [
        {
            "student_id": student_id,
            "student_name": student_names.get((student_id, class_id), ""),
            "class_name": class_names.get(class_id, class_id),
            "average_score": round(average, 2),
        }
        for (student_id, class_id), average in student_class_averages.items()
    ]
    student_rankings.sort(key=lambda item: item["average_score"], reverse=True)

    top_students = student_rankings[:5]
    struggling_students = [
        student
        for student in sorted(student_rankings, key=lambda item: item["average_score"])
        if student["average_score"] < 10.0
    ][:5]

    from sqlalchemy import case, Integer
    # 6. Absence Rate (Absent count / Total attendances * 100)
    att_stmt = select(
        func.count(Attendance.id).label("total"),
        func.sum(
            case(
                (Attendance.status.in_(["absent", "late"]), 1),
                else_=0
            )
        ).label("absences")
    ).where(Attendance.school_id == school_id)
    att_res = await db.execute(att_stmt)
    att_row = att_res.first()
    
    absence_rate = 0.0
    if att_row and att_row.total and att_row.total > 0:
        absences = att_row.absences or 0
        absence_rate = (absences / att_row.total) * 100

    return {
        "school_avg": round(school_avg, 2),
        "class_performance": class_performance,
        "adoption_rate": round(adoption_rate, 1),
        "subject_performance": subject_performance,
        "top_students": top_students,
        "struggling_students": struggling_students,
        "absence_rate": round(absence_rate, 2)
    }
