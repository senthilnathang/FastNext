"""
Enhanced Distributed Module Architecture

Enterprise-grade distributed module system with:
- Multi-level caching (Memory, Redis, Disk)
- Parallel discovery and sync operations
- Circuit breaker pattern for failover
- Health monitoring and metrics
- Load balancing across sources
- Retry with exponential backoff
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from functools import wraps
from pathlib import Path
from threading import Lock, RLock
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, TypeVar
import heapq

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# =============================================================================
# Types and Constants
# =============================================================================


T = TypeVar("T")

CACHE_TTL_SECONDS = 300  # 5 minutes
CIRCUIT_BREAKER_THRESHOLD = 5
CIRCUIT_BREAKER_TIMEOUT = 60
MAX_PARALLEL_WORKERS = 10
RETRY_MAX_ATTEMPTS = 3
RETRY_BASE_DELAY = 1.0


class CacheLevel(str, Enum):
    """Cache levels."""
    MEMORY = "memory"
    REDIS = "redis"
    DISK = "disk"


class SourceHealth(str, Enum):
    """Remote source health status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class CircuitState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Blocking requests
    HALF_OPEN = "half_open"  # Testing recovery


# =============================================================================
# Multi-Level Cache
# =============================================================================


@dataclass
class CacheEntry:
    """Cache entry with metadata."""
    key: str
    value: Any
    created_at: datetime
    ttl_seconds: int
    access_count: int = 0
    last_accessed: datetime = field(default_factory=datetime.now)

    def is_expired(self) -> bool:
        return datetime.now() > self.created_at + timedelta(seconds=self.ttl_seconds)

    def touch(self) -> None:
        self.access_count += 1
        self.last_accessed = datetime.now()


class MemoryCache:
    """Thread-safe in-memory LRU cache."""

    def __init__(self, max_size: int = 1000, default_ttl: int = CACHE_TTL_SECONDS):
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = RLock()
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                self._misses += 1
                return None

            if entry.is_expired():
                del self._cache[key]
                self._misses += 1
                return None

            entry.touch()
            self._hits += 1
            return entry.value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        with self._lock:
            # Evict if at capacity
            if len(self._cache) >= self._max_size:
                self._evict_lru()

            self._cache[key] = CacheEntry(
                key=key,
                value=value,
                created_at=datetime.now(),
                ttl_seconds=ttl or self._default_ttl,
            )

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def _evict_lru(self) -> None:
        """Evict least recently used entry."""
        if not self._cache:
            return

        lru_key = min(self._cache.keys(), key=lambda k: self._cache[k].last_accessed)
        del self._cache[lru_key]

    def get_stats(self) -> Dict[str, Any]:
        total = self._hits + self._misses
        return {
            "size": len(self._cache),
            "max_size": self._max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": self._hits / total if total > 0 else 0,
        }


class DiskCache:
    """Persistent disk cache."""

    def __init__(self, cache_dir: Path, default_ttl: int = 3600):
        self._cache_dir = cache_dir
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._default_ttl = default_ttl
        self._lock = Lock()

    def _get_path(self, key: str) -> Path:
        """Get cache file path for key."""
        key_hash = hashlib.sha256(key.encode()).hexdigest()[:16]
        return self._cache_dir / f"{key_hash}.cache"

    def get(self, key: str) -> Optional[Any]:
        path = self._get_path(key)
        if not path.exists():
            return None

        try:
            data = json.loads(path.read_text())
            expires_at = datetime.fromisoformat(data["expires_at"])

            if datetime.now() > expires_at:
                path.unlink()
                return None

            return data["value"]
        except (json.JSONDecodeError, KeyError):
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        path = self._get_path(key)
        expires_at = datetime.now() + timedelta(seconds=ttl or self._default_ttl)

        with self._lock:
            data = {
                "key": key,
                "value": value,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now().isoformat(),
            }
            path.write_text(json.dumps(data, default=str))

    def delete(self, key: str) -> bool:
        path = self._get_path(key)
        if path.exists():
            path.unlink()
            return True
        return False

    def clear(self) -> None:
        with self._lock:
            for path in self._cache_dir.glob("*.cache"):
                path.unlink()


