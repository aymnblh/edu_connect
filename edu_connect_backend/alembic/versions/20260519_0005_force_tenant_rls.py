"""force rls on tenant scoped tables

Revision ID: 20260519_0005
Revises: 20260519_0004
Create Date: 2026-05-19 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260519_0005"
down_revision: Union[str, None] = "20260519_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE
            tenant_table record;
        BEGIN
            FOR tenant_table IN
                SELECT c.table_name
                FROM information_schema.columns c
                JOIN information_schema.tables t
                  ON t.table_schema = c.table_schema
                 AND t.table_name = c.table_name
                WHERE c.table_schema = 'public'
                  AND c.column_name = 'school_id'
                  AND t.table_type = 'BASE TABLE'
            LOOP
                EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tenant_table.table_name);
                EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tenant_table.table_name);
            END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE
            tenant_table record;
        BEGIN
            FOR tenant_table IN
                SELECT c.table_name
                FROM information_schema.columns c
                JOIN information_schema.tables t
                  ON t.table_schema = c.table_schema
                 AND t.table_name = c.table_name
                WHERE c.table_schema = 'public'
                  AND c.column_name = 'school_id'
                  AND t.table_type = 'BASE TABLE'
            LOOP
                EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', tenant_table.table_name);
            END LOOP;
        END $$;
        """
    )
