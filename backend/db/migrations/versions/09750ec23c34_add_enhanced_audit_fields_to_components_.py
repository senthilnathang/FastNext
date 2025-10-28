"""add_enhanced_audit_fields_to_components_and_products

Revision ID: 09750ec23c34
Revises: f05a6d2f0a35
Create Date: 2025-10-28 10:44:51.449030

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '09750ec23c34'
down_revision: Union[str, None] = 'f05a6d2f0a35'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add enhanced audit fields to components table
    op.add_column('components', sa.Column('created_by_datetime', sa.DateTime(timezone=True), nullable=True))
    op.add_column('components', sa.Column('updated_by_datetime', sa.DateTime(timezone=True), nullable=True))

    # Add enhanced audit fields to products table
    op.add_column('products', sa.Column('created_by_datetime', sa.DateTime(timezone=True), nullable=True))
    op.add_column('products', sa.Column('updated_by_datetime', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove enhanced audit fields from components table
    op.drop_column('components', 'created_by_datetime')
    op.drop_column('components', 'updated_by_datetime')

    # Remove enhanced audit fields from products table
    op.drop_column('products', 'created_by_datetime')
    op.drop_column('products', 'updated_by_datetime')
