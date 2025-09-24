"""Add categorys table

Revision ID: d6ace6363753
Revises: 
Create Date: 2025-09-24 13:52:33.766788

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '352c907a73be'
down_revision = '6f7e9b6ff1ab'
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Create categorys table"""
    op.create_table('categorys',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

def downgrade() -> None:
    """Drop categorys table"""
    op.drop_table('categorys')