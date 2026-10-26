"""school logo for printed documents

Revision ID: 20261024_0021
Revises: 20261024_0020
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261024_0021"
down_revision: Union[str, None] = "20261024_0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_data TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE schools DROP COLUMN IF EXISTS logo_data")
