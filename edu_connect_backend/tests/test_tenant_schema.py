from app.db.base import Base


APPROVED_GLOBAL_TABLES = {
    "schools",
}

APPROVED_NULLABLE_SCHOOL_ID_TABLES = {
    # Global audit/security events can be platform-wide.
    "audit_events",
    # Migration diagnostics may be emitted before a school can be resolved.
    "migration_orphans",
    # System-admin sessions are intentionally platform-wide.
    "refresh_tokens",
    # Platform users and pre-assignment users can exist without a school.
    "users",
}


def test_all_models_are_either_tenant_scoped_or_approved_global():
    missing_school_id = [
        table.name
        for table in Base.metadata.sorted_tables
        if "school_id" not in table.c and table.name not in APPROVED_GLOBAL_TABLES
    ]

    assert missing_school_id == []


def test_tenant_school_id_columns_are_non_nullable_except_approved_cases():
    nullable_school_ids = [
        table.name
        for table in Base.metadata.sorted_tables
        if "school_id" in table.c
        and table.c.school_id.nullable
        and table.name not in APPROVED_NULLABLE_SCHOOL_ID_TABLES
    ]

    assert nullable_school_ids == []
