"""phase_4_auth_audit

Revision ID: 5edc308f5a83
Revises: 2d398d372642
Create Date: 2026-04-05 13:39:16.700527

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5edc308f5a83'
down_revision: Union[str, None] = '2d398d372642'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update users table
    op.add_column('users', sa.Column('password_hash', sa.String(length=255), nullable=True))
    
    # 2. Create refresh_tokens table
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=128), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('family_id', sa.String(length=36), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_refresh_tokens_family_id'), 'refresh_tokens', ['family_id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_token_hash'), 'refresh_tokens', ['token_hash'], unique=True)

    # 3. Update pending_links table
    op.add_column('pending_links', sa.Column('label', sa.String(length=50), nullable=True))
    op.add_column('pending_links', sa.Column('device_fingerprint', sa.String(length=64), nullable=True))
    op.add_column('pending_links', sa.Column('device_platform', sa.String(length=20), nullable=True))
    op.add_column('pending_links', sa.Column('ip_address', sa.String(length=45), nullable=True))
    op.add_column('pending_links', sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('pending_links', sa.Column('parent_id', sa.String(length=128), nullable=True))
    op.create_foreign_key('fk_pending_links_parent_id_users', 'pending_links', 'users', ['parent_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # 1. Downgrade pending_links
    op.drop_constraint('fk_pending_links_parent_id_users', 'pending_links', type_='foreignkey')
    op.drop_column('pending_links', 'parent_id')
    op.drop_column('pending_links', 'revoked_at')
    op.drop_column('pending_links', 'ip_address')
    op.drop_column('pending_links', 'device_platform')
    op.drop_column('pending_links', 'device_fingerprint')
    op.drop_column('pending_links', 'label')

    # 2. Downgrade refresh_tokens
    op.drop_index(op.f('ix_refresh_tokens_token_hash'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_family_id'), table_name='refresh_tokens')
    op.drop_table('refresh_tokens')

    # 3. Downgrade users
    op.drop_column('users', 'password_hash')
