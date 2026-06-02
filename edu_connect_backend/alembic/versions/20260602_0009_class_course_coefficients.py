"""add class course coefficients

Revision ID: 20260602_0009
Revises: 20260520_0008
Create Date: 2026-06-02 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260602_0009"
down_revision: Union[str, None] = "20260520_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE class_courses ADD COLUMN IF NOT EXISTS coefficient DOUBLE PRECISION NOT NULL DEFAULT 1.0"
    )
    op.execute(
        """
        UPDATE class_courses AS cc
        SET coefficient = COALESCE(c.coefficient, 1.0)
        FROM courses AS c
        WHERE c.id = cc.course_id
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE class_courses DROP COLUMN IF EXISTS coefficient")
