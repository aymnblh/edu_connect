"""The director's monthly report."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import School, User, UserRole
from app.modules.reports.monthly import compute_monthly_report, month_bounds, parse_month, previous_month
from app.modules.schools.calendar import ALGERIA_TZ

router = APIRouter(prefix="/admin/reports", tags=["Monthly report"])

# How far back the month picker goes.
AVAILABLE_MONTHS = 12


@router.get("/monthly")
async def monthly_report(
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """One month of activity next to the month before (default: the month in progress)."""
    if current_user.role not in {UserRole.principal, UserRole.secretary}:
        raise HTTPException(status_code=403, detail="Reserve a l'administration de l'etablissement.")
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User not assigned to a school")

    now = datetime.now(ALGERIA_TZ)
    try:
        year, month_number = parse_month(month) if month else (now.year, now.month)
    except ValueError:
        raise HTTPException(status_code=400, detail="Mois invalide.")
    if month_bounds(year, month_number)[0] > now:
        raise HTTPException(status_code=400, detail="Ce mois n'a pas encore commence.")

    school = await db.get(School, current_user.school_id)
    report = await compute_monthly_report(db, current_user.school_id, year, month_number, now=now)

    months = []
    cursor = (now.year, now.month)
    created = school.created_at.astimezone(ALGERIA_TZ) if school and school.created_at else None
    for _ in range(AVAILABLE_MONTHS):
        if created and month_bounds(*cursor)[1] <= created:
            break
        months.append(f"{cursor[0]:04d}-{cursor[1]:02d}")
        cursor = previous_month(*cursor)
    report["available_months"] = months
    report["school_name"] = school.name if school else ""
    return report
