"""academic_year on classes/semesters, class archiving, and RESTRICT protection for historical academic records

Revision ID: 20261123_0030
Revises: 20261116_0029
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261123_0030"
down_revision: Union[str, None] = "20261116_0029"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _replace_fk(table: str, column: str, ref_table: str, on_delete: str) -> None:
    """Safely replace the foreign key on (table.column -> ref_table.id) with the desired ON DELETE action."""
    op.execute(
        f"""
        DO $$
        DECLARE
            fk_name text;
        BEGIN
            SELECT tc.constraint_name INTO fk_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = '{table}'
              AND kcu.column_name = '{column}'
            LIMIT 1;

            IF fk_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE {table} DROP CONSTRAINT %I', fk_name);
            END IF;

            EXECUTE format(
                'ALTER TABLE {table} ADD CONSTRAINT %I FOREIGN KEY ({column}) REFERENCES {ref_table}(id) ON DELETE {on_delete}',
                '{table}_{column}_fkey'
            );
        END $$;
        """
    )


def upgrade() -> None:
    op.execute("ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year VARCHAR(16)")
    op.execute("ALTER TABLE classes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE")
    op.execute(
        "ALTER TABLE classes ADD COLUMN IF NOT EXISTS archived_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_classes_academic_year ON classes (academic_year)")

    op.execute("ALTER TABLE semesters ADD COLUMN IF NOT EXISTS academic_year VARCHAR(16)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_semesters_academic_year ON semesters (academic_year)")

    # Backfill academic_year for existing semesters and classes from their dates (Sept -> next Aug).
    op.execute(
        """
        UPDATE semesters
        SET academic_year = CASE
            WHEN EXTRACT(MONTH FROM start_date AT TIME ZONE 'UTC') >= 9
                THEN (EXTRACT(YEAR FROM start_date AT TIME ZONE 'UTC')::int)::text || '-' || (EXTRACT(YEAR FROM start_date AT TIME ZONE 'UTC')::int + 1)::text
            ELSE (EXTRACT(YEAR FROM start_date AT TIME ZONE 'UTC')::int - 1)::text || '-' || (EXTRACT(YEAR FROM start_date AT TIME ZONE 'UTC')::int)::text
        END
        WHERE academic_year IS NULL AND start_date IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE classes
        SET academic_year = CASE
            WHEN EXTRACT(MONTH FROM created_at AT TIME ZONE 'UTC') >= 9
                THEN (EXTRACT(YEAR FROM created_at AT TIME ZONE 'UTC')::int)::text || '-' || (EXTRACT(YEAR FROM created_at AT TIME ZONE 'UTC')::int + 1)::text
            ELSE (EXTRACT(YEAR FROM created_at AT TIME ZONE 'UTC')::int - 1)::text || '-' || (EXTRACT(YEAR FROM created_at AT TIME ZONE 'UTC')::int)::text
        END
        WHERE academic_year IS NULL AND created_at IS NOT NULL
        """
    )

    # Protect historical grades, attendance, remarks, and report cards from accidental class/semester deletion.
    _replace_fk("grades", "class_id", "classes", "RESTRICT")
    _replace_fk("attendance", "class_id", "classes", "RESTRICT")
    _replace_fk("remarks", "class_id", "classes", "RESTRICT")
    _replace_fk("report_cards", "class_id", "classes", "RESTRICT")
    _replace_fk("report_cards", "semester_id", "semesters", "RESTRICT")
    _replace_fk("report_cards", "student_id", "students", "RESTRICT")


def downgrade() -> None:
    _replace_fk("report_cards", "student_id", "students", "CASCADE")
    _replace_fk("report_cards", "semester_id", "semesters", "CASCADE")
    _replace_fk("report_cards", "class_id", "classes", "CASCADE")
    _replace_fk("remarks", "class_id", "classes", "CASCADE")
    _replace_fk("attendance", "class_id", "classes", "CASCADE")
    _replace_fk("grades", "class_id", "classes", "CASCADE")

    op.execute("DROP INDEX IF EXISTS ix_semesters_academic_year")
    op.execute("ALTER TABLE semesters DROP COLUMN IF EXISTS academic_year")

    op.execute("DROP INDEX IF EXISTS ix_classes_academic_year")
    op.execute("ALTER TABLE classes DROP COLUMN IF EXISTS archived_by")
    op.execute("ALTER TABLE classes DROP COLUMN IF EXISTS archived_at")
    op.execute("ALTER TABLE classes DROP COLUMN IF EXISTS academic_year")
