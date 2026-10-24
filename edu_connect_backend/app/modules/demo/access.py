"""Public demo: who counts as a demo visitor and what they may do.

The demo school is a normal tenant seeded by scripts/seed_demo_presentation_data.py.
When PUBLIC_DEMO_ENABLED is on, anyone can open it from the login page without an
account, so its accounts become read-only: visitors can look at every screen but
cannot write anything other visitors would see.
"""

from app.core.config import settings

DEMO_DOMAIN = "demo.educonnect.dz"
DEMO_SCHOOL_NAME = "EduConnect Demo Academy"

# The one account per role a visitor is signed in as.
DEMO_ROLE_ACCOUNTS = {
    "principal": f"director@{DEMO_DOMAIN}",
    "teacher": f"teacher.math@{DEMO_DOMAIN}",
    "parent": f"parent.nadia@{DEMO_DOMAIN}",
}

DEMO_READ_ONLY_MESSAGE = (
    "Démo : consultation uniquement. Créez votre école pour enregistrer vos propres données."
)

# Requests a read-only demo session may still send.
DEMO_WRITE_ALLOWLIST = {"/auth/logout", "/auth/refresh"}


def is_demo_email(email: str | None) -> bool:
    return bool(email) and email.lower().endswith(f"@{DEMO_DOMAIN}")


def is_read_only_demo_user(user) -> bool:
    """True for demo accounts while the public demo is open."""
    return settings.public_demo_enabled and is_demo_email(getattr(user, "email", None))
