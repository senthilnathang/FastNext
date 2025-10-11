"""
SQLAlchemy Query Cache Integration
Automatic caching for SQLAlchemy queries with smart invalidation
"""

import hashlib
import json
import logging
from typing import Any, Optional, List, Set
from functools import wraps

from sqlalchemy import event
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from sqlalchemy.sql import Select

from app.core.cache_optimization import (
    query_cache_manager,
    invalidation_strategy,
    CacheStrategy
)

logger = logging.getLogger(__name__)


class QueryCacheIntegration:
    """
    Integrates query caching with SQLAlchemy ORM

    Features:
    - Automatic query result caching
    - Smart invalidation on data changes
    - Per-table cache invalidation
    - Query hash generation
    """

    def __init__(self):
        self.enabled = True
        self.default_ttl = CacheStrategy.DATABASE_QUERY_TTL
        self.cache_stats = {
            'queries_cached': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'invalidations': 0
        }

    def enable(self):
        """Enable query caching"""
        self.enabled = True
        logger.info("Query cache enabled")

    def disable(self):
        """Disable query caching"""
        self.enabled = False
        logger.info("Query cache disabled")

    def generate_query_hash(self, query_str: str, params: Optional[dict] = None) -> str:
        """Generate unique hash for a query"""
        query_normalized = ' '.join(query_str.lower().split())
        params_str = json.dumps(params or {}, sort_keys=True, default=str)

        hash_input = f"{query_normalized}|{params_str}"
        return hashlib.sha256(hash_input.encode()).hexdigest()

    async def cache_query_result(
        self,
        query_str: str,
        result: Any,
        params: Optional[dict] = None,
        ttl: Optional[int] = None,
        tags: Optional[Set[str]] = None
    ):
        """Cache a query result"""
        if not self.enabled:
            return

        ttl = ttl or self.default_ttl

        await query_cache_manager.cache_query_result(
            query=query_str,
            result=result,
            params=params,
            ttl=ttl,
            tags=tags
        )

        self.cache_stats['queries_cached'] += 1

    async def get_cached_query_result(
        self,
        query_str: str,
        params: Optional[dict] = None
    ) -> Optional[Any]:
        """Get cached query result"""
        if not self.enabled:
            return None

        result = await query_cache_manager.get_cached_query_result(
            query=query_str,
            params=params
        )

        if result is not None:
            self.cache_stats['cache_hits'] += 1
        else:
            self.cache_stats['cache_misses'] += 1

        return result

    async def invalidate_table_cache(self, table_name: str):
        """Invalidate all cached queries for a table"""
        invalidated = await invalidation_strategy.invalidate_table_related(table_name)
        self.cache_stats['invalidations'] += invalidated
        return invalidated


# Global instance
query_cache_integration = QueryCacheIntegration()


