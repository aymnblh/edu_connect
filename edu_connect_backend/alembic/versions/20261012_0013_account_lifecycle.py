"""account lifecycle: staff deactivation and session token versions

Revision ID: 20261012_0013
Revises: 20260807_0012
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261012_0013"
down_revision: Union[str, None] = "20260807_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent: the baseline migration creates tables from the current models.
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0")


def downgrade() -> None:
    op.drop_column("users", "token_version")
    op.drop_column("users", "deactivated_at")
