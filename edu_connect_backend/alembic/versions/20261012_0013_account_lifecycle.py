"""account lifecycle: staff deactivation and session token versions

Revision ID: 20261012_0013
Revises: 20260807_0012
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261012_0013"
down_revision: Union[str, None] = "20260807_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("deactivated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("users", "token_version")
    op.drop_column("users", "deactivated_at")
