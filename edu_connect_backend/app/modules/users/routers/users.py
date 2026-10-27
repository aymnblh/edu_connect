from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from app.modules.demo.access import is_read_only_demo_user
from app.core.audit import record_audit_event
from app.db.database import get_db
from app.models import (
    Notification,
    NotificationPreference,
    PushDevice,
    RefreshToken,
    Student,
    StudentParent,
    User,
    UserRole,
    VerificationRequest,
)
from app.schemas import UserCreate, UserOut, UserUpdate, PushTokenRequest, PushDeviceRequest, StudentCreate, StudentOut
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
    out = UserOut.model_validate(current_user)
    out.is_demo = is_read_only_demo_user(current_user)
    return out


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


@router.post("/me/push-devices")
async def register_push_device(
    payload: PushDeviceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register this phone for push notifications (a user may have several)."""
    if not current_user.school_id or is_read_only_demo_user(current_user):
        return {"status": "skipped"}
    now = datetime.now(timezone.utc)
    # A token belongs to one account: if the phone changed hands, it follows the new sign-in.
    # Row security hides other schools' rows, so claim it by writing, not by reading.
    await db.execute(delete(PushDevice).where(PushDevice.token == payload.token, PushDevice.user_id != current_user.id))
    existing = (
        await db.execute(select(PushDevice).where(PushDevice.token == payload.token, PushDevice.user_id == current_user.id))
    ).scalar_one_or_none()
    if existing is None:
        db.add(PushDevice(school_id=current_user.school_id, user_id=current_user.id, token=payload.token, platform=payload.platform))
    else:
        existing.last_seen_at = now
        existing.platform = payload.platform
    try:
        await db.commit()
    except IntegrityError:
        # Still registered to an account of another school on this phone.
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cet appareil est deja lie a un autre compte : deconnectez-le d'abord.",
        )
    return {"status": "ok"}


@router.delete("/me/push-devices")
async def unregister_push_device(
    payload: PushDeviceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stop pushing to this phone (sign-out)."""
    await db.execute(delete(PushDevice).where(PushDevice.token == payload.token, PushDevice.user_id == current_user.id))
    await db.commit()
    return {"status": "ok"}


DELETED_ACCOUNT_NAME = "Compte supprime"
# Must stay a syntactically valid address: user payloads validate emails.
DELETED_ACCOUNT_EMAIL_DOMAIN = "deleted.waseledu.dz"


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete the signed-in parent's account.

    The row is anonymized rather than removed: messages, reports and audit
    events keep a valid author (a hard delete would either fail on class-chat
    messages or cascade away the school's message history). Personal data,
    child links, pending link requests, notifications and sessions are erased.
    Staff accounts belong to the school and are closed by its administration.
    """
    if current_user.role != UserRole.parent:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "account_deletion_by_school",
                "message": "Les comptes du personnel sont geres par l'etablissement. "
                "Contactez la direction pour fermer ce compte.",
            },
        )

    links_res = await db.execute(
        select(func.count()).select_from(StudentParent).where(StudentParent.parent_id == current_user.id)
    )
    linked_students = links_res.scalar_one()
    await record_audit_event(
        db,
        action="account.deleted",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="user",
        resource_id=current_user.id,
        method=request.method,
        path=request.url.path,
        metadata={"role": current_user.role.value, "linked_students": linked_students},
    )

    for model, column in (
        (StudentParent, StudentParent.parent_id),
        (VerificationRequest, VerificationRequest.parent_id),
        (Notification, Notification.user_id),
        (NotificationPreference, NotificationPreference.user_id),
        (PushDevice, PushDevice.user_id),
        (RefreshToken, RefreshToken.user_id),
    ):
        await db.execute(delete(model).where(column == current_user.id))

    current_user.full_name = DELETED_ACCOUNT_NAME
    current_user.email = f"deleted-{current_user.id}@{DELETED_ACCOUNT_EMAIL_DOMAIN}"
    current_user.phone = None
    current_user.avatar_url = None
    current_user.push_token = None
    current_user.password_hash = None
    current_user.invite_code = None
    current_user.invite_expires_at = None
    current_user.deactivated_at = datetime.now(timezone.utc)
    current_user.token_version = (current_user.token_version or 0) + 1
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
