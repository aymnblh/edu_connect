import csv
import io
import uuid
import random
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import get_db
from ..models import User, UserRole, School, Course, Student, Class, Semester, PendingLink, StudentParent, RefreshToken
from ..schemas import (
    SchoolCreate, SchoolOut, CourseCreate, CourseOut, StudentOut, 
    StudentRegeneratePin, SemesterOut, SemesterUpdate, 
    TokenGenerationRequest, ParentLinkAuditOut, AnalyticsOverview, ClassPerformance
)
from ..auth import get_current_user
from sqlalchemy import select, func, delete
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/admin", tags=["Admin Tools"])

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
    
    course = Course(name=payload.name, school_id=payload.school_id)
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

@router.post("/import/students")
async def import_students(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Import students from a CSV file.
    Expected columns: full_name
    """
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can import data")
    
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    # Fetch school to get prefix
    school = await db.get(School, current_user.school_id)
    prefix = school.student_id_prefix if school and school.student_id_prefix else ""

    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    
    current_year_suffix = str(datetime.now().year)[2:]
    import_count = 0
    for row in reader:
        name = row.get("full_name")
        if name:
            # Generate Unique Human-Readable Student ID
            # Count current students to get serial
            count_stmt = select(func.count(Student.id)).where(Student.school_id == current_user.school_id)
            count_res = await db.execute(count_stmt)
            serial = count_res.scalar() + import_count + 1
            student_id_code = f"{prefix}{current_year_suffix}-{serial:03d}" 
            
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
            
    # Lock the prefix after the first mass import
    if import_count > 0 and school and not school.prefix_locked:
        school.prefix_locked = True
        
    await db.commit()
    return {"status": "success", "imported": import_count}

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
        
    pin = "".join([str(random.randint(0, 9)) for _ in range(6)])
    student.linking_pin = pin
    
    # Notify parents if requested and applicable
    if payload and payload.notify:
        # TODO: Trigger notification service (e.g. FCM or In-app)
        # For now, just mark the intent in the log/response
        pass
        
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
    Note: These teachers will still need to sign up via Firebase with the same email.
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
                # We can't set their Firebase ID yet, but we store them
                # Use a placeholder ID or just skip if they must be created through normal flow.
                # Actually, normal flow handles User creation. This import might be for invitations.
                pass
            import_count += 1
            
    return {"status": "feature_partially_implemented", "msg": "Teacher invites coming soon"}

# ─── Parent Linking & Audit ───────────────────────────────────────────────────

@router.post("/students/{student_id}/generate-link-tokens")
async def generate_link_tokens(
    student_id: str,
    payload: TokenGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate distinct one-time QR tokens for multiple parents (e.g., Mère, Père)."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")

    student = await db.get(Student, student_id)
    if not student or student.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Student not found")

    tokens = []
    for label in payload.labels:
        token = str(uuid.uuid4())
        new_link = PendingLink(
            school_id=student.school_id,
            student_id=student.id,
            token=token,
            label=label,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15)
        )
        db.add(new_link)
        tokens.append({"label": label, "token": token})

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
        PendingLink.school_id == current_user.school_id
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

@router.post("/students/{student_id}/revoke-link/{link_id}")
async def revoke_student_link(
    student_id: str,
    link_id: str,
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
    parent_id = link.parent_id

    if parent_id:
        # 2. Remove Relationship
        stmt = delete(StudentParent).where(
            StudentParent.student_id == student_id,
            StudentParent.parent_id == parent_id
        )
        await db.execute(stmt)

        # 3. GLOBAL LOGOUT: Clear all sessions for this user
        # In a real environment, we'd delete based on family_id if we wanted to target one device,
        # but the user requested "Supprimer le lien device-level / invalidate tokens".
        # We delete all to be safe.
        await db.execute(delete(RefreshToken).where(RefreshToken.user_id == parent_id))

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

    # 1. Global School Average
    avg_stmt = select(func.avg(Grade.score)).join(Grade.student).where(Student.school_id == school_id)
    school_avg_res = await db.execute(avg_stmt)
    school_avg = school_avg_res.scalar() or 0.0

    # 2. Class-by-class averages
    class_stmt = (
        select(Class.name, func.avg(Grade.score))
        .join(Grade, Grade.class_id == Class.id)
        .where(Class.school_id == school_id)
        .group_by(Class.id, Class.name)
        .order_by(func.avg(Grade.score).desc())
    )
    class_res = await db.execute(class_stmt)
    class_performance = [
        ClassPerformance(class_name=name, average_score=round(avg, 2))
        for name, avg in class_res.all()
    ]

    # 3. Adoption Rate (Students with >=1 parent / Total students)
    total_students_stmt = select(func.count(Student.id)).where(Student.school_id == school_id)
    total_res = await db.execute(total_students_stmt)
    total_count = total_res.scalar() or 1 # Avoid division by zero

    linked_students_stmt = (
        select(func.count(func.distinct(StudentParent.student_id)))
        .join(Student, Student.id == StudentParent.student_id)
        .where(Student.school_id == school_id)
    )
    linked_res = await db.execute(linked_students_stmt)
    linked_count = linked_res.scalar() or 0

    adoption_rate = (linked_count / total_count) * 100

    return AnalyticsOverview(
        school_avg=round(school_avg, 2),
        class_performance=class_performance,
        adoption_rate=round(adoption_rate, 1)
    )
