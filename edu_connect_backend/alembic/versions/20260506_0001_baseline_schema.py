"""baseline schema

Revision ID: 20260506_0001
Revises:
Create Date: 2026-05-06 20:45:00.000000
"""
from typing import Sequence, Union

from alembic import op

from app.db.base import Base


revision: str = "20260506_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)

    for table in Base.metadata.sorted_tables:
        if "school_id" not in table.c:
            continue
        table_name = _q(table.name)
        policy_name = _q(f"tenant_isolation_{table.name}")
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


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
