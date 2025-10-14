"""Add foreign key constraints for audit fields

Revision ID: 1758725000
Revises: 6e4b537d8354
Create Date: 2025-09-24 14:30:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "1758725000"
down_revision = "6e4b537d8354"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add foreign key constraints for audit fields"""

    # Add foreign key constraints for products table audit fields
    op.create_foreign_key(
        "fk_products_created_by", "products", "users", ["created_by"], ["id"]
    )

    op.create_foreign_key(
        "fk_products_updated_by", "products", "users", ["updated_by"], ["id"]
    )

    # Add foreign key constraints for blog_posts table audit fields
    op.create_foreign_key(
        "fk_blog_posts_created_by", "blog_posts", "users", ["created_by"], ["id"]
    )

    op.create_foreign_key(
        "fk_blog_posts_updated_by", "blog_posts", "users", ["updated_by"], ["id"]
    )

    # Add foreign key constraints for categorys table audit fields (if they exist)
    try:
        op.create_foreign_key(
            "fk_categorys_created_by", "categorys", "users", ["created_by"], ["id"]
        )

        op.create_foreign_key(
            "fk_categorys_updated_by", "categorys", "users", ["updated_by"], ["id"]
        )
    except Exception:
        # categorys table might not have audit fields
        pass


def downgrade() -> None:
    """Remove foreign key constraints for audit fields"""

    # Remove foreign key constraints
    op.drop_constraint("fk_products_created_by", "products", type_="foreignkey")
    op.drop_constraint("fk_products_updated_by", "products", type_="foreignkey")

    op.drop_constraint("fk_blog_posts_created_by", "blog_posts", type_="foreignkey")
    op.drop_constraint("fk_blog_posts_updated_by", "blog_posts", type_="foreignkey")

    try:
        op.drop_constraint("fk_categorys_created_by", "categorys", type_="foreignkey")
        op.drop_constraint("fk_categorys_updated_by", "categorys", type_="foreignkey")
    except Exception:
        pass
