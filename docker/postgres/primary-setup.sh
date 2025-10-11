#!/bin/bash
# PostgreSQL Primary Server Replication Setup
# Configures the primary database for streaming replication

set -e

echo "Configuring PostgreSQL Primary for Replication..."

# Create replication user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create replication user
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${POSTGRES_REPLICATION_USER:-replicator}') THEN
            CREATE ROLE ${POSTGRES_REPLICATION_USER:-replicator} WITH REPLICATION PASSWORD '${POSTGRES_REPLICATION_PASSWORD}' LOGIN;
        END IF;
    END
    \$\$;

    -- Grant necessary permissions
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_REPLICATION_USER:-replicator};
EOSQL

# Configure postgresql.conf for replication
cat >> ${PGDATA}/postgresql.conf <<EOF

# ============================================================================
# REPLICATION SETTINGS
# ============================================================================

# WAL (Write-Ahead Logging) settings
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 1GB
hot_standby = on

# Synchronous replication (optional, for higher consistency)
# synchronous_commit = on
# synchronous_standby_names = '*'

# Archive settings (for point-in-time recovery)
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/backups/%f && cp %p /var/lib/postgresql/backups/%f'
archive_timeout = 300

# Logging
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'mod'
log_replication_commands = on

# Performance tuning for primary
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

EOF

# Configure pg_hba.conf to allow replication connections
echo "host replication ${POSTGRES_REPLICATION_USER:-replicator} 0.0.0.0/0 md5" >> ${PGDATA}/pg_hba.conf
echo "host replication ${POSTGRES_REPLICATION_USER:-replicator} ::0/0 md5" >> ${PGDATA}/pg_hba.conf

# Allow replica connections to the database
echo "host ${POSTGRES_DB} ${POSTGRES_USER} 172.20.0.0/16 md5" >> ${PGDATA}/pg_hba.conf

# Create replication slots for each expected replica
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create replication slots
    SELECT pg_create_physical_replication_slot('replica_1_slot') WHERE NOT EXISTS (
        SELECT 1 FROM pg_replication_slots WHERE slot_name = 'replica_1_slot'
    );

    SELECT pg_create_physical_replication_slot('replica_2_slot') WHERE NOT EXISTS (
        SELECT 1 FROM pg_replication_slots WHERE slot_name = 'replica_2_slot'
    );
EOSQL

# Create backup directory
mkdir -p /var/lib/postgresql/backups
chown -R postgres:postgres /var/lib/postgresql/backups

echo "Primary database replication setup complete!"
echo "Replication user: ${POSTGRES_REPLICATION_USER:-replicator}"
echo "Replication slots created: replica_1_slot, replica_2_slot"
echo "WAL archiving enabled to: /var/lib/postgresql/backups"
