"""payment reminders on tuition invoices

Revision ID: 20261024_0019
Revises: 20261021_0018
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261024_0019"
down_revision: Union[str, None] = "20261021_0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent: the baseline migration creates tables from the current models.
    op.execute("ALTER TABLE tuition_invoices ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE tuition_invoices ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0")


def downgrade() -> None:
    op.execute("ALTER TABLE tuition_invoices DROP COLUMN IF EXISTS reminder_count")
    op.execute("ALTER TABLE tuition_invoices DROP COLUMN IF EXISTS last_reminded_at")
