"""published term report cards

Revision ID: 20261013_0016
Revises: 20261012_0015
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261013_0016"
down_revision: Union[str, None] = "20261012_0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS report_cards (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            semester_id VARCHAR(36) NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
            student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            overall_average DOUBLE PRECISION,
            rank INTEGER,
            class_size INTEGER NOT NULL DEFAULT 0,
            data JSONB NOT NULL,
            published_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            CONSTRAINT uq_report_cards_class_semester_student UNIQUE (class_id, semester_id, student_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_report_cards_school_id ON report_cards (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_report_cards_class_id ON report_cards (class_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_report_cards_student_id ON report_cards (student_id)")
    op.execute("ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE report_cards FORCE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_report_cards ON report_cards")
    op.execute(
        """
        CREATE POLICY tenant_isolation_report_cards ON report_cards
        USING (school_id = current_setting('app.current_school_id', true))
        WITH CHECK (school_id = current_setting('app.current_school_id', true))
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_report_cards ON report_cards")
    op.execute("DROP TABLE IF EXISTS report_cards")
