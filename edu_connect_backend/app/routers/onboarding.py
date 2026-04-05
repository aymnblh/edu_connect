import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import School, User, UserRole, Course, Semester
from ..schemas import SchoolRegistration, UserOut
from ..auth import get_password_hash

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

ALGERIAN_CORE_SUBJECTS = [
    "اللغة العربية (Arabic)", "الرياضيات (Mathematics)", "اللغة الفرنسية (French)",
    "اللغة الإنجليزية (English)", "فيزياء وكيمياء (Physics/Chemistry)",
    "علوم الطبيعة والحياة (Life Sciences)", "التاريخ والجغرافيا (History/Geography)",
    "التربية الإسلامية (Islamic Education)", "التربية البدنية (PE)",
    "المعلوماتية (Informatics)", "التربية الفنية (Arts)",
    "التربية المدنية (Civic Education)", "الفلسفة (Philosophy)"
]

ALGERIAN_TRIMESTERS = [
    ("Trimester 1", 9, 15, 12, 15),
    ("Trimester 2", 1, 5, 3, 25),
    ("Trimester 3", 4, 5, 7, 5),
]

@router.post("/register-school", status_code=status.HTTP_201_CREATED)
async def register_school(
    payload: SchoolRegistration,
    db: AsyncSession = Depends(get_db)
):
    """
    Self-serve onboarding for a new school.
    1. Check if email already exists.
    2. Create School (Inactive by default).
    3. Create Principal user.
    4. Seed Algerian subjects and trimesters.
    """
    # 1. Check existing user
    stmt = select(User).where(User.email == payload.admin_email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

    # 2. Create School
    # Use first 3 letters of school name as ID prefix (e.g. "College El Amel" -> "COL")
    prefix = payload.school_name[:3].upper()
    school = School(
        name=payload.school_name,
        student_id_prefix=prefix,
        tenant_config={
            "active": False, 
            "activated_at": None, 
            "plan": "pro",
            "max_parents_per_student": 2,
            "offline_scope": "current_trimester"
        }
    )
    db.add(school)
    await db.flush()

    # 3. Create Principal
    admin_user = User(
        id=str(uuid.uuid4()),
        email=payload.admin_email,
        full_name=payload.admin_name,
        password_hash=get_password_hash(payload.admin_password),
        role=UserRole.principal,
        school_id=school.id
    )
    db.add(admin_user)

    # 4. Seed Data
    for subject in ALGERIAN_CORE_SUBJECTS:
        db.add(Course(name=subject, school_id=school.id))

    current_year = datetime.now().year
    for name, sm, sd, em, ed in ALGERIAN_TRIMESTERS:
        start_dt = datetime(current_year if sm > 8 else current_year + 1, sm, sd, tzinfo=timezone.utc)
        end_dt = datetime(current_year if em > 8 else current_year + 1, em, ed, tzinfo=timezone.utc)
        db.add(Semester(
            name=name, start_date=start_dt, end_date=end_dt,
            school_id=school.id, is_active=(name == "Trimester 1")
        ))

    await db.commit()
    return {"status": "success", "message": "Établissement créé. En attente d'activation.", "school_id": school.id}
