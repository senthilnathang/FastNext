"""
Redis configuration and connection management for FastNext Framework
"""

import asyncio
import json
import logging
import pickle
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Dict, List, Optional, Union

import redis
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisConnectionManager:
    """Manages Redis connections with connection pooling and retry logic"""

    def __init__(self):
        self.redis_pool: Optional[aioredis.ConnectionPool] = None
        self.sync_redis: Optional[redis.Redis] = None
        self._connected = False

    async def connect(self) -> None:
        """Initialize Redis connections"""
        try:
            # Async Redis connection pool
            self.redis_pool = aioredis.ConnectionPool.from_url(
                settings.REDIS_URL,
                max_connections=20,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30,
                encoding="utf-8",
                decode_responses=True,
            )

            # Sync Redis connection for synchronous operations
            self.sync_redis = redis.from_url(
                settings.REDIS_URL,
                max_connections=10,
                retry_on_timeout=True,
                socket_keepalive=True,
                decode_responses=True,
            )

            # Test connections
            async with aioredis.Redis(connection_pool=self.redis_pool) as redis_client:
                await redis_client.ping()

            self.sync_redis.ping()

            self._connected = True
            logger.info("✅ Redis connections established successfully")

        except Exception as e:
            logger.error(f"❌ Failed to connect to Redis: {e}")
            self._connected = False
            raise

    async def disconnect(self) -> None:
        """Close Redis connections"""
        try:
            if self.redis_pool:
                await self.redis_pool.disconnect()
            if self.sync_redis:
                self.sync_redis.close()
            self._connected = False
            logger.info("✅ Redis connections closed")
        except Exception as e:
            logger.error(f"❌ Error closing Redis connections: {e}")

    @asynccontextmanager
    async def get_redis(self):
        """Get async Redis client with connection pooling"""
        if not self._connected:
            await self.connect()

        redis_client = aioredis.Redis(connection_pool=self.redis_pool)
        try:
            yield redis_client
        finally:
            await redis_client.close()

    def get_sync_redis(self) -> redis.Redis:
        """Get synchronous Redis client"""
        if not self.sync_redis or not self._connected:
            raise RuntimeError("Redis not connected. Call connect() first.")
        return self.sync_redis

    @property
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        return self._connected


# Global Redis connection manager
redis_manager = RedisConnectionManager()


class CacheStrategy:
    """Different caching strategies for various data types"""

    # Cache TTL configurations (in seconds)
    USER_CACHE_TTL = 3600  # 1 hour
    SESSION_CACHE_TTL = 86400  # 24 hours
    API_RESPONSE_TTL = 300  # 5 minutes
    DATABASE_QUERY_TTL = 1800  # 30 minutes
    STATIC_DATA_TTL = 7200  # 2 hours
    SHORT_TERM_TTL = 60  # 1 minute
    LONG_TERM_TTL = 86400 * 7  # 1 week


