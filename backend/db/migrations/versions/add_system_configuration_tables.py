"""add system configuration tables

Revision ID: add_system_configuration_tables
Revises: simple_import_export
Create Date: 2025-01-21 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_system_configuration_tables"
down_revision: Union[str, None] = "simple_import_export"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # System Configuration table
    op.create_table(
        "system_configurations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "key", sa.String(length=255), nullable=False, unique=True, index=True
        ),
        sa.Column("category", sa.String(length=50), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("config_data", sa.JSON(), nullable=False, default="{}"),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("is_system_config", sa.Boolean(), nullable=False, default=False),
        sa.Column("requires_restart", sa.Boolean(), nullable=False, default=False),
        sa.Column("default_value", sa.JSON(), nullable=False, default="{}"),
        sa.Column("validation_schema", sa.JSON(), nullable=False, default="{}"),
        sa.Column("version", sa.String(length=20), nullable=False, default="1.0.0"),
        sa.Column("previous_version", sa.JSON(), nullable=False, default="{}"),
        sa.Column("tags", sa.JSON(), nullable=False, default="[]"),
        sa.Column(
            "environment", sa.String(length=50), nullable=False, default="production"
        ),
        sa.Column("last_applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False, default="{}"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, default=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by"],
            ["users.id"],
        ),
    )

    # Configuration Templates table
    op.create_table(
        "configuration_templates",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(length=255), nullable=False, index=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False, index=True),
        sa.Column("template_data", sa.JSON(), nullable=False, default="{}"),
        sa.Column("variables", sa.JSON(), nullable=False, default="[]"),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("is_system_template", sa.Boolean(), nullable=False, default=False),
        sa.Column("is_public", sa.Boolean(), nullable=False, default=False),
        sa.Column("usage_count", sa.Integer(), nullable=False, default=0),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "supported_environments",
            sa.JSON(),
            nullable=False,
            default='["production", "staging", "development"]',
        ),
        sa.Column("metadata_json", sa.JSON(), nullable=False, default="{}"),
        sa.Column("tags", sa.JSON(), nullable=False, default="[]"),
        sa.Column("version", sa.String(length=20), nullable=False, default="1.0.0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, default=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by"],
            ["users.id"],
        ),
    )

    # Configuration Audit Log table
    op.create_table(
        "configuration_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "configuration_key", sa.String(length=255), nullable=False, index=True
        ),
        sa.Column("action", sa.String(length=50), nullable=False, index=True),
        sa.Column("old_value", sa.JSON(), nullable=False, default="{}"),
        sa.Column("new_value", sa.JSON(), nullable=False, default="{}"),
        sa.Column("change_reason", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("environment", sa.String(length=50), nullable=True),
        sa.Column("validation_passed", sa.Boolean(), nullable=True),
        sa.Column("validation_errors", sa.JSON(), nullable=False, default="[]"),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("metadata_json", sa.JSON(), nullable=False, default="{}"),
        sa.Column("tags", sa.JSON(), nullable=False, default="[]"),
        sa.Column("version", sa.String(length=20), nullable=False, default="1.0.0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, default=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by"],
            ["users.id"],
        ),
    )

    # Create indexes for better performance
    op.create_index(
        "idx_system_configurations_category_active",
        "system_configurations",
        ["category", "is_active"],
    )
    op.create_index(
        "idx_system_configurations_environment",
        "system_configurations",
        ["environment"],
    )
    op.create_index(
        "idx_configuration_templates_category_active",
        "configuration_templates",
        ["category", "is_active"],
    )
    op.create_index(
        "idx_configuration_audit_logs_key_action",
        "configuration_audit_logs",
        ["configuration_key", "action"],
    )
    op.create_index(
        "idx_configuration_audit_logs_timestamp",
        "configuration_audit_logs",
        ["timestamp"],
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("idx_configuration_audit_logs_timestamp", "configuration_audit_logs")
    op.drop_index("idx_configuration_audit_logs_key_action", "configuration_audit_logs")
    op.drop_index(
        "idx_configuration_templates_category_active", "configuration_templates"
    )
    op.drop_index("idx_system_configurations_environment", "system_configurations")
    op.drop_index("idx_system_configurations_category_active", "system_configurations")

    # Drop tables
    op.drop_table("configuration_audit_logs")
    op.drop_table("configuration_templates")
    op.drop_table("system_configurations")
