from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import get_db
from ..models import User, Student, VerificationStatus, StudentParent, PendingLink, School
from ..schemas import VerificationRequestOut, LinkStudentRequest, LinkByQrRequest
from ..auth import get_current_user
from fastapi import Request

router = APIRouter(prefix="/verification", tags=["Verification"])

@router.post("/request", status_code=status.HTTP_201_CREATED)
async def request_student_link(
    payload: LinkStudentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role.value != "parent":
        raise HTTPException(status_code=403, detail="Only parents can request student links")

    # Find the student by human-readable ID and PIN
    stmt = select(Student).where(
        Student.student_id == payload.student_id,
        Student.linking_pin == payload.linking_pin
    )
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found or incorrect PIN")

    # Check if already linked
    if current_user in student.parents:
        raise HTTPException(status_code=400, detail="Already linked to this student")

    # Check if a pending request already exists
    stmt = select(VerificationRequest).where(
        VerificationRequest.parent_id == current_user.id,
        VerificationRequest.student_id == student.id,
        VerificationRequest.status == VerificationStatus.pending
    )
    existing = await db.execute(stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Request already pending")

    # Create request
    new_request = VerificationRequest(
        school_id=student.school_id,
        student_id=student.id,
        parent_id=current_user.id
    )
    db.add(new_request)
    await db.commit()
    return {"status": "success", "message": "Verification request sent to school administration"}

@router.post("/link-by-qr")
async def link_student_by_qr(
    request: Request,
    payload: LinkByQrRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Link a parent to a student using a temporary QR token.
    Uses SELECT FOR UPDATE to prevent race conditions (double-scanning).
    """
    if current_user.role.value != "parent":
        raise HTTPException(status_code=403, detail="Only parents can link via QR")

    # 1. Lock the token for update to prevent simultaneous scans
    stmt = select(PendingLink).where(PendingLink.token == payload.token).with_for_update()
    result = await db.execute(stmt)
    pending_link = result.scalar_one_or_none()

    if not pending_link:
        raise HTTPException(status_code=404, detail="Invalid QR Code")

    # 2. Check if already used
    if pending_link.status != "pending":
        raise HTTPException(status_code=400, detail="QR Code already used")

    # 3. Check TTL (15 minutes from creation)
    from datetime import datetime, timezone
    if pending_link.expires_at < datetime.now(timezone.utc):
        pending_link.status = "expired"
        await db.commit()
        raise HTTPException(status_code=400, detail="QR Code expired (15 min limit)")

    # 4. Check if parent is already linked to this student
    # Note: RLS might block this check if not handled correctly, 
    # but here we have the pending_link.student_id
    stmt = select(StudentParent).where(
        StudentParent.student_id == pending_link.student_id,
        StudentParent.parent_id == current_user.id
    )
    existing = await db.execute(stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already linked to this student")

    # 5. Check Tenant Parental Limit
    # Load school to get config
    res_school = await db.execute(select(School).where(School.id == pending_link.school_id))
    school = res_school.scalar_one()
    max_parents = school.tenant_config.get("max_parents_per_student", 2)
    
    # Count current active links for this student
    cnt_stmt = select(func.count(StudentParent.id)).where(StudentParent.student_id == pending_link.student_id)
    cnt_res = await db.execute(cnt_stmt)
    current_count = cnt_res.scalar()
    
    if current_count >= max_parents:
        raise HTTPException(
            status_code=403, 
            detail=f"Limite de parents atteinte ({max_parents}). Contactez l'administration."
        )

    # 6. Finalize the link with Audit Info
    pending_link.status = "used"
    pending_link.scanned_at = datetime.now(timezone.utc)
    pending_link.used_at = datetime.now(timezone.utc)
    
    # Audit trail (captured by middleware)
    pending_link.device_fingerprint = getattr(request.state, "device_fingerprint", "unknown")
    pending_link.device_platform = getattr(request.state, "device_platform", "unknown")
    pending_link.ip_address = getattr(request.state, "ip_address", "unknown")
    pending_link.parent_id = current_user.id
    pending_link.label = payload.label if hasattr(payload, "label") else f"Parent {current_user.full_name}"
    
    # Create the link
    new_link = StudentParent(
        school_id=pending_link.school_id,
        student_id=pending_link.student_id,
        parent_id=current_user.id
    )
    db.add(new_link)
    
    await db.commit()
    return {"status": "success", "message": "Élève lié avec succès. Bienvenue !"}

@router.get("/pending", response_model=list[VerificationRequestOut])
async def list_pending_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")
    
    # We want to join with Student and User to get names
    stmt = select(VerificationRequest, Student.full_name, User.full_name).join(
        Student, VerificationRequest.student_id == Student.id
    ).join(
        User, VerificationRequest.parent_id == User.id
    ).where(
        VerificationRequest.school_id == current_user.school_id,
        VerificationRequest.status == VerificationStatus.pending
    )
    
    result = await db.execute(stmt)
    out = []
    for row in result.all():
        req, s_name, p_name = row
        out.append(VerificationRequestOut(
            id=req.id,
            school_id=req.school_id,
            student_id=req.student_id,
            parent_id=req.parent_id,
            status=req.status,
            created_at=req.created_at,
            student_name=s_name,
            parent_name=p_name
        ))
    return out

@router.post("/{request_id}/approve")
async def approve_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")

    stmt = select(VerificationRequest).where(
        VerificationRequest.id == request_id, 
        VerificationRequest.school_id == current_user.school_id
    )
    result = await db.execute(stmt)
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req.status != VerificationStatus.pending:
        raise HTTPException(status_code=400, detail="Request already processed")

    # Approve and link
    req.status = VerificationStatus.approved
    
    # Explicitly create the StudentParent relationship
    student_parent = StudentParent(student_id=req.student_id, parent_id=req.parent_id)
    db.add(student_parent)
    
    await db.commit()
    return {"status": "success", "message": "Parent successfully linked to student"}

@router.post("/{request_id}/reject")
async def reject_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role.value not in ["principal", "secretary"]:
        raise HTTPException(status_code=403, detail="Unprivileged")

    stmt = select(VerificationRequest).where(
        VerificationRequest.id == request_id, 
        VerificationRequest.school_id == current_user.school_id
    )
    result = await db.execute(stmt)
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    req.status = VerificationStatus.rejected
    await db.commit()
    return {"status": "success", "message": "Request rejected"}
