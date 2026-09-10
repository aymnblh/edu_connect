"""harden staff invitation expiry and token length

Revision ID: 20260807_0012
Revises: 20260603_0011
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260807_0012"
down_revision: Union[str, None] = "20260603_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _drop_auth_lookup_policy() -> None:
    op.execute("DROP POLICY IF EXISTS users_auth_lookup_select ON users")


def _create_auth_lookup_policy() -> None:
    op.execute(
        """
        CREATE POLICY users_auth_lookup_select ON users
        FOR SELECT
        USING (
            lower(email) = lower(current_setting('app.auth_lookup_email', true))
            OR invite_code = current_setting('app.auth_invite_code', true)
            OR id = current_setting('app.auth_user_id', true)
        )
        """
    )


def upgrade() -> None:
    _drop_auth_lookup_policy()
    op.alter_column(
        "users",
        "invite_code",
        existing_type=sa.String(length=20),
        type_=sa.String(length=128),
        existing_nullable=True,
    )
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
        "invite_expires_at TIMESTAMP WITH TIME ZONE"
    )
    _create_auth_lookup_policy()


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS invite_expires_at")
    _drop_auth_lookup_policy()
    op.alter_column(
        "users",
        "invite_code",
        existing_type=sa.String(length=128),
        type_=sa.String(length=20),
        existing_nullable=True,
    )
    _create_auth_lookup_policy()
