"""Add authors table

Revision ID: 4befd26dd02e
Revises: 
Create Date: 2025-09-24 14:22:17.406095

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'fcb007615c62'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Create authors table"""
    op.create_table('authors',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

def downgrade() -> None:
    """Drop authors table"""
    op.drop_table('authors')