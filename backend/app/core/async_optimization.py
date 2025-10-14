"""
Advanced async optimization patterns and utilities for FastAPI applications.
"""

import asyncio
import inspect
import logging
import threading
import time
import weakref
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from functools import partial, wraps
from typing import (
    Any,
    Awaitable,
    Callable,
    Coroutine,
    Dict,
    List,
    Optional,
    TypeVar,
    Union,
)

logger = logging.getLogger(__name__)

# Type variables
T = TypeVar("T")
F = TypeVar("F", bound=Callable[..., Any])


class ExecutionStrategy(Enum):
    """Async execution strategies"""

    SEQUENTIAL = "sequential"
    CONCURRENT = "concurrent"
    PARALLEL = "parallel"
    BATCH = "batch"
    STREAMING = "streaming"


class TaskPriority(Enum):
    """Task priority levels"""

    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class TaskMetrics:
    """Metrics for async task execution"""

    task_id: str
    start_time: float
    end_time: Optional[float] = None
    execution_time: Optional[float] = None
    status: str = "pending"
    error: Optional[str] = None
    memory_usage: Optional[float] = None

    def complete(self, error: Optional[Exception] = None):
        """Mark task as completed"""
        self.end_time = time.time()
        self.execution_time = self.end_time - self.start_time
        self.status = "failed" if error else "completed"
        if error:
            self.error = str(error)


class AsyncTaskManager:
    """Advanced async task management with optimization features"""

    def __init__(self, max_concurrent_tasks: int = 100):
        self.max_concurrent_tasks = max_concurrent_tasks
        self.semaphore = asyncio.Semaphore(max_concurrent_tasks)
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.task_metrics: Dict[str, TaskMetrics] = {}
        self.task_queue: Dict[TaskPriority, deque] = {
            priority: deque() for priority in TaskPriority
        }
        self._lock = asyncio.Lock()
        self._task_counter = 0

    async def execute_task(
        self,
        coro: Awaitable[T],
        priority: TaskPriority = TaskPriority.NORMAL,
        timeout: Optional[float] = None,
        task_id: Optional[str] = None,
    ) -> T:
        """Execute a single async task with optimization"""
        if task_id is None:
            self._task_counter += 1
            task_id = f"task_{self._task_counter}"

        metrics = TaskMetrics(task_id=task_id, start_time=time.time())
        self.task_metrics[task_id] = metrics

        async with self.semaphore:
            try:
                if timeout:
                    result = await asyncio.wait_for(coro, timeout=timeout)
                else:
                    result = await coro

                metrics.complete()
                return result

            except Exception as e:
                metrics.complete(error=e)
                logger.error(f"Task {task_id} failed: {e}")
                raise
            finally:
                if task_id in self.active_tasks:
                    del self.active_tasks[task_id]

    async def execute_concurrent(
        self,
        tasks: List[Awaitable[Any]],
        max_concurrent: Optional[int] = None,
        return_exceptions: bool = True,
    ) -> List[Any]:
        """Execute multiple tasks concurrently with controlled concurrency"""
        max_concurrent = max_concurrent or self.max_concurrent_tasks

        # Create semaphore for this batch
        batch_semaphore = asyncio.Semaphore(max_concurrent)

        async def controlled_task(coro: Awaitable[Any]) -> Any:
            async with batch_semaphore:
                return await coro

        controlled_tasks = [controlled_task(task) for task in tasks]
        return await asyncio.gather(
            *controlled_tasks, return_exceptions=return_exceptions
        )

    async def execute_batch(
        self,
        tasks: List[Awaitable[Any]],
        batch_size: int = 10,
        delay_between_batches: float = 0.1,
    ) -> List[Any]:
        """Execute tasks in batches to prevent overwhelming the system"""
        results = []

        for i in range(0, len(tasks), batch_size):
            batch = tasks[i : i + batch_size]
            batch_results = await asyncio.gather(*batch, return_exceptions=True)
            results.extend(batch_results)

            # Small delay between batches to prevent resource exhaustion
            if i + batch_size < len(tasks):
                await asyncio.sleep(delay_between_batches)

        return results

    async def execute_with_priority(self) -> None:
        """Execute queued tasks based on priority"""
        while True:
            task_to_execute = None

            # Check priority queues from highest to lowest
            for priority in sorted(TaskPriority, key=lambda x: x.value, reverse=True):
                queue = self.task_queue[priority]
                if queue:
                    task_to_execute = queue.popleft()
                    break

            if task_to_execute:
                await self.execute_task(
                    task_to_execute["coro"], task_id=task_to_execute["task_id"]
                )
            else:
                await asyncio.sleep(0.1)  # Wait for new tasks

    def get_metrics(self) -> Dict[str, Any]:
        """Get task execution metrics"""
        completed_tasks = [
            m for m in self.task_metrics.values() if m.status in ["completed", "failed"]
        ]

        if not completed_tasks:
            return {"total_tasks": 0}

        execution_times = [
            m.execution_time for m in completed_tasks if m.execution_time
        ]

        return {
            "total_tasks": len(self.task_metrics),
            "completed_tasks": len(
                [m for m in completed_tasks if m.status == "completed"]
            ),
            "failed_tasks": len([m for m in completed_tasks if m.status == "failed"]),
            "active_tasks": len(self.active_tasks),
            "avg_execution_time": (
                sum(execution_times) / len(execution_times) if execution_times else 0
            ),
            "max_execution_time": max(execution_times) if execution_times else 0,
            "min_execution_time": min(execution_times) if execution_times else 0,
        }


