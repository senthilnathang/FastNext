"""
Advanced caching system for FastAPI with multiple backends and optimization strategies.
"""

import asyncio
import hashlib
import json
import logging
import pickle
import time
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Tuple, TypeVar, Union

try:
    import redis.asyncio as redis

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

try:
    import aiocache
    from aiocache import Cache as AIOCache
    from aiocache.serializers import JsonSerializer, PickleSerializer

    AIOCACHE_AVAILABLE = True
except ImportError:
    AIOCACHE_AVAILABLE = False

from app.core.config import settings

logger = logging.getLogger(__name__)

# Type variables for generic caching
T = TypeVar("T")
F = TypeVar("F", bound=Callable[..., Any])


class CacheBackend(Enum):
    """Available cache backends"""

    MEMORY = "memory"
    REDIS = "redis"
    HYBRID = "hybrid"


class CacheStrategy(Enum):
    """Cache invalidation strategies"""

    TTL = "ttl"  # Time-to-live
    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind"
    READ_THROUGH = "read_through"


@dataclass
class CacheConfig:
    """Cache configuration settings"""

    backend: CacheBackend = CacheBackend.MEMORY
    default_ttl: int = 300  # 5 minutes
    max_size: int = 1000
    strategy: CacheStrategy = CacheStrategy.TTL
    enable_compression: bool = True
    enable_encryption: bool = False
    key_prefix: str = "fastnext"
    redis_url: Optional[str] = None

    def __post_init__(self):
        if self.redis_url is None and settings.REDIS_URL:
            self.redis_url = settings.REDIS_URL


@dataclass
class CacheEntry:
    """Cache entry with metadata"""

    key: str
    value: Any
    created_at: datetime
    expires_at: Optional[datetime]
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    size_bytes: int = 0
    tags: List[str] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.last_accessed is None:
            self.last_accessed = self.created_at


class CacheStats:
    """Cache performance statistics"""

    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.sets = 0
        self.deletes = 0
        self.evictions = 0
        self.total_size = 0
        self.start_time = datetime.utcnow()

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    @property
    def miss_rate(self) -> float:
        return 1.0 - self.hit_rate

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hits": self.hits,
            "misses": self.misses,
            "sets": self.sets,
            "deletes": self.deletes,
            "evictions": self.evictions,
            "total_size": self.total_size,
            "hit_rate": self.hit_rate,
            "miss_rate": self.miss_rate,
            "uptime_seconds": (datetime.utcnow() - self.start_time).total_seconds(),
        }


class CacheInterface(ABC):
    """Abstract cache interface"""

    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        pass

    @abstractmethod
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        pass

    @abstractmethod
    async def clear(self) -> bool:
        """Clear all cache entries"""
        pass

    @abstractmethod
    async def get_stats(self) -> CacheStats:
        """Get cache statistics"""
        pass


class MemoryCache(CacheInterface):
    """High-performance in-memory cache with LRU eviction"""

    def __init__(self, config: CacheConfig):
        self.config = config
        self._cache: Dict[str, CacheEntry] = {}
        self._access_order: List[str] = []
        self._stats = CacheStats()
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                self._stats.misses += 1
                return None

            # Check expiration
            if entry.expires_at and datetime.utcnow() > entry.expires_at:
                await self._remove_entry(key)
                self._stats.misses += 1
                return None

            # Update access metadata
            entry.access_count += 1
            entry.last_accessed = datetime.utcnow()

            # Update LRU order
            if key in self._access_order:
                self._access_order.remove(key)
            self._access_order.append(key)

            self._stats.hits += 1
            return entry.value

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        async with self._lock:
            ttl = ttl or self.config.default_ttl
            expires_at = datetime.utcnow() + timedelta(seconds=ttl) if ttl > 0 else None

            # Calculate approximate size
            size_bytes = len(pickle.dumps(value))

            # Create cache entry
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=datetime.utcnow(),
                expires_at=expires_at,
                size_bytes=size_bytes,
            )

            # Check if we need to evict entries
            await self._ensure_capacity(size_bytes)

            # Add to cache
            if key not in self._cache:
                self._access_order.append(key)
            else:
                # Update access order for existing key
                if key in self._access_order:
                    self._access_order.remove(key)
                self._access_order.append(key)

            self._cache[key] = entry
            self._stats.sets += 1
            self._stats.total_size += size_bytes

            return True

    async def delete(self, key: str) -> bool:
        async with self._lock:
            if key in self._cache:
                await self._remove_entry(key)
                self._stats.deletes += 1
                return True
            return False

    async def exists(self, key: str) -> bool:
        async with self._lock:
            entry = self._cache.get(key)
            if entry and entry.expires_at and datetime.utcnow() > entry.expires_at:
                await self._remove_entry(key)
                return False
            return entry is not None

    async def clear(self) -> bool:
        async with self._lock:
            self._cache.clear()
            self._access_order.clear()
            self._stats.total_size = 0
            return True

    async def get_stats(self) -> CacheStats:
        return self._stats

    async def _remove_entry(self, key: str):
        """Remove entry and update metadata"""
        if key in self._cache:
            entry = self._cache[key]
            self._stats.total_size -= entry.size_bytes
            del self._cache[key]

        if key in self._access_order:
            self._access_order.remove(key)

    async def _ensure_capacity(self, new_size: int):
        """Ensure cache has capacity for new entry"""
        while (
            len(self._cache) >= self.config.max_size
            or self._stats.total_size + new_size > self.config.max_size * 1024
        ):  # Assume 1KB per entry max
            if not self._access_order:
                break

            # Evict least recently used item
            lru_key = self._access_order[0]
            await self._remove_entry(lru_key)
            self._stats.evictions += 1


