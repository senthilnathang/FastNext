"""Add module system tables for installed_modules and module_reload_signals

Revision ID: module_001
Revises: None
Create Date: 2025-12-29

This migration adds the module system tables to support Odoo-style modular architecture.
- installed_modules: Tracks installed modules and their state
- module_reload_signals: Frontend synchronization for module changes
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "module_001"
down_revision = None  # Can be linked to existing migration if needed
branch_labels = None
depends_on = None


def upgrade():
    """Create module system tables"""

    # Create installed_modules table
    op.create_table(
        "installed_modules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("version", sa.String(length=64), nullable=False, server_default="1.0.0"),
        sa.Column("summary", sa.String(length=500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("author", sa.String(length=255), nullable=True),
        sa.Column("website", sa.String(length=500), nullable=True),
        sa.Column("category", sa.String(length=128), nullable=False, server_default="Uncategorized"),
        sa.Column("license", sa.String(length=64), nullable=False, server_default="MIT"),
        sa.Column("application", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("state", sa.String(length=32), nullable=False, server_default="installed"),
        sa.Column(
            "depends",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "manifest_cache",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("module_path", sa.String(length=500), nullable=True),
        sa.Column("auto_install", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "installed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("uninstalled_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_installed_modules_name"),
    )

    # Create indexes for installed_modules
    op.create_index(
        "idx_installed_modules_name",
        "installed_modules",
        ["name"],
        unique=True,
    )
    op.create_index(
        "idx_installed_modules_state",
        "installed_modules",
        ["state"],
        unique=False,
    )
    op.create_index(
        "idx_installed_modules_category",
        "installed_modules",
        ["category"],
        unique=False,
    )
    op.create_index(
        "idx_installed_modules_application",
        "installed_modules",
        ["application"],
        unique=False,
    )
    # GIN index for JSONB depends field for efficient contains queries
    op.create_index(
        "idx_installed_modules_depends",
        "installed_modules",
        ["depends"],
        unique=False,
        postgresql_using="gin",
    )

    # Create module_reload_signals table
    op.create_table(
        "module_reload_signals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("module_name", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("acknowledged", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for module_reload_signals
    op.create_index(
        "idx_module_reload_signals_acknowledged",
        "module_reload_signals",
        ["acknowledged"],
        unique=False,
    )
    op.create_index(
        "idx_module_reload_signals_module_name",
        "module_reload_signals",
        ["module_name"],
        unique=False,
    )
    op.create_index(
        "idx_module_reload_signals_created_at",
        "module_reload_signals",
        [sa.text("created_at DESC")],
        unique=False,
    )


def downgrade():
    """Drop module system tables"""

    # Drop indexes for module_reload_signals
    op.drop_index("idx_module_reload_signals_created_at", table_name="module_reload_signals")
    op.drop_index("idx_module_reload_signals_module_name", table_name="module_reload_signals")
    op.drop_index("idx_module_reload_signals_acknowledged", table_name="module_reload_signals")

    # Drop module_reload_signals table
    op.drop_table("module_reload_signals")

    # Drop indexes for installed_modules
    op.drop_index("idx_installed_modules_depends", table_name="installed_modules")
    op.drop_index("idx_installed_modules_application", table_name="installed_modules")
    op.drop_index("idx_installed_modules_category", table_name="installed_modules")
    op.drop_index("idx_installed_modules_state", table_name="installed_modules")
    op.drop_index("idx_installed_modules_name", table_name="installed_modules")

    # Drop installed_modules table
    op.drop_table("installed_modules")
