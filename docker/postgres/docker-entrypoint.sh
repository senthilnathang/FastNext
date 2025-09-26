#!/bin/bash
# Custom PostgreSQL entrypoint for FastNext Framework

set -e

# Source the original entrypoint functions
source /usr/local/bin/docker-entrypoint.sh

# Custom initialization function
fastnext_init() {
    echo "FastNext Framework PostgreSQL initialization starting..."
    
    # Set timezone
    echo "Setting timezone to UTC..."
    ln -sf /usr/share/zoneinfo/UTC /etc/localtime
    echo "UTC" > /etc/timezone
    
    # Create log directory
    mkdir -p /var/log/postgresql
    chown postgres:postgres /var/log/postgresql
    
    # Create backup directory
    mkdir -p /var/lib/postgresql/backups
    chown postgres:postgres /var/lib/postgresql/backups
    
    # Apply custom configuration
    if [ -f "/etc/postgresql-custom/postgresql.conf" ]; then
        echo "Applying custom PostgreSQL configuration..."
        cp /etc/postgresql-custom/postgresql.conf /tmp/postgresql-custom.conf
        chown postgres:postgres /tmp/postgresql-custom.conf
    fi
    
    if [ -f "/etc/postgresql-custom/pg_hba.conf" ]; then
        echo "Applying custom pg_hba.conf..."
        cp /etc/postgresql-custom/pg_hba.conf /tmp/pg_hba-custom.conf
        chown postgres:postgres /tmp/pg_hba-custom.conf
    fi
    
    # Set up performance monitoring
    echo "Setting up performance monitoring..."
    
    echo "FastNext Framework PostgreSQL initialization completed."
}

# Custom database ready check
wait_for_db() {
    echo "Waiting for PostgreSQL to be ready..."
    
    while ! pg_isready -h localhost -p 5432 -U postgres; do
        echo "PostgreSQL is not ready yet, waiting..."
        sleep 2
    done
    
    echo "PostgreSQL is ready!"
}

# Performance tuning based on available memory
tune_performance() {
    local total_mem=$(free -m | awk 'NR==2{print $2}')
    local shared_buffers=$((total_mem / 4))
    local effective_cache_size=$((total_mem * 3 / 4))
    local work_mem=$((total_mem / 50))
    
    echo "Auto-tuning PostgreSQL for ${total_mem}MB RAM:"
    echo "  shared_buffers: ${shared_buffers}MB"
    echo "  effective_cache_size: ${effective_cache_size}MB"
    echo "  work_mem: ${work_mem}MB"
    
    # Apply these settings if custom config doesn't exist
    if [ ! -f "/etc/postgresql-custom/postgresql.conf" ]; then
        echo "shared_buffers = ${shared_buffers}MB" >> /tmp/auto-tune.conf
        echo "effective_cache_size = ${effective_cache_size}MB" >> /tmp/auto-tune.conf
        echo "work_mem = ${work_mem}MB" >> /tmp/auto-tune.conf
        chown postgres:postgres /tmp/auto-tune.conf
    fi
}

# Health check function
health_check() {
    pg_isready -h localhost -p 5432 -U postgres
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "Health check passed"
    else
        echo "Health check failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Main execution
main() {
    # Run FastNext initialization
    fastnext_init
    
    # Auto-tune performance if needed
    if [ "${AUTO_TUNE:-true}" = "true" ]; then
        tune_performance
    fi
    
    # If this is the first run, handle database initialization
    if [ "$1" = 'postgres' ] && [ ! -s "$PGDATA/PG_VERSION" ]; then
        echo "First-time PostgreSQL setup detected"
        
        # Initialize the database with custom settings
        docker_setup_env
        docker_create_db_directories
        
        # Run initdb with custom options
        docker_init_database_dir
        
        # Start PostgreSQL temporarily for setup
        docker_temp_server_start
        
        # Create databases and users
        docker_setup_db
        
        # Apply custom configurations
        if [ -f "/tmp/postgresql-custom.conf" ]; then
            echo "include '/tmp/postgresql-custom.conf'" >> "$PGDATA/postgresql.conf"
        fi
        
        if [ -f "/tmp/auto-tune.conf" ]; then
            cat /tmp/auto-tune.conf >> "$PGDATA/postgresql.conf"
        fi
        
        if [ -f "/tmp/pg_hba-custom.conf" ]; then
            cp /tmp/pg_hba-custom.conf "$PGDATA/pg_hba.conf"
        fi
        
        # Stop temporary server
        docker_temp_server_stop
    fi
    
    # Set up health check endpoint
    export PGUSER="${POSTGRES_USER:-postgres}"
    export PGDATABASE="${POSTGRES_DB:-postgres}"
    
    # Start PostgreSQL
    echo "Starting PostgreSQL server..."
    exec docker_process_sql --dbname="$POSTGRES_DB" --username="$POSTGRES_USER" < /dev/null &
    exec postgres "$@"
}

# Handle signals for graceful shutdown
trap 'echo "Received SIGTERM, shutting down gracefully..."; pg_ctl stop -D "$PGDATA" -s -m fast' SIGTERM

# Export functions for external use
export -f health_check
export -f wait_for_db

# Execute main function if this script is run directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi