"""Make product fields nullable

Revision ID: 1758726000
Revises: 1758725000
Create Date: 2025-10-18 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "1758726000"
down_revision = "1758725000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Make product fields nullable to match model changes"""
    # Make fields nullable
    op.alter_column("products", "description", nullable=True)
    op.alter_column("products", "sku", nullable=True)
    op.alter_column("products", "is_featured", nullable=True)
    op.alter_column("products", "launch_date", nullable=True)
    op.alter_column("products", "specifications", nullable=True)
    op.alter_column("products", "website_url", nullable=True)
    op.alter_column("products", "support_email", nullable=True)
    op.alter_column("products", "category_id", nullable=True)
    op.alter_column("products", "owner_id", nullable=True)


def downgrade() -> None:
    """Revert product fields to not nullable"""
    # Make fields not nullable (this might fail if there are NULL values)
    op.alter_column("products", "description", nullable=False)
    op.alter_column("products", "sku", nullable=False)
    op.alter_column("products", "is_featured", nullable=False)
    op.alter_column("products", "launch_date", nullable=False)
    op.alter_column("products", "specifications", nullable=False)
    op.alter_column("products", "website_url", nullable=False)
    op.alter_column("products", "support_email", nullable=False)
    op.alter_column("products", "category_id", nullable=False)
    op.alter_column("products", "owner_id", nullable=False)