class RedisCache(CacheInterface):
    """Redis-based distributed cache"""

    def __init__(self, config: CacheConfig):
        self.config = config
        self._redis = None
        self._stats = CacheStats()

        if not REDIS_AVAILABLE:
            raise ImportError("redis package is required for RedisCache")

    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis connection"""
        if self._redis is None:
            self._redis = redis.from_url(
                self.config.redis_url or "redis://localhost:6379",
                encoding="utf-8",
                decode_responses=False,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30,
            )
        return self._redis

    def _make_key(self, key: str) -> str:
        """Create prefixed key"""
        return f"{self.config.key_prefix}:{key}"

    async def get(self, key: str) -> Optional[Any]:
        try:
            redis_client = await self._get_redis()
            prefixed_key = self._make_key(key)

            # Get value and metadata
            data = await redis_client.hgetall(prefixed_key)
            if not data:
                self._stats.misses += 1
                return None

            # Deserialize value
            value = pickle.loads(data[b"value"])

            # Update access count
            await redis_client.hincrby(prefixed_key, "access_count", 1)
            await redis_client.hset(prefixed_key, "last_accessed", time.time())

            self._stats.hits += 1
            return value

        except Exception as e:
            logger.error(f"Redis get error: {e}")
            self._stats.misses += 1
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        try:
            redis_client = await self._get_redis()
            prefixed_key = self._make_key(key)
            ttl = ttl or self.config.default_ttl

            # Serialize value
            serialized_value = pickle.dumps(value)

            # Create cache entry
            entry_data = {
                "value": serialized_value,
                "created_at": time.time(),
                "access_count": 0,
                "size_bytes": len(serialized_value),
            }

            # Set value with TTL
            await redis_client.hset(prefixed_key, mapping=entry_data)
            if ttl > 0:
                await redis_client.expire(prefixed_key, ttl)

            self._stats.sets += 1
            return True

        except Exception as e:
            logger.error(f"Redis set error: {e}")
            return False

    async def delete(self, key: str) -> bool:
        try:
            redis_client = await self._get_redis()
            result = await redis_client.delete(self._make_key(key))
            if result:
                self._stats.deletes += 1
            return bool(result)
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return False

    async def exists(self, key: str) -> bool:
        try:
            redis_client = await self._get_redis()
            return bool(await redis_client.exists(self._make_key(key)))
        except Exception as e:
            logger.error(f"Redis exists error: {e}")
            return False

    async def clear(self) -> bool:
        try:
            redis_client = await self._get_redis()
            pattern = f"{self.config.key_prefix}:*"
            keys = await redis_client.keys(pattern)
            if keys:
                await redis_client.delete(*keys)
            return True
        except Exception as e:
            logger.error(f"Redis clear error: {e}")
            return False

    async def get_stats(self) -> CacheStats:
        return self._stats


class HybridCache(CacheInterface):
    """Hybrid cache using both memory and Redis with intelligent tiering"""

    def __init__(self, config: CacheConfig):
        self.config = config
        self.l1_cache = MemoryCache(
            CacheConfig(
                backend=CacheBackend.MEMORY,
                max_size=config.max_size // 2,  # L1 cache is smaller
                default_ttl=config.default_ttl,
            )
        )
        self.l2_cache = (
            RedisCache(config) if REDIS_AVAILABLE and config.redis_url else None
        )
        self._stats = CacheStats()

    async def get(self, key: str) -> Optional[Any]:
        # Try L1 cache first (fastest)
        value = await self.l1_cache.get(key)
        if value is not None:
            self._stats.hits += 1
            return value

        # Try L2 cache if available
        if self.l2_cache:
            value = await self.l2_cache.get(key)
            if value is not None:
                # Promote to L1 cache
                await self.l1_cache.set(key, value)
                self._stats.hits += 1
                return value

        self._stats.misses += 1
        return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        # Set in both caches
        l1_success = await self.l1_cache.set(key, value, ttl)
        l2_success = True

        if self.l2_cache:
            l2_success = await self.l2_cache.set(key, value, ttl)

        if l1_success or l2_success:
            self._stats.sets += 1
            return True
        return False

    async def delete(self, key: str) -> bool:
        l1_result = await self.l1_cache.delete(key)
        l2_result = True

        if self.l2_cache:
            l2_result = await self.l2_cache.delete(key)

        if l1_result or l2_result:
            self._stats.deletes += 1
            return True
        return False

    async def exists(self, key: str) -> bool:
        if await self.l1_cache.exists(key):
            return True

        if self.l2_cache:
            return await self.l2_cache.exists(key)

        return False

    async def clear(self) -> bool:
        l1_result = await self.l1_cache.clear()
        l2_result = True

        if self.l2_cache:
            l2_result = await self.l2_cache.clear()

        return l1_result and l2_result

    async def get_stats(self) -> CacheStats:
        l1_stats = await self.l1_cache.get_stats()
        l2_stats = await self.l2_cache.get_stats() if self.l2_cache else CacheStats()

        # Combine stats
        combined_stats = CacheStats()
        combined_stats.hits = l1_stats.hits + l2_stats.hits + self._stats.hits
        combined_stats.misses = l1_stats.misses + l2_stats.misses + self._stats.misses
        combined_stats.sets = l1_stats.sets + l2_stats.sets + self._stats.sets
        combined_stats.deletes = (
            l1_stats.deletes + l2_stats.deletes + self._stats.deletes
        )
        combined_stats.evictions = l1_stats.evictions + l2_stats.evictions
        combined_stats.total_size = l1_stats.total_size + l2_stats.total_size

        return combined_stats


class CacheManager:
    """Centralized cache manager with multiple cache instances"""

    def __init__(self):
        self._caches: Dict[str, CacheInterface] = {}
        self._default_config = CacheConfig()

    def create_cache(
        self, name: str, config: Optional[CacheConfig] = None
    ) -> CacheInterface:
        """Create a new cache instance"""
        config = config or self._default_config

        if config.backend == CacheBackend.MEMORY:
            cache = MemoryCache(config)
        elif config.backend == CacheBackend.REDIS:
            cache = RedisCache(config)
        elif config.backend == CacheBackend.HYBRID:
            cache = HybridCache(config)
        else:
            raise ValueError(f"Unsupported cache backend: {config.backend}")

        self._caches[name] = cache
        logger.info(f"Created {config.backend.value} cache: {name}")
        return cache

    def get_cache(self, name: str) -> Optional[CacheInterface]:
        """Get existing cache instance"""
        return self._caches.get(name)

    async def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all caches"""
        stats = {}
        for name, cache in self._caches.items():
            cache_stats = await cache.get_stats()
            stats[name] = cache_stats.to_dict()
        return stats

    async def clear_all(self):
        """Clear all caches"""
        for cache in self._caches.values():
            await cache.clear()


