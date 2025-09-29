"""simple import export tables

Revision ID: simple_import_export
Revises: 0e2491553ab8
Create Date: 2025-09-29 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'simple_import_export'
down_revision: Union[str, None] = '0e2491553ab8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Simple import/export tables for testing
    
    # Import Jobs table
    op.create_table('import_jobs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('job_id', sa.String(length=36), nullable=False, unique=True, index=True),
        sa.Column('table_name', sa.String(length=100), nullable=False, index=True),
        sa.Column('status', sa.String(length=20), nullable=False, default='PENDING'),
        sa.Column('original_filename', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('file_format', sa.String(length=20), nullable=False),
        sa.Column('import_options', sa.JSON(), nullable=False, default='{}'),
        sa.Column('field_mappings', sa.JSON(), nullable=False, default='{}'),
        sa.Column('progress_percent', sa.Float(), nullable=False, default=0.0),
        sa.Column('total_rows', sa.Integer(), nullable=True),
        sa.Column('processed_rows', sa.Integer(), nullable=False, default=0),
        sa.Column('valid_rows', sa.Integer(), nullable=False, default=0),
        sa.Column('error_rows', sa.Integer(), nullable=False, default=0),
        sa.Column('validation_results', sa.JSON(), nullable=False, default='{}'),
        sa.Column('import_results', sa.JSON(), nullable=False, default='{}'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    )

    # Export Jobs table
    op.create_table('export_jobs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('job_id', sa.String(length=36), nullable=False, unique=True, index=True),
        sa.Column('table_name', sa.String(length=100), nullable=False, index=True),
        sa.Column('status', sa.String(length=20), nullable=False, default='PENDING'),
        sa.Column('export_format', sa.String(length=20), nullable=False),
        sa.Column('export_options', sa.JSON(), nullable=False, default='{}'),
        sa.Column('selected_columns', sa.JSON(), nullable=False, default='[]'),
        sa.Column('filters', sa.JSON(), nullable=False, default='[]'),
        sa.Column('filename', sa.String(length=500), nullable=True),
        sa.Column('file_path', sa.String(length=1000), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('download_url', sa.String(length=1000), nullable=True),
        sa.Column('progress_percent', sa.Float(), nullable=False, default=0.0),
        sa.Column('estimated_rows', sa.Integer(), nullable=True),
        sa.Column('processed_rows', sa.Integer(), nullable=False, default=0),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    )

    # Import Permissions table
    op.create_table('import_permissions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), nullable=False, index=True),
        sa.Column('table_name', sa.String(length=100), nullable=False, index=True),
        sa.Column('can_import', sa.Boolean(), nullable=False, default=True),
        sa.Column('can_validate', sa.Boolean(), nullable=False, default=True),
        sa.Column('can_preview', sa.Boolean(), nullable=False, default=True),
        sa.Column('max_file_size_mb', sa.Integer(), nullable=False, default=10),
        sa.Column('max_rows_per_import', sa.Integer(), nullable=False, default=10000),
        sa.Column('allowed_formats', sa.JSON(), nullable=False, default='["csv", "json", "excel"]'),
        sa.Column('requires_approval', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    )

    # Export Permissions table
    op.create_table('export_permissions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), nullable=False, index=True),
        sa.Column('table_name', sa.String(length=100), nullable=False, index=True),
        sa.Column('can_export', sa.Boolean(), nullable=False, default=True),
        sa.Column('can_preview', sa.Boolean(), nullable=False, default=True),
        sa.Column('max_rows_per_export', sa.Integer(), nullable=False, default=100000),
        sa.Column('allowed_formats', sa.JSON(), nullable=False, default='["csv", "json", "excel"]'),
        sa.Column('allowed_columns', sa.JSON(), nullable=False, default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    )


def downgrade() -> None:
    op.drop_table('export_permissions')
    op.drop_table('import_permissions')
    op.drop_table('export_jobs')
    op.drop_table('import_jobs')