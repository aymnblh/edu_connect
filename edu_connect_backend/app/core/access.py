from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import and_, false, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Class,
    ClassCourse,
    ClassMember,
    ClassTeacher,
    ClassTemporaryAccess,
    Course,
    Grade,
    Student,
    StudentParent,
    User,
    UserRole,
)


ADMIN_ROLES = {UserRole.principal, UserRole.secretary}
STAFF_ROLES = {UserRole.teacher, UserRole.principal, UserRole.secretary}


def assert_school_is_active(current_user: User) -> None:
    """Apply activation and subscription checks to non-HTTP entry points."""
    if current_user.role == UserRole.system_admin:
        return
    school = current_user.school
    if not school or not school.is_active:
        raise HTTPException(status_code=403, detail="School is not active.")
    if school.subscription_expires_at and school.subscription_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=402, detail="School subscription has expired.")


async def get_class_or_404(class_id: str, db: AsyncSession) -> Class:
    cls = await db.get(Class, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return cls


async def assert_school_admin_for_class(
    class_id: str,
    current_user: User,
    db: AsyncSession,
) -> Class:
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only school administration is authorized.")

    cls = await get_class_or_404(class_id, db)
    if cls.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return cls


async def assert_teacher_for_class(
    class_id: str,
    current_user: User,
    db: AsyncSession,
    *,
    write: bool = True,
) -> Class:
    cls = await get_class_or_404(class_id, db)
    if cls.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied")

    res = await db.execute(
        select(ClassTeacher.teacher_id).where(
            ClassTeacher.school_id == cls.school_id,
            ClassTeacher.class_id == class_id,
            ClassTeacher.teacher_id == current_user.id,
        )
    )
    if not res.scalar_one_or_none():
        now = datetime.now(timezone.utc)
        temp_res = await db.execute(
            select(ClassTemporaryAccess).where(
                ClassTemporaryAccess.school_id == cls.school_id,
                ClassTemporaryAccess.class_id == class_id,
                ClassTemporaryAccess.user_id == current_user.id,
                ClassTemporaryAccess.starts_at <= now,
                ClassTemporaryAccess.expires_at >= now,
            )
        )
        temp_access = temp_res.scalar_one_or_none()
        if not temp_access:
            raise HTTPException(status_code=403, detail="You are not assigned to this class.")
        if write and temp_access.access_level != "write":
            raise HTTPException(status_code=403, detail="Temporary access is read-only.")
    return cls


async def assert_parent_has_child_in_class(
    class_id: str,
    parent_id: str,
    db: AsyncSession,
    *,
    school_id: str,
) -> None:
    res = await db.execute(
        select(ClassMember.student_id)
        .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
        .where(
            ClassMember.school_id == school_id,
            ClassMember.class_id == class_id,
            StudentParent.school_id == school_id,
            StudentParent.parent_id == parent_id,
        )
        .limit(1)
    )
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Your child is not enrolled in this class.")


async def assert_parent_linked_to_student(
    student_id: str,
    parent_id: str,
    db: AsyncSession,
    *,
    school_id: str | None = None,
) -> None:
    stmt = select(StudentParent.student_id).where(
        StudentParent.student_id == student_id,
        StudentParent.parent_id == parent_id,
    )
    if school_id:
        stmt = stmt.where(StudentParent.school_id == school_id)

    res = await db.execute(stmt)
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")


async def assert_class_read_access(
    class_id: str,
    current_user: User,
    db: AsyncSession,
) -> Class:
    if current_user.role in ADMIN_ROLES:
        return await assert_school_admin_for_class(class_id, current_user, db)

    if current_user.role == UserRole.teacher:
        return await assert_teacher_for_class(class_id, current_user, db, write=False)

    cls = await get_class_or_404(class_id, db)
    if current_user.role == UserRole.parent:
        if cls.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Access denied")
        await assert_parent_has_child_in_class(
            class_id,
            current_user.id,
            db,
            school_id=cls.school_id,
        )
        return cls

    raise HTTPException(status_code=403, detail="Not authorized")


async def assert_class_write_access(
    class_id: str,
    current_user: User,
    db: AsyncSession,
) -> Class:
    if current_user.role in ADMIN_ROLES:
        return await assert_school_admin_for_class(class_id, current_user, db)

    if current_user.role == UserRole.teacher:
        return await assert_teacher_for_class(class_id, current_user, db, write=True)

    raise HTTPException(status_code=403, detail="Not authorized")


async def assert_student_enrolled_in_class(
    class_id: str,
    student_id: str,
    db: AsyncSession,
    *,
    school_id: str | None = None,
) -> Student:
    stmt = (
        select(Student)
        .join(ClassMember, ClassMember.student_id == Student.id)
        .where(
            ClassMember.class_id == class_id,
            Student.id == student_id,
        )
    )
    if school_id:
        stmt = stmt.where(
            ClassMember.school_id == school_id,
            Student.school_id == school_id,
        )

    res = await db.execute(stmt)
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student is not enrolled in this class.")
    return student


def normalized_subject(value: str | None) -> str:
    return " ".join((value or "").strip().casefold().split())


@dataclass(frozen=True)
class TeacherCourseScope:
    """Courses a teacher is responsible for in one class."""

    course_ids: frozenset[str]
    subject_names: frozenset[str]
    display_names: tuple[str, ...] = ()

    def allows(self, course_id: str | None, subject: str | None) -> bool:
        if course_id:
            return course_id in self.course_ids
        return normalized_subject(subject) in self.subject_names

    def grade_filter(self):
        clauses = []
        if self.course_ids:
            clauses.append(Grade.course_id.in_(self.course_ids))
        if self.subject_names:
            clauses.append(and_(Grade.course_id.is_(None), func.lower(Grade.subject).in_(self.subject_names)))
        return or_(*clauses) if clauses else false()


async def teacher_course_scope(cls: Class, current_user: User, db: AsyncSession) -> TeacherCourseScope | None:
    """Return the subjects a teacher may see in this class, or None when unrestricted.

    Administrators are unrestricted. A teacher is limited to the courses assigned
    to them through ``class_courses``. A substitute holding only temporary class
    access covers the whole class, so they are unrestricted for that window.
    """
    if current_user.role != UserRole.teacher:
        return None

    result = await db.execute(
        select(Course.id, Course.name)
        .join(ClassCourse, ClassCourse.course_id == Course.id)
        .where(
            ClassCourse.school_id == cls.school_id,
            ClassCourse.class_id == cls.id,
            ClassCourse.teacher_id == current_user.id,
            Course.school_id == cls.school_id,
        )
    )
    rows = result.all()
    if not rows:
        now = datetime.now(timezone.utc)
        temp_res = await db.execute(
            select(ClassTemporaryAccess.user_id).where(
                ClassTemporaryAccess.school_id == cls.school_id,
                ClassTemporaryAccess.class_id == cls.id,
                ClassTemporaryAccess.user_id == current_user.id,
                ClassTemporaryAccess.starts_at <= now,
                ClassTemporaryAccess.expires_at >= now,
            )
        )
        if temp_res.scalar_one_or_none():
            return None
    return TeacherCourseScope(
        course_ids=frozenset(course_id for course_id, _ in rows),
        subject_names=frozenset(normalized_subject(name) for _, name in rows),
        display_names=tuple(sorted(name for _, name in rows)),
    )


async def resolve_class_course(
    cls: Class,
    *,
    course_id: str | None,
    subject: str | None,
    db: AsyncSession,
) -> Course | None:
    """Find the class's course by id (must exist in the class) or by subject name."""
    base_stmt = (
        select(Course)
        .join(ClassCourse, ClassCourse.course_id == Course.id)
        .where(
            Course.school_id == cls.school_id,
            ClassCourse.school_id == cls.school_id,
            ClassCourse.class_id == cls.id,
        )
    )
    if course_id:
        result = await db.execute(base_stmt.where(Course.id == course_id))
        course = result.scalar_one_or_none()
        if not course:
            raise HTTPException(status_code=404, detail="Matiere introuvable dans cette classe")
        return course

    name = (subject or "").strip()
    if not name:
        return None
    result = await db.execute(base_stmt.where(func.lower(Course.name) == name.lower()).limit(1))
    return result.scalar_one_or_none()


def assert_scope_allows_course(scope: "TeacherCourseScope | None", course: Course | None) -> None:
    """Refuse a teacher acting on a subject they do not teach in the class."""
    if scope is None or (course and scope.allows(course.id, course.name)):
        return
    own = ", ".join(scope.display_names) or "aucune"
    raise HTTPException(
        status_code=403,
        detail=f"Vous n'enseignez pas cette matiere dans cette classe. Vos matieres : {own}.",
    )
