"""Add blog_posts table

Revision ID: e6ad10e185c5
Revises:
Create Date: 2025-09-24 11:36:55.030419

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "6e4b537d8354"
down_revision = "018d819e0910"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create blog_posts table"""
    op.create_table(
        "blog_posts",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("title", sa.String(300), nullable=False, unique=True, index=True),
        sa.Column("slug", sa.String(150), nullable=False, unique=True, index=True),
        sa.Column("excerpt", sa.Text, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("status", sa.Enum(PostStatus), nullable=False, default="draft"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("view_count", sa.Integer, nullable=False, default=0),
        sa.Column("tags", sa.JSON, nullable=False),
        sa.Column("author_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id")),
    )


def downgrade() -> None:
    """Drop blog_posts table"""
    op.drop_table("blog_posts")
