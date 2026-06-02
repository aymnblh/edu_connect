from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import calendar
from pydantic import BaseModel
from app.db.database import get_db
from app.models import School, SubscriptionPayment
from app.core.config import settings
from app.schemas import SchoolOut

router = APIRouter(prefix="/platform", tags=["Platform Admin"])

@router.get("/schools", response_model=list[SchoolOut])
async def list_all_schools(
    x_platform_secret: str = Header(..., alias="X-Platform-Secret"),
    db: AsyncSession = Depends(get_db)
):
    """
    List all schools for the SuperAdmin.
    """
    if x_platform_secret != settings.platform_secret:
        raise HTTPException(status_code=403, detail="Clé de plateforme invalide.")
        
    result = await db.execute(select(School).order_by(School.created_at.desc()))
    return result.scalars().all()

@router.patch("/schools/{school_id}/activate")
async def activate_school(
    school_id: str,
    x_platform_secret: str = Header(..., alias="X-Platform-Secret"),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually activate a school after payment confirmation.
    Requires the master PLATFORM_SECRET from the environment.
    """
    if x_platform_secret != settings.platform_secret:
        raise HTTPException(status_code=403, detail="Clé de plateforme invalide.")

    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="Établissement introuvable.")

    config = dict(school.tenant_config) if school.tenant_config else {}
    config.update({
        "active": True,
        "activated_at": datetime.now(timezone.utc).isoformat()
    })
    school.tenant_config = config
    school.is_active = True
    
    await db.commit()
    return {"status": "success", "message": f"Établissement {school.name} activé avec succès."}

class SubscriptionPaymentRequest(BaseModel):
    amount: float
    months_added: int
    payment_method: str = "cash"
    notes: str | None = None

@router.post("/schools/{school_id}/subscription")
async def add_subscription_payment(
    school_id: str,
    payload: SubscriptionPaymentRequest,
    x_platform_secret: str = Header(..., alias="X-Platform-Secret"),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually add a subscription payment (e.g. cash) for a school.
    Extends the subscription_expires_at date.
    Requires the master PLATFORM_SECRET from the environment.
    """
    if x_platform_secret != settings.platform_secret:
        raise HTTPException(status_code=403, detail="Clé de plateforme invalide.")

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
