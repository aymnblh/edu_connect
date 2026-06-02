"""harden tenant rls auth lookups and audit retention

Revision ID: 20260519_0006
Revises: 20260519_0005
Create Date: 2026-05-19 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260519_0006"
down_revision: Union[str, None] = "20260519_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TENANT_QUAL = """
(
    current_setting('app.is_system_admin', true) = 'true'
    OR school_id = current_setting('app.current_school_id', true)
)
"""


def upgrade() -> None:
    op.execute(
        f"""
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
                  AND c.table_name <> 'audit_events'
            LOOP
                EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tenant_table.table_name);
                EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tenant_table.table_name);
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_' || tenant_table.table_name, tenant_table.table_name);
                EXECUTE format(
                    $policy$
                    CREATE POLICY %I ON public.%I
                    FOR ALL
                    USING (
                        current_setting('app.is_system_admin', true) = 'true'
                        OR school_id = current_setting('app.current_school_id', true)
                    )
                    WITH CHECK (
                        current_setting('app.is_system_admin', true) = 'true'
                        OR school_id = current_setting('app.current_school_id', true)
                    )
                    $policy$,
                    'tenant_isolation_' || tenant_table.table_name,
                    tenant_table.table_name
                );
            END LOOP;
        END $$;
        """
    )

    op.execute("DROP POLICY IF EXISTS tenant_isolation_audit_events ON audit_events")
    op.execute("DROP POLICY IF EXISTS audit_events_select ON audit_events")
    op.execute("DROP POLICY IF EXISTS audit_events_insert ON audit_events")
    op.execute("DROP POLICY IF EXISTS audit_events_retention_delete ON audit_events")
    op.execute("ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE audit_events FORCE ROW LEVEL SECURITY")
    op.execute(
        f"""
        CREATE POLICY audit_events_select ON audit_events
        FOR SELECT
        USING ({TENANT_QUAL})
        """
    )
    op.execute(
        f"""
        CREATE POLICY audit_events_insert ON audit_events
        FOR INSERT
        WITH CHECK (
            {TENANT_QUAL}
            OR (
                school_id IS NULL
                AND current_setting('app.audit_event_write', true) = 'true'
            )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY audit_events_retention_delete ON audit_events
        FOR DELETE
        USING (current_setting('app.audit_retention_job', true) = 'true')
        """
    )

    op.execute("DROP POLICY IF EXISTS users_auth_lookup_select ON users")
    op.execute(
        """
        CREATE POLICY users_auth_lookup_select ON users
        FOR SELECT
        USING (
            lower(email) = lower(current_setting('app.auth_lookup_email', true))
            OR invite_code = current_setting('app.auth_invite_code', true)
            OR id = current_setting('app.auth_user_id', true)
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
        )
        """
    )

    op.execute("DROP POLICY IF EXISTS students_pin_lookup_select ON students")
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

    op.execute("DROP POLICY IF EXISTS refresh_tokens_hash_select ON refresh_tokens")
    op.execute(
        """
        CREATE POLICY refresh_tokens_hash_select ON refresh_tokens
        FOR SELECT
        USING (token_hash = current_setting('app.refresh_token_hash', true))
        """
    )
    op.execute("DROP POLICY IF EXISTS refresh_tokens_hash_delete ON refresh_tokens")
    op.execute(
        """
        CREATE POLICY refresh_tokens_hash_delete ON refresh_tokens
        FOR DELETE
        USING (
            token_hash = current_setting('app.refresh_token_hash', true)
            OR (
                user_id = current_setting('app.refresh_token_user_id', true)
                AND family_id = current_setting('app.refresh_token_family_id', true)
            )
        )
        """
    )


def downgrade() -> None:
    for table_name, policy_name in (
        ("users", "users_auth_lookup_select"),
        ("pending_links", "pending_links_token_select"),
        ("students", "students_pin_lookup_select"),
        ("refresh_tokens", "refresh_tokens_hash_select"),
        ("refresh_tokens", "refresh_tokens_hash_delete"),
        ("audit_events", "audit_events_select"),
        ("audit_events", "audit_events_insert"),
        ("audit_events", "audit_events_retention_delete"),
    ):
        op.execute(f"DROP POLICY IF EXISTS {policy_name} ON {table_name}")

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
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_' || tenant_table.table_name, tenant_table.table_name);
                EXECUTE format(
                    'CREATE POLICY %I ON public.%I FOR ALL USING (school_id = current_setting(''app.current_school_id'', true)) WITH CHECK (school_id = current_setting(''app.current_school_id'', true))',
                    'tenant_isolation_' || tenant_table.table_name,
                    tenant_table.table_name
                );
            END LOOP;
        END $$;
        """
    )
