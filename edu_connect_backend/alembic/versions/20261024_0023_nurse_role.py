"""school nurse role

Revision ID: 20261024_0023
Revises: 20261024_0022
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261024_0023"
down_revision: Union[str, None] = "20261024_0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'nurse'")


def downgrade() -> None:
    # PostgreSQL cannot drop an enum value; nurse accounts must be removed by hand.
    pass
