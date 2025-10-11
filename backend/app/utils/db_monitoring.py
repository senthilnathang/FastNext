"""
Database Performance Monitoring Utilities
Provides tools for monitoring database performance, connection pool stats, and query analysis
"""
import time
import logging
from typing import Dict, Any, List
from sqlalchemy import text, inspect
from sqlalchemy.pool import QueuePool
from app.db.base import engine
from contextlib import contextmanager
import psutil
import os

logger = logging.getLogger(__name__)


class DatabaseMonitor:
    """Monitor database performance and health"""
    
    @staticmethod
    def get_connection_pool_stats() -> Dict[str, Any]:
        """Get current connection pool statistics"""
        pool = engine.pool
        
        if isinstance(pool, QueuePool):
            return {
                "pool_size": pool.size(),
                "checked_in_connections": pool.checkedin(),
                "checked_out_connections": pool.checkedout(),
                "overflow_connections": pool.overflow(),
                "total_connections": pool.size() + pool.overflow(),
                "max_overflow": engine.pool._max_overflow,
                "pool_timeout": engine.pool._timeout,
                "pool_recycle": engine.pool._recycle
            }
        
        return {"error": "Not using QueuePool"}
    
    @staticmethod
    async def get_database_stats(db) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            # Get database size
            result = db.execute(text("""
                SELECT pg_size_pretty(pg_database_size(current_database())) as size
            """))
            db_size = result.fetchone()[0]
            
            # Get table sizes
            result = db.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
                FROM pg_tables
                WHERE schemaname = 'public'
                ORDER BY size_bytes DESC
                LIMIT 10
            """))
            table_sizes = [
                {
                    "schema": row[0],
                    "table": row[1],
                    "size": row[2],
                    "size_bytes": row[3]
                }
                for row in result.fetchall()
            ]
            
            # Get active connections
            result = db.execute(text("""
                SELECT count(*) FROM pg_stat_activity
                WHERE datname = current_database()
            """))
            active_connections = result.fetchone()[0]
            
            # Get slow queries (if pg_stat_statements is available)
            try:
                result = db.execute(text("""
                    SELECT 
                        query,
                        calls,
                        total_exec_time,
                        mean_exec_time,
                        max_exec_time
                    FROM pg_stat_statements
                    WHERE query NOT LIKE '%pg_stat_statements%'
                    ORDER BY mean_exec_time DESC
                    LIMIT 5
                """))
                slow_queries = [
                    {
                        "query": row[0][:100] + "..." if len(row[0]) > 100 else row[0],
                        "calls": row[1],
                        "total_time_ms": round(row[2], 2),
                        "mean_time_ms": round(row[3], 2),
                        "max_time_ms": round(row[4], 2)
                    }
                    for row in result.fetchall()
                ]
            except Exception:
                slow_queries = []
            
            return {
                "database_size": db_size,
                "active_connections": active_connections,
                "largest_tables": table_sizes,
                "slow_queries": slow_queries
            }
            
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def get_index_usage_stats(db) -> List[Dict[str, Any]]:
        """Get index usage statistics"""
        try:
            result = db.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan as scans,
                    idx_tup_read as tuples_read,
                    idx_tup_fetch as tuples_fetched,
                    pg_size_pretty(pg_relation_size(indexrelid)) as size
                FROM pg_stat_user_indexes
                WHERE schemaname = 'public'
                ORDER BY idx_scan DESC
                LIMIT 20
            """))
            
            return [
                {
                    "schema": row[0],
                    "table": row[1],
                    "index": row[2],
                    "scans": row[3],
                    "tuples_read": row[4],
                    "tuples_fetched": row[5],
                    "size": row[6]
                }
                for row in result.fetchall()
            ]
        except Exception as e:
            logger.error(f"Error getting index stats: {e}")
            return []
    
    @staticmethod
    def get_unused_indexes(db) -> List[Dict[str, Any]]:
        """Identify potentially unused indexes"""
        try:
            result = db.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan,
                    pg_size_pretty(pg_relation_size(indexrelid)) as size
                FROM pg_stat_user_indexes
                WHERE schemaname = 'public'
                AND idx_scan < 10
                AND indexname NOT LIKE '%_pkey'
                ORDER BY pg_relation_size(indexrelid) DESC
            """))
            
            return [
                {
                    "schema": row[0],
                    "table": row[1],
                    "index": row[2],
                    "scans": row[3],
                    "size": row[4],
                    "suggestion": "Consider dropping if truly unused"
                }
                for row in result.fetchall()
            ]
        except Exception as e:
            logger.error(f"Error getting unused indexes: {e}")
            return []
    
    @staticmethod
    def get_cache_hit_ratio(db) -> Dict[str, Any]:
        """Get database cache hit ratio"""
        try:
            result = db.execute(text("""
                SELECT 
                    sum(heap_blks_read) as heap_read,
                    sum(heap_blks_hit) as heap_hit,
                    sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 as ratio
                FROM pg_statio_user_tables
            """))
            
            row = result.fetchone()
            return {
                "heap_blocks_read": row[0] or 0,
                "heap_blocks_hit": row[1] or 0,
                "cache_hit_ratio_percent": round(row[2], 2) if row[2] else 0
            }
        except Exception as e:
            logger.error(f"Error getting cache hit ratio: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def get_table_bloat(db) -> List[Dict[str, Any]]:
        """Identify table bloat (requires administrative access)"""
        try:
            result = db.execute(text("""
                SELECT 
                    current_database(),
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_table_size(schemaname||'.'||tablename)) as size,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_table_size(schemaname||'.'||tablename)) as external_size
                FROM pg_tables
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                LIMIT 10
            """))
            
            return [
                {
                    "database": row[0],
                    "schema": row[1],
                    "table": row[2],
                    "table_size": row[3],
                    "external_size": row[4]
                }
                for row in result.fetchall()
            ]
        except Exception as e:
            logger.error(f"Error getting table bloat: {e}")
            return []


@contextmanager
def query_timer(query_name: str):
    """Context manager to time queries"""
    start_time = time.time()
    try:
        yield
    finally:
        duration = (time.time() - start_time) * 1000  # Convert to milliseconds
        logger.info(f"Query '{query_name}' took {duration:.2f}ms")
        
        # Log slow queries
        if duration > 1000:  # More than 1 second
            logger.warning(f"SLOW QUERY: '{query_name}' took {duration:.2f}ms")


def log_query_performance(func):
    """Decorator to log query performance"""
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            duration = (time.time() - start_time) * 1000
            logger.info(f"Function '{func.__name__}' took {duration:.2f}ms")
            
            if duration > 1000:
                logger.warning(f"SLOW FUNCTION: '{func.__name__}' took {duration:.2f}ms")
    
    return wrapper


def get_system_metrics() -> Dict[str, Any]:
    """Get system-level metrics"""
    process = psutil.Process(os.getpid())
    
    return {
        "cpu_percent": process.cpu_percent(interval=1),
        "memory_mb": process.memory_info().rss / 1024 / 1024,
        "memory_percent": process.memory_percent(),
        "num_threads": process.num_threads(),
        "num_fds": process.num_fds() if hasattr(process, 'num_fds') else None,
        "connections": len(process.connections())
    }


async def generate_performance_report(db) -> Dict[str, Any]:
    """Generate comprehensive performance report"""
    monitor = DatabaseMonitor()
    
    return {
        "timestamp": time.time(),
        "connection_pool": monitor.get_connection_pool_stats(),
        "database": await monitor.get_database_stats(db),
        "cache_hit_ratio": monitor.get_cache_hit_ratio(db),
        "index_usage": monitor.get_index_usage_stats(db),
        "unused_indexes": monitor.get_unused_indexes(db),
        "table_bloat": monitor.get_table_bloat(db),
        "system_metrics": get_system_metrics()
    }
