from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

import calendar
from datetime import datetime, timezone
from app.db.database import get_db
from app.models import User, UserRole, School, SubscriptionPayment, Student, Class
from app.core.security import get_current_user

router = APIRouter(prefix="/system", tags=["System Administration"])


class SchoolAdminOut(BaseModel):
    id: str
    name: str
    is_active: bool
    subscription_expires_at: str | None = None
    created_at: str | None = None
    user_count: int = 0
    student_count: int = 0
    class_count: int = 0
    last_payment_amount: float | None = None
    last_payment_at: str | None = None
    
    model_config = {"from_attributes": True}


@router.get("/schools", response_model=list[SchoolAdminOut])
async def list_all_schools(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """SuperAdmin only: List all schools."""
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Unprivileged")
        
    result = await db.execute(select(School).order_by(School.created_at.desc()))
    schools = result.scalars().all()
    
    # Format subscription dates to string if they exist
    out = []
    for s in schools:
        user_count = await db.scalar(
            select(func.count(User.id)).where(User.school_id == s.id)
        )
        student_count = await db.scalar(
            select(func.count(Student.id)).where(Student.school_id == s.id)
        )
        class_count = await db.scalar(
            select(func.count(Class.id)).where(Class.school_id == s.id)
        )
        last_payment = (
            await db.execute(
                select(SubscriptionPayment)
                .where(SubscriptionPayment.school_id == s.id)
                .order_by(SubscriptionPayment.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        out.append(SchoolAdminOut(
            id=s.id,
            name=s.name,
            is_active=s.is_active,
            subscription_expires_at=s.subscription_expires_at.isoformat() if s.subscription_expires_at else None,
            created_at=s.created_at.isoformat() if s.created_at else None,
            user_count=user_count or 0,
            student_count=student_count or 0,
            class_count=class_count or 0,
            last_payment_amount=last_payment.amount if last_payment else None,
            last_payment_at=last_payment.created_at.isoformat() if last_payment else None,
        ))
    return out


@router.post("/schools/{school_id}/activate")
async def activate_school(
    school_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """SuperAdmin only: Activate a school (e.g. after verifying payment)."""
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Unprivileged")
        
    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    school.is_active = True
    config = dict(school.tenant_config) if school.tenant_config else {}
    config.update({"active": True, "activated_at": datetime.now(timezone.utc).isoformat()})
    school.tenant_config = config
    await db.commit()
    
    return {"status": "success", "message": "École activée avec succès"}


@router.post("/schools/{school_id}/deactivate")
async def deactivate_school(
    school_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """SuperAdmin only: Deactivate a school."""
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Unprivileged")
        
    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    school.is_active = False
    config = dict(school.tenant_config) if school.tenant_config else {}
    config["active"] = False
    school.tenant_config = config
    await db.commit()
    
    return {"status": "success", "message": "École suspendue."}

class SubscriptionPaymentRequest(BaseModel):
    amount: float
    months_added: int
    payment_method: str = "cash"
    notes: str | None = None

@router.post("/schools/{school_id}/subscription")
async def add_subscription_payment(
    school_id: str,
    payload: SubscriptionPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """SuperAdmin only: Add a subscription payment (e.g. cash) for a school."""
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Unprivileged")

    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="Établissement introuvable.")

    payment = SubscriptionPayment(
        school_id=school_id,
        amount=payload.amount,
        months_added=payload.months_added,
        payment_method=payload.payment_method,
        notes=payload.notes
    )
    db.add(payment)

    # Extend subscription date manually to avoid dateutil dependency
    now = datetime.now(timezone.utc)
    current_expiry = school.subscription_expires_at
    if not current_expiry or current_expiry < now:
        current_expiry = now

    new_month = current_expiry.month + payload.months_added - 1
    new_year = current_expiry.year + new_month // 12
    new_month = new_month % 12 + 1
    
    # Handle end of month issues (e.g. Jan 31 -> Feb 28)
    max_days = calendar.monthrange(new_year, new_month)[1]
    new_day = min(current_expiry.day, max_days)
    
    new_expiry = current_expiry.replace(year=new_year, month=new_month, day=new_day)
    
    school.subscription_expires_at = new_expiry
    school.is_active = True
    config = dict(school.tenant_config) if school.tenant_config else {}
    config.update({"active": True, "last_payment_at": now.isoformat()})
    school.tenant_config = config

    await db.commit()
    await db.refresh(school)

    return {
        "status": "success", 
        "message": f"Paiement de {payload.amount} enregistré. Abonnement prolongé jusqu'au {new_expiry.strftime('%Y-%m-%d')}.",
        "new_expiry": new_expiry.isoformat()
    }
