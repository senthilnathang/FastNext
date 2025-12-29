"""Add missing columns to rls_audit_logs table

Revision ID: m9n0o1p2q3r4
Revises: l8m9n0o1p2q3
Create Date: 2025-12-30

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'm9n0o1p2q3r4'
down_revision = 'l8m9n0o1p2q3'
branch_labels = None
depends_on = None


def upgrade():
    # Add missing columns to rls_audit_logs table
    op.add_column('rls_audit_logs', sa.Column('sql_query', sa.Text(), nullable=True))
    op.add_column('rls_audit_logs', sa.Column('applied_conditions', sa.JSON(), nullable=True))
    op.add_column('rls_audit_logs', sa.Column('request_method', sa.String(10), nullable=True))
    op.add_column('rls_audit_logs', sa.Column('request_path', sa.String(500), nullable=True))


def downgrade():
    # Remove added columns
    op.drop_column('rls_audit_logs', 'request_path')
    op.drop_column('rls_audit_logs', 'request_method')
    op.drop_column('rls_audit_logs', 'applied_conditions')
    op.drop_column('rls_audit_logs', 'sql_query')
