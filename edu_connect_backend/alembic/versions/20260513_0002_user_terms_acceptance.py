"""add user terms acceptance fields

Revision ID: 20260513_0002
Revises: 20260506_0001
Create Date: 2026-05-13 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260513_0002"
down_revision: Union[str, None] = "20260506_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(50)")


def downgrade() -> None:
    op.drop_column("users", "terms_version")
    op.drop_column("users", "terms_accepted_at")
