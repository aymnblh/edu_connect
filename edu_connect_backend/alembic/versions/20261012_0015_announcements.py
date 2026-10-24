"""school announcements, calendar events and read receipts

Revision ID: 20261012_0015
Revises: 20261012_0014
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261012_0015"
down_revision: Union[str, None] = "20261012_0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("announcement_reads", "announcement_classes", "announcements")


def _tenant_policy(table_name: str) -> None:
    policy_name = f"tenant_isolation_{table_name}"
    op.execute(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS {policy_name} ON {table_name}")
    op.execute(
        f"""
        CREATE POLICY {policy_name} ON {table_name}
        USING (school_id = current_setting('app.current_school_id', true))
        WITH CHECK (school_id = current_setting('app.current_school_id', true))
        """
    )


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS announcements (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            title VARCHAR(200) NOT NULL,
            body TEXT NOT NULL,
            category VARCHAR(20) NOT NULL DEFAULT 'announcement',
            starts_on DATE,
            ends_on DATE,
            whole_school BOOLEAN NOT NULL DEFAULT false,
            created_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            recipient_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_announcements_school_id ON announcements (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_announcements_school_starts ON announcements (school_id, starts_on)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS announcement_classes (
            announcement_id VARCHAR(36) NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
            class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            PRIMARY KEY (announcement_id, class_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_announcement_classes_school_id ON announcement_classes (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_announcement_classes_class_id ON announcement_classes (class_id)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS announcement_reads (
            announcement_id VARCHAR(36) NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
            user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            PRIMARY KEY (announcement_id, user_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_announcement_reads_school_id ON announcement_reads (school_id)")

    for table in TABLES:
        _tenant_policy(table)


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(f"DROP TABLE IF EXISTS {table}")
