"""
Multi-Level Caching Optimization for FastNext Framework
Implements intelligent caching layers: Browser -> CDN -> Redis -> Database
"""

import hashlib
import json
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Set, TypeVar

from app.core.redis_config import CacheStrategy, cache, redis_manager
from app.db.session import get_db
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CacheLevel(Enum):
    """Cache hierarchy levels"""

    BROWSER = "browser"  # L1: Browser/Service Worker (fastest, smallest)
    CDN = "cdn"  # L2: CDN Edge Locations
    REDIS = "redis"  # L3: Redis In-Memory
    DATABASE = "database"  # L4: Database Query Cache


@dataclass
class CachePolicy:
    """Caching policy configuration"""

    ttl: int  # Time to live in seconds
    cache_levels: List[CacheLevel]  # Which cache levels to use
    invalidation_tags: Set[str]  # Tags for invalidation
    vary_by: List[str]  # Vary cache by these factors (user, role, etc.)
    stale_while_revalidate: int = 0  # Serve stale for N seconds while refreshing
    stale_if_error: int = 0  # Serve stale for N seconds if error

    @staticmethod
    def browser_cache(ttl: int = 300) -> "CachePolicy":
        """Browser-only cache policy"""
        return CachePolicy(
            ttl=ttl,
            cache_levels=[CacheLevel.BROWSER],
            invalidation_tags=set(),
            vary_by=["user"],
            stale_while_revalidate=60,
        )

    @staticmethod
    def cdn_cache(ttl: int = 3600) -> "CachePolicy":
        """CDN + Browser cache policy"""
        return CachePolicy(
            ttl=ttl,
            cache_levels=[CacheLevel.BROWSER, CacheLevel.CDN],
            invalidation_tags=set(),
            vary_by=[],
            stale_while_revalidate=300,
        )

    @staticmethod
    def redis_cache(ttl: int = 600, tags: Set[str] = None) -> "CachePolicy":
        """Redis + Browser cache policy"""
        return CachePolicy(
            ttl=ttl,
            cache_levels=[CacheLevel.BROWSER, CacheLevel.REDIS],
            invalidation_tags=tags or set(),
            vary_by=["user"],
            stale_while_revalidate=30,
        )

    @staticmethod
    def full_cache(ttl: int = 1800, tags: Set[str] = None) -> "CachePolicy":
        """Full multi-level cache policy"""
        return CachePolicy(
            ttl=ttl,
            cache_levels=[CacheLevel.BROWSER, CacheLevel.CDN, CacheLevel.REDIS],
            invalidation_tags=tags or set(),
            vary_by=["user"],
            stale_while_revalidate=300,
            stale_if_error=3600,
        )


