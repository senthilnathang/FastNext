"""Add is_active column to products table

Revision ID: prod_active_001
Revises: 1758726000
Create Date: 2025-10-22

This migration adds the is_active column to the products table to track product availability status.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "prod_active_001"
down_revision = "1758726000"
branch_labels = None
depends_on = None


def upgrade():
    """Add is_active column to products table"""

    # Add is_active column with default value True
    op.add_column(
        "products",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            default=True,
            server_default=sa.text("true")
        )
    )

    # Create index on is_active for better query performance
    op.create_index("ix_products_is_active", "products", ["is_active"])


def downgrade():
    """Remove is_active column from products table"""

    # Drop the index first
    op.drop_index("ix_products_is_active", table_name="products")

    # Drop the column
    op.drop_column("products", "is_active")