"""canteen staff and school bus driver roles

Revision ID: 20261116_0027
Revises: 20261027_0026
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261116_0027"
down_revision: Union[str, None] = "20261027_0026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'canteen'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'driver'")


def downgrade() -> None:
    # PostgreSQL cannot drop an enum value; canteen and driver accounts must be removed by hand.
    pass
