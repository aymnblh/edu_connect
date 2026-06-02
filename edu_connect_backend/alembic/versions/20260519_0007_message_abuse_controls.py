"""add message abuse controls

Revision ID: 20260519_0007
Revises: 20260519_0006
Create Date: 2026-05-19 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260519_0007"
down_revision: Union[str, None] = "20260519_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _tenant_policy(table_name: str) -> None:
    policy_name = f"tenant_isolation_{table_name}"
    op.execute(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS {policy_name} ON {table_name}")
    op.execute(
        f"""
        CREATE POLICY {policy_name} ON {table_name}
        FOR ALL
        USING (
            current_setting('app.is_system_admin', true) = 'true'
            OR school_id = current_setting('app.current_school_id', true)
        )
        WITH CHECK (
            current_setting('app.is_system_admin', true) = 'true'
            OR school_id = current_setting('app.current_school_id', true)
        )
        """
    )


def upgrade() -> None:
    op.execute("ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS bulk_send_id VARCHAR(36)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_direct_messages_bulk_send_id ON direct_messages (bulk_send_id)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS message_blocks (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            blocker_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            blocked_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            CONSTRAINT uq_message_blocks_pair UNIQUE (school_id, blocker_id, blocked_user_id),
            CONSTRAINT ck_message_blocks_not_self CHECK (blocker_id <> blocked_user_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_blocks_school_id ON message_blocks (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_blocks_blocker_id ON message_blocks (blocker_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_blocks_blocked_user_id ON message_blocks (blocked_user_id)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS message_reports (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            reporter_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reported_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            conversation_id VARCHAR(36) REFERENCES conversations(id) ON DELETE SET NULL,
            message_id VARCHAR(36) REFERENCES direct_messages(id) ON DELETE SET NULL,
            reason VARCHAR(50) NOT NULL,
            details TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            reviewed_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            CONSTRAINT ck_message_reports_not_self CHECK (reporter_id <> reported_user_id),
            CONSTRAINT ck_message_reports_status CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned'))
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_reports_school_id ON message_reports (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_reports_reporter_id ON message_reports (reporter_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_reports_reported_user_id ON message_reports (reported_user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_reports_conversation_id ON message_reports (conversation_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_reports_message_id ON message_reports (message_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_reports_status ON message_reports (status)")

    _tenant_policy("message_blocks")
    _tenant_policy("message_reports")


def downgrade() -> None:
    for table_name in ("message_reports", "message_blocks"):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table_name} ON {table_name}")
        op.execute(f"DROP TABLE IF EXISTS {table_name}")
    op.execute("DROP INDEX IF EXISTS ix_direct_messages_bulk_send_id")
    op.execute("ALTER TABLE direct_messages DROP COLUMN IF EXISTS bulk_send_id")
