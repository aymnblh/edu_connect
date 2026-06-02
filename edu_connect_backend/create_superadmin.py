"""
Script de création d'un compte SuperAdmin pour EduConnect.
Utilisation :
    python create_superadmin.py

Le compte créé pourra se connecter avec email + mot de passe
via l'application Flutter et accéder au tableau de bord SuperAdmin.
"""

import asyncio
import uuid
import sys
from passlib.context import CryptContext

# ── Configuration ─────────────────────────────────────────────────────────────
SUPERADMIN_EMAIL    = "admin@educonnect.local"
SUPERADMIN_NAME     = "Super Administrateur"
SUPERADMIN_PASSWORD = "EduAdmin2024!"   # ← Changez ce mot de passe

# ─────────────────────────────────────────────────────────────────────────────

async def main():
    # Import after setting up path
    from app.database import AsyncSessionLocal, engine, Base
    from app.models import User, UserRole
    from sqlalchemy import select

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if superadmin already exists
        result = await db.execute(select(User).where(User.email == SUPERADMIN_EMAIL))
        existing = result.scalar_one_or_none()

        if existing:
            if existing.role == UserRole.system_admin:
                print(f"\n✅ Le superadmin '{SUPERADMIN_EMAIL}' existe déjà.")
                print(f"   Role : {existing.role.value}")
                print(f"   ID   : {existing.id}")
            else:
                existing.role = UserRole.system_admin
                existing.password_hash = pwd_context.hash(SUPERADMIN_PASSWORD)
                await db.commit()
                print(f"\n✅ Utilisateur mis à jour en superadmin : {SUPERADMIN_EMAIL}")
            return

        # Create new superadmin
        new_admin = User(
            id=str(uuid.uuid4()),
            email=SUPERADMIN_EMAIL,
            full_name=SUPERADMIN_NAME,
            role=UserRole.system_admin,
            password_hash=pwd_context.hash(SUPERADMIN_PASSWORD),
            school_id=None,
        )
        db.add(new_admin)
        await db.commit()
        await db.refresh(new_admin)

        print("\n" + "="*55)
        print("  ✅ Compte SuperAdmin créé avec succès !")
        print("="*55)
        print(f"  Email    : {SUPERADMIN_EMAIL}")
        print(f"  Mot de p.: {SUPERADMIN_PASSWORD}")
        print(f"  ID       : {new_admin.id}")
        print("="*55)
        print("\n⚠️  Changez le mot de passe après la première connexion !")
        print()


if __name__ == "__main__":
    asyncio.run(main())
