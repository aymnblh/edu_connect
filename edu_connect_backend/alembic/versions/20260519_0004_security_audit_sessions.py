"""add security audit sessions and consent controls

Revision ID: 20260519_0004
Revises: 20260519_0003
Create Date: 2026-05-19 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260519_0004"
down_revision: Union[str, None] = "20260519_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TENANT_TABLES = (
    "audit_events",
    "media_attachments",
    "notification_preferences",
    "class_temporary_access",
)


def _tenant_policy(table_name: str, nullable_school: bool = False) -> None:
    policy_name = f"tenant_isolation_{table_name}"
    using_clause = "school_id = current_setting('app.current_school_id', true)"
    if nullable_school:
        using_clause = f"(school_id IS NULL OR {using_clause})"
    op.execute(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS {policy_name} ON {table_name}")
    op.execute(
        f"""
        CREATE POLICY {policy_name} ON {table_name}
        USING ({using_clause})
        WITH CHECK ({using_clause})
        """
    )


def upgrade() -> None:
    op.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(64)")
    op.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_platform VARCHAR(50)")
    op.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)")
    op.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS user_agent TEXT")
    op.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE")
    op.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_device_fingerprint ON refresh_tokens (device_fingerprint)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_events (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) REFERENCES schools(id) ON DELETE CASCADE,
            actor_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            actor_role VARCHAR(50),
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(100),
            resource_id VARCHAR(128),
            method VARCHAR(10),
            path TEXT,
            status_code INTEGER,
            ip_address VARCHAR(45),
            device_fingerprint VARCHAR(64),
            device_platform VARCHAR(50),
            user_agent TEXT,
            event_metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_events_school_id ON audit_events (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_events_actor_id ON audit_events (actor_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_events_action ON audit_events (action)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_events_resource_type ON audit_events (resource_type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_events_resource_id ON audit_events (resource_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_events_created_at ON audit_events (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_events_device_fingerprint ON audit_events (device_fingerprint)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS media_attachments (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            uploaded_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            parent_type VARCHAR(50) NOT NULL,
            parent_id VARCHAR(128) NOT NULL,
            storage_key TEXT NOT NULL,
            original_filename VARCHAR(255),
            mime_type VARCHAR(100),
            size_bytes INTEGER,
            deleted_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_media_attachments_school_id ON media_attachments (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_media_attachments_parent_type ON media_attachments (parent_type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_media_attachments_parent_id ON media_attachments (parent_id)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS notification_preferences (
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            notification_type VARCHAR(50) NOT NULL,
            in_app_enabled BOOLEAN DEFAULT true,
            push_enabled BOOLEAN DEFAULT true,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            PRIMARY KEY (user_id, notification_type)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_notification_preferences_school_id ON notification_preferences (school_id)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS class_temporary_access (
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            access_level VARCHAR(20) DEFAULT 'read',
            starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            granted_by VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            PRIMARY KEY (class_id, user_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_class_temporary_access_school_id ON class_temporary_access (school_id)")

    _tenant_policy("audit_events", nullable_school=True)
    for table_name in TENANT_TABLES[1:]:
        _tenant_policy(table_name)


def downgrade() -> None:
    for table_name in reversed(TENANT_TABLES):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table_name} ON {table_name}")
        op.execute(f"DROP TABLE IF EXISTS {table_name}")

    for column_name in (
        "revoked_at",
        "last_used_at",
        "user_agent",
        "ip_address",
        "device_platform",
        "device_fingerprint",
    ):
        op.execute(f"ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS {column_name}")
