"""payment reminders on tuition invoices

Revision ID: 20261024_0019
Revises: 20261021_0018
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261024_0019"
down_revision: Union[str, None] = "20261021_0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tuition_invoices", sa.Column("last_reminded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "tuition_invoices",
        sa.Column("reminder_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("tuition_invoices", "reminder_count")
    op.drop_column("tuition_invoices", "last_reminded_at")
