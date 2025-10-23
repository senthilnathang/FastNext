"""Add notifications table for user notifications system

Revision ID: notif_001
Revises: perf_001
Create Date: 2025-10-13

This migration adds the notifications table to support in-app, email, and push notifications.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "notif_001"
down_revision = "perf_001"
branch_labels = None
depends_on = None


def upgrade():
    """Create notifications table"""

    # Create enum types
    notification_type_enum = postgresql.ENUM(
        "info", "success", "warning", "error", "system", name="notificationtype"
    )
    notification_type_enum.create(op.get_bind(), checkfirst=True)

    notification_channel_enum = postgresql.ENUM(
        "in_app", "email", "push", name="notificationchannel"
    )
    notification_channel_enum.create(op.get_bind(), checkfirst=True)

    # Create notifications table
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", notification_type_enum, nullable=False, default="info"),
        sa.Column(
            "channels", sa.String(length=255), nullable=False
        ),  # JSON array of channels
        sa.Column("is_read", sa.Boolean(), nullable=False, default=False),
        sa.Column("is_sent", sa.Boolean(), nullable=False, default=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("action_url", sa.String(length=500), nullable=True),
        sa.Column("data", sa.Text(), nullable=True),  # JSON data
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes
    op.create_index(
        "idx_notifications_user_id", "notifications", ["user_id"], unique=False
    )
    op.create_index(
        "idx_notifications_created_at",
        "notifications",
        [sa.text("created_at DESC")],
        unique=False,
    )
    op.create_index(
        "idx_notifications_user_read",
        "notifications",
        ["user_id", "is_read"],
        unique=False,
    )
    op.create_index("idx_notifications_type", "notifications", ["type"], unique=False)


def downgrade():
    """Drop notifications table"""

    # Drop indexes
    op.drop_index("idx_notifications_type", table_name="notifications")
    op.drop_index("idx_notifications_user_read", table_name="notifications")
    op.drop_index("idx_notifications_created_at", table_name="notifications")
    op.drop_index("idx_notifications_user_id", table_name="notifications")

    # Drop table
    op.drop_table("notifications")

    # Drop enum types
    notification_channel_enum = postgresql.ENUM(
        "in_app", "email", "push", name="notificationchannel"
    )
    notification_channel_enum.drop(op.get_bind(), checkfirst=True)

    notification_type_enum = postgresql.ENUM(
        "info", "success", "warning", "error", "system", name="notificationtype"
    )
    notification_type_enum.drop(op.get_bind(), checkfirst=True)
