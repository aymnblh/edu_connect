"""student health records; who entered grades and attendance

Revision ID: 20261021_0018
Revises: 20261013_0017
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


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

    op.add_column("grades", sa.Column("created_by", sa.String(length=128), nullable=True))
    op.create_foreign_key("fk_grades_created_by_users", "grades", "users", ["created_by"], ["id"], ondelete="SET NULL")
    op.create_index("ix_grades_created_by", "grades", ["created_by"])
    op.add_column("attendance", sa.Column("recorded_by", sa.String(length=128), nullable=True))
    op.create_foreign_key("fk_attendance_recorded_by_users", "attendance", "users", ["recorded_by"], ["id"], ondelete="SET NULL")
    op.create_index("ix_attendance_recorded_by", "attendance", ["recorded_by"])


def downgrade() -> None:
    op.drop_index("ix_attendance_recorded_by", table_name="attendance")
    op.drop_constraint("fk_attendance_recorded_by_users", "attendance", type_="foreignkey")
    op.drop_column("attendance", "recorded_by")
    op.drop_index("ix_grades_created_by", table_name="grades")
    op.drop_constraint("fk_grades_created_by_users", "grades", type_="foreignkey")
    op.drop_column("grades", "created_by")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_student_health_records ON student_health_records")
    op.execute("DROP TABLE IF EXISTS student_health_records")
