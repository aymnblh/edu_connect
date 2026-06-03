"""add homework kind

Revision ID: 20260603_0010
Revises: 20260602_0009
Create Date: 2026-06-03 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260603_0010"
down_revision: Union[str, None] = "20260602_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE homework ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'homework'"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE homework DROP COLUMN IF EXISTS kind")
