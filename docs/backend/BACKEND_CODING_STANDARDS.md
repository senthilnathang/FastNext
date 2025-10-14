# FastNext Backend Coding Standards & Optimization Guidelines

## Table of Contents
1. [General Principles](#general-principles)
2. [Code Organization](#code-organization)
3. [Performance Optimization](#performance-optimization)
4. [Database Optimization](#database-optimization)
5. [Async Programming Patterns](#async-programming-patterns)
6. [Caching Strategies](#caching-strategies)
7. [API Design](#api-design)
8. [Security Standards](#security-standards)
9. [Monitoring & Observability](#monitoring--observability)
10. [Testing Standards](#testing-standards)

## General Principles

### Code Quality
- Follow PEP 8 style guidelines with line length of 100 characters
- Use type hints for all function signatures and class attributes
- Write comprehensive docstrings using Google style
- Maintain consistent naming conventions (snake_case for variables and functions)
- Keep functions focused and under 50 lines when possible

### Performance-First Mindset
- Always consider performance implications of code changes
- Use profiling tools to identify bottlenecks before optimization
- Implement caching at appropriate layers (application, database, CDN)
- Optimize database queries with proper indexing and query analysis
- Use async/await patterns for I/O-bound operations

### Error Handling
- Use custom exception classes for different error types
- Implement comprehensive logging with structured data
- Provide meaningful error messages with context
- Always clean up resources in finally blocks or context managers

## Code Organization

### Directory Structure
```
app/
├── api/                 # API route handlers
├── core/               # Core system components
│   ├── cache.py        # Caching system
│   ├── database_optimization.py
│   ├── performance_monitoring.py
│   └── async_optimization.py
├── models/             # Database models
├── schemas/            # Pydantic schemas
├── services/           # Business logic services
├── middleware/         # Custom middleware
└── utils/              # Utility functions
```

### Module Design
- Keep modules focused on single responsibilities
- Use dependency injection for testability
- Implement clear interfaces between layers
- Avoid circular imports through proper layering

## Performance Optimization

### Async Programming Best Practices

```python
# ✅ Good: Use async context managers for resources
async with get_db() as db:
    result = await db.execute(query)

# ✅ Good: Concurrent execution for independent tasks
async def process_data():
    tasks = [
        fetch_user_data(user_id),
        fetch_permissions(user_id),
        fetch_preferences(user_id)
    ]
    user_data, permissions, preferences = await asyncio.gather(*tasks)

# ❌ Bad: Sequential execution of independent tasks
async def process_data_bad():
    user_data = await fetch_user_data(user_id)
    permissions = await fetch_permissions(user_id)
    preferences = await fetch_preferences(user_id)
```

### Caching Implementation

```python
from app.core.cache import cached, cache_manager

# ✅ Cache expensive operations
@cached(cache_name="users", ttl=600)
async def get_user_with_permissions(user_id: int) -> UserWithPermissions:
    # Expensive database operations
    pass

# ✅ Use cache hierarchies for different data types
user_cache = cache_manager.create_cache("users", CacheConfig(
    backend=CacheBackend.HYBRID,
    default_ttl=600,
    max_size=1000
))
```

### Database Query Optimization

```python
from app.core.database_optimization import cache_query, monitor_query_performance

# ✅ Cache database queries
@cache_query(cache_name="api_responses", ttl=300)
async def get_user_list(skip: int, limit: int) -> List[User]:
    return await session.execute(
        select(User)
        .options(selectinload(User.roles))  # Eager loading
        .offset(skip)
        .limit(limit)
    )

# ✅ Monitor query performance
@monitor_query_performance(slow_threshold=1.0)
async def complex_analytics_query():
    # Complex query implementation
    pass
```

## Database Optimization

### Query Patterns

```python
# ✅ Good: Use proper joins and eager loading
query = (
    select(User)
    .options(
        selectinload(User.roles),
        selectinload(User.permissions)
    )
    .join(User.organization)
    .where(Organization.active == True)
)

# ✅ Good: Use database-level pagination
query = query.offset(skip).limit(limit)

# ❌ Bad: N+1 query problem
users = await session.execute(select(User))
for user in users:
    roles = await session.execute(
        select(Role).where(Role.user_id == user.id)
    )  # This creates N+1 queries
```

### Index Strategy
- Create indexes for frequently queried columns
- Use composite indexes for multi-column queries
- Monitor query execution plans regularly
- Remove unused indexes to improve write performance

```sql
-- ✅ Good: Composite index for common query patterns
CREATE INDEX idx_user_org_active ON users (organization_id, active, created_at);

-- ✅ Good: Partial index for specific conditions
CREATE INDEX idx_active_users ON users (email) WHERE active = true;
```

## Async Programming Patterns

### Task Management

```python
from app.core.async_optimization import task_manager, async_cached

# ✅ Use task manager for controlled concurrency
async def process_bulk_data(items: List[Any]):
    tasks = [process_item(item) for item in items]
    results = await task_manager.execute_concurrent(
        tasks,
        max_concurrent=20
    )
    return results

# ✅ Use async caching for expensive operations
@async_cached(ttl=300, max_size=100)
async def expensive_calculation(params: dict) -> dict:
    # Expensive async operation
    result = await complex_api_call(params)
    return result
```

### Circuit Breaker Pattern

```python
from app.core.async_optimization import circuit_breaker

# ✅ Protect external service calls
@circuit_breaker(failure_threshold=5, timeout=60.0)
async def call_external_api(data: dict) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(external_url, json=data)
        response.raise_for_status()
        return response.json()
```

### Resource Pooling

```python
from app.core.async_optimization import AsyncResourcePool

# ✅ Use resource pools for expensive connections
http_pool = AsyncResourcePool(
    resource_factory=lambda: httpx.AsyncClient(),
    max_size=10,
    min_size=2
)

async def make_request(url: str):
    async with http_pool.get_resource() as client:
        response = await client.get(url)
        return response.json()
```

## Caching Strategies

### Cache Hierarchies

```python
# ✅ Implement multi-level caching
class UserService:
    def __init__(self):
        self.l1_cache = MemoryCache(max_size=100)  # Fast, small
        self.l2_cache = RedisCache()               # Distributed, larger

    async def get_user(self, user_id: int) -> User:
        # Try L1 cache first
        user = await self.l1_cache.get(f"user:{user_id}")
        if user:
            return user

        # Try L2 cache
        user = await self.l2_cache.get(f"user:{user_id}")
        if user:
            await self.l1_cache.set(f"user:{user_id}", user)
            return user

        # Fetch from database
        user = await self.fetch_user_from_db(user_id)
        await self.l1_cache.set(f"user:{user_id}", user)
        await self.l2_cache.set(f"user:{user_id}", user)
        return user
```

### Cache Invalidation

```python
# ✅ Implement proper cache invalidation
class UserService:
    async def update_user(self, user_id: int, data: dict) -> User:
        user = await self.db_update_user(user_id, data)

        # Invalidate related caches
        await self.cache.delete(f"user:{user_id}")
        await self.cache.delete(f"user_permissions:{user_id}")
        await self.cache.delete_pattern(f"user_search:*")

        return user
```

## API Design

### Response Optimization

```python
from app.middleware.optimization_middleware import OptimizationMiddleware

# ✅ Use response optimization middleware
app.add_middleware(
    OptimizationMiddleware,
    config=OptimizationConfig(
        enable_compression=True,
        enable_response_caching=True,
        enable_minification=True
    )
)

# ✅ Implement proper response models
class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: datetime

    class Config:
        # Optimize serialization
        validate_assignment = True
        use_enum_values = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
```

### Pagination Standards

```python
# ✅ Consistent pagination pattern
class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

@router.get("/users", response_model=PaginatedResponse[UserResponse])
async def get_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    db: AsyncSession = Depends(get_db)
):
    users, total = await user_service.get_users_paginated(skip, limit)
    return PaginatedResponse(
        items=users,
        total=total,
        page=(skip // limit) + 1,
        size=limit,
        pages=math.ceil(total / limit)
    )
```

## Security Standards

### Input Validation

```python
# ✅ Comprehensive input validation
class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=100)

    @validator('password')
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain digit')
        return v
```

### Rate Limiting

```python
from app.core.async_optimization import async_rate_limit

# ✅ Implement rate limiting for sensitive operations
@async_rate_limit(calls_per_second=5.0)
async def login_attempt(credentials: LoginCredentials):
    # Login logic
    pass
```

## Monitoring & Observability

### Performance Monitoring

```python
from app.core.performance_monitoring import performance_collector

# ✅ Add performance monitoring to critical paths
@router.post("/process-data")
async def process_data(request: ProcessRequest):
    start_time = time.time()

    try:
        result = await data_processor.process(request.data)

        # Record metrics
        performance_collector.add_metric(
            MetricType.RESPONSE_TIME,
            time.time() - start_time,
            labels={"endpoint": "process_data", "status": "success"}
        )

        return result

    except Exception as e:
        performance_collector.add_metric(
            MetricType.ERROR_RATE,
            1.0,
            labels={"endpoint": "process_data", "error_type": type(e).__name__}
        )
        raise
```

### Structured Logging

```python
import structlog

logger = structlog.get_logger(__name__)

# ✅ Use structured logging with context
async def process_user_action(user_id: int, action: str):
    logger.info(
        "Processing user action",
        user_id=user_id,
        action=action,
        timestamp=datetime.utcnow().isoformat()
    )

    try:
        result = await perform_action(user_id, action)
        logger.info(
            "User action completed successfully",
            user_id=user_id,
            action=action,
            duration=time.time() - start_time
        )
        return result

    except Exception as e:
        logger.error(
            "User action failed",
            user_id=user_id,
            action=action,
            error=str(e),
            error_type=type(e).__name__
        )
        raise
```

## Testing Standards

### Performance Testing

```python
import pytest
import asyncio
from unittest.mock import AsyncMock

class TestUserService:
    @pytest.mark.asyncio
    async def test_get_user_performance(self):
        """Test that user retrieval meets performance requirements"""
        user_service = UserService()

        start_time = time.time()
        user = await user_service.get_user(1)
        execution_time = time.time() - start_time

        assert user is not None
        assert execution_time < 0.1  # Should complete within 100ms

    @pytest.mark.asyncio
    async def test_concurrent_user_requests(self):
        """Test system under concurrent load"""
        user_service = UserService()

        tasks = [
            user_service.get_user(i)
            for i in range(1, 101)  # 100 concurrent requests
        ]

        start_time = time.time()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time

        # Verify all requests completed successfully
        assert all(not isinstance(r, Exception) for r in results)
        # Verify reasonable total time
        assert total_time < 5.0  # Should complete within 5 seconds
```

### Cache Testing

```python
class TestCaching:
    @pytest.mark.asyncio
    async def test_cache_hit_rate(self):
        """Test cache effectiveness"""
        cache = MemoryCache(CacheConfig(max_size=100))

        # First call - cache miss
        result1 = await expensive_operation(cache, "test_key")

        # Second call - cache hit
        result2 = await expensive_operation(cache, "test_key")

        assert result1 == result2
        # Verify cache statistics
        stats = await cache.get_stats()
        assert stats.cache_hit_rate > 0.5
```

## Performance Budget

### Response Time Targets
- API endpoints: < 200ms (95th percentile)
- Database queries: < 100ms (average)
- Cache operations: < 10ms (average)
- Background tasks: < 5 seconds (average)

### Resource Limits
- Memory usage: < 80% of available
- CPU usage: < 70% sustained
- Database connections: < 80% of pool
- Cache hit rate: > 80% for frequently accessed data

### Monitoring Alerts
- Response time > 500ms (warning)
- Error rate > 5% (critical)
- Memory usage > 85% (warning)
- Database query time > 1s (warning)

## Deployment Standards

### Health Checks

```python
from app.core.performance_monitoring import get_performance_metrics

@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "performance": get_performance_metrics(),
        "dependencies": {
            "database": await check_database_health(),
            "cache": await check_cache_health(),
            "external_apis": await check_external_services()
        }
    }

    # Determine overall health
    if any(dep["status"] != "healthy" for dep in health_status["dependencies"].values()):
        health_status["status"] = "degraded"

    return health_status
```

### Configuration Management

```python
# ✅ Environment-specific optimization settings
class Settings(BaseSettings):
    # Performance settings
    CACHE_BACKEND: CacheBackend = CacheBackend.HYBRID
    DB_POOL_SIZE: int = 20
    MAX_CONCURRENT_REQUESTS: int = 100

    # Monitoring settings
    ENABLE_PERFORMANCE_MONITORING: bool = True
    PERFORMANCE_METRICS_INTERVAL: int = 10

    # Optimization settings
    ENABLE_RESPONSE_COMPRESSION: bool = True
    ENABLE_QUERY_OPTIMIZATION: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True
```

## Code Review Checklist

### Performance Review
- [ ] Are database queries optimized with proper indexing?
- [ ] Is caching implemented for expensive operations?
- [ ] Are async patterns used correctly for I/O operations?
- [ ] Is error handling comprehensive and performant?
- [ ] Are resource pools used for expensive connections?

### Security Review
- [ ] Is input validation comprehensive?
- [ ] Are rate limits implemented for sensitive operations?
- [ ] Is logging structured and secure (no sensitive data)?
- [ ] Are permissions checked at appropriate levels?

### Monitoring Review
- [ ] Are performance metrics collected?
- [ ] Is error tracking comprehensive?
- [ ] Are alerts configured for critical issues?
- [ ] Is logging structured and searchable?

## Migration and Optimization Guidelines

### Database Migrations
```python
# ✅ Performance-conscious migrations
"""Add index for user email lookup

Revision ID: 001
Revises: base
"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    # Create index concurrently to avoid locks
    op.create_index(
        'idx_users_email',
        'users',
        ['email'],
        postgresql_concurrently=True
    )

def downgrade():
    op.drop_index('idx_users_email', table_name='users')
```

### Performance Optimization Workflow
1. **Identify**: Use monitoring to identify bottlenecks
2. **Measure**: Benchmark current performance
3. **Optimize**: Implement targeted optimizations
4. **Validate**: Verify improvements with metrics
5. **Monitor**: Continuous monitoring post-deployment

This coding standards document ensures consistent, high-performance, and maintainable FastAPI applications with comprehensive optimization strategies.