class AsyncResourcePool:
    """Pool for managing async resources with optimization"""

    def __init__(
        self,
        resource_factory: Callable[[], Awaitable[Any]],
        max_size: int = 10,
        min_size: int = 2,
        idle_timeout: float = 300.0,
    ):
        self.resource_factory = resource_factory
        self.max_size = max_size
        self.min_size = min_size
        self.idle_timeout = idle_timeout

        self.pool: deque = deque()
        self.active_resources: weakref.WeakSet = weakref.WeakSet()
        self.pool_size = 0
        self.created_count = 0
        self.borrowed_count = 0
        self.returned_count = 0

        self._lock = asyncio.Lock()
        self._condition = asyncio.Condition(self._lock)

    async def acquire(self, timeout: Optional[float] = None) -> Any:
        """Acquire a resource from the pool"""
        async with self._condition:
            # Wait for available resource or pool capacity
            while self.pool_size >= self.max_size and not self.pool:
                if timeout:
                    try:
                        await asyncio.wait_for(self._condition.wait(), timeout=timeout)
                    except asyncio.TimeoutError:
                        raise asyncio.TimeoutError("Timeout waiting for resource")
                else:
                    await self._condition.wait()

            # Try to get from pool first
            if self.pool:
                resource = self.pool.popleft()
                self.borrowed_count += 1
                return resource

            # Create new resource if under limit
            if self.pool_size < self.max_size:
                resource = await self.resource_factory()
                self.active_resources.add(resource)
                self.pool_size += 1
                self.created_count += 1
                self.borrowed_count += 1
                return resource

            raise RuntimeError("Unable to acquire resource")

    async def release(self, resource: Any):
        """Release a resource back to the pool"""
        async with self._condition:
            if resource in self.active_resources:
                self.pool.append(resource)
                self.returned_count += 1
                self._condition.notify()

    async def close(self):
        """Close all resources in the pool"""
        async with self._lock:
            while self.pool:
                resource = self.pool.popleft()
                if hasattr(resource, "close"):
                    await resource.close()

            self.pool_size = 0

    @asynccontextmanager
    async def get_resource(self, timeout: Optional[float] = None):
        """Context manager for acquiring and releasing resources"""
        resource = await self.acquire(timeout)
        try:
            yield resource
        finally:
            await self.release(resource)

    def get_stats(self) -> Dict[str, Any]:
        """Get pool statistics"""
        return {
            "pool_size": self.pool_size,
            "available_resources": len(self.pool),
            "active_resources": len(self.active_resources),
            "created_count": self.created_count,
            "borrowed_count": self.borrowed_count,
            "returned_count": self.returned_count,
            "max_size": self.max_size,
            "min_size": self.min_size,
        }


