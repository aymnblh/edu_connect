from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Class, ClassMember, ClassTeacher, ClassTemporaryAccess, Student, StudentParent, User, UserRole


ADMIN_ROLES = {UserRole.principal, UserRole.secretary}
STAFF_ROLES = {UserRole.teacher, UserRole.principal, UserRole.secretary}


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