class RedisCache:
    """High-level Redis caching interface with JSON and pickle serialization"""

    def __init__(self):
        self.manager = redis_manager

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        json_serialize: bool = True,
    ) -> bool:
        """Set a value in cache with optional TTL"""
        try:
            async with self.manager.get_redis() as redis_client:
                # Serialize value
                if json_serialize:
                    try:
                        serialized_value = json.dumps(value, default=str)
                    except (TypeError, ValueError) as e:
                        # Check if the error is specifically about bytes serialization
                        if "bytes" in str(e).lower() or "not JSON serializable" in str(
                            e
                        ):
                            logger.debug(
                                f"Using pickle serialization for bytes data in key: {key}"
                            )
                        # Fallback to pickle for complex objects
                        serialized_value = pickle.dumps(value)
                        json_serialize = False
                else:
                    serialized_value = pickle.dumps(value)

                # Store with metadata
                cache_data = {
                    "value": serialized_value,
                    "json_serialized": json_serialize,
                    "timestamp": datetime.utcnow().isoformat(),
                    "ttl": ttl,
                }

                # Serialize the cache_data itself
                try:
                    cache_data_serialized = json.dumps(cache_data)
                except (TypeError, ValueError) as e:
                    # If cache_data contains non-JSON serializable content, use pickle
                    logger.debug(
                        f"Cache metadata contains non-JSON serializable data for key {key}, using pickle"
                    )
                    cache_data_serialized = pickle.dumps(cache_data).decode("latin1")
                    cache_data = {
                        "_pickled_metadata": True,
                        "data": cache_data_serialized,
                    }
                    cache_data_serialized = json.dumps(cache_data)

                if ttl:
                    result = await redis_client.setex(
                        f"cache:{key}", ttl, cache_data_serialized
                    )
                else:
                    result = await redis_client.set(
                        f"cache:{key}", cache_data_serialized
                    )

                logger.debug(f"✅ Cached key: {key} (TTL: {ttl})")
                return bool(result)

        except Exception as e:
            logger.error(f"❌ Cache set error for key {key}: {e}")
            return False

    async def get(self, key: str) -> Optional[Any]:
        """Get a value from cache"""
        try:
            async with self.manager.get_redis() as redis_client:
                cached_data = await redis_client.get(f"cache:{key}")

                if not cached_data:
                    return None

                # Parse cache metadata
                cache_info = json.loads(cached_data)

                # Handle pickled metadata
                if cache_info.get("_pickled_metadata"):
                    cache_info = pickle.loads(cache_info["data"].encode("latin1"))

                serialized_value = cache_info["value"]
                json_serialized = cache_info["json_serialized"]

                # Deserialize value
                if json_serialized:
                    value = json.loads(serialized_value)
                else:
                    value = pickle.loads(
                        serialized_value.encode()
                        if isinstance(serialized_value, str)
                        else serialized_value
                    )

                logger.debug(f"✅ Cache hit for key: {key}")
                return value

        except Exception as e:
            logger.error(f"❌ Cache get error for key {key}: {e}")
            return None

    async def delete(self, key: str) -> bool:
        """Delete a key from cache"""
        try:
            async with self.manager.get_redis() as redis_client:
                result = await redis_client.delete(f"cache:{key}")
                logger.debug(f"✅ Deleted cache key: {key}")
                return bool(result)
        except Exception as e:
            logger.error(f"❌ Cache delete error for key {key}: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache"""
        try:
            async with self.manager.get_redis() as redis_client:
                result = await redis_client.exists(f"cache:{key}")
                return bool(result)
        except Exception as e:
            logger.error(f"❌ Cache exists error for key {key}: {e}")
            return False

    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching a pattern"""
        try:
            async with self.manager.get_redis() as redis_client:
                keys = await redis_client.keys(f"cache:{pattern}")
                if keys:
                    deleted = await redis_client.delete(*keys)
                    logger.info(
                        f"✅ Cleared {deleted} cache keys matching pattern: {pattern}"
                    )
                    return deleted
                return 0
        except Exception as e:
            logger.error(f"❌ Cache clear pattern error for {pattern}: {e}")
            return 0

    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            async with self.manager.get_redis() as redis_client:
                info = await redis_client.info()
                stats = {
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory": info.get("used_memory_human", "0B"),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0),
                    "total_commands_processed": info.get("total_commands_processed", 0),
                    "uptime_in_seconds": info.get("uptime_in_seconds", 0),
                }

                # Calculate hit ratio
                hits = stats["keyspace_hits"]
                misses = stats["keyspace_misses"]
                total = hits + misses
                stats["hit_ratio"] = (hits / total * 100) if total > 0 else 0

                return stats
        except Exception as e:
            logger.error(f"❌ Error getting cache stats: {e}")
            return {}


# Global cache instance
cache = RedisCache()


def cached(
    ttl: int = CacheStrategy.API_RESPONSE_TTL,
    key_prefix: str = "",
    key_builder: Optional[callable] = None,
):
    """
    Decorator for caching function results

    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache keys
        key_builder: Custom function to build cache key
    """

    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Default key building
                func_name = f"{func.__module__}.{func.__name__}"
                args_str = "_".join(str(arg) for arg in args)
                kwargs_str = "_".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = f"{key_prefix}{func_name}_{args_str}_{kwargs_str}".replace(
                    " ", "_"
                )

            # Try to get from cache
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"🎯 Cache hit for function: {func.__name__}")
                return cached_result

            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl)
            logger.debug(f"💾 Cached result for function: {func.__name__}")
            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # For synchronous functions, return the async wrapper in an event loop
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(async_wrapper(*args, **kwargs))

        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


class SessionCache:
    """Specialized caching for user sessions"""

    def __init__(self):
        self.cache = cache

    async def set_user_session(
        self,
        user_id: int,
        session_data: Dict[str, Any],
        ttl: int = CacheStrategy.SESSION_CACHE_TTL,
    ) -> bool:
        """Store user session data"""
        key = f"session:user:{user_id}"
        return await self.cache.set(key, session_data, ttl)

    async def get_user_session(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user session data"""
        key = f"session:user:{user_id}"
        return await self.cache.get(key)

    async def delete_user_session(self, user_id: int) -> bool:
        """Delete user session"""
        key = f"session:user:{user_id}"
        return await self.cache.delete(key)

    async def set_token_blacklist(self, token_jti: str, ttl: int = 86400) -> bool:
        """Add token to blacklist"""
        key = f"blacklist:token:{token_jti}"
        return await self.cache.set(key, True, ttl)

    async def is_token_blacklisted(self, token_jti: str) -> bool:
        """Check if token is blacklisted"""
        key = f"blacklist:token:{token_jti}"
        return await self.cache.exists(key)


class QueryCache:
    """Specialized caching for database queries"""

    def __init__(self):
        self.cache = cache

    async def cache_query_result(
        self, query_hash: str, result: Any, ttl: int = CacheStrategy.DATABASE_QUERY_TTL
    ) -> bool:
        """Cache database query result"""
        key = f"query:{query_hash}"
        return await self.cache.set(key, result, ttl)

    async def get_query_result(self, query_hash: str) -> Optional[Any]:
        """Get cached query result"""
        key = f"query:{query_hash}"
        return await self.cache.get(key)

    async def invalidate_table_cache(self, table_name: str) -> int:
        """Invalidate all cached queries for a table"""
        pattern = f"query:*{table_name}*"
        return await self.cache.clear_pattern(pattern)


# Global cache instances
session_cache = SessionCache()
query_cache = QueryCache()


# Utility functions for rate limiting
class RateLimiter:
    """Redis-based rate limiting"""

    def __init__(self):
        self.manager = redis_manager

    async def check_rate_limit(
        self, key: str, limit: int, window: int
    ) -> Dict[str, Any]:
        """
        Check rate limit using sliding window

        Args:
            key: Unique identifier for the rate limit
            limit: Maximum number of requests
            window: Time window in seconds

        Returns:
            Dict with 'allowed', 'remaining', 'reset_time'
        """
        try:
            async with self.manager.get_redis() as redis_client:
                now = datetime.utcnow().timestamp()
                window_start = now - window

                # Remove expired entries
                await redis_client.zremrangebyscore(
                    f"rate_limit:{key}", 0, window_start
                )

                # Count current requests
                current_count = await redis_client.zcard(f"rate_limit:{key}")

                if current_count >= limit:
                    # Get reset time (oldest entry + window)
                    oldest_entries = await redis_client.zrange(
                        f"rate_limit:{key}", 0, 0, withscores=True
                    )
                    reset_time = (
                        oldest_entries[0][1] + window
                        if oldest_entries
                        else now + window
                    )

                    return {
                        "allowed": False,
                        "remaining": 0,
                        "reset_time": reset_time,
                        "current_count": current_count,
                    }

                # Add current request
                await redis_client.zadd(f"rate_limit:{key}", {str(now): now})
                await redis_client.expire(f"rate_limit:{key}", window)

                return {
                    "allowed": True,
                    "remaining": limit - current_count - 1,
                    "reset_time": now + window,
                    "current_count": current_count + 1,
                }

        except Exception as e:
            logger.error(f"❌ Rate limit check error for key {key}: {e}")
            # Fail open - allow request if Redis is down
            return {
                "allowed": True,
                "remaining": limit,
                "reset_time": datetime.utcnow().timestamp() + window,
                "current_count": 0,
            }


# Global rate limiter
rate_limiter = RateLimiter()


# Startup and shutdown events
async def startup_redis():
    """Initialize Redis connections on startup"""
    await redis_manager.connect()


async def shutdown_redis():
    """Close Redis connections on shutdown"""
    await redis_manager.disconnect()