# Global cache manager instance
cache_manager = CacheManager()


def generate_cache_key(*args, **kwargs) -> str:
    """Generate a cache key from function arguments"""
    key_parts = []

    # Add positional arguments
    for arg in args:
        if hasattr(arg, "__dict__"):  # Object with attributes
            key_parts.append(f"obj_{hash(str(sorted(arg.__dict__.items())))}")
        else:
            key_parts.append(str(arg))

    # Add keyword arguments
    for k, v in sorted(kwargs.items()):
        key_parts.append(f"{k}={v}")

    # Create hash of combined key
    key_string = "|".join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()


def cached(
    cache_name: str = "default",
    ttl: Optional[int] = None,
    key_generator: Optional[Callable] = None,
    bypass_cache: Callable[[], bool] = lambda: False,
):
    """
    Decorator for caching function results

    Args:
        cache_name: Name of the cache to use
        ttl: Time to live in seconds
        key_generator: Custom key generation function
        bypass_cache: Function to determine if cache should be bypassed
    """

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Check if cache should be bypassed
            if bypass_cache():
                return await func(*args, **kwargs)

            # Get or create cache
            cache = cache_manager.get_cache(cache_name)
            if cache is None:
                cache = cache_manager.create_cache(cache_name)

            # Generate cache key
            if key_generator:
                cache_key = key_generator(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}_{generate_cache_key(*args, **kwargs)}"

            # Try to get from cache
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result

            # Execute function and cache result
            logger.debug(f"Cache miss for {cache_key}")
            result = await func(*args, **kwargs)

            # Cache the result
            await cache.set(cache_key, result, ttl)

            return result

        # Add cache management methods to the function
        wrapper.cache_clear = lambda: cache_manager.get_cache(cache_name).clear()
        wrapper.cache_stats = lambda: cache_manager.get_cache(cache_name).get_stats()

        return wrapper

    return decorator


