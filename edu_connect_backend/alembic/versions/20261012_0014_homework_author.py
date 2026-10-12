"""record who created each homework entry

Revision ID: 20261012_0014
Revises: 20261012_0013
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261012_0014"
down_revision: Union[str, None] = "20261012_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("homework", sa.Column("created_by", sa.String(length=128), nullable=True))
    op.create_foreign_key(
        "fk_homework_created_by_users",
        "homework",
        "users",
        ["created_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_homework_created_by_users", "homework", type_="foreignkey")
    op.drop_column("homework", "created_by")
