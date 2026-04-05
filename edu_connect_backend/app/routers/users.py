from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from ..database import get_db
from ..models import User, Student, StudentParent
from ..schemas import UserCreate, UserOut, UserUpdate, FcmTokenRequest, StudentCreate, StudentOut
from ..auth import get_current_user
from firebase_admin import messaging

router = APIRouter(prefix="/users", tags=["Users"])


from app.utils.push import send_push


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """Called by Flutter right after Firebase account creation to persist the profile."""
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


@router.patch("/me/fcm-token")
async def register_fcm_token(
    payload: FcmTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.fcm_token = payload.token
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
    
    # Check if link already exists
    stmt = select(StudentParent).where(
        StudentParent.student_id == student_id,
        StudentParent.parent_id == parent_id
    )
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
         return {"status": "already linked"}
         
    link = StudentParent(student_id=student_id, parent_id=parent_id)
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
    
    stmt = select(Student).join(Student.parents).where(User.id == current_user.id)
    result = await db.execute(stmt)
    return result.scalars().all()
