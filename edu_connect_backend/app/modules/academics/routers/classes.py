import random
import string
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select, delete as sa_delete, or_
from app.core.access import assert_class_read_access, assert_school_admin_for_class
from app.db.database import get_db
from app.models import Class, ClassMember, ClassTemporaryAccess, User, UserRole, Student, ClassTeacher, StudentParent, ClassCourse, Course
from app.schemas import ClassCreate, ClassOut, JoinClassRequest, ClassCourseAssign, ClassCourseOut, ClassStudentEnroll, TeacherSimpleOut
from app.core.security import get_current_user
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

router = APIRouter(prefix="/classes", tags=["Classes"])


# ─── Response Schemas ─────────────────────────────────────────────────────────

class StudentOut(BaseModel):
    id: str
    full_name: str
    student_id: str | None = None

    model_config = {"from_attributes": True}


class TemporaryAccessCreate(BaseModel):
    user_id: str
    access_level: str = "read"
    starts_at: datetime | None = None
    expires_at: datetime
    reason: str | None = None


class TemporaryAccessOut(BaseModel):
    class_id: str
    user_id: str
    access_level: str
    starts_at: datetime
    expires_at: datetime
    granted_by: str
    reason: str | None = None

    model_config = {"from_attributes": True}


def _random_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def _aware_datetime(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _course_coefficient(course: Course | None) -> float:
    if course and course.coefficient and course.coefficient > 0:
        return float(course.coefficient)
    return 1.0


def _class_out(cls: Class, *, member_filter: set[str] | None = None) -> dict:
    visible_members = []
    for member in cls.members or []:
        if member.student is None:
            continue
        if member_filter is not None and member.student.id not in member_filter:
            continue
        visible_members.append(member.student)

    return {
        "id": cls.id,
        "school_id": cls.school_id,
        "name": cls.name,
        "subject": cls.subject,
        "join_code": cls.join_code,
        "created_at": cls.created_at,
        "teachers": [
            {
                "id": t.id,
                "school_id": t.school_id,
                "email": t.email,
                "full_name": t.full_name,
                "role": t.role,
                "phone": t.phone,
                "avatar_url": t.avatar_url,
                "created_at": t.created_at,
                "students_linking": [],
            }
            for t in (cls.teachers or [])
        ],
        "members": visible_members,
    }


async def _parent_visible_student_ids(
    *,
    school_id: str,
    parent_id: str,
    db: AsyncSession,
) -> set[str]:
    result = await db.execute(
        select(StudentParent.student_id).where(
            StudentParent.school_id == school_id,
            StudentParent.parent_id == parent_id,
        )
    )
    return set(result.scalars().all())


@router.post("/", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
async def create_class(
    payload: ClassCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Seule l'administration peut créer des classes.")
    
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    join_code = _random_code()
    cls = Class(
        name=payload.name, 
        subject=payload.subject, 
        join_code=join_code,
        school_id=current_user.school_id
    )
    db.add(cls)
    await db.flush()
    
    # Only automatically assign the creator as a teacher if they actually are a teacher
    if current_user.role.value == "teacher":
        db.add(ClassTeacher(
            school_id=current_user.school_id,
            class_id=cls.id,
            teacher_id=current_user.id
        ))

    await db.commit()

    # Reload with eager-loaded relationships to avoid lazy-load async issues
    result = await db.execute(
        select(Class)
        .where(Class.id == cls.id, Class.school_id == current_user.school_id)
        .options(
            selectinload(Class.teachers),
            selectinload(Class.members).selectinload(ClassMember.student),
        )
    )
    return _class_out(result.scalar_one())


@router.post("/join", response_model=ClassOut)
async def join_class(
    payload: JoinClassRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Class)
        .where(Class.join_code == payload.join_code)
        .options(
            selectinload(Class.teachers),
            selectinload(Class.members).selectinload(ClassMember.student),
        )
    )
    cls = result.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Invalid join code.")
    if current_user.role.value != "system_admin" and cls.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Acces refuse.")
    
    if current_user.role.value == "teacher":
        if current_user not in cls.teachers:
            cls.teachers.append(current_user)
            await db.commit()
    return _class_out(cls)


@router.get("/teachers/all", response_model=list[TeacherSimpleOut])
async def list_school_teachers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: list all teachers in the school."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can list teachers")
    result = await db.execute(
        select(User).where(
            User.school_id == current_user.school_id,
            User.role == UserRole.teacher
        )
    )
    return result.scalars().all()


@router.get("/", response_model=list[ClassOut])
async def list_classes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    opts = [
        selectinload(Class.teachers),
        selectinload(Class.members).selectinload(ClassMember.student),
    ]
    if current_user.role.value in ["principal", "secretary"]:
        result = await db.execute(
            select(Class)
            .where(Class.school_id == current_user.school_id)
            .options(*opts)
        )
    elif current_user.role.value == "teacher":
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(Class)
            .outerjoin(ClassTeacher, ClassTeacher.class_id == Class.id)
            .outerjoin(ClassTemporaryAccess, ClassTemporaryAccess.class_id == Class.id)
            .where(
                Class.school_id == current_user.school_id,
                or_(
                    ClassTeacher.teacher_id == current_user.id,
                    and_(
                        ClassTemporaryAccess.user_id == current_user.id,
                        ClassTemporaryAccess.starts_at <= now,
                        ClassTemporaryAccess.expires_at >= now,
                    ),
                ),
            )
            .distinct()
            .options(*opts)
        )
    else:
        result = await db.execute(
            select(Class)
            .join(Class.members)
            .join(ClassMember.student)
            .join(StudentParent, StudentParent.student_id == Student.id)
            .where(
                Class.school_id == current_user.school_id,
                ClassMember.school_id == current_user.school_id,
                Student.school_id == current_user.school_id,
                StudentParent.school_id == current_user.school_id,
                StudentParent.parent_id == current_user.id,
            )
            .distinct()
            .options(*opts)
        )
    classes = result.scalars().unique().all()
    if current_user.role.value == "parent" and current_user.school_id:
        visible_student_ids = await _parent_visible_student_ids(
            school_id=current_user.school_id,
            parent_id=current_user.id,
            db=db,
        )
        return [_class_out(cls, member_filter=visible_student_ids) for cls in classes]
    return [_class_out(cls) for cls in classes]


