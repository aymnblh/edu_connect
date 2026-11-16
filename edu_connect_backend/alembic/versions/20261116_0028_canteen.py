"""school canteen menus and student registrations

Revision ID: 20261116_0028
Revises: 20261116_0027
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261116_0028"
down_revision: Union[str, None] = "20261116_0027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _enable_rls(table: str) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
    op.execute(
        f"""
        CREATE POLICY tenant_isolation_{table} ON {table}
        USING (school_id = current_setting('app.current_school_id', true))
        WITH CHECK (school_id = current_setting('app.current_school_id', true))
        """
    )


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS canteen_menus (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            day DATE NOT NULL,
            starter VARCHAR(200),
            main VARCHAR(200) NOT NULL,
            dessert VARCHAR(200),
            allergens JSONB NOT NULL DEFAULT '[]'::jsonb,
            note TEXT,
            published_at TIMESTAMP WITH TIME ZONE,
            created_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            CONSTRAINT uq_canteen_menus_school_day UNIQUE (school_id, day)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_canteen_menus_school_id ON canteen_menus (school_id)")
    _enable_rls("canteen_menus")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS canteen_enrollments (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            plan VARCHAR(10) NOT NULL DEFAULT 'monthly',
            weekdays JSONB NOT NULL DEFAULT '[0, 1, 2, 3, 4]'::jsonb,
            diet VARCHAR(20) NOT NULL DEFAULT 'none',
            diet_note VARCHAR(200),
            start_date DATE NOT NULL,
            end_date DATE,
            created_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            CONSTRAINT uq_canteen_enrollments_student UNIQUE (school_id, student_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_canteen_enrollments_school_id ON canteen_enrollments (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_canteen_enrollments_student_id ON canteen_enrollments (student_id)")
    _enable_rls("canteen_enrollments")


def downgrade() -> None:
    for table in ("canteen_enrollments", "canteen_menus"):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(f"DROP TABLE IF EXISTS {table}")
