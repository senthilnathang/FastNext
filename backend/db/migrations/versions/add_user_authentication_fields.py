"""add_user_authentication_fields

Revision ID: add_user_auth_fields
Revises: 4ca9055bc81e
Create Date: 2025-09-18 17:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_user_auth_fields"
down_revision: Union[str, None] = "4ca9055bc81e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new fields to users table
    op.add_column("users", sa.Column("full_name", sa.String(255), nullable=True))
    op.add_column(
        "users", sa.Column("is_verified", sa.Boolean(), default=False, nullable=False)
    )
    op.add_column(
        "users",
        sa.Column("failed_login_attempts", sa.Integer(), default=0, nullable=False),
    )
    op.add_column(
        "users", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("users", sa.Column("avatar_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("location", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("website", sa.String(500), nullable=True))

    # Set default values for existing users
    op.execute("UPDATE users SET is_verified = false WHERE is_verified IS NULL")
    op.execute(
        "UPDATE users SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL"
    )


def downgrade() -> None:
    # Remove the added columns
    op.drop_column("users", "website")
    op.drop_column("users", "location")
    op.drop_column("users", "bio")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "password_changed_at")
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_attempts")
    op.drop_column("users", "is_verified")
    op.drop_column("users", "full_name")
