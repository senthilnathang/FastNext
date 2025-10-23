"""Add performance indexes for scalability

Revision ID: perf_001
Revises:
Create Date: 2025-10-11

This migration adds strategic indexes to improve query performance
for high-scale operations.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "perf_001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Add performance indexes"""

    # Activity Logs - High-volume table optimizations
    # Composite indexes for common query patterns
    op.create_index(
        "idx_activity_logs_created_at_desc",
        "activity_logs",
        [sa.text("created_at DESC")],
        postgresql_using="btree",
    )

    op.create_index(
        "idx_activity_logs_user_created",
        "activity_logs",
        ["user_id", sa.text("created_at DESC")],
        postgresql_using="btree",
    )

    op.create_index(
        "idx_activity_logs_category_action",
        "activity_logs",
        ["category", "action", sa.text("created_at DESC")],
        postgresql_using="btree",
    )

    op.create_index(
        "idx_activity_logs_level_created",
        "activity_logs",
        ["level", sa.text("created_at DESC")],
        postgresql_using="btree",
    )

    op.create_index(
        "idx_activity_logs_entity",
        "activity_logs",
        ["entity_type", "entity_id"],
        postgresql_using="btree",
    )

    # GIN index for JSON fields (fast searching within JSON)
    op.execute(
        """
        CREATE INDEX idx_activity_logs_metadata_gin
        ON activity_logs USING gin (metadata jsonb_path_ops)
    """
    )

    op.execute(
        """
        CREATE INDEX idx_activity_logs_tags_gin
        ON activity_logs USING gin (tags jsonb_path_ops)
    """
    )

    # Users table optimizations
    op.create_index(
        "idx_users_active_verified",
        "users",
        ["is_active", "is_verified"],
        postgresql_using="btree",
    )

    op.create_index(
        "idx_users_last_login",
        "users",
        [sa.text("last_login_at DESC NULLS LAST")],
        postgresql_using="btree",
    )

    # Projects table (assuming it exists)
    try:
        op.create_index(
            "idx_projects_owner_created",
            "projects",
            ["owner_id", sa.text("created_at DESC")],
            postgresql_using="btree",
        )
    except Exception:
        pass  # Table might not exist

    # Workflow instances (for workflow engine performance)
    try:
        op.create_index(
            "idx_workflow_instances_status_created",
            "workflow_instances",
            ["status", sa.text("created_at DESC")],
            postgresql_using="btree",
        )

        op.create_index(
            "idx_workflow_instances_assigned_status",
            "workflow_instances",
            ["assigned_to", "status"],
            postgresql_using="btree",
        )
    except Exception:
        pass  # Table might not exist


def downgrade():
    """Remove performance indexes"""

    # Activity logs indexes
    op.drop_index("idx_activity_logs_created_at_desc", "activity_logs")
    op.drop_index("idx_activity_logs_user_created", "activity_logs")
    op.drop_index("idx_activity_logs_category_action", "activity_logs")
    op.drop_index("idx_activity_logs_level_created", "activity_logs")
    op.drop_index("idx_activity_logs_entity", "activity_logs")
    op.drop_index("idx_activity_logs_metadata_gin", "activity_logs")
    op.drop_index("idx_activity_logs_tags_gin", "activity_logs")

    # Users table indexes
    op.drop_index("idx_users_active_verified", "users")
    op.drop_index("idx_users_last_login", "users")

    # Projects table indexes
    try:
        op.drop_index("idx_projects_owner_created", "projects")
    except Exception:
        pass

    # Workflow indexes
    try:
        op.drop_index("idx_workflow_instances_status_created", "workflow_instances")
        op.drop_index("idx_workflow_instances_assigned_status", "workflow_instances")
    except Exception:
        pass