@router.get("/{class_id}", response_model=ClassOut)
async def get_class(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Class)
        .where(Class.id == class_id)
        .options(
            selectinload(Class.members).selectinload(ClassMember.student),
            selectinload(Class.teachers),
        )
    )
    result = await db.execute(stmt)
    cls = result.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if current_user.role.value == "teacher":
        await assert_class_read_access(class_id, current_user, db)
        teacher_ids = [current_user.id]
        if current_user.id not in teacher_ids:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas enseignant dans cette classe.")

    member_filter: set[str] | None = None
    if current_user.role.value == "parent":
        parent_access = await db.execute(
            select(ClassMember)
            .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
            .where(
                ClassMember.school_id == cls.school_id,
                ClassMember.class_id == class_id,
                StudentParent.school_id == cls.school_id,
                StudentParent.parent_id == current_user.id,
            )
            .limit(1)
        )
        if not parent_access.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Acces refuse.")
        member_filter = await _parent_visible_student_ids(
            school_id=cls.school_id,
            parent_id=current_user.id,
            db=db,
        )
    elif current_user.role.value != "system_admin" and cls.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Accès refusé.")

    return _class_out(cls, member_filter=member_filter)


@router.get("/{class_id}/students", response_model=list[StudentOut])
async def list_class_students(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls_res = await db.execute(select(Class).where(Class.id == class_id))
    cls = cls_res.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Classe introuvable.")
    if current_user.role.value != "system_admin" and cls.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Accès refusé.")

    if current_user.role.value in ["principal", "secretary"]:
        stmt = (
            select(Student)
            .join(ClassMember, ClassMember.student_id == Student.id)
            .where(
                Student.school_id == cls.school_id,
                ClassMember.school_id == cls.school_id,
                ClassMember.class_id == class_id,
            )
        )
    elif current_user.role.value == "teacher":
        await assert_class_read_access(class_id, current_user, db)
        result = await db.execute(
            select(Student)
            .join(ClassMember, ClassMember.student_id == Student.id)
            .where(
                Student.school_id == cls.school_id,
                ClassMember.school_id == cls.school_id,
                ClassMember.class_id == class_id,
            )
        )
        return result.scalars().all()

        teacher_check = await db.execute(
            select(Class).join(Class.teachers)
            .where(Class.id == class_id, User.id == current_user.id)
        )
        if not teacher_check.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Vous n'êtes pas enseignant dans cette classe.")
        stmt = (
            select(Student)
            .join(ClassMember, ClassMember.student_id == Student.id)
            .where(ClassMember.school_id == cls.school_id, ClassMember.class_id == class_id)
        )
    else:
        stmt = (
            select(Student)
            .join(ClassMember, ClassMember.student_id == Student.id)
            .join(StudentParent, StudentParent.student_id == Student.id)
            .where(
                Student.school_id == cls.school_id,
                ClassMember.school_id == cls.school_id,
                ClassMember.class_id == class_id,
                StudentParent.school_id == cls.school_id,
                StudentParent.parent_id == current_user.id,
            )
        )

    result = await db.execute(stmt)
    return result.scalars().all()


# ─── Admin: Enroll students in a class ───────────────────────────────────────

@router.get("/{class_id}/temporary-access", response_model=list[TemporaryAccessOut])
async def list_temporary_access(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_school_admin_for_class(class_id, current_user, db)
    result = await db.execute(
        select(ClassTemporaryAccess)
        .where(
            ClassTemporaryAccess.school_id == current_user.school_id,
            ClassTemporaryAccess.class_id == class_id,
        )
        .order_by(ClassTemporaryAccess.expires_at.desc())
    )
    return result.scalars().all()


@router.post("/{class_id}/temporary-access", response_model=TemporaryAccessOut, status_code=status.HTTP_201_CREATED)
async def grant_temporary_access(
    class_id: str,
    payload: TemporaryAccessCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await assert_school_admin_for_class(class_id, current_user, db)
    access_level = payload.access_level.strip().lower()
    if access_level not in {"read", "write"}:
        raise HTTPException(status_code=400, detail="access_level must be read or write.")

    starts_at = _aware_datetime(payload.starts_at) if payload.starts_at else datetime.now(timezone.utc)
    expires_at = _aware_datetime(payload.expires_at)
    if expires_at <= starts_at:
        raise HTTPException(status_code=400, detail="expires_at must be after starts_at.")

    user = await db.get(User, payload.user_id)
    if not user or user.school_id != cls.school_id or user.role != UserRole.teacher:
        raise HTTPException(status_code=404, detail="Enseignant introuvable dans cet etablissement.")

    result = await db.execute(
        select(ClassTemporaryAccess).where(
            ClassTemporaryAccess.school_id == cls.school_id,
            ClassTemporaryAccess.class_id == class_id,
            ClassTemporaryAccess.user_id == payload.user_id,
        )
    )
    access = result.scalar_one_or_none()
    if not access:
        access = ClassTemporaryAccess(
            school_id=cls.school_id,
            class_id=class_id,
            user_id=payload.user_id,
            granted_by=current_user.id,
        )
        db.add(access)

    access.access_level = access_level
    access.starts_at = starts_at
    access.expires_at = expires_at
    access.reason = payload.reason
    access.granted_by = current_user.id

    await db.commit()
    await db.refresh(access)
    return access


@router.delete("/{class_id}/temporary-access/{user_id}")
async def revoke_temporary_access(
    class_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_school_admin_for_class(class_id, current_user, db)
    await db.execute(
        sa_delete(ClassTemporaryAccess).where(
            ClassTemporaryAccess.school_id == current_user.school_id,
            ClassTemporaryAccess.class_id == class_id,
            ClassTemporaryAccess.user_id == user_id,
        )
    )
    await db.commit()
    return {"status": "success"}


@router.put("/{class_id}/students")
async def enroll_students(
    class_id: str,
    payload: ClassStudentEnroll,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin sets the list of enrolled students (replaces existing enrollment)."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can enroll students")

    cls_res = await db.execute(select(Class).where(Class.id == class_id, Class.school_id == current_user.school_id))
    if not cls_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Classe introuvable")

    # Replace existing memberships
    await db.execute(
        sa_delete(ClassMember).where(
            ClassMember.school_id == current_user.school_id,
            ClassMember.class_id == class_id,
        )
    )

    for student_id in payload.student_ids:
        student_res = await db.execute(
            select(Student).where(
                Student.id == student_id,
                Student.school_id == current_user.school_id,
            )
        )
        if not student_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Eleve introuvable: {student_id}")

        db.add(ClassMember(
            school_id=current_user.school_id,
            class_id=class_id,
            student_id=student_id
        ))

    await db.commit()
    return {"status": "success", "enrolled": len(payload.student_ids)}


# ─── Admin: Assign / remove course+teacher to a class ────────────────────────

@router.get("/{class_id}/courses", response_model=list[ClassCourseOut])
async def get_class_courses(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all courses assigned to a class with their responsible teacher."""
    cls = await assert_class_read_access(class_id, current_user, db)

    result = await db.execute(
        select(ClassCourse).where(
            ClassCourse.school_id == cls.school_id,
            ClassCourse.class_id == class_id,
        )
    )
    cc_list = result.scalars().all()
    out = []
    for cc in cc_list:
        course = await db.get(Course, cc.course_id)
        teacher = await db.get(User, cc.teacher_id)
        out.append(ClassCourseOut(
            class_id=cc.class_id,
            course_id=cc.course_id,
            teacher_id=cc.teacher_id,
            coefficient=cc.coefficient or _course_coefficient(course),
            course_name=course.name if course else None,
            teacher_name=teacher.full_name if teacher else None,
        ))
    return out


@router.post("/{class_id}/courses", response_model=ClassCourseOut)
async def assign_course_to_class(
    class_id: str,
    payload: ClassCourseAssign,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin assigns a course (matière) with its responsible teacher to a class."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can assign courses")

    cls_res = await db.execute(select(Class).where(Class.id == class_id, Class.school_id == current_user.school_id))
    if not cls_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Classe introuvable")

    course_res = await db.execute(
        select(Course).where(Course.id == payload.course_id, Course.school_id == current_user.school_id)
    )
    course = course_res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Matiere introuvable")

    teacher_res = await db.execute(
        select(User).where(
            User.id == payload.teacher_id,
            User.school_id == current_user.school_id,
            User.role == UserRole.teacher,
        )
    )
    if not teacher_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Enseignant introuvable")

    # Check if already assigned — update teacher if so
    existing = await db.execute(
        select(ClassCourse).where(
            ClassCourse.school_id == current_user.school_id,
            ClassCourse.class_id == class_id,
            ClassCourse.course_id == payload.course_id
        )
    )
    existing_cc = existing.scalar_one_or_none()
    if existing_cc:
        existing_cc.teacher_id = payload.teacher_id
        if payload.coefficient is not None:
            existing_cc.coefficient = payload.coefficient
        await db.commit()
        cc = existing_cc
    else:
        cc = ClassCourse(
            class_id=class_id,
            course_id=payload.course_id,
            teacher_id=payload.teacher_id,
            school_id=current_user.school_id,
            coefficient=payload.coefficient or _course_coefficient(course),
        )
        # Also add the teacher to class_teachers if not already there
        teacher_exists = await db.execute(
            select(ClassTeacher).where(
                ClassTeacher.school_id == current_user.school_id,
                ClassTeacher.class_id == class_id,
                ClassTeacher.teacher_id == payload.teacher_id
            )
        )
        if not teacher_exists.scalar_one_or_none():
            db.add(ClassTeacher(
                school_id=current_user.school_id,
                class_id=class_id,
                teacher_id=payload.teacher_id
            ))
        db.add(cc)
        await db.commit()
        await db.refresh(cc)

    teacher = await db.get(User, cc.teacher_id)
    return ClassCourseOut(
        class_id=cc.class_id,
        course_id=cc.course_id,
        teacher_id=cc.teacher_id,
        coefficient=cc.coefficient or _course_coefficient(course),
        course_name=course.name if course else None,
        teacher_name=teacher.full_name if teacher else None,
    )


@router.delete("/{class_id}/courses/{course_id}")
async def remove_course_from_class(
    class_id: str,
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin removes a course assignment from a class."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can remove courses")

    cls_res = await db.execute(select(Class).where(Class.id == class_id, Class.school_id == current_user.school_id))
    if not cls_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Classe introuvable")

    await db.execute(
        sa_delete(ClassCourse).where(
            ClassCourse.school_id == current_user.school_id,
            ClassCourse.class_id == class_id,
            ClassCourse.course_id == course_id
        )
    )
    await db.commit()
    return {"status": "success"}
