from datetime import datetime, timezone
import calendar

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import School, SubscriptionPayment, User, UserRole
from app.schemas import SchoolOut

router = APIRouter(prefix="/platform", tags=["Platform Admin"])


async def require_platform_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Platform administrator access required.")
    return current_user


@router.get("/schools", response_model=list[SchoolOut])
async def list_all_schools(
    _: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).order_by(School.created_at.desc()))
    return result.scalars().all()


@router.patch("/schools/{school_id}/activate")
async def activate_school(
    school_id: str,
    _: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found.")

    config = dict(school.tenant_config) if school.tenant_config else {}
    config.update({"active": True, "activated_at": datetime.now(timezone.utc).isoformat()})
    school.tenant_config = config
    school.is_active = True
    await db.commit()
    return {"status": "success", "message": f"School {school.name} activated."}


class SubscriptionPaymentRequest(BaseModel):
    amount: float = Field(gt=0, le=100_000_000)
    months_added: int = Field(gt=0, le=120)
    payment_method: str = Field(default="cash", min_length=2, max_length=50)
    notes: str | None = Field(default=None, max_length=2000)


@router.post("/schools/{school_id}/subscription")
async def add_subscription_payment(
    school_id: str,
    payload: SubscriptionPaymentRequest,
    _: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found.")

    payment = SubscriptionPayment(
        school_id=school_id,
        amount=payload.amount,
        months_added=payload.months_added,
        payment_method=payload.payment_method,
        notes=payload.notes,
    )
    db.add(payment)

    now = datetime.now(timezone.utc)
    current_expiry = school.subscription_expires_at
    if not current_expiry or current_expiry < now:
        current_expiry = now

    new_month = current_expiry.month + payload.months_added - 1
    new_year = current_expiry.year + new_month // 12
    new_month = new_month % 12 + 1
    new_day = min(current_expiry.day, calendar.monthrange(new_year, new_month)[1])
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
        "message": f"Payment recorded until {new_expiry.date().isoformat()}.",
        "new_expiry": new_expiry.isoformat(),
    }
