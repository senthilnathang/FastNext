"""Add saless table

Revision ID: 403375e6edbb
Revises: 
Create Date: 2025-09-24 14:38:44.810259

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'c9f69e5bec34'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Create saless table"""
    op.create_table('saless',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

def downgrade() -> None:
    """Drop saless table"""
    op.drop_table('saless')