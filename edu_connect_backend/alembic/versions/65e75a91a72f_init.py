"""Init

Revision ID: 65e75a91a72f
Revises: 
Create Date: 2026-04-05 03:20:46.301184

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65e75a91a72f'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Migration Orphans table
    op.create_table(
        'migration_orphans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('table_name', sa.String(length=100), nullable=False),
        sa.Column('row_id', sa.String(length=128), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Add school_id to tables (Initial NULLABLE)
    tables_to_add_school_id = [
        'student_parents', 'class_teachers', 'class_members', 
        'messages', 'grades', 'homework', 'attendance', 'remarks'
    ]
    
    for table in tables_to_add_school_id:
        op.add_column(table, sa.Column('school_id', sa.String(length=36), nullable=True))
        op.create_foreign_key(f'fk_{table}_school_id', table, 'schools', ['school_id'], ['id'], ondelete='CASCADE')

    # 3. Create Pending Links table
    op.create_table(
        'pending_links',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('school_id', sa.String(length=36), nullable=False),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
        sa.Column('scanned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    op.create_index(op.f('ix_pending_links_token'), 'pending_links', ['token'], unique=True)
    op.create_index(op.f('ix_pending_links_school_id'), 'pending_links', ['school_id'], unique=False)

    # 4. Backfill Logic
    # Update Grades
    op.execute("""
        UPDATE grades g
        SET school_id = c.school_id
        FROM classes c
        WHERE g.class_id = c.id
    """)
    # Update Attendance
    op.execute("""
        UPDATE attendance a
        SET school_id = c.school_id
        FROM classes c
        WHERE a.class_id = c.id
    """)
    # Update Remarks
    op.execute("""
        UPDATE remarks r
        SET school_id = c.school_id
        FROM classes c
        WHERE r.class_id = c.id
    """)
    # Update Homework
    op.execute("""
        UPDATE homework h
        SET school_id = c.school_id
        FROM classes c
        WHERE h.class_id = c.id
    """)
    # Update Messages
    op.execute("""
        UPDATE messages m
        SET school_id = c.school_id
        FROM classes c
        WHERE m.class_id = c.id
    """)

    # Catch orphans (rows where school_id is still NULL)
    for table in tables_to_add_school_id:
        if table in ['student_parents', 'class_teachers', 'class_members']:
            continue # Junction tables might need different logic if they are empty
            
        op.execute(f"""
            INSERT INTO migration_orphans (table_name, row_id, reason)
            SELECT '{table}', id, 'Could not resolve school_id from class_id link'
            FROM {table}
            WHERE school_id IS NULL
        """)

    # 5. Set NOT NULL (Phase 1 completion)
    for table in tables_to_add_school_id:
        op.alter_column(table, 'school_id', nullable=False)


def downgrade() -> None:
    op.drop_table('pending_links')
    op.drop_table('migration_orphans')
    
    tables_to_add_school_id = [
        'student_parents', 'class_teachers', 'class_members', 
        'messages', 'grades', 'homework', 'attendance', 'remarks'
    ]
    
    for table in tables_to_add_school_id:
        op.drop_constraint(f'fk_{table}_school_id', table, type_='foreignkey')
        op.drop_column(table, 'school_id')
