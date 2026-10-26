"""record who created each homework entry

Revision ID: 20261012_0014
Revises: 20261012_0013
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261012_0014"
down_revision: Union[str, None] = "20261012_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent: the baseline migration creates tables from the current models.
    op.execute(
        "ALTER TABLE homework ADD COLUMN IF NOT EXISTS created_by VARCHAR(128) "
        "REFERENCES users(id) ON DELETE SET NULL"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE homework DROP COLUMN IF EXISTS created_by")
