"""add student retention lifecycle

Revision ID: 20260520_0008
Revises: 20260519_0007
Create Date: 2026-05-20 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260520_0008"
down_revision: Union[str, None] = "20260519_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(50)")
    op.execute(
        """
        ALTER TABLE students
        ADD COLUMN IF NOT EXISTS archived_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_students_school_archived_at ON students (school_id, archived_at)")

    op.execute("DROP POLICY IF EXISTS students_pin_lookup_select ON students")
    op.execute(
        """
        CREATE POLICY students_pin_lookup_select ON students
        FOR SELECT
        USING (
            archived_at IS NULL
            AND student_id = current_setting('app.student_lookup_id', true)
            AND linking_pin = current_setting('app.student_lookup_pin', true)
        )
        """
    )

    op.execute("DROP POLICY IF EXISTS pending_links_token_select ON pending_links")
    op.execute(
        """
        CREATE POLICY pending_links_token_select ON pending_links
        FOR SELECT
        USING (
            token = current_setting('app.pending_link_token', true)
            AND status = 'pending'
            AND revoked_at IS NULL
        )
        """
    )

    op.execute("DROP POLICY IF EXISTS students_retention_delete ON students")
    op.execute(
        """
        CREATE POLICY students_retention_delete ON students
        AS RESTRICTIVE
        FOR DELETE
        USING (current_setting('app.student_retention_job', true) = 'true')
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS students_retention_delete ON students")
    op.execute("DROP POLICY IF EXISTS students_pin_lookup_select ON students")
    op.execute("DROP POLICY IF EXISTS pending_links_token_select ON pending_links")
    op.execute(
        """
        CREATE POLICY pending_links_token_select ON pending_links
        FOR SELECT
        USING (
            token = current_setting('app.pending_link_token', true)
            AND status = 'pending'
        )
        """
    )
    op.execute(
        """
        CREATE POLICY students_pin_lookup_select ON students
        FOR SELECT
        USING (
            student_id = current_setting('app.student_lookup_id', true)
            AND linking_pin = current_setting('app.student_lookup_pin', true)
        )
        """
    )
    op.execute("DROP INDEX IF EXISTS ix_students_school_archived_at")
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS archived_by")
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS archive_reason")
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS archived_at")