def setup_query_cache_events(engine: Engine):
    """
    Set up SQLAlchemy event listeners for automatic cache invalidation

    This function should be called after engine creation to enable
    automatic cache invalidation on INSERT, UPDATE, DELETE operations.
    """

    @event.listens_for(engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Log SQL queries for debugging"""
        if query_cache_integration.enabled:
            logger.debug(f"Executing query: {statement[:100]}...")

    @event.listens_for(engine, "after_cursor_execute")
    async def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Invalidate cache after data modification queries"""
        if not query_cache_integration.enabled:
            return

        statement_lower = statement.lower().strip()

        # Check if it's a data modification query
        if any(statement_lower.startswith(cmd) for cmd in ['insert', 'update', 'delete']):
            # Extract table name (basic implementation)
            tables = query_cache_manager.extract_tables_from_query(statement)

            # Invalidate cache for affected tables
            for table in tables:
                await query_cache_integration.invalidate_table_cache(table)
                logger.debug(f"Invalidated cache for table: {table}")

    logger.info("✅ Query cache event listeners registered")


class CachedQuery:
    """
    Context manager for cached queries

    Usage:
        async with CachedQuery(db, ttl=600, tags={'users'}) as cache:
            result = await cache.execute(
                db.query(User).filter(User.is_active == True)
            )
    """

    def __init__(
        self,
        db: Session,
        ttl: int = CacheStrategy.DATABASE_QUERY_TTL,
        tags: Optional[Set[str]] = None,
        bypass_cache: bool = False
    ):
        self.db = db
        self.ttl = ttl
        self.tags = tags or set()
        self.bypass_cache = bypass_cache

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    async def execute(self, query: Any) -> Any:
        """Execute a query with caching"""
        if self.bypass_cache:
            return query.all()

        # Generate query string and hash
        try:
            query_str = str(query.statement.compile(compile_kwargs={"literal_binds": True}))
        except Exception:
            # Fallback if literal_binds fails
            query_str = str(query.statement)

        # Try to get from cache
        cached_result = await query_cache_integration.get_cached_query_result(query_str)
        if cached_result is not None:
            logger.debug(f"🎯 Query cache hit")
            return cached_result

        # Execute query
        result = query.all()

        # Cache result
        await query_cache_integration.cache_query_result(
            query_str=query_str,
            result=result,
            ttl=self.ttl,
            tags=self.tags
        )

        return result

    async def scalar(self, query: Any) -> Any:
        """Execute a scalar query with caching"""
        if self.bypass_cache:
            return query.scalar()

        try:
            query_str = str(query.statement.compile(compile_kwargs={"literal_binds": True}))
        except Exception:
            query_str = str(query.statement)

        # Try cache
        cached_result = await query_cache_integration.get_cached_query_result(query_str)
        if cached_result is not None:
            return cached_result

        # Execute
        result = query.scalar()

        # Cache
        await query_cache_integration.cache_query_result(
            query_str=query_str,
            result=result,
            ttl=self.ttl,
            tags=self.tags
        )

        return result


def cached_db_query(
    ttl: int = CacheStrategy.DATABASE_QUERY_TTL,
    tags: Optional[Set[str]] = None,
    bypass_on: Optional[callable] = None
):
    """
    Decorator for caching database query results

    Usage:
        @cached_db_query(ttl=600, tags={'users', 'active'})
        def get_active_users(db: Session):
            return db.query(User).filter(User.is_active == True).all()
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Check bypass condition
            if bypass_on and bypass_on():
                return await func(*args, **kwargs)

            # Generate cache key from function signature
            func_name = f"{func.__module__}.{func.__name__}"
            args_str = str(args)
            kwargs_str = str(sorted(kwargs.items()))
            cache_key = f"db_query:{func_name}:{hashlib.md5((args_str + kwargs_str).encode()).hexdigest()}"

            # Try cache
            from app.core.redis_config import cache
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"🎯 Cached DB query hit: {func_name}")
                query_cache_integration.cache_stats['cache_hits'] += 1
                return cached_result

            # Execute function
            result = await func(*args, **kwargs)

            # Cache result
            if tags:
                await invalidation_strategy.register_cache_entry(cache_key, tags)

            await cache.set(cache_key, result, ttl)
            query_cache_integration.cache_stats['queries_cached'] += 1

            logger.debug(f"📦 Cached DB query result: {func_name}")
            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            """Sync wrapper for non-async functions"""
            # For sync functions, execute directly (can't use async cache easily)
            result = func(*args, **kwargs)
            logger.debug(f"⚠️  Sync DB query (no cache): {func.__name__}")
            return result

        # Return appropriate wrapper
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


def get_query_cache_stats() -> dict:
    """Get query cache statistics"""
    stats = query_cache_integration.cache_stats.copy()

    # Calculate hit ratio
    total_queries = stats['cache_hits'] + stats['cache_misses']
    stats['hit_ratio'] = (
        stats['cache_hits'] / total_queries * 100
        if total_queries > 0
        else 0
    )

    return stats
