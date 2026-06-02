import os
import uuid

import pytest
import sqlalchemy as sa
from sqlalchemy import text


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="Set RUN_DB_TESTS=1 to run PostgreSQL/RLS integration tests.",
)


APP_ROLE = "educonnect_rls_test_app"
APP_PASSWORD = "educonnect_rls_test_password"
APPROVED_GLOBAL_TABLES = {"alembic_version", "schools"}
APPROVED_NULLABLE_SCHOOL_ID_TABLES = {
    "audit_events",
    "migration_orphans",
    "refresh_tokens",
    "users",
}


def _sync_url(url: str) -> str:
    return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)


@pytest.fixture(scope="module")
def admin_engine():
    database_url = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_DATABASE_URL or DATABASE_URL is required for DB integration tests.")

    engine = sa.create_engine(_sync_url(database_url), isolation_level="AUTOCOMMIT")
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture(scope="module")
def app_engine(admin_engine):
    admin_url = str(admin_engine.url)
    app_url = admin_engine.url.set(username=APP_ROLE, password=APP_PASSWORD)

    with admin_engine.begin() as conn:
        role_exists = conn.execute(
            text("SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :role_name)"),
            {"role_name": APP_ROLE},
        ).scalar_one()
        if role_exists:
            conn.execute(text(f"DROP OWNED BY {APP_ROLE}"))
            conn.execute(text(f"DROP ROLE {APP_ROLE}"))
        conn.execute(
            text(
                f"""
                CREATE ROLE {APP_ROLE}
                LOGIN PASSWORD :password
                NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS
                """
            ),
            {"password": APP_PASSWORD},
        )
        conn.execute(text(f"GRANT USAGE ON SCHEMA public TO {APP_ROLE}"))
        conn.execute(text(f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {APP_ROLE}"))
        conn.execute(text(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {APP_ROLE}"))

    engine = sa.create_engine(app_url)
    try:
        yield engine
    finally:
        engine.dispose()
        with admin_engine.begin() as conn:
            conn.execute(text(f"DROP OWNED BY {APP_ROLE}"))
            conn.execute(text(f"DROP ROLE IF EXISTS {APP_ROLE}"))


@pytest.fixture()
def seeded_rls_data(admin_engine):
    suffix = uuid.uuid4().hex[:8]
    data = {
        "school_a": f"school-a-{suffix}",
        "school_b": f"school-b-{suffix}",
        "class_a": f"class-a-{suffix}",
        "class_b": f"class-b-{suffix}",
        "user_a": f"teacher-a-{suffix}",
        "user_b": f"teacher-b-{suffix}",
        "student_a": f"student-a-{suffix}",
        "student_b": f"student-b-{suffix}",
        "message_a": f"message-a-{suffix}",
        "message_b": f"message-b-{suffix}",
    }

    with admin_engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO schools (
                    id, name, student_id_prefix, prefix_locked, is_active, created_at
                )
                VALUES (
                    :id, :name, :student_id_prefix, false, true, now()
                )
                """
            ),
            [
                {
                    "id": data["school_a"],
                    "name": "RLS School A",
                    "student_id_prefix": f"A{suffix[:6]}",
                },
                {
                    "id": data["school_b"],
                    "name": "RLS School B",
                    "student_id_prefix": f"B{suffix[:6]}",
                },
            ],
        )
        conn.execute(
            text(
                """
                INSERT INTO users (id, school_id, email, full_name, role, created_at)
                VALUES (:id, :school_id, :email, :full_name, 'teacher', now())
                """
            ),
            [
                {
                    "id": data["user_a"],
                    "school_id": data["school_a"],
                    "email": f"{data['user_a']}@example.test",
                    "full_name": "Teacher A",
                },
                {
                    "id": data["user_b"],
                    "school_id": data["school_b"],
                    "email": f"{data['user_b']}@example.test",
                    "full_name": "Teacher B",
                },
            ],
        )
        conn.execute(
            text(
                """
                INSERT INTO classes (id, school_id, name, join_code, created_at)
                VALUES (:id, :school_id, :name, :join_code, now())
                """
            ),
            [
                {
                    "id": data["class_a"],
                    "school_id": data["school_a"],
                    "name": "Class A",
                    "join_code": f"A{suffix[:5]}",
                },
                {
                    "id": data["class_b"],
                    "school_id": data["school_b"],
                    "name": "Class B",
                    "join_code": f"B{suffix[:5]}",
                },
            ],
        )
        conn.execute(
            text(
                """
                INSERT INTO students (id, school_id, student_id, full_name, created_at)
                VALUES (:id, :school_id, :student_id, :full_name, now())
                """
            ),
            [
                {
                    "id": data["student_a"],
                    "school_id": data["school_a"],
                    "student_id": f"SA-{suffix}",
                    "full_name": "Student A",
                },
                {
                    "id": data["student_b"],
                    "school_id": data["school_b"],
                    "student_id": f"SB-{suffix}",
                    "full_name": "Student B",
                },
            ],
        )
        conn.execute(
            text(
                """
                INSERT INTO messages (
                    id, school_id, class_id, sender_id, sender_name, content, is_announcement, created_at
                )
                VALUES (
                    :id, :school_id, :class_id, :sender_id, :sender_name, :content, false, now()
                )
                """
            ),
            [
                {
                    "id": data["message_a"],
                    "school_id": data["school_a"],
                    "class_id": data["class_a"],
                    "sender_id": data["user_a"],
                    "sender_name": "Teacher A",
                    "content": "Tenant A message",
                },
                {
                    "id": data["message_b"],
                    "school_id": data["school_b"],
                    "class_id": data["class_b"],
                    "sender_id": data["user_b"],
                    "sender_name": "Teacher B",
                    "content": "Tenant B message",
                },
            ],
        )

    try:
        yield data
    finally:
        with admin_engine.begin() as conn:
            for table_name in ("messages", "students", "classes", "users", "schools"):
                conn.execute(
                    text(f"DELETE FROM {table_name} WHERE id IN :ids").bindparams(
                        sa.bindparam("ids", expanding=True)
                    ),
                    {"ids": tuple(data.values())},
                )


def test_tenant_tables_have_forced_rls(admin_engine):
    with admin_engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                JOIN information_schema.columns col
                  ON col.table_schema = n.nspname
                 AND col.table_name = c.relname
                WHERE n.nspname = 'public'
                  AND c.relkind = 'r'
                  AND col.column_name = 'school_id'
                ORDER BY c.relname
                """
            )
        ).mappings().all()

    assert rows
    not_forced = [
        row["relname"]
        for row in rows
        if not row["relrowsecurity"] or not row["relforcerowsecurity"]
    ]
    assert not not_forced


def test_school_scoped_tables_have_non_null_school_id_except_approved_exceptions(admin_engine):
    with admin_engine.connect() as conn:
        table_rows = conn.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name
                """
            )
        ).scalars().all()
        column_rows = conn.execute(
            text(
                """
                SELECT table_name, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND column_name = 'school_id'
                """
            )
        ).mappings().all()

    school_id_columns = {row["table_name"]: row["is_nullable"] for row in column_rows}
    missing_school_id = [
        table_name
        for table_name in table_rows
        if table_name not in school_id_columns
        and table_name not in APPROVED_GLOBAL_TABLES
    ]
    nullable_school_id = [
        table_name
        for table_name, is_nullable in school_id_columns.items()
        if is_nullable == "YES"
        and table_name not in APPROVED_NULLABLE_SCHOOL_ID_TABLES
    ]

    assert missing_school_id == []
    assert nullable_school_id == []


def test_tenant_tables_have_current_school_policies(admin_engine):
    with admin_engine.connect() as conn:
        tenant_tables = conn.execute(
            text(
                """
                SELECT c.table_name
                FROM information_schema.columns c
                JOIN information_schema.tables t
                  ON t.table_schema = c.table_schema
                 AND t.table_name = c.table_name
                WHERE c.table_schema = 'public'
                  AND c.column_name = 'school_id'
                  AND t.table_type = 'BASE TABLE'
                  AND c.table_name <> 'audit_events'
                ORDER BY c.table_name
                """
            )
        ).scalars().all()
        policy_rows = conn.execute(
            text(
                """
                SELECT tablename, qual, with_check
                FROM pg_policies
                WHERE schemaname = 'public'
                  AND policyname LIKE 'tenant_isolation_%'
                """
            )
        ).mappings().all()

    policy_by_table = {row["tablename"]: row for row in policy_rows}
    missing = [table_name for table_name in tenant_tables if table_name not in policy_by_table]
    assert not missing

    weak = [
        table_name
        for table_name in tenant_tables
        if "app.current_school_id" not in (policy_by_table[table_name]["qual"] or "")
        or "app.current_school_id" not in (policy_by_table[table_name]["with_check"] or "")
    ]
    assert not weak


def test_non_superuser_app_role_is_subject_to_rls(app_engine):
    with app_engine.connect() as conn:
        role = conn.execute(
            text(
                """
                SELECT rolsuper, rolbypassrls
                FROM pg_roles
                WHERE rolname = current_user
                """
            )
        ).mappings().one()

    assert role["rolsuper"] is False
    assert role["rolbypassrls"] is False


def test_auth_email_lookup_is_narrow_and_does_not_disable_tenant_rls(app_engine, seeded_rls_data):
    with app_engine.begin() as conn:
        visible_without_context = conn.execute(
            text("SELECT id FROM users ORDER BY id")
        ).scalars().all()

    assert visible_without_context == []

    with app_engine.begin() as conn:
        conn.execute(
            text("SELECT set_config('app.auth_lookup_email', :email, true)"),
            {"email": f"{seeded_rls_data['user_a']}@example.test"},
        )
        visible_with_email = conn.execute(
            text("SELECT id FROM users ORDER BY id")
        ).scalars().all()

    assert visible_with_email == [seeded_rls_data["user_a"]]


def test_rls_filters_reads_by_current_school(app_engine, seeded_rls_data):
    with app_engine.begin() as conn:
        conn.execute(
            text("SELECT set_config('app.current_school_id', :school_id, true)"),
            {"school_id": seeded_rls_data["school_a"]},
        )
        message_ids = conn.execute(text("SELECT id FROM messages ORDER BY id")).scalars().all()

    assert message_ids == [seeded_rls_data["message_a"]]


def test_rls_rejects_cross_tenant_writes(app_engine, seeded_rls_data):
    with pytest.raises(sa.exc.DBAPIError):
        with app_engine.begin() as conn:
            conn.execute(
                text("SELECT set_config('app.current_school_id', :school_id, true)"),
                {"school_id": seeded_rls_data["school_a"]},
            )
            conn.execute(
                text(
                    """
                    INSERT INTO messages (
                        id, school_id, class_id, sender_id, sender_name, content, is_announcement, created_at
                    )
                    VALUES (
                        :id, :school_id, :class_id, :sender_id, :sender_name, :content, false, now()
                    )
                    """
                ),
                {
                    "id": f"blocked-message-{uuid.uuid4().hex[:8]}",
                    "school_id": seeded_rls_data["school_b"],
                    "class_id": seeded_rls_data["class_b"],
                    "sender_id": seeded_rls_data["user_b"],
                    "sender_name": "Teacher B",
                    "content": "This write must be rejected by RLS.",
                },
            )


def test_student_delete_requires_retention_job_context(app_engine, seeded_rls_data):
    with app_engine.begin() as conn:
        conn.execute(
            text("SELECT set_config('app.current_school_id', :school_id, true)"),
            {"school_id": seeded_rls_data["school_a"]},
        )
        delete_count = conn.execute(
            text("DELETE FROM students WHERE id = :id"),
            {"id": seeded_rls_data["student_a"]},
        ).rowcount

    assert delete_count == 0

    with app_engine.begin() as conn:
        conn.execute(
            text("SELECT set_config('app.current_school_id', :school_id, true)"),
            {"school_id": seeded_rls_data["school_a"]},
        )
        conn.execute(text("SELECT set_config('app.student_retention_job', 'true', true)"))
        delete_count = conn.execute(
            text("DELETE FROM students WHERE id = :id"),
            {"id": seeded_rls_data["student_a"]},
        ).rowcount

    assert delete_count == 1


def test_audit_events_are_tenant_scoped_append_only_and_retention_purgeable(app_engine, seeded_rls_data):
    school_event_id = f"audit-school-{uuid.uuid4().hex[:8]}"
    global_event_id = f"audit-global-{uuid.uuid4().hex[:8]}"
    old_event_id = f"audit-old-{uuid.uuid4().hex[:8]}"

    with app_engine.begin() as conn:
        conn.execute(
            text("SELECT set_config('app.current_school_id', :school_id, true)"),
            {"school_id": seeded_rls_data["school_a"]},
        )
        conn.execute(
            text(
                """
                INSERT INTO audit_events (id, school_id, action, created_at)
                VALUES (:id, :school_id, 'audit.school', now())
                """
            ),
            {"id": school_event_id, "school_id": seeded_rls_data["school_a"]},
        )
        update_count = conn.execute(
            text("UPDATE audit_events SET action = 'audit.changed' WHERE id = :id"),
            {"id": school_event_id},
        ).rowcount
        delete_count = conn.execute(
            text("DELETE FROM audit_events WHERE id = :id"),
            {"id": school_event_id},
        ).rowcount

    assert update_count == 0
    assert delete_count == 0

    with app_engine.begin() as conn:
        conn.execute(text("SELECT set_config('app.audit_event_write', 'true', true)"))
        conn.execute(
            text("INSERT INTO audit_events (id, action, created_at) VALUES (:id, 'audit.global', now())"),
            {"id": global_event_id},
        )

    with app_engine.begin() as conn:
        conn.execute(
            text("SELECT set_config('app.current_school_id', :school_id, true)"),
            {"school_id": seeded_rls_data["school_a"]},
        )
        visible_ids = conn.execute(
            text(
                """
                SELECT id
                FROM audit_events
                WHERE id IN (:school_event_id, :global_event_id)
                ORDER BY id
                """
            ),
            {"school_event_id": school_event_id, "global_event_id": global_event_id},
        ).scalars().all()

    assert visible_ids == [school_event_id]

    with app_engine.begin() as conn:
        conn.execute(text("SELECT set_config('app.is_system_admin', 'true', true)"))
        actions = conn.execute(
            text(
                """
                SELECT id, action
                FROM audit_events
                WHERE id IN (:school_event_id, :global_event_id)
                ORDER BY id
                """
            ),
            {"school_event_id": school_event_id, "global_event_id": global_event_id},
        ).mappings().all()

    assert {row["id"]: row["action"] for row in actions} == {
        global_event_id: "audit.global",
        school_event_id: "audit.school",
    }

    with app_engine.begin() as conn:
        conn.execute(
            text("SELECT set_config('app.current_school_id', :school_id, true)"),
            {"school_id": seeded_rls_data["school_a"]},
        )
        conn.execute(
            text(
                """
                INSERT INTO audit_events (id, school_id, action, created_at)
                VALUES (:id, :school_id, 'audit.old', now() - interval '10 years')
                """
            ),
            {"id": old_event_id, "school_id": seeded_rls_data["school_a"]},
        )

    with app_engine.begin() as conn:
        conn.execute(text("SELECT set_config('app.is_system_admin', 'true', true)"))
        conn.execute(text("SELECT set_config('app.audit_retention_job', 'true', true)"))
        purged = conn.execute(
            text("DELETE FROM audit_events WHERE id = :id"),
            {"id": old_event_id},
        ).rowcount

    assert purged == 1
