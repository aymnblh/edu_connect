"""The school's name and logo, shown on receipts, report cards and printed sheets."""
import base64

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_event
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import School, User, UserRole

router = APIRouter(prefix="/schools", tags=["School branding"])

LOGO_MAX_BYTES = 200 * 1024
# Raster formats only, recognised by their first bytes: SVG could carry script.
_SIGNATURES = (
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
)


def logo_media_type(content: bytes) -> str | None:
    for signature, media_type in _SIGNATURES:
        if content.startswith(signature):
            return media_type
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    return None


@router.get("/branding")
async def school_branding(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.school_id:
        raise HTTPException(status_code=404, detail="No school")
    school = await db.get(School, current_user.school_id)
    if school is None:
        raise HTTPException(status_code=404, detail="No school")
    return {"name": school.name, "logo": school.logo_data}


@router.put("/branding/logo")
async def upload_logo(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replace the school logo (director only): PNG, JPEG or WebP, at most 200 KB."""
    if current_user.role != UserRole.principal or not current_user.school_id:
        raise HTTPException(status_code=403, detail="Reserve au directeur.")
    content = await file.read(LOGO_MAX_BYTES + 1)
    if len(content) > LOGO_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Logo trop lourd : 200 Ko au maximum.")
    media_type = logo_media_type(content)
    if media_type is None:
        raise HTTPException(status_code=400, detail="Format accepte : PNG, JPEG ou WebP.")
    school = await db.get(School, current_user.school_id)
    school.logo_data = f"data:{media_type};base64,{base64.b64encode(content).decode('ascii')}"
    await record_audit_event(
        db, action="school.logo_updated", actor=current_user, school_id=school.id, resource_type="school",
        resource_id=school.id, method=request.method, path=request.url.path,
        metadata={"bytes": len(content), "type": media_type},
    )
    await db.commit()
    return {"name": school.name, "logo": school.logo_data}


@router.delete("/branding/logo")
async def delete_logo(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.principal or not current_user.school_id:
        raise HTTPException(status_code=403, detail="Reserve au directeur.")
    school = await db.get(School, current_user.school_id)
    school.logo_data = None
    await record_audit_event(
        db, action="school.logo_removed", actor=current_user, school_id=school.id, resource_type="school",
        resource_id=school.id, method=request.method, path=request.url.path,
    )
    await db.commit()
    return {"name": school.name, "logo": None}
