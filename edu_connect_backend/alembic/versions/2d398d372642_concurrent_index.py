"""Concurrent Index

Revision ID: 2d398d372642
Revises: b27154759c51
Create Date: 2026-04-05 03:22:16.376623

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2d398d372642'
down_revision = 'b27154759c51'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Important: These must run CONCURRENTLY to avoid locking tables.
    # Concurrent indexing requires no transaction.
    tables = [
        'courses', 'semesters', 'users', 'students', 'verification_requests',
        'student_parents', 'class_teachers', 'notifications', 'classes',
        'class_members', 'messages', 'grades', 'homework', 'attendance', 
        'remarks', 'pending_links'
    ]
    
    for table in tables:
        # Check if the migration is running with -x no_transaction=true
        op.execute(f"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{table}_school_composite ON {table} (school_id, id)")


def downgrade() -> None:
    tables = [
        'courses', 'semesters', 'users', 'students', 'verification_requests',
        'student_parents', 'class_teachers', 'notifications', 'classes',
        'class_members', 'messages', 'grades', 'homework', 'attendance', 
        'remarks', 'pending_links'
    ]
    
    for table in tables:
        op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS idx_{table}_school_composite")
