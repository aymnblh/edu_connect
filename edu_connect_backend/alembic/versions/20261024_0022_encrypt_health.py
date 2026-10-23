"""health record fields stored encrypted (text columns)

Revision ID: 20261024_0022
Revises: 20261024_0021
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261024_0022"
down_revision: Union[str, None] = "20261024_0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TEXT_COLUMNS = ("blood_group", "doctor_name", "doctor_phone", "teacher_alert")


def upgrade() -> None:
    # Ciphertext is longer than the plain values and the contacts are no longer JSONB.
    # Existing plain rows stay readable and are encrypted on their next save.
    op.execute("ALTER TABLE student_health_records ALTER COLUMN emergency_contacts DROP DEFAULT")
    op.execute(
        "ALTER TABLE student_health_records ALTER COLUMN emergency_contacts TYPE TEXT "
        "USING emergency_contacts::text"
    )
    for column in TEXT_COLUMNS:
        op.execute(f"ALTER TABLE student_health_records ALTER COLUMN {column} TYPE TEXT")


def downgrade() -> None:
    # Only possible while no row has been encrypted yet.
    op.execute(
        "ALTER TABLE student_health_records ALTER COLUMN emergency_contacts TYPE JSONB "
        "USING emergency_contacts::jsonb"
    )
