"""add schedule exams

Revision ID: 20260603_0011
Revises: 20260603_0010
Create Date: 2026-06-03 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260603_0011"
down_revision: Union[str, None] = "20260603_0010"
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
        USING (school_id = current_setting('app.current_school_id', true))
        WITH CHECK (school_id = current_setting('app.current_school_id', true))
        """
    )


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS schedule_exams (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            course_id VARCHAR(36) REFERENCES courses(id) ON DELETE SET NULL,
            course_name VARCHAR(255) NOT NULL,
            exam_date VARCHAR(10) NOT NULL,
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            room VARCHAR(100),
            description TEXT,
            created_by VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_schedule_exams_school_id ON schedule_exams (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_schedule_exams_class_id ON schedule_exams (class_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_schedule_exams_course_id ON schedule_exams (course_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_schedule_exams_class_date ON schedule_exams (school_id, class_id, exam_date)")
    _tenant_policy("schedule_exams")


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_schedule_exams ON schedule_exams")
    op.execute("DROP TABLE IF EXISTS schedule_exams")
