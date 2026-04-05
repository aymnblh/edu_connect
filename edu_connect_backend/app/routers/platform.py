from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from ..database import get_db
from ..models import School
from ..config import settings

router = APIRouter(prefix="/platform", tags=["Platform Admin"])

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
    
    await db.commit()
    return {"status": "success", "message": f"Établissement {school.name} activé avec succès."}
