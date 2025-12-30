"""add_installed_modules_table

Revision ID: ea2e2c127424
Revises:
Create Date: 2024-12-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ea2e2c127424'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the installed_modules table for tracking module state."""
    op.create_table(
        'installed_modules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False, comment='Technical module name (directory name)'),
        sa.Column('display_name', sa.String(length=200), nullable=False, comment='Human-readable module name'),
        sa.Column('version', sa.String(length=50), nullable=False, comment='Module version string'),
        sa.Column('summary', sa.String(length=500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('author', sa.String(length=200), nullable=True),
        sa.Column('website', sa.String(length=500), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True, server_default='Uncategorized'),
        sa.Column('license', sa.String(length=50), nullable=True, server_default='MIT'),
        sa.Column('application', sa.Boolean(), nullable=True, server_default='false', comment='True if full application, False if technical module'),
        sa.Column('state', sa.String(length=20), nullable=False, server_default='installed', comment='Module state: installed, to_upgrade, to_remove, uninstalled'),
        sa.Column('installed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('depends', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]', comment='List of module dependencies'),
        sa.Column('manifest_cache', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}', comment='Full manifest cached as JSON'),
        sa.Column('module_path', sa.String(length=500), nullable=True, comment='Filesystem path to module directory'),
        sa.Column('auto_install', sa.Boolean(), nullable=True, server_default='false', comment='Auto-install when dependencies are met'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_installed_modules_id'), 'installed_modules', ['id'], unique=False)
    op.create_index(op.f('ix_installed_modules_name'), 'installed_modules', ['name'], unique=True)
    op.create_index(op.f('ix_installed_modules_state'), 'installed_modules', ['state'], unique=False)
    op.create_index(op.f('ix_installed_modules_category'), 'installed_modules', ['category'], unique=False)


def downgrade() -> None:
    """Drop the installed_modules table."""
    op.drop_index(op.f('ix_installed_modules_category'), table_name='installed_modules')
    op.drop_index(op.f('ix_installed_modules_state'), table_name='installed_modules')
    op.drop_index(op.f('ix_installed_modules_name'), table_name='installed_modules')
    op.drop_index(op.f('ix_installed_modules_id'), table_name='installed_modules')
    op.drop_table('installed_modules')
