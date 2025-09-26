-- FastNext Framework Database Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search optimization
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- Create application database if it doesn't exist
SELECT 'CREATE DATABASE fastnext'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fastnext');

-- Connect to the application database
\c fastnext;

-- Create extensions in the application database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create application user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fastnext') THEN
        CREATE ROLE fastnext WITH LOGIN PASSWORD 'fastnext_password';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE fastnext TO fastnext;
GRANT CREATE ON DATABASE fastnext TO fastnext;
GRANT USAGE ON SCHEMA public TO fastnext;
GRANT CREATE ON SCHEMA public TO fastnext;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fastnext;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fastnext;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO fastnext;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fastnext;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fastnext;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO fastnext;

-- Create application schema if needed
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION fastnext;
GRANT ALL ON SCHEMA app TO fastnext;

-- Performance monitoring views
CREATE OR REPLACE VIEW pg_stat_activity_readable AS
SELECT 
    pid,
    usename,
    datname,
    state,
    query_start,
    state_change,
    CASE 
        WHEN state = 'active' THEN now() - query_start
        ELSE null
    END as query_duration,
    LEFT(query, 100) as query_preview
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Grant access to monitoring views
GRANT SELECT ON pg_stat_activity_readable TO fastnext;
GRANT SELECT ON pg_stat_statements TO fastnext;

-- Create maintenance functions
CREATE OR REPLACE FUNCTION maintenance_info() 
RETURNS TABLE(
    table_name text,
    size_pretty text,
    tuple_count bigint,
    dead_tuple_count bigint,
    last_vacuum timestamp with time zone,
    last_analyze timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_pretty,
        n_tup_ins + n_tup_upd as tuple_count,
        n_dead_tup as dead_tuple_count,
        last_vacuum,
        last_analyze
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION maintenance_info() TO fastnext;

-- Log initialization completion
\echo 'FastNext Framework database initialization completed successfully'