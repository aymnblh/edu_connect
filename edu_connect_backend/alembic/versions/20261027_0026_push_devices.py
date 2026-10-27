"""push notification devices (Firebase tokens)

Revision ID: 20261027_0026
Revises: 20261024_0025
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261027_0026"
down_revision: Union[str, None] = "20261024_0025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS push_devices (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(512) NOT NULL UNIQUE,
            platform VARCHAR(20) NOT NULL DEFAULT 'unknown',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_push_devices_school_id ON push_devices (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_push_devices_user_id ON push_devices (user_id)")
    op.execute("ALTER TABLE push_devices ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE push_devices FORCE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_push_devices ON push_devices")
    op.execute(
        """
        CREATE POLICY tenant_isolation_push_devices ON push_devices
        USING (school_id = current_setting('app.current_school_id', true))
        WITH CHECK (school_id = current_setting('app.current_school_id', true))
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_push_devices ON push_devices")
    op.execute("DROP TABLE IF EXISTS push_devices")