@asynccontextmanager
async def cache_transaction(cache_name: str = "default"):
    """Context manager for cache transactions"""
    cache = cache_manager.get_cache(cache_name)
    if cache is None:
        cache = cache_manager.create_cache(cache_name)

    # TODO: Implement transaction logic if needed
    yield cache


# Cache warming utilities
class CacheWarmer:
    """Utility for warming up caches"""

    def __init__(self, cache: CacheInterface):
        self.cache = cache

    async def warm_from_data(self, data: Dict[str, Any], ttl: Optional[int] = None):
        """Warm cache from a dictionary of data"""
        for key, value in data.items():
            await self.cache.set(key, value, ttl)
        logger.info(f"Warmed cache with {len(data)} entries")

    async def warm_from_function(
        self,
        keys: List[str],
        value_func: Callable[[str], Any],
        ttl: Optional[int] = None,
        batch_size: int = 100,
    ):
        """Warm cache by calling a function for each key"""
        for i in range(0, len(keys), batch_size):
            batch = keys[i : i + batch_size]
            tasks = []

            for key in batch:
                try:
                    value = (
                        await value_func(key)
                        if asyncio.iscoroutinefunction(value_func)
                        else value_func(key)
                    )
                    tasks.append(self.cache.set(key, value, ttl))
                except Exception as e:
                    logger.error(f"Error warming cache for key {key}: {e}")

            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

        logger.info(f"Warmed cache with {len(keys)} keys")


# Initialize default caches
def initialize_caches():
    """Initialize default cache instances"""
    try:
        # Create default cache based on configuration
        default_config = CacheConfig(
            backend=(
                CacheBackend.HYBRID
                if REDIS_AVAILABLE and settings.REDIS_URL
                else CacheBackend.MEMORY
            ),
            default_ttl=300,  # 5 minutes
            max_size=1000,
        )
        cache_manager.create_cache("default", default_config)

        # Create specialized caches
        cache_manager.create_cache(
            "users",
            CacheConfig(
                backend=default_config.backend,
                default_ttl=600,  # 10 minutes for user data
                max_size=500,
                key_prefix="users",
            ),
        )

        cache_manager.create_cache(
            "sessions",
            CacheConfig(
                backend=default_config.backend,
                default_ttl=3600,  # 1 hour for sessions
                max_size=2000,
                key_prefix="sessions",
            ),
        )

        cache_manager.create_cache(
            "api_responses",
            CacheConfig(
                backend=default_config.backend,
                default_ttl=300,  # 5 minutes for API responses
                max_size=1500,
                key_prefix="api",
            ),
        )

        logger.info("Cache system initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize cache system: {e}")
        # Fall back to memory-only cache
        cache_manager.create_cache("default", CacheConfig(backend=CacheBackend.MEMORY))
