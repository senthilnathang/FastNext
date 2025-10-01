"""Enhance activity log for comprehensive event logging

Revision ID: enhance_activity_log_for_events
Revises: 2e84d23d2884
Create Date: 2025-01-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'enhance_activity_log_for_events'
down_revision: Union[str, None] = '2e84d23d2884'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to activity_logs table for enhanced event logging
    
    # Event identification fields
    op.add_column('activity_logs', sa.Column('event_id', sa.String(length=36), nullable=True))
    op.add_column('activity_logs', sa.Column('correlation_id', sa.String(length=36), nullable=True))
    
    # Enhanced user identification
    op.add_column('activity_logs', sa.Column('username', sa.String(length=100), nullable=True))
    
    # Event categorization
    op.add_column('activity_logs', sa.Column('category', 
        sa.Enum('AUTHENTICATION', 'AUTHORIZATION', 'USER_MANAGEMENT', 'DATA_MANAGEMENT', 
                'SYSTEM_MANAGEMENT', 'SECURITY', 'WORKFLOW', 'API', 'FILE_MANAGEMENT', 
                'CONFIGURATION', name='eventcategory'), nullable=True))
    
    # Enhanced entity information
    op.alter_column('activity_logs', 'entity_id', 
                   existing_type=sa.Integer(), 
                   type_=sa.String(length=100),
                   existing_nullable=True)
    
    # Enhanced request metadata
    op.add_column('activity_logs', sa.Column('request_headers', sa.JSON(), nullable=True))
    op.add_column('activity_logs', sa.Column('response_time_ms', sa.Integer(), nullable=True))
    
    # Geographic and session info
    op.add_column('activity_logs', sa.Column('country_code', sa.String(length=2), nullable=True))
    op.add_column('activity_logs', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('activity_logs', sa.Column('session_id', sa.String(length=100), nullable=True))
    
    # Enhanced metadata and context
    op.add_column('activity_logs', sa.Column('metadata', sa.JSON(), nullable=True))
    op.add_column('activity_logs', sa.Column('tags', sa.JSON(), nullable=True))
    
    # Risk assessment
    op.add_column('activity_logs', sa.Column('risk_score', sa.Integer(), nullable=True))
    op.add_column('activity_logs', sa.Column('affected_users_count', sa.Integer(), nullable=True))
    
    # System context
    op.add_column('activity_logs', sa.Column('server_name', sa.String(length=100), nullable=True))
    op.add_column('activity_logs', sa.Column('environment', sa.String(length=20), nullable=True))
    op.add_column('activity_logs', sa.Column('application_version', sa.String(length=50), nullable=True))
    
    # Processing metadata
    op.add_column('activity_logs', sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True))
    
    # Update existing enum to include new values
    # First, let's extend the ActivityAction enum
    op.execute("ALTER TYPE activityaction ADD VALUE IF NOT EXISTS 'read'")
    op.execute("ALTER TYPE activityaction ADD VALUE IF NOT EXISTS 'SYSTEM_EVENT'")
    op.execute("ALTER TYPE activityaction ADD VALUE IF NOT EXISTS 'SECURITY_EVENT'")
    op.execute("ALTER TYPE activityaction ADD VALUE IF NOT EXISTS 'API_CALL'")
    op.execute("ALTER TYPE activityaction ADD VALUE IF NOT EXISTS 'FILE_UPLOAD'")
    op.execute("ALTER TYPE activityaction ADD VALUE IF NOT EXISTS 'FILE_DOWNLOAD'")
    op.execute("ALTER TYPE activityaction ADD VALUE IF NOT EXISTS 'WORKFLOW_EXECUTE'")
    op.execute("ALTER TYPE activityaction ADD VALUE IF NOT EXISTS 'VALIDATION_FAILED'")
    
    # Extend ActivityLevel enum
    op.execute("ALTER TYPE activitylevel ADD VALUE IF NOT EXISTS 'DEBUG'")
    
    # Create indexes for enhanced performance
    op.create_index('ix_activity_logs_event_id', 'activity_logs', ['event_id'], unique=True)
    op.create_index('ix_activity_logs_correlation_id', 'activity_logs', ['correlation_id'])
    op.create_index('ix_activity_logs_username', 'activity_logs', ['username'])
    op.create_index('ix_activity_logs_category', 'activity_logs', ['category'])
    op.create_index('ix_activity_logs_level', 'activity_logs', ['level'])
    op.create_index('ix_activity_logs_request_path', 'activity_logs', ['request_path'])
    op.create_index('ix_activity_logs_status_code', 'activity_logs', ['status_code'])
    op.create_index('ix_activity_logs_session_id', 'activity_logs', ['session_id'])
    
    # Replace extra_data column with metadata (JSON)
    # First migrate existing data if any
    op.execute("""
        UPDATE activity_logs 
        SET metadata = 
            CASE 
                WHEN extra_data IS NOT NULL AND extra_data != '' 
                THEN CAST(extra_data AS json)
                ELSE NULL 
            END
        WHERE extra_data IS NOT NULL
    """)
    
    # Drop the old extra_data column
    op.drop_column('activity_logs', 'extra_data')


def downgrade() -> None:
    # Add back the extra_data column
    op.add_column('activity_logs', sa.Column('extra_data', sa.Text(), nullable=True))
    
    # Migrate metadata back to extra_data
    op.execute("""
        UPDATE activity_logs 
        SET extra_data = CAST(metadata AS text)
        WHERE metadata IS NOT NULL
    """)
    
    # Drop indexes
    op.drop_index('ix_activity_logs_session_id', table_name='activity_logs')
    op.drop_index('ix_activity_logs_status_code', table_name='activity_logs')
    op.drop_index('ix_activity_logs_request_path', table_name='activity_logs')
    op.drop_index('ix_activity_logs_level', table_name='activity_logs')
    op.drop_index('ix_activity_logs_category', table_name='activity_logs')
    op.drop_index('ix_activity_logs_username', table_name='activity_logs')
    op.drop_index('ix_activity_logs_correlation_id', table_name='activity_logs')
    op.drop_index('ix_activity_logs_event_id', table_name='activity_logs')
    
    # Drop new columns
    op.drop_column('activity_logs', 'processed_at')
    op.drop_column('activity_logs', 'application_version')
    op.drop_column('activity_logs', 'environment')
    op.drop_column('activity_logs', 'server_name')
    op.drop_column('activity_logs', 'affected_users_count')
    op.drop_column('activity_logs', 'risk_score')
    op.drop_column('activity_logs', 'tags')
    op.drop_column('activity_logs', 'metadata')
    op.drop_column('activity_logs', 'session_id')
    op.drop_column('activity_logs', 'city')
    op.drop_column('activity_logs', 'country_code')
    op.drop_column('activity_logs', 'response_time_ms')
    op.drop_column('activity_logs', 'request_headers')
    op.drop_column('activity_logs', 'category')
    op.drop_column('activity_logs', 'username')
    op.drop_column('activity_logs', 'correlation_id')
    op.drop_column('activity_logs', 'event_id')
    
    # Revert entity_id back to Integer
    op.alter_column('activity_logs', 'entity_id', 
                   existing_type=sa.String(length=100), 
                   type_=sa.Integer(),
                   existing_nullable=True)