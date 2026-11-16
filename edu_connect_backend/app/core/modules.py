"""Optional school modules (canteen, school transport) switched on per school by the director."""
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import School, User

OPTIONAL_MODULES = ("canteen", "transport")


def enabled_modules(school: School | None) -> dict[str, bool]:
    configured = ((school.tenant_config or {}).get("modules") or {}) if school else {}
    return {name: bool(configured.get(name)) for name in OPTIONAL_MODULES}


def with_modules(config: dict | None, modules: dict[str, bool]) -> dict:
    """A new tenant_config with the given module switches (a new dict, so SQLAlchemy sees the change)."""
    current = dict(config or {})
    current["modules"] = {name: bool(modules.get(name)) for name in OPTIONAL_MODULES}
    return current


async def require_module(name: str, user: User, db: AsyncSession) -> School:
    """The user's school, if the module is switched on there; 403 otherwise."""
    if name not in OPTIONAL_MODULES:
        raise ValueError(f"Unknown module {name!r}")
    if not user.school_id:
        raise HTTPException(status_code=403, detail="Not assigned to a school.")
    school = await db.get(School, user.school_id)
    if not enabled_modules(school).get(name):
        label = "La cantine" if name == "canteen" else "Le transport scolaire"
        raise HTTPException(status_code=403, detail=f"{label} n'est pas active pour cet etablissement.")
    return school