class CacheInvalidationStrategy:
    """Smart cache invalidation strategies"""

    def __init__(self):
        self.dependency_graph: Dict[str, Set[str]] = {}  # tag -> dependent keys
        self.tag_registry: Dict[str, Set[str]] = {}  # key -> tags

    async def register_cache_entry(self, key: str, tags: Set[str]):
        """Register a cache entry with its invalidation tags"""
        self.tag_registry[key] = tags

        for tag in tags:
            if tag not in self.dependency_graph:
                self.dependency_graph[tag] = set()
            self.dependency_graph[tag].add(key)

        # Store in Redis for distributed invalidation
        await cache.set(
            f"cache_tags:{key}", list(tags), ttl=CacheStrategy.LONG_TERM_TTL
        )

    async def invalidate_by_tags(self, tags: Set[str]) -> int:
        """Invalidate all cache entries matching any of the tags"""
        invalidated = 0

        for tag in tags:
            dependent_keys = self.dependency_graph.get(tag, set())

            for key in dependent_keys:
                if await cache.delete(key):
                    invalidated += 1
                    logger.debug(f"Invalidated cache key: {key} (tag: {tag})")

                # Clean up registry
                if key in self.tag_registry:
                    del self.tag_registry[key]

            # Clear dependency graph
            if tag in self.dependency_graph:
                del self.dependency_graph[tag]

        logger.info(f"🗑️  Invalidated {invalidated} cache entries for tags: {tags}")
        return invalidated

    async def invalidate_by_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching a pattern"""
        return await cache.clear_pattern(pattern)

    async def invalidate_table_related(self, table_name: str) -> int:
        """Invalidate all cache entries related to a database table"""
        tags = {f"table:{table_name}", f"model:{table_name}"}
        return await self.invalidate_by_tags(tags)


# Global invalidation strategy
invalidation_strategy = CacheInvalidationStrategy()


class QueryCacheManager:
    """Advanced database query result caching with intelligent invalidation"""

    def __init__(self):
        self.query_stats: Dict[str, Dict[str, Any]] = {}

    def generate_query_hash(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate a unique hash for a query and its parameters"""
        query_normalized = query.strip().lower()
        params_str = json.dumps(params or {}, sort_keys=True, default=str)

        hash_input = f"{query_normalized}|{params_str}"
        return hashlib.sha256(hash_input.encode()).hexdigest()

    def extract_tables_from_query(self, query: str) -> Set[str]:
        """Extract table names from SQL query (basic implementation)"""
        tables = set()

        # Simple regex-based extraction (could be improved with SQL parser)
        query_lower = query.lower()

        # Extract from FROM clause
        if "from" in query_lower:
            parts = query_lower.split("from")[1].split("where")[0].split("join")
            for part in parts:
                tokens = part.strip().split()
                if tokens:
                    table_name = tokens[0].replace(",", "").strip()
                    if table_name and not table_name.startswith("("):
                        tables.add(table_name)

        # Extract from JOIN clauses
        if "join" in query_lower:
            join_parts = query_lower.split("join")
            for part in join_parts[1:]:
                tokens = part.strip().split()
                if tokens:
                    table_name = tokens[0].strip()
                    if table_name:
                        tables.add(table_name)

        return tables

    async def cache_query_result(
        self,
        query: str,
        result: Any,
        params: Optional[Dict[str, Any]] = None,
        ttl: int = CacheStrategy.DATABASE_QUERY_TTL,
        tags: Optional[Set[str]] = None,
    ) -> bool:
        """Cache a database query result with automatic tag generation"""
        query_hash = self.generate_query_hash(query, params)
        cache_key = f"query:{query_hash}"

        # Auto-generate tags from query
        if tags is None:
            tags = set()

        # Add table tags
        tables = self.extract_tables_from_query(query)
        for table in tables:
            tags.add(f"table:{table}")

        # Register for invalidation
        await invalidation_strategy.register_cache_entry(cache_key, tags)

        # Cache the result
        success = await cache.set(cache_key, result, ttl)

        if success:
            # Track query stats
            self.query_stats[query_hash] = {
                "query": query[:100] + "..." if len(query) > 100 else query,
                "cache_key": cache_key,
                "cached_at": time.time(),
                "ttl": ttl,
                "tags": list(tags),
                "hit_count": 0,
            }
            logger.debug(f"📦 Cached query result: {cache_key[:16]}... (TTL: {ttl}s)")

        return success

    async def get_cached_query_result(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> Optional[Any]:
        """Retrieve cached query result"""
        query_hash = self.generate_query_hash(query, params)
        cache_key = f"query:{query_hash}"

        result = await cache.get(cache_key)

        if result is not None:
            # Update stats
            if query_hash in self.query_stats:
                self.query_stats[query_hash]["hit_count"] += 1

            logger.debug(f"🎯 Query cache hit: {cache_key[:16]}...")

        return result

    async def invalidate_query_cache(
        self,
        query: Optional[str] = None,
        tables: Optional[Set[str]] = None,
        tags: Optional[Set[str]] = None,
    ) -> int:
        """Invalidate cached queries by query, tables, or tags"""
        if query:
            query_hash = self.generate_query_hash(query)
            cache_key = f"query:{query_hash}"
            return 1 if await cache.delete(cache_key) else 0

        if tables:
            invalidation_tags = {f"table:{table}" for table in tables}
            return await invalidation_strategy.invalidate_by_tags(invalidation_tags)

        if tags:
            return await invalidation_strategy.invalidate_by_tags(tags)

        return 0

    def get_stats(self) -> Dict[str, Any]:
        """Get query cache statistics"""
        total_queries = len(self.query_stats)
        total_hits = sum(stat["hit_count"] for stat in self.query_stats.values())

        # Most cached queries
        top_queries = sorted(
            self.query_stats.values(), key=lambda x: x["hit_count"], reverse=True
        )[:10]

        return {
            "total_cached_queries": total_queries,
            "total_cache_hits": total_hits,
            "top_cached_queries": top_queries,
            "avg_hits_per_query": (
                total_hits / total_queries if total_queries > 0 else 0
            ),
        }


# Global query cache manager
query_cache_manager = QueryCacheManager()


def cached_query(
    ttl: int = CacheStrategy.DATABASE_QUERY_TTL,
    tags: Optional[Set[str]] = None,
    bypass_on: Optional[Callable[[], bool]] = None,
):
    """
    Decorator for caching database query results

    Usage:
        @cached_query(ttl=600, tags={'users', 'active'})
        async def get_active_users(db: Session):
            return db.query(User).filter(User.is_active == True).all()
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Check bypass condition
            if bypass_on and bypass_on():
                return await func(*args, **kwargs)

            # Generate cache key from function and arguments
            func_name = f"{func.__module__}.{func.__name__}"
            args_hash = hashlib.md5(str(args).encode()).hexdigest()[:8]
            kwargs_hash = hashlib.md5(str(sorted(kwargs.items())).encode()).hexdigest()[
                :8
            ]
            cache_key = f"query_func:{func_name}:{args_hash}:{kwargs_hash}"

            # Try to get from cache
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"🎯 Cached query function hit: {func_name}")
                return cached_result

            # Execute function
            result = await func(*args, **kwargs)

            # Cache result
            if tags:
                await invalidation_strategy.register_cache_entry(cache_key, tags)

            await cache.set(cache_key, result, ttl)
            logger.debug(f"📦 Cached query function result: {func_name}")

            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            """Synchronous wrapper for non-async functions"""
            # Generate cache key
            func_name = f"{func.__module__}.{func.__name__}"
            args_hash = hashlib.md5(str(args).encode()).hexdigest()[:8]
            kwargs_hash = hashlib.md5(str(sorted(kwargs.items())).encode()).hexdigest()[
                :8
            ]

            # For sync functions, we can't use async cache
            # Execute function directly
            result = func(*args, **kwargs)

            logger.debug(f"⚠️  Sync query function (no cache): {func_name}")
            return result

        # Return appropriate wrapper
        import asyncio

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


class CacheWarmingService:
    """Service for proactively warming caches"""

    def __init__(self):
        self.warming_jobs: Dict[str, Dict[str, Any]] = {}

    async def warm_critical_queries(self, db: Session):
        """Warm cache with critical frequently-accessed queries"""
        logger.info("🔥 Starting cache warming for critical queries...")

        warmed = 0

        # Example: Warm active users count
        try:
            from app.models.user import User

            query = "SELECT COUNT(*) FROM users WHERE is_active = true"
            result = db.execute(text(query)).scalar()

            await query_cache_manager.cache_query_result(
                query=query,
                result=result,
                ttl=CacheStrategy.USER_CACHE_TTL,
                tags={"table:users", "count", "active_users"},
            )
            warmed += 1
        except Exception as e:
            logger.error(f"Error warming active users count: {e}")

        # Example: Warm recent activity logs
        try:
            query = """
                SELECT * FROM activity_logs
                WHERE created_at >= NOW() - INTERVAL '1 hour'
                ORDER BY created_at DESC
                LIMIT 100
            """
            result = db.execute(text(query)).fetchall()

            await query_cache_manager.cache_query_result(
                query=query,
                result=[dict(row._mapping) for row in result],
                ttl=300,  # 5 minutes for recent data
                tags={"table:activity_logs", "recent"},
            )
            warmed += 1
        except Exception as e:
            logger.error(f"Error warming recent activity logs: {e}")

        logger.info(f"✅ Cache warming complete: {warmed} queries warmed")
        return warmed

    async def schedule_cache_warming(
        self, job_name: str, warming_func: Callable, interval_seconds: int = 300
    ):
        """Schedule periodic cache warming"""
        self.warming_jobs[job_name] = {
            "function": warming_func,
            "interval": interval_seconds,
            "last_run": None,
            "next_run": time.time() + interval_seconds,
        }

        logger.info(
            f"📅 Scheduled cache warming job: {job_name} (every {interval_seconds}s)"
        )


# Global cache warming service
cache_warming_service = CacheWarmingService()


def get_cache_control_headers(policy: CachePolicy) -> Dict[str, str]:
    """Generate HTTP Cache-Control headers based on cache policy"""
    headers = {}

    # Cache-Control header
    cache_directives = []

    if CacheLevel.BROWSER in policy.cache_levels:
        cache_directives.append("public")
        cache_directives.append(f"max-age={policy.ttl}")
    else:
        cache_directives.append("private")

    if policy.stale_while_revalidate > 0:
        cache_directives.append(
            f"stale-while-revalidate={policy.stale_while_revalidate}"
        )

    if policy.stale_if_error > 0:
        cache_directives.append(f"stale-if-error={policy.stale_if_error}")

    headers["Cache-Control"] = ", ".join(cache_directives)

    # Vary header
    if policy.vary_by:
        vary_headers = []
        if "user" in policy.vary_by:
            vary_headers.append("Authorization")
        if "role" in policy.vary_by:
            vary_headers.append("X-User-Role")

        if vary_headers:
            headers["Vary"] = ", ".join(vary_headers)

    # CDN-specific headers
    if CacheLevel.CDN in policy.cache_levels:
        headers["CDN-Cache-Control"] = f"public, max-age={policy.ttl}"
        headers["Surrogate-Control"] = f"max-age={policy.ttl}"

    return headers


async def get_cache_statistics() -> Dict[str, Any]:
    """Get comprehensive cache statistics across all levels"""
    redis_stats = await cache.get_stats()
    query_stats = query_cache_manager.get_stats()

    return {
        "redis": redis_stats,
        "query_cache": query_stats,
        "invalidation": {
            "registered_tags": len(invalidation_strategy.dependency_graph),
            "tracked_keys": len(invalidation_strategy.tag_registry),
        },
        "warming": {"scheduled_jobs": len(cache_warming_service.warming_jobs)},
    }