class MultiLevelCache:
    """Multi-level cache (Memory -> Redis -> Disk)."""

    def __init__(
        self,
        disk_path: Path,
        redis_client: Optional[Any] = None,
        memory_size: int = 1000,
    ):
        self.memory = MemoryCache(max_size=memory_size)
        self.disk = DiskCache(disk_path)
        self.redis = redis_client

    def get(self, key: str) -> Optional[Any]:
        """Get from cache, checking each level."""
        # L1: Memory
        value = self.memory.get(key)
        if value is not None:
            return value

        # L2: Redis (if available)
        if self.redis:
            try:
                cached = self.redis.get(key)
                if cached:
                    value = json.loads(cached)
                    self.memory.set(key, value)  # Promote to L1
                    return value
            except Exception as e:
                logger.warning(f"Redis cache error: {e}")

        # L3: Disk
        value = self.disk.get(key)
        if value is not None:
            self.memory.set(key, value)  # Promote to L1
            return value

        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set in all cache levels."""
        self.memory.set(key, value, ttl)

        if self.redis:
            try:
                self.redis.setex(key, ttl or CACHE_TTL_SECONDS, json.dumps(value, default=str))
            except Exception as e:
                logger.warning(f"Redis cache write error: {e}")

        self.disk.set(key, value, ttl)

    def invalidate(self, key: str) -> None:
        """Invalidate key from all levels."""
        self.memory.delete(key)
        if self.redis:
            try:
                self.redis.delete(key)
            except Exception:
                pass
        self.disk.delete(key)

    def invalidate_pattern(self, pattern: str) -> None:
        """Invalidate keys matching pattern."""
        # Memory cache doesn't support pattern, clear all
        if pattern == "*":
            self.memory.clear()
            self.disk.clear()
            if self.redis:
                try:
                    for key in self.redis.scan_iter(pattern):
                        self.redis.delete(key)
                except Exception:
                    pass


# =============================================================================
# Circuit Breaker
# =============================================================================


@dataclass
class CircuitBreaker:
    """Circuit breaker for source failover."""

    name: str
    failure_threshold: int = CIRCUIT_BREAKER_THRESHOLD
    timeout_seconds: int = CIRCUIT_BREAKER_TIMEOUT
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure: Optional[datetime] = None
    last_success: Optional[datetime] = None
    opened_at: Optional[datetime] = None

    def record_success(self) -> None:
        """Record successful operation."""
        self.failure_count = 0
        self.last_success = datetime.now()

        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
            logger.info(f"Circuit {self.name} closed after successful recovery")

    def record_failure(self) -> None:
        """Record failed operation."""
        self.failure_count += 1
        self.last_failure = datetime.now()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.opened_at = datetime.now()
            logger.warning(f"Circuit {self.name} opened after {self.failure_count} failures")

    def can_execute(self) -> bool:
        """Check if operation should be allowed."""
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            # Check timeout for recovery attempt
            if self.opened_at and datetime.now() > self.opened_at + timedelta(seconds=self.timeout_seconds):
                self.state = CircuitState.HALF_OPEN
                logger.info(f"Circuit {self.name} half-open for recovery test")
                return True
            return False

        # HALF_OPEN allows one test request
        return self.state == CircuitState.HALF_OPEN

    def get_status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "last_failure": self.last_failure.isoformat() if self.last_failure else None,
            "last_success": self.last_success.isoformat() if self.last_success else None,
        }


class CircuitBreakerRegistry:
    """Registry of circuit breakers."""

    def __init__(self):
        self._breakers: Dict[str, CircuitBreaker] = {}
        self._lock = Lock()

    def get(self, name: str) -> CircuitBreaker:
        with self._lock:
            if name not in self._breakers:
                self._breakers[name] = CircuitBreaker(name=name)
            return self._breakers[name]

    def get_all_status(self) -> List[Dict[str, Any]]:
        return [cb.get_status() for cb in self._breakers.values()]


def with_circuit_breaker(breaker: CircuitBreaker):
    """Decorator for circuit breaker pattern."""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            if not breaker.can_execute():
                raise ConnectionError(f"Circuit breaker {breaker.name} is open")

            try:
                result = func(*args, **kwargs)
                breaker.record_success()
                return result
            except Exception as e:
                breaker.record_failure()
                raise

        return wrapper
    return decorator


# =============================================================================
# Retry with Backoff
# =============================================================================


def retry_with_backoff(
    max_attempts: int = RETRY_MAX_ATTEMPTS,
    base_delay: float = RETRY_BASE_DELAY,
    exponential: bool = True,
    exceptions: Tuple = (Exception,),
):
    """Decorator for retry with exponential backoff."""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        delay = base_delay * (2 ** attempt if exponential else 1)
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_attempts} failed for {func.__name__}: {e}. "
                            f"Retrying in {delay:.1f}s"
                        )
                        time.sleep(delay)

            raise last_exception

        return wrapper
    return decorator


# =============================================================================
# Health Monitor
# =============================================================================


@dataclass
class SourceMetrics:
    """Metrics for a remote source."""
    source_name: str
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_latency_ms: float = 0
    last_check: Optional[datetime] = None
    health: SourceHealth = SourceHealth.UNKNOWN
    error_messages: List[str] = field(default_factory=list)

    @property
    def success_rate(self) -> float:
        if self.total_requests == 0:
            return 0
        return self.successful_requests / self.total_requests

    @property
    def avg_latency_ms(self) -> float:
        if self.successful_requests == 0:
            return 0
        return self.total_latency_ms / self.successful_requests

    def record_request(self, success: bool, latency_ms: float, error: Optional[str] = None):
        self.total_requests += 1
        if success:
            self.successful_requests += 1
            self.total_latency_ms += latency_ms
        else:
            self.failed_requests += 1
            if error:
                self.error_messages.append(error)
                # Keep only last 10 errors
                self.error_messages = self.error_messages[-10:]

        # Update health based on recent success rate
        if self.total_requests >= 10:
            if self.success_rate >= 0.95:
                self.health = SourceHealth.HEALTHY
            elif self.success_rate >= 0.80:
                self.health = SourceHealth.DEGRADED
            else:
                self.health = SourceHealth.UNHEALTHY

        self.last_check = datetime.now()


class HealthMonitor:
    """Monitor health of remote sources."""

    def __init__(self):
        self._metrics: Dict[str, SourceMetrics] = {}
        self._lock = Lock()

    def get_metrics(self, source_name: str) -> SourceMetrics:
        with self._lock:
            if source_name not in self._metrics:
                self._metrics[source_name] = SourceMetrics(source_name=source_name)
            return self._metrics[source_name]

    def record_request(
        self,
        source_name: str,
        success: bool,
        latency_ms: float,
        error: Optional[str] = None,
    ):
        metrics = self.get_metrics(source_name)
        metrics.record_request(success, latency_ms, error)

    def get_healthy_sources(self) -> List[str]:
        """Get list of healthy sources."""
        return [
            name for name, m in self._metrics.items()
            if m.health in (SourceHealth.HEALTHY, SourceHealth.UNKNOWN)
        ]

    def get_all_metrics(self) -> Dict[str, Dict[str, Any]]:
        return {
            name: {
                "health": m.health.value,
                "success_rate": round(m.success_rate, 4),
                "avg_latency_ms": round(m.avg_latency_ms, 2),
                "total_requests": m.total_requests,
                "failed_requests": m.failed_requests,
                "last_check": m.last_check.isoformat() if m.last_check else None,
            }
            for name, m in self._metrics.items()
        }


# =============================================================================
# Load Balancer
# =============================================================================


class LoadBalancer:
    """Load balancer for selecting optimal source."""

    def __init__(self, health_monitor: HealthMonitor):
        self.health_monitor = health_monitor

    def select_source(
        self,
        sources: List[str],
        strategy: str = "round_robin",
    ) -> Optional[str]:
        """Select best source based on strategy."""
        healthy = [s for s in sources if s in self.health_monitor.get_healthy_sources() or
                   s not in [m.source_name for m in self.health_monitor._metrics.values()]]

        if not healthy:
            # Fall back to any source if all are unhealthy
            healthy = sources

        if not healthy:
            return None

        if strategy == "round_robin":
            return self._round_robin(healthy)
        elif strategy == "least_latency":
            return self._least_latency(healthy)
        elif strategy == "weighted":
            return self._weighted(healthy)
        else:
            return healthy[0]

    def _round_robin(self, sources: List[str]) -> str:
        """Simple round-robin selection."""
        import random
        return random.choice(sources)

    def _least_latency(self, sources: List[str]) -> str:
        """Select source with lowest latency."""
        latencies = []
        for source in sources:
            metrics = self.health_monitor.get_metrics(source)
            latencies.append((source, metrics.avg_latency_ms or float("inf")))

        return min(latencies, key=lambda x: x[1])[0]

    def _weighted(self, sources: List[str]) -> str:
        """Weighted selection based on health and latency."""
        scores = []
        for source in sources:
            metrics = self.health_monitor.get_metrics(source)
            # Score: higher is better
            score = metrics.success_rate * 100
            if metrics.avg_latency_ms > 0:
                score -= min(metrics.avg_latency_ms / 10, 50)  # Penalize high latency
            scores.append((source, max(score, 1)))

        total = sum(s[1] for s in scores)
        import random
        r = random.uniform(0, total)

        cumulative = 0
        for source, score in scores:
            cumulative += score
            if r <= cumulative:
                return source

        return sources[0]


# =============================================================================
# Parallel Operations Manager
# =============================================================================


class ParallelOperationsManager:
    """Manager for parallel module operations."""

    def __init__(self, max_workers: int = MAX_PARALLEL_WORKERS):
        self.max_workers = max_workers

    def discover_parallel(
        self,
        discover_funcs: List[Tuple[str, Callable[[], Dict[str, Any]]]],
    ) -> Dict[str, Dict[str, Any]]:
        """Discover modules from multiple sources in parallel."""
        all_modules = {}
        errors = []

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_source = {
                executor.submit(func): name
                for name, func in discover_funcs
            }

            for future in as_completed(future_to_source):
                source_name = future_to_source[future]
                try:
                    modules = future.result()
                    for module_name, info in modules.items():
                        info["source"] = source_name
                        if module_name not in all_modules:
                            all_modules[module_name] = info
                except Exception as e:
                    errors.append({"source": source_name, "error": str(e)})
                    logger.error(f"Discovery failed for {source_name}: {e}")

        if errors:
            logger.warning(f"Discovery completed with {len(errors)} errors")

        return all_modules

    def sync_parallel(
        self,
        sync_funcs: List[Tuple[str, Callable[[], Dict[str, Any]]]],
    ) -> Dict[str, Dict[str, Any]]:
        """Sync multiple modules in parallel."""
        results = {}

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_module = {
                executor.submit(func): name
                for name, func in sync_funcs
            }

            for future in as_completed(future_to_module):
                module_name = future_to_module[future]
                try:
                    result = future.result()
                    results[module_name] = result
                except Exception as e:
                    results[module_name] = {
                        "status": "failed",
                        "error": str(e),
                    }

        return results

    async def discover_async(
        self,
        discover_coros: List[Tuple[str, Any]],
    ) -> Dict[str, Dict[str, Any]]:
        """Async version of parallel discovery."""
        all_modules = {}

        async def safe_discover(name: str, coro):
            try:
                return name, await coro
            except Exception as e:
                logger.error(f"Async discovery failed for {name}: {e}")
                return name, {}

        tasks = [safe_discover(name, coro) for name, coro in discover_coros]
        results = await asyncio.gather(*tasks)

        for source_name, modules in results:
            for module_name, info in modules.items():
                info["source"] = source_name
                if module_name not in all_modules:
                    all_modules[module_name] = info

        return all_modules


# =============================================================================
# Enhanced Distributed Module Service
# =============================================================================


class EnhancedDistributedService:
    """
    Enhanced distributed module service with enterprise features.

    Features:
    - Multi-level caching (Memory + Redis + Disk)
    - Parallel discovery and sync
    - Circuit breaker pattern
    - Health monitoring
    - Load balancing
    - Retry with backoff
    """

    def __init__(
        self,
        db: Session,
        cache_dir: Path,
        redis_client: Optional[Any] = None,
    ):
        self.db = db

        # Initialize components
        self.cache = MultiLevelCache(
            disk_path=cache_dir / "cache",
            redis_client=redis_client,
        )
        self.health_monitor = HealthMonitor()
        self.circuit_registry = CircuitBreakerRegistry()
        self.load_balancer = LoadBalancer(self.health_monitor)
        self.parallel_manager = ParallelOperationsManager()

        # Source configurations
        self._sources: Dict[str, Dict[str, Any]] = {}
        self._local_cache_dir = cache_dir / "modules"
        self._local_cache_dir.mkdir(parents=True, exist_ok=True)

    def add_source(
        self,
        name: str,
        source_type: str,
        config: Dict[str, Any],
        priority: int = 10,
    ) -> None:
        """Add a remote source with health tracking."""
        self._sources[name] = {
            "type": source_type,
            "config": config,
            "priority": priority,
        }
        # Initialize health metrics
        self.health_monitor.get_metrics(name)
        logger.info(f"Added source {name} ({source_type}) with priority {priority}")

    def discover_modules(
        self,
        use_cache: bool = True,
        parallel: bool = True,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Discover modules with caching and parallel execution.
        """
        cache_key = "module_discovery_all"

        # Check cache
        if use_cache:
            cached = self.cache.get(cache_key)
            if cached:
                logger.debug("Module discovery served from cache")
                return cached

        # Prepare discovery functions
        discover_funcs = []
        for name, source in self._sources.items():
            breaker = self.circuit_registry.get(name)
            if breaker.can_execute():
                discover_funcs.append((
                    name,
                    lambda n=name, s=source: self._discover_from_source(n, s),
                ))

        # Execute discovery
        if parallel and len(discover_funcs) > 1:
            modules = self.parallel_manager.discover_parallel(discover_funcs)
        else:
            modules = {}
            for name, func in discover_funcs:
                try:
                    result = func()
                    modules.update(result)
                except Exception as e:
                    logger.error(f"Discovery failed for {name}: {e}")

        # Cache results
        self.cache.set(cache_key, modules, ttl=CACHE_TTL_SECONDS)

        return modules

    @retry_with_backoff(max_attempts=3)
    def _discover_from_source(
        self,
        source_name: str,
        source: Dict[str, Any],
    ) -> Dict[str, Dict[str, Any]]:
        """Discover from a single source with metrics."""
        start_time = time.perf_counter()
        breaker = self.circuit_registry.get(source_name)

        try:
            # Import and call discovery based on type
            # This is a placeholder - actual implementation would call source-specific methods
            modules = self._do_discovery(source)

            latency_ms = (time.perf_counter() - start_time) * 1000
            self.health_monitor.record_request(source_name, True, latency_ms)
            breaker.record_success()

            return modules

        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            self.health_monitor.record_request(source_name, False, latency_ms, str(e))
            breaker.record_failure()
            raise

    def _do_discovery(self, source: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Actual discovery implementation (placeholder)."""
        # This would be implemented based on source type
        return {}

    def sync_modules(
        self,
        module_names: Optional[List[str]] = None,
        force: bool = False,
        parallel: bool = True,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Sync modules with parallel execution.
        """
        # Discover if needed
        all_modules = self.discover_modules()

        if module_names is None:
            module_names = list(all_modules.keys())

        # Filter modules that need sync
        to_sync = []
        for name in module_names:
            if name not in all_modules:
                continue

            cache_key = f"module_synced_{name}"
            if not force and self.cache.get(cache_key):
                continue

            to_sync.append(name)

        if not to_sync:
            return {"message": "All modules up-to-date"}

        # Prepare sync functions
        sync_funcs = [
            (name, lambda n=name: self._sync_module(n, all_modules[n]))
            for name in to_sync
        ]

        # Execute sync
        if parallel and len(sync_funcs) > 1:
            results = self.parallel_manager.sync_parallel(sync_funcs)
        else:
            results = {}
            for name, func in sync_funcs:
                results[name] = func()

        return results

    @retry_with_backoff(max_attempts=2)
    def _sync_module(
        self,
        module_name: str,
        module_info: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Sync a single module."""
        source_name = module_info.get("source")
        if not source_name:
            return {"status": "failed", "error": "No source specified"}

        breaker = self.circuit_registry.get(source_name)
        if not breaker.can_execute():
            return {"status": "skipped", "error": "Circuit breaker open"}

        start_time = time.perf_counter()

        try:
            # Actual sync implementation would go here
            result = {"status": "synced", "version": module_info.get("version")}

            latency_ms = (time.perf_counter() - start_time) * 1000
            self.health_monitor.record_request(source_name, True, latency_ms)
            breaker.record_success()

            # Mark as synced in cache
            self.cache.set(f"module_synced_{module_name}", True, ttl=3600)

            return result

        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            self.health_monitor.record_request(source_name, False, latency_ms, str(e))
            breaker.record_failure()
            return {"status": "failed", "error": str(e)}

    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive status of the distributed system."""
        return {
            "sources": {
                name: {
                    **info,
                    "circuit_breaker": self.circuit_registry.get(name).get_status(),
                }
                for name, info in self._sources.items()
            },
            "health": self.health_monitor.get_all_metrics(),
            "cache": self.cache.memory.get_stats(),
            "circuit_breakers": self.circuit_registry.get_all_status(),
        }

    def invalidate_cache(self, module_name: Optional[str] = None) -> None:
        """Invalidate cache for a module or all modules."""
        if module_name:
            self.cache.invalidate(f"module_synced_{module_name}")
        else:
            self.cache.invalidate_pattern("module_*")
            self.cache.invalidate("module_discovery_all")


# =============================================================================
# Factory Function
# =============================================================================


def create_enhanced_distributed_service(
    db: Session,
    cache_dir: Optional[Path] = None,
    redis_url: Optional[str] = None,
) -> EnhancedDistributedService:
    """
    Factory function to create enhanced distributed service.

    Args:
        db: Database session
        cache_dir: Cache directory path
        redis_url: Redis connection URL (optional)

    Returns:
        Configured EnhancedDistributedService instance
    """
    cache_dir = cache_dir or Path("modules/.distributed_cache")

    redis_client = None
    if redis_url:
        try:
            import redis
            redis_client = redis.from_url(redis_url)
            redis_client.ping()
            logger.info("Redis connection established for distributed cache")
        except Exception as e:
            logger.warning(f"Redis connection failed, using memory+disk cache: {e}")

    return EnhancedDistributedService(
        db=db,
        cache_dir=cache_dir,
        redis_client=redis_client,
    )
