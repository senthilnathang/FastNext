"""
Advanced database query optimization and monitoring for FastAPI applications.
"""

import asyncio
import logging
import threading
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Tuple, TypeVar, Union

import sqlalchemy as sa
from app.core.cache import cache_manager, cached
from app.core.config import settings
from sqlalchemy import event, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Query, Session
from sqlalchemy.pool import QueuePool
from sqlalchemy.sql import Select

logger = logging.getLogger(__name__)

# Type variables
T = TypeVar("T")
F = TypeVar("F", bound=Callable[..., Any])


class QueryOptimizationLevel(Enum):
    """Query optimization levels"""

    DISABLED = "disabled"
    BASIC = "basic"
    AGGRESSIVE = "aggressive"
    EXPERIMENTAL = "experimental"


@dataclass
class QueryProfile:
    """Query execution profile"""

    query: str
    execution_time: float
    rows_examined: Optional[int] = None
    rows_returned: Optional[int] = None
    index_used: Optional[bool] = None
    table_scans: int = 0
    sort_operations: int = 0
    join_operations: int = 0
    memory_usage: Optional[int] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)

    @property
    def efficiency_score(self) -> float:
        """Calculate query efficiency score (0-100)"""
        base_score = 100.0

        # Penalize long execution times
        if self.execution_time > 1.0:
            base_score -= min(50, self.execution_time * 10)

        # Penalize table scans
        base_score -= self.table_scans * 20

        # Penalize excessive sorting
        base_score -= self.sort_operations * 10

        # Bonus for index usage
        if self.index_used:
            base_score += 10

        return max(0, min(100, base_score))


@dataclass
class QueryStats:
    """Query performance statistics"""

    total_queries: int = 0
    total_time: float = 0.0
    average_time: float = 0.0
    slowest_time: float = 0.0
    fastest_time: float = float("inf")
    cache_hits: int = 0
    cache_misses: int = 0
    errors: int = 0

    def update(self, execution_time: float, from_cache: bool = False):
        """Update statistics with new query execution"""
        self.total_queries += 1
        self.total_time += execution_time
        self.average_time = self.total_time / self.total_queries
        self.slowest_time = max(self.slowest_time, execution_time)
        self.fastest_time = min(self.fastest_time, execution_time)

        if from_cache:
            self.cache_hits += 1
        else:
            self.cache_misses += 1

    @property
    def cache_hit_rate(self) -> float:
        total = self.cache_hits + self.cache_misses
        return self.cache_hits / total if total > 0 else 0.0


class SlowQueryDetector:
    """Detect and log slow database queries"""

    def __init__(self, threshold_seconds: float = 1.0, max_queries: int = 1000):
        self.threshold = threshold_seconds
        self.slow_queries: deque = deque(maxlen=max_queries)
        self.query_patterns: Dict[str, int] = defaultdict(int)

    def check_query(self, query: str, execution_time: float) -> bool:
        """Check if query is slow and log it"""
        if execution_time >= self.threshold:
            profile = QueryProfile(query=query, execution_time=execution_time)
            self.slow_queries.append(profile)

            # Track patterns
            query_pattern = self._normalize_query(query)
            self.query_patterns[query_pattern] += 1

            logger.warning(
                f"Slow query detected: {execution_time:.3f}s - {query[:200]}..."
            )
            return True
        return False

    def _normalize_query(self, query: str) -> str:
        """Normalize query for pattern detection"""
        import re

        # Remove literals and normalize whitespace
        normalized = re.sub(r"\b\d+\b", "?", query)
        normalized = re.sub(r"'[^']*'", "'?'", normalized)
        normalized = re.sub(r"\s+", " ", normalized.strip())
        return normalized

    def get_top_slow_patterns(self, limit: int = 10) -> List[Tuple[str, int]]:
        """Get the most common slow query patterns"""
        return sorted(self.query_patterns.items(), key=lambda x: x[1], reverse=True)[
            :limit
        ]


class QueryOptimizer:
    """Query optimization and analysis engine"""

    def __init__(
        self, optimization_level: QueryOptimizationLevel = QueryOptimizationLevel.BASIC
    ):
        self.optimization_level = optimization_level
        self.stats: Dict[str, QueryStats] = defaultdict(QueryStats)
        self.slow_query_detector = SlowQueryDetector()
        self._query_cache: Dict[str, Any] = {}
        self._lock = threading.Lock()

    async def optimize_query(
        self, query: Union[str, Select], session: AsyncSession
    ) -> Union[str, Select]:
        """Optimize a database query"""
        if self.optimization_level == QueryOptimizationLevel.DISABLED:
            return query

        if isinstance(query, str):
            return await self._optimize_raw_query(query, session)
        else:
            return await self._optimize_sqlalchemy_query(query, session)

    async def _optimize_raw_query(self, query: str, session: AsyncSession) -> str:
        """Optimize raw SQL query"""
        optimized = query

        if self.optimization_level in [
            QueryOptimizationLevel.AGGRESSIVE,
            QueryOptimizationLevel.EXPERIMENTAL,
        ]:
            # Add query hints for MySQL/PostgreSQL
            if "SELECT" in query.upper() and "LIMIT" not in query.upper():
                # Suggest adding LIMIT for potentially large result sets
                if "ORDER BY" in query.upper():
                    optimized += " LIMIT 1000"

        return optimized

    async def _optimize_sqlalchemy_query(
        self, query: Select, session: AsyncSession
    ) -> Select:
        """Optimize SQLAlchemy query"""
        optimized_query = query

        if self.optimization_level == QueryOptimizationLevel.BASIC:
            # Basic optimizations
            if not query._limit_clause:
                # Add default limit for safety
                optimized_query = query.limit(1000)

        elif self.optimization_level == QueryOptimizationLevel.AGGRESSIVE:
            # Aggressive optimizations
            optimized_query = query

            # Add eager loading hints
            if hasattr(query, "_from_obj") and query._from_obj:
                # Analyze relationships and suggest joinedload
                pass

        return optimized_query

    async def execute_with_profiling(
        self,
        query: Union[str, Select],
        session: AsyncSession,
        parameters: Optional[Dict] = None,
    ) -> Tuple[Any, QueryProfile]:
        """Execute query with performance profiling"""
        start_time = time.time()

        try:
            if isinstance(query, str):
                if parameters:
                    result = await session.execute(text(query), parameters)
                else:
                    result = await session.execute(text(query))
            else:
                result = await session.execute(query)

            execution_time = time.time() - start_time

            # Create profile
            profile = QueryProfile(query=str(query), execution_time=execution_time)

            # Update statistics
            query_key = self._get_query_key(query)
            with self._lock:
                self.stats[query_key].update(execution_time)

            # Check for slow queries
            self.slow_query_detector.check_query(str(query), execution_time)

            return result, profile

        except Exception as e:
            execution_time = time.time() - start_time
            query_key = self._get_query_key(query)
            with self._lock:
                self.stats[query_key].errors += 1
            raise

    def _get_query_key(self, query: Union[str, Select]) -> str:
        """Generate a unique key for query statistics"""
        import hashlib

        query_str = str(query)
        return hashlib.md5(query_str.encode()).hexdigest()[:16]

    def get_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        with self._lock:
            total_queries = sum(stats.total_queries for stats in self.stats.values())
            total_time = sum(stats.total_time for stats in self.stats.values())

            # Find slowest queries
            slowest_queries = sorted(
                [(key, stats.slowest_time) for key, stats in self.stats.items()],
                key=lambda x: x[1],
                reverse=True,
            )[:10]

            return {
                "summary": {
                    "total_queries": total_queries,
                    "total_execution_time": total_time,
                    "average_execution_time": (
                        total_time / total_queries if total_queries > 0 else 0
                    ),
                    "optimization_level": self.optimization_level.value,
                },
                "slowest_queries": slowest_queries,
                "slow_query_patterns": self.slow_query_detector.get_top_slow_patterns(),
                "cache_statistics": {
                    "total_hits": sum(
                        stats.cache_hits for stats in self.stats.values()
                    ),
                    "total_misses": sum(
                        stats.cache_misses for stats in self.stats.values()
                    ),
                    "hit_rate": (
                        sum(stats.cache_hit_rate for stats in self.stats.values())
                        / len(self.stats)
                        if self.stats
                        else 0
                    ),
                },
            }


