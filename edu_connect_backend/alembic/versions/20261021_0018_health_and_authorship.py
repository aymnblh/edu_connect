"""student health records; who entered grades and attendance

Revision ID: 20261021_0018
Revises: 20261013_0017
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261021_0018"
down_revision: Union[str, None] = "20261013_0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS student_health_records (
            student_id VARCHAR(36) PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
            allergies TEXT,
            conditions TEXT,
            medications TEXT,
            blood_group VARCHAR(3),
            doctor_name VARCHAR(120),
            doctor_phone VARCHAR(30),
            emergency_instructions TEXT,
            teacher_alert VARCHAR(200),
            consent_given_at TIMESTAMP WITH TIME ZONE NOT NULL,
            consent_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            consent_method VARCHAR(10) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_student_health_records_school_id ON student_health_records (school_id)")
    op.execute("ALTER TABLE student_health_records ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE student_health_records FORCE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_student_health_records ON student_health_records")
    op.execute(
        """
        CREATE POLICY tenant_isolation_student_health_records ON student_health_records
        USING (school_id = current_setting('app.current_school_id', true))
        WITH CHECK (school_id = current_setting('app.current_school_id', true))
        """
    )

    # Idempotent: the baseline migration creates tables from the current models.
    op.execute(
        "ALTER TABLE grades ADD COLUMN IF NOT EXISTS created_by VARCHAR(128) "
        "REFERENCES users(id) ON DELETE SET NULL"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_grades_created_by ON grades (created_by)")
    op.execute(
        "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(128) "
        "REFERENCES users(id) ON DELETE SET NULL"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_attendance_recorded_by ON attendance (recorded_by)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_attendance_recorded_by")
    op.execute("ALTER TABLE attendance DROP COLUMN IF EXISTS recorded_by")
    op.execute("DROP INDEX IF EXISTS ix_grades_created_by")
    op.execute("ALTER TABLE grades DROP COLUMN IF EXISTS created_by")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_student_health_records ON student_health_records")
    op.execute("DROP TABLE IF EXISTS student_health_records")