class AsyncCache:
    """High-performance async cache with TTL and size limits"""

    def __init__(self, max_size: int = 1000, default_ttl: float = 300.0):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._access_order: deque = deque()
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        async with self._lock:
            if key not in self._cache:
                return None

            entry = self._cache[key]

            # Check TTL
            if time.time() > entry["expires_at"]:
                del self._cache[key]
                if key in self._access_order:
                    self._access_order.remove(key)
                return None

            # Update access order (LRU)
            if key in self._access_order:
                self._access_order.remove(key)
            self._access_order.append(key)

            return entry["value"]

    async def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        """Set value in cache"""
        async with self._lock:
            ttl = ttl or self.default_ttl
            expires_at = time.time() + ttl

            # Ensure capacity
            while len(self._cache) >= self.max_size and key not in self._cache:
                if self._access_order:
                    lru_key = self._access_order.popleft()
                    if lru_key in self._cache:
                        del self._cache[lru_key]

            # Store entry
            self._cache[key] = {
                "value": value,
                "expires_at": expires_at,
                "created_at": time.time(),
            }

            # Update access order
            if key in self._access_order:
                self._access_order.remove(key)
            self._access_order.append(key)

    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                if key in self._access_order:
                    self._access_order.remove(key)
                return True
            return False

    async def clear(self) -> None:
        """Clear all cache entries"""
        async with self._lock:
            self._cache.clear()
            self._access_order.clear()


def async_cached(
    ttl: float = 300.0,
    max_size: int = 100,
    key_generator: Optional[Callable[..., str]] = None,
):
    """Decorator for caching async function results"""
    cache = AsyncCache(max_size=max_size, default_ttl=ttl)

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if key_generator:
                cache_key = key_generator(*args, **kwargs)
            else:
                cache_key = (
                    f"{func.__name__}:{hash(str(args) + str(sorted(kwargs.items())))}"
                )

            # Try cache first
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl)

            return result

        # Add cache management methods
        wrapper.cache_clear = cache.clear
        wrapper.cache_delete = cache.delete
        wrapper.cache_stats = lambda: {
            "size": len(cache._cache),
            "max_size": cache.max_size,
            "ttl": cache.default_ttl,
        }

        return wrapper

    return decorator


def async_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,),
):
    """Decorator for retrying async functions with exponential backoff"""

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt == max_attempts - 1:
                        break

                    # Calculate delay with exponential backoff
                    wait_time = delay * (backoff_factor**attempt)
                    logger.warning(
                        f"Attempt {attempt + 1} failed for {func.__name__}: {e}. "
                        f"Retrying in {wait_time:.2f}s..."
                    )
                    await asyncio.sleep(wait_time)

            # All attempts failed
            logger.error(f"All {max_attempts} attempts failed for {func.__name__}")
            raise last_exception

        return wrapper

    return decorator


def async_timeout(timeout_seconds: float):
    """Decorator for adding timeout to async functions"""

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(
                    func(*args, **kwargs), timeout=timeout_seconds
                )
            except asyncio.TimeoutError:
                logger.error(
                    f"Function {func.__name__} timed out after {timeout_seconds}s"
                )
                raise

        return wrapper

    return decorator


def async_rate_limit(calls_per_second: float):
    """Decorator for rate limiting async functions"""
    min_interval = 1.0 / calls_per_second
    last_called = [0.0]  # Use list to make it mutable in closure

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            now = time.time()
            time_since_last = now - last_called[0]

            if time_since_last < min_interval:
                sleep_time = min_interval - time_since_last
                await asyncio.sleep(sleep_time)

            last_called[0] = time.time()
            return await func(*args, **kwargs)

        return wrapper

    return decorator


class AsyncCircuitBreaker:
    """Circuit breaker pattern for async functions"""

    def __init__(
        self,
        failure_threshold: int = 5,
        timeout: float = 60.0,
        expected_exception: type = Exception,
    ):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.expected_exception = expected_exception

        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half-open
        self._lock = asyncio.Lock()

    async def call(self, func: Callable[..., Awaitable[T]], *args, **kwargs) -> T:
        """Call function through circuit breaker"""
        async with self._lock:
            if self.state == "open":
                if time.time() - self.last_failure_time < self.timeout:
                    raise Exception("Circuit breaker is open")
                else:
                    self.state = "half-open"

            try:
                result = await func(*args, **kwargs)

                # Success - reset circuit breaker
                if self.state == "half-open":
                    self.state = "closed"
                self.failure_count = 0

                return result

            except self.expected_exception as e:
                self.failure_count += 1
                self.last_failure_time = time.time()

                if self.failure_count >= self.failure_threshold:
                    self.state = "open"
                    logger.warning(
                        f"Circuit breaker opened after {self.failure_count} failures"
                    )

                raise e


def circuit_breaker(
    failure_threshold: int = 5,
    timeout: float = 60.0,
    expected_exception: type = Exception,
):
    """Decorator for circuit breaker pattern"""
    cb = AsyncCircuitBreaker(failure_threshold, timeout, expected_exception)

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await cb.call(func, *args, **kwargs)

        return wrapper

    return decorator


