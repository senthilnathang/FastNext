#!/bin/bash
# PostgreSQL backup script for FastNext Framework

set -e

# Configuration
BACKUP_DIR="/var/lib/postgresql/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Database connection parameters
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-fastnext}
DB_USER=${POSTGRES_USER:-postgres}

echo "Starting backup of database $DB_NAME at $(date)"

# Full database backup
BACKUP_FILE="$BACKUP_DIR/fastnext_full_backup_$TIMESTAMP.sql"
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
    --verbose \
    --format=custom \
    --compress=9 \
    --file="$BACKUP_FILE.backup"

# Also create a plain SQL backup for easier inspection
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
    --verbose \
    --format=plain \
    --file="$BACKUP_FILE"

# Compress the plain SQL backup
gzip "$BACKUP_FILE"

echo "Backup completed: $BACKUP_FILE.backup and $BACKUP_FILE.gz"

# Schema-only backup
SCHEMA_BACKUP="$BACKUP_DIR/fastnext_schema_$TIMESTAMP.sql"
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
    --schema-only \
    --verbose \
    --file="$SCHEMA_BACKUP"

gzip "$SCHEMA_BACKUP"
echo "Schema backup completed: $SCHEMA_BACKUP.gz"

# Data-only backup
DATA_BACKUP="$BACKUP_DIR/fastnext_data_$TIMESTAMP.sql"
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
    --data-only \
    --verbose \
    --file="$DATA_BACKUP"

gzip "$DATA_BACKUP"
echo "Data backup completed: $DATA_BACKUP.gz"

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "fastnext_*" -type f -mtime +$RETENTION_DAYS -delete

# List current backups
echo "Current backups:"
ls -lh $BACKUP_DIR/fastnext_*

echo "Backup process completed at $(date)"

# Optional: Upload to cloud storage
if [ ! -z "$S3_BUCKET" ]; then
    echo "Uploading to S3 bucket: $S3_BUCKET"
    aws s3 cp "$BACKUP_FILE.backup" "s3://$S3_BUCKET/postgres-backups/"
    aws s3 cp "$BACKUP_FILE.gz" "s3://$S3_BUCKET/postgres-backups/"
fi
