"""school referral codes

Revision ID: 20261024_0025
Revises: 20261024_0024
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261024_0025"
down_revision: Union[str, None] = "20261024_0024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE schools ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12)")
    op.execute(
        "ALTER TABLE schools ADD COLUMN IF NOT EXISTS referred_by VARCHAR(36) "
        "REFERENCES schools(id) ON DELETE SET NULL"
    )
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_schools_referral_code ON schools (referral_code)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_schools_referral_code")
    op.execute("ALTER TABLE schools DROP COLUMN IF EXISTS referred_by")
    op.execute("ALTER TABLE schools DROP COLUMN IF EXISTS referral_code")
