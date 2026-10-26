"""report card verification codes (QR) and their public lookup

Revision ID: 20261024_0024
Revises: 20261024_0023
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261024_0024"
down_revision: Union[str, None] = "20261024_0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS verify_code VARCHAR(32)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_report_cards_verify_code ON report_cards (verify_code)")
    # The public check knows only the code, not the school: allow reading exactly that row.
    op.execute("DROP POLICY IF EXISTS report_cards_verify_lookup ON report_cards")
    op.execute(
        """
        CREATE POLICY report_cards_verify_lookup ON report_cards
        FOR SELECT
        USING (verify_code IS NOT NULL AND verify_code = current_setting('app.report_card_verify_code', true))
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS report_cards_verify_lookup ON report_cards")
    op.execute("DROP INDEX IF EXISTS ix_report_cards_verify_code")
    op.execute("ALTER TABLE report_cards DROP COLUMN IF EXISTS verify_code")
