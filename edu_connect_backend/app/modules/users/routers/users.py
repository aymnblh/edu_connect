from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db.database import get_db
from app.models import User, UserRole, Student, StudentParent
from app.schemas import UserCreate, UserOut, UserUpdate, PushTokenRequest, StudentCreate, StudentOut
from app.core.security import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """System-admin-only legacy profile creation endpoint."""
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Only system admins can create arbitrary user profiles.")

    existing = await db.get(User, payload.id)
    if existing:
        return existing
    user = User(**payload.model_dump())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.patch("/me/push-token")
async def register_push_token(
    payload: PushTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token = payload.push_token or payload.token
    if not token:
        raise HTTPException(status_code=422, detail="Missing push token.")
    current_user.push_token = token
    await db.commit()
    return {"status": "ok"}


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deletes the current user's profile from the backend database."""
    await db.delete(current_user)
    await db.commit()
    return None


@router.post("/students", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
async def create_student(
    payload: StudentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Seule l'administration peut créer des élèves.")
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    student = Student(
        full_name=payload.full_name,
        school_id=current_user.school_id
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


@router.post("/students/{student_id}/parents/{parent_id}", status_code=status.HTTP_200_OK)
async def link_parent_to_student(
    student_id: str,
    parent_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admins can link parents to students."""
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Only admins can link parents")

    student = await db.get(Student, student_id)
    if not student or student.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.archived_at:
        raise HTTPException(status_code=400, detail="Archived students cannot be linked to parents")

    # Check if link already exists
    stmt = select(StudentParent).where(
        StudentParent.school_id == current_user.school_id,
        StudentParent.student_id == student_id,
        StudentParent.parent_id == parent_id
    )
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        return {"status": "already linked"}

    parent = await db.get(User, parent_id)
    if (
        not parent
        or parent.school_id != current_user.school_id
        or parent.role != UserRole.parent
    ):
        raise HTTPException(status_code=404, detail="Parent not found")

    link = StudentParent(
        school_id=current_user.school_id,
        student_id=student_id,
        parent_id=parent_id,
    )
    db.add(link)
    await db.commit()
    return {"status": "linked"}


@router.get("/students/me", response_model=list[StudentOut])
async def get_my_students(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Parents get a list of their children."""
    if current_user.role.value != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this")
    if not current_user.school_id:
        return []

    # BUG FIX: explicit school_id guard prevents cross-tenant data leaks.
    # The previous Student.parents ORM join had no school_id filter.
    stmt = (
        select(Student)
        .join(StudentParent, StudentParent.student_id == Student.id)
        .where(
            StudentParent.school_id == current_user.school_id,
            StudentParent.parent_id == current_user.id,
            Student.school_id == current_user.school_id,
            Student.archived_at.is_(None),
        )
    )
    result = await db.execute(stmt)
    return result.scalars().all()
