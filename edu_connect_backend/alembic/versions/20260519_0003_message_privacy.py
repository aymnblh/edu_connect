"""add class message recipient audience

Revision ID: 20260519_0003
Revises: 20260513_0002
Create Date: 2026-05-19 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260519_0003"
down_revision: Union[str, None] = "20260513_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_ids JSONB")


def downgrade() -> None:
    op.drop_column("messages", "recipient_ids")
