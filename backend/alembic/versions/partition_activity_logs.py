"""Partition activity_logs table by date for better performance

Revision ID: perf_002
Revises: perf_001
Create Date: 2025-10-11

This migration converts activity_logs to a partitioned table
based on created_at date for improved query performance on large datasets.
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timedelta


# revision identifiers
revision = 'perf_002'
down_revision = 'perf_001'
branch_labels = None
depends_on = None


def upgrade():
    """
    Convert activity_logs to partitioned table by created_at (monthly partitions)
    
    Note: This is a PostgreSQL-specific operation.
    For MySQL or other databases, skip or implement alternative strategies.
    """
    
    # Check if we're using PostgreSQL
    conn = op.get_bind()
    if conn.dialect.name != 'postgresql':
        print("Skipping partitioning - PostgreSQL only")
        return
    
    # Step 1: Rename existing table
    op.rename_table('activity_logs', 'activity_logs_old')
    
    # Step 2: Create new partitioned table
    op.execute("""
        CREATE TABLE activity_logs (
            id SERIAL,
            event_id VARCHAR(36),
            correlation_id VARCHAR(36),
            user_id INTEGER,
            username VARCHAR(100),
            category VARCHAR(50) NOT NULL,
            action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(100) NOT NULL,
            entity_id VARCHAR(100),
            entity_name VARCHAR(255),
            description TEXT NOT NULL,
            level VARCHAR(20) NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            request_method VARCHAR(10),
            request_path VARCHAR(500),
            request_headers JSONB,
            status_code INTEGER,
            response_time_ms INTEGER,
            country_code VARCHAR(2),
            city VARCHAR(100),
            session_id VARCHAR(100),
            metadata JSONB,
            tags JSONB,
            risk_score INTEGER,
            affected_users_count INTEGER,
            server_name VARCHAR(100),
            environment VARCHAR(20),
            application_version VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            processed_at TIMESTAMP WITH TIME ZONE,
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);
    """)
    
    # Step 3: Create partitions for past 6 months and future 6 months
    current_date = datetime.now()
    start_date = current_date - timedelta(days=180)  # 6 months ago
    
    for month_offset in range(-6, 7):  # -6 to +6 months
        partition_date = (current_date.replace(day=1) + timedelta(days=32*month_offset)).replace(day=1)
        next_partition_date = (partition_date + timedelta(days=32)).replace(day=1)
        
        partition_name = f"activity_logs_{partition_date.strftime('%Y_%m')}"
        
        op.execute(f"""
            CREATE TABLE {partition_name} PARTITION OF activity_logs
            FOR VALUES FROM ('{partition_date.strftime('%Y-%m-%d')}')
            TO ('{next_partition_date.strftime('%Y-%m-%d')}');
        """)
    
    # Step 4: Create indexes on partitioned table
    op.execute("""
        CREATE INDEX idx_activity_logs_part_created_at ON activity_logs(created_at DESC);
        CREATE INDEX idx_activity_logs_part_user_id ON activity_logs(user_id, created_at DESC);
        CREATE INDEX idx_activity_logs_part_category ON activity_logs(category, action, created_at DESC);
        CREATE INDEX idx_activity_logs_part_entity ON activity_logs(entity_type, entity_id);
        CREATE INDEX idx_activity_logs_part_level ON activity_logs(level, created_at DESC);
        CREATE INDEX idx_activity_logs_part_event_id ON activity_logs(event_id);
        CREATE INDEX idx_activity_logs_part_correlation_id ON activity_logs(correlation_id);
    """)
    
    # Step 5: Copy data from old table to new partitioned table
    op.execute("""
        INSERT INTO activity_logs 
        SELECT * FROM activity_logs_old
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 months';
    """)
    
    # Step 6: Create foreign key constraints
    op.execute("""
        ALTER TABLE activity_logs 
        ADD CONSTRAINT fk_activity_logs_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id);
    """)
    
    # Step 7: Archive old data (keep old table for now)
    # In production, you might want to export this to cold storage
    # op.drop_table('activity_logs_old')
    # For now, we keep it for safety
    
    print("Activity logs table partitioned successfully")
    print("Old table renamed to activity_logs_old (can be dropped after verification)")


def downgrade():
    """Revert partitioning"""
    
    conn = op.get_bind()
    if conn.dialect.name != 'postgresql':
        return
    
    # Drop partitioned table
    op.execute("DROP TABLE IF EXISTS activity_logs CASCADE;")
    
    # Restore old table
    op.rename_table('activity_logs_old', 'activity_logs')
