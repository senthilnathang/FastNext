"""Partition audit_trail table by date for better performance

Revision ID: perf_003
Revises: perf_002
Create Date: 2025-10-14

This migration converts audit_trail to a partitioned table
based on created_at date for improved query performance on large datasets.
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timedelta


# revision identifiers
revision = 'perf_003'
down_revision = 'perf_002'
branch_labels = None
depends_on = None


def upgrade():
    """
    Convert audit_trail to partitioned table by created_at (monthly partitions)

    Note: This is a PostgreSQL-specific operation.
    For MySQL or other databases, skip or implement alternative strategies.
    """

    # Check if we're using PostgreSQL
    conn = op.get_bind()
    if conn.dialect.name != 'postgresql':
        print("Skipping partitioning - PostgreSQL only")
        return

    # Step 1: Rename existing table
    op.rename_table('audit_trails', 'audit_trails_old')

    # Step 2: Create new partitioned table
    op.execute("""
        CREATE TABLE audit_trails (
            id SERIAL,
            user_id INTEGER,
            entity_type VARCHAR(100) NOT NULL,
            entity_id INTEGER NOT NULL,
            entity_name VARCHAR(255),
            operation VARCHAR(50) NOT NULL,
            old_values TEXT,
            new_values TEXT,
            changed_fields TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            session_id VARCHAR(255),
            reason TEXT,
            extra_data TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);
    """)

    # Step 3: Create partitions for past 6 months and future 6 months
    current_date = datetime.now()
    start_date = current_date - timedelta(days=180)  # 6 months ago

    for month_offset in range(-6, 7):  # -6 to +6 months
        partition_date = (current_date.replace(day=1) + timedelta(days=32*month_offset)).replace(day=1)
        next_partition_date = (partition_date + timedelta(days=32)).replace(day=1)

        partition_name = f"audit_trails_{partition_date.strftime('%Y_%m')}"

        op.execute(f"""
            CREATE TABLE {partition_name} PARTITION OF audit_trails
            FOR VALUES FROM ('{partition_date.strftime('%Y-%m-%d')}')
            TO ('{next_partition_date.strftime('%Y-%m-%d')}');
        """)

    # Step 4: Create indexes on partitioned table
    op.execute("""
        CREATE INDEX idx_audit_trails_part_created_at ON audit_trails(created_at DESC);
        CREATE INDEX idx_audit_trails_part_user_id ON audit_trails(user_id, created_at DESC);
        CREATE INDEX idx_audit_trails_part_entity ON audit_trails(entity_type, entity_id);
        CREATE INDEX idx_audit_trails_part_operation ON audit_trails(operation, created_at DESC);
    """)

    # Step 5: Copy data from old table to new partitioned table
    op.execute("""
        INSERT INTO audit_trails
        SELECT * FROM audit_trails_old
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 months';
    """)

    # Step 6: Create foreign key constraints
    op.execute("""
        ALTER TABLE audit_trails
        ADD CONSTRAINT fk_audit_trails_user_id
        FOREIGN KEY (user_id) REFERENCES users(id);
    """)

    # Step 7: Archive old data (keep old table for now)
    # In production, you might want to export this to cold storage
    # op.drop_table('audit_trails_old')
    # For now, we keep it for safety

    print("Audit trails table partitioned successfully")
    print("Old table renamed to audit_trails_old (can be dropped after verification)")


def downgrade():
    """Revert partitioning"""

    conn = op.get_bind()
    if conn.dialect.name != 'postgresql':
        return

    # Drop partitioned table
    op.execute("DROP TABLE IF EXISTS audit_trails CASCADE;")

    # Restore old table
    op.rename_table('audit_trails_old', 'audit_trails')