class DatabaseConnectionOptimizer:
    """Optimize database connection settings and pooling"""

    @staticmethod
    def get_optimized_engine_config() -> Dict[str, Any]:
        """Get optimized database engine configuration"""
        return {
            # Connection pooling
            "poolclass": QueuePool,
            "pool_size": 20,
            "max_overflow": 30,
            "pool_timeout": 30,
            "pool_recycle": 3600,  # 1 hour
            "pool_pre_ping": True,
            # Performance settings
            "echo": False,  # Disable in production
            "echo_pool": False,
            "future": True,
            # Connection options
            "connect_args": {
                "server_side_cursors": True,
                "connect_timeout": 10,
                "command_timeout": 30,
            },
        }

    @staticmethod
    def setup_connection_events(engine: Engine):
        """Setup connection event handlers for optimization"""

        @event.listens_for(engine, "connect")
        def set_connection_options(dbapi_connection, connection_record):
            """Set connection-specific optimizations"""
            cursor = dbapi_connection.cursor()

            # PostgreSQL specific optimizations
            if hasattr(dbapi_connection, "autocommit"):
                try:
                    # Set connection parameters for better performance
                    cursor.execute("SET work_mem = '32MB'")
                    cursor.execute("SET maintenance_work_mem = '256MB'")
                    cursor.execute("SET effective_cache_size = '1GB'")
                    cursor.execute("SET random_page_cost = 1.1")
                    cursor.execute("SET seq_page_cost = 1.0")
                except Exception as e:
                    logger.debug(
                        f"Could not set PostgreSQL optimization parameters: {e}"
                    )

            cursor.close()

        @event.listens_for(engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            """Monitor connection checkout"""
            connection_record.checkout_time = time.time()

        @event.listens_for(engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            """Monitor connection checkin and usage"""
            if hasattr(connection_record, "checkout_time"):
                usage_time = time.time() - connection_record.checkout_time
                if usage_time > 10.0:  # Log long-running connections
                    logger.warning(
                        f"Long-running database connection: {usage_time:.2f}s"
                    )


# Query caching decorators
def cache_query(
    cache_name: str = "api_responses", ttl: int = 300, key_prefix: str = "query"
):
    """Cache database query results"""

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function arguments
            import hashlib

            key_data = f"{func.__name__}_{str(args)}_{str(sorted(kwargs.items()))}"
            cache_key = f"{key_prefix}_{hashlib.md5(key_data.encode()).hexdigest()}"

            # Get cache
            cache = cache_manager.get_cache(cache_name)
            if cache is None:
                cache = cache_manager.create_cache(cache_name)

            # Try cache first
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Query cache hit: {cache_key}")
                return cached_result

            # Execute query and cache result
            logger.debug(f"Query cache miss: {cache_key}")
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl)

            return result

        return wrapper

    return decorator


class BatchQueryExecutor:
    """Execute multiple queries efficiently in batches"""

    def __init__(self, session: AsyncSession, batch_size: int = 100):
        self.session = session
        self.batch_size = batch_size
        self._pending_queries: List[Tuple[Any, Dict]] = []

    def add_query(self, query: Union[str, Select], parameters: Optional[Dict] = None):
        """Add query to batch"""
        self._pending_queries.append((query, parameters or {}))

    async def execute_batch(self) -> List[Any]:
        """Execute all pending queries in batches"""
        results = []

        for i in range(0, len(self._pending_queries), self.batch_size):
            batch = self._pending_queries[i : i + self.batch_size]
            batch_results = await self._execute_query_batch(batch)
            results.extend(batch_results)

        self._pending_queries.clear()
        return results

    async def _execute_query_batch(self, queries: List[Tuple[Any, Dict]]) -> List[Any]:
        """Execute a single batch of queries"""
        tasks = []

        for query, parameters in queries:
            if isinstance(query, str):
                task = self.session.execute(text(query), parameters)
            else:
                task = self.session.execute(query)
            tasks.append(task)

        return await asyncio.gather(*tasks, return_exceptions=True)


@asynccontextmanager
async def optimized_session(
    session_factory, optimizer: Optional[QueryOptimizer] = None
):
    """Context manager for optimized database sessions"""
    async with session_factory() as session:
        if optimizer:
            session._query_optimizer = optimizer

        # Set session-level optimizations
        try:
            # PostgreSQL session optimizations
            await session.execute(text("SET statement_timeout = 30000"))  # 30 seconds
            await session.execute(text("SET lock_timeout = 10000"))  # 10 seconds
        except Exception:
            pass  # Ignore if not PostgreSQL or statements not supported

        yield session


class QueryAnalyzer:
    """Analyze query execution plans and suggest optimizations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze_query(self, query: Union[str, Select]) -> Dict[str, Any]:
        """Analyze query execution plan"""
        try:
            if isinstance(query, str):
                explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
                result = await self.session.execute(text(explain_query))
            else:
                # For SQLAlchemy queries, convert to string first
                compiled = query.compile(compile_kwargs={"literal_binds": True})
                explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {compiled}"
                result = await self.session.execute(text(explain_query))

            plan_data = result.fetchone()[0]
            return self._parse_execution_plan(plan_data)

        except Exception as e:
            logger.error(f"Query analysis failed: {e}")
            return {"error": str(e)}

    def _parse_execution_plan(self, plan_data: List[Dict]) -> Dict[str, Any]:
        """Parse PostgreSQL execution plan"""
        if not plan_data:
            return {}

        plan = plan_data[0]["Plan"]

        analysis = {
            "total_cost": plan.get("Total Cost", 0),
            "execution_time": plan.get("Actual Total Time", 0),
            "rows_returned": plan.get("Actual Rows", 0),
            "node_type": plan.get("Node Type"),
            "uses_index": "Index" in plan.get("Node Type", ""),
            "recommendations": [],
        }

        # Generate recommendations
        if analysis["execution_time"] > 1000:  # > 1 second
            analysis["recommendations"].append("Consider optimizing this slow query")

        if not analysis["uses_index"] and analysis["rows_returned"] > 1000:
            analysis["recommendations"].append(
                "Consider adding an index for better performance"
            )

        if plan.get("Node Type") == "Seq Scan":
            analysis["recommendations"].append(
                "Sequential scan detected - consider adding an index"
            )

        return analysis


# Global query optimizer instance
query_optimizer = QueryOptimizer(optimization_level=QueryOptimizationLevel.BASIC)


def setup_database_optimization():
    """Setup database optimization components"""
    logger.info("Setting up database optimization...")

    # Initialize caches for database queries
    from app.core.cache import initialize_caches

    initialize_caches()

    logger.info("Database optimization setup completed")


# Performance monitoring decorators
def monitor_query_performance(slow_threshold: float = 1.0):
    """Decorator to monitor query performance"""

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time

                # Update global stats
                query_optimizer.stats[func.__name__].update(execution_time)

                # Check for slow queries
                if execution_time > slow_threshold:
                    logger.warning(
                        f"Slow database operation: {func.__name__} took {execution_time:.3f}s"
                    )

                return result

            except Exception as e:
                execution_time = time.time() - start_time
                query_optimizer.stats[func.__name__].errors += 1
                logger.error(f"Database operation failed: {func.__name__} - {e}")
                raise

        return wrapper

    return decorator


# Database health monitoring
class DatabaseHealthMonitor:
    """Monitor database health and performance metrics"""

    def __init__(self, session_factory):
        self.session_factory = session_factory
        self.health_metrics = {
            "connection_count": 0,
            "active_queries": 0,
            "slow_queries_5min": 0,
            "last_check": datetime.utcnow(),
        }

    async def check_health(self) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        async with self.session_factory() as session:
            try:
                # Test basic connectivity
                await session.execute(text("SELECT 1"))

                # Get database statistics (PostgreSQL specific)
                stats_query = """
                SELECT
                    (SELECT count(*) FROM pg_stat_activity) as active_connections,
                    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_queries
                """

                result = await session.execute(text(stats_query))
                row = result.fetchone()

                self.health_metrics.update(
                    {
                        "status": "healthy",
                        "connection_count": row[0] if row else 0,
                        "active_queries": row[1] if row else 0,
                        "last_check": datetime.utcnow(),
                    }
                )

                return self.health_metrics

            except Exception as e:
                self.health_metrics.update(
                    {
                        "status": "unhealthy",
                        "error": str(e),
                        "last_check": datetime.utcnow(),
                    }
                )
                return self.health_metrics