class AsyncBatchProcessor:
    """Process items in batches with async optimization"""

    def __init__(
        self,
        batch_size: int = 100,
        max_wait_time: float = 1.0,
        max_concurrent_batches: int = 5,
    ):
        self.batch_size = batch_size
        self.max_wait_time = max_wait_time
        self.max_concurrent_batches = max_concurrent_batches

        self.pending_items: List[Any] = []
        self.semaphore = asyncio.Semaphore(max_concurrent_batches)
        self._lock = asyncio.Lock()
        self._batch_event = asyncio.Event()
        self._processor_task: Optional[asyncio.Task] = None
        self._running = False

    async def add_item(self, item: Any) -> None:
        """Add item to be processed"""
        async with self._lock:
            self.pending_items.append(item)

            if len(self.pending_items) >= self.batch_size:
                self._batch_event.set()

    async def process_batch(
        self, processor: Callable[[List[Any]], Awaitable[Any]]
    ) -> None:
        """Process batches continuously"""
        self._running = True

        while self._running:
            try:
                # Wait for batch to be ready or timeout
                await asyncio.wait_for(
                    self._batch_event.wait(), timeout=self.max_wait_time
                )
            except asyncio.TimeoutError:
                pass  # Process whatever we have

            async with self._lock:
                if not self.pending_items:
                    self._batch_event.clear()
                    continue

                # Get batch
                batch = self.pending_items[: self.batch_size]
                self.pending_items = self.pending_items[self.batch_size :]

                if not self.pending_items:
                    self._batch_event.clear()

            # Process batch
            if batch:
                async with self.semaphore:
                    try:
                        await processor(batch)
                    except Exception as e:
                        logger.error(f"Batch processing failed: {e}")

    async def start_processing(
        self, processor: Callable[[List[Any]], Awaitable[Any]]
    ) -> None:
        """Start batch processing"""
        if self._processor_task:
            return

        self._processor_task = asyncio.create_task(self.process_batch(processor))

    async def stop_processing(self) -> None:
        """Stop batch processing"""
        self._running = False
        if self._processor_task:
            self._processor_task.cancel()
            try:
                await self._processor_task
            except asyncio.CancelledError:
                pass
            self._processor_task = None


class AsyncEventEmitter:
    """Async event emitter with optimization features"""

    def __init__(self):
        self.listeners: Dict[str, List[Callable]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def on(self, event: str, listener: Callable) -> None:
        """Add event listener"""
        async with self._lock:
            self.listeners[event].append(listener)

    async def off(self, event: str, listener: Callable) -> None:
        """Remove event listener"""
        async with self._lock:
            if event in self.listeners and listener in self.listeners[event]:
                self.listeners[event].remove(listener)

    async def emit(self, event: str, *args, **kwargs) -> None:
        """Emit event to all listeners"""
        async with self._lock:
            listeners = self.listeners.get(event, []).copy()

        # Execute listeners concurrently
        tasks = []
        for listener in listeners:
            if inspect.iscoroutinefunction(listener):
                tasks.append(listener(*args, **kwargs))
            else:
                # Wrap sync function in async
                tasks.append(
                    asyncio.create_task(asyncio.to_thread(listener, *args, **kwargs))
                )

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


# Global instances
task_manager = AsyncTaskManager()
event_emitter = AsyncEventEmitter()


async def optimize_async_operations():
    """Setup async optimizations"""
    # Configure event loop optimizations
    loop = asyncio.get_running_loop()

    # Set custom exception handler
    def exception_handler(loop, context):
        exception = context.get("exception")
        if exception:
            logger.error(f"Uncaught async exception: {exception}")
        else:
            logger.error(f"Async error: {context['message']}")

    loop.set_exception_handler(exception_handler)

    logger.info("Async optimizations configured")


# Utility functions for common async patterns
async def gather_with_concurrency(
    tasks: List[Awaitable[T]], max_concurrent: int = 10
) -> List[T]:
    """Gather tasks with limited concurrency"""
    return await task_manager.execute_concurrent(tasks, max_concurrent=max_concurrent)


async def run_with_timeout(coro: Awaitable[T], timeout: float) -> T:
    """Run coroutine with timeout"""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        logger.error(f"Operation timed out after {timeout}s")
        raise


@asynccontextmanager
async def async_context_timer(name: str):
    """Context manager for timing async operations"""
    start_time = time.time()
    try:
        yield
    finally:
        execution_time = time.time() - start_time
        logger.info(f"Async operation '{name}' completed in {execution_time:.3f}s")
