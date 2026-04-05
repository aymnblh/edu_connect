"""RLS Policies

Revision ID: b27154759c51
Revises: 65e75a91a72f
Create Date: 2026-04-05 03:21:49.812394

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b27154759c51'
down_revision: Union[str, None] = '65e75a91a72f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = [
        'courses', 'semesters', 'users', 'students', 'verification_requests',
        'student_parents', 'class_teachers', 'notifications', 'classes',
        'class_members', 'messages', 'grades', 'homework', 'attendance', 
        'remarks', 'pending_links'
    ]
    
    for table in tables:
        # 1. Enable RLS
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        
        # 2. Create Policy
        # Using current_setting('app.current_school_id') which will be set by middleware
        op.execute(f"""
            CREATE POLICY {table}_school_isolation ON {table}
            USING (school_id = current_setting('app.current_school_id'))
        """)


def downgrade() -> None:
    tables = [
        'courses', 'semesters', 'users', 'students', 'verification_requests',
        'student_parents', 'class_teachers', 'notifications', 'classes',
        'class_members', 'messages', 'grades', 'homework', 'attendance', 
        'remarks', 'pending_links'
    ]
    
    for table in tables:
        op.execute(f"DROP POLICY IF EXISTS {table}_school_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
