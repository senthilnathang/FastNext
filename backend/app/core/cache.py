"""Redis caching utilities"""

import json
import logging
from typing import Any, Optional

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis cache wrapper with connection pooling"""

    def __init__(self):
        self._pool: Optional[redis.ConnectionPool] = None
        self._client: Optional[redis.Redis] = None

    @property
    def client(self) -> redis.Redis:
        """Get or create Redis client with connection pool"""
        if self._client is None:
            self._pool = redis.ConnectionPool.from_url(
                settings.REDIS_URL,
                max_connections=50,
                decode_responses=True,
            )
            self._client = redis.Redis(connection_pool=self._pool)
        return self._client

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not settings.CACHE_ENABLED:
            return None
        try:
            value = self.client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning(f"Cache get error for key {key}: {e}")
            return None

    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
    ) -> bool:
        """Set value in cache with optional TTL"""
        if not settings.CACHE_ENABLED:
            return False
        try:
            ttl = ttl or settings.CACHE_DEFAULT_TTL
            serialized = json.dumps(value, default=str)
            self.client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.warning(f"Cache set error for key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not settings.CACHE_ENABLED:
            return False
        try:
            self.client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete error for key {key}: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not settings.CACHE_ENABLED:
            return 0
        try:
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Cache delete pattern error for {pattern}: {e}")
            return 0

    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not settings.CACHE_ENABLED:
            return False
        try:
            return bool(self.client.exists(key))
        except Exception as e:
            logger.warning(f"Cache exists error for key {key}: {e}")
            return False

    def close(self):
        """Close Redis connection pool"""
        if self._pool:
            self._pool.disconnect()
            self._pool = None
            self._client = None


# Global cache instance
cache = RedisCache()


def get_cache() -> RedisCache:
    """Get cache instance (for dependency injection)"""
    return cache
