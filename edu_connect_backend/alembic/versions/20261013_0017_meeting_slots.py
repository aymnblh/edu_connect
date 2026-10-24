"""parent-teacher meeting slots

Revision ID: 20261013_0017
Revises: 20261013_0016
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261013_0017"
down_revision: Union[str, None] = "20261013_0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS meeting_slots (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            teacher_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            class_id VARCHAR(36) REFERENCES classes(id) ON DELETE CASCADE,
            starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
            ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
            location VARCHAR(120),
            parent_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            student_id VARCHAR(36) REFERENCES students(id) ON DELETE SET NULL,
            note TEXT,
            booked_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_meeting_slots_school_id ON meeting_slots (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_meeting_slots_teacher_id ON meeting_slots (teacher_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_meeting_slots_parent_id ON meeting_slots (parent_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_meeting_slots_starts_at ON meeting_slots (starts_at)")
    op.execute("ALTER TABLE meeting_slots ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE meeting_slots FORCE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_meeting_slots ON meeting_slots")
    op.execute(
        """
        CREATE POLICY tenant_isolation_meeting_slots ON meeting_slots
        USING (school_id = current_setting('app.current_school_id', true))
        WITH CHECK (school_id = current_setting('app.current_school_id', true))
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_meeting_slots ON meeting_slots")
    op.execute("DROP TABLE IF EXISTS meeting_slots")
