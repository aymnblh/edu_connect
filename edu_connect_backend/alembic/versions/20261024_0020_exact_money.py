"""tuition amounts as exact decimals instead of floating point

Revision ID: 20261024_0020
Revises: 20261024_0019
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261024_0020"
down_revision: Union[str, None] = "20261024_0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COLUMNS = (
    ("tuition_invoices", "amount_due"),
    ("tuition_invoices", "amount_paid"),
    ("tuition_payments", "amount"),
)


def upgrade() -> None:
    for table, column in COLUMNS:
        op.execute(
            f"ALTER TABLE {table} ALTER COLUMN {column} TYPE NUMERIC(12, 2) "
            f"USING round({column}::numeric, 2)"
        )


def downgrade() -> None:
    for table, column in COLUMNS:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE DOUBLE PRECISION USING {column}::double precision")
