"""Add products table

Revision ID: 5429c81fcbe2
Revises: 
Create Date: 2025-09-24 11:36:55.027568

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '018d819e0910'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Create products table"""
    op.create_table('products',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(200), nullable=False, unique=True, index=True),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('price', sa.Float, nullable=False),
        sa.Column('category', sa.Enum(ProductCategory), nullable=False),
        sa.Column('sku', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('stock_quantity', sa.Integer, nullable=False, default=0),
        sa.Column('is_featured', sa.Boolean, nullable=False, default=False),
        sa.Column('launch_date', sa.Date, nullable=False),
        sa.Column('specifications', sa.JSON, nullable=False),
        sa.Column('website_url', sa.String(500), nullable=False),
        sa.Column('support_email', sa.String(255), nullable=False),
        sa.Column('category_id', sa.Integer, nullable=False, sa.ForeignKey('categories.id')),
        sa.Column('owner_id', sa.Integer, nullable=False, sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), default=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id')),
    )

def downgrade() -> None:
    """Drop products table"""
    op.drop_table('products')