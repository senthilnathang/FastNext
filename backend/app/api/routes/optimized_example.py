"""
Example route demonstrating all optimization patterns and best practices.
"""

import asyncio
import time
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
from app.models.role import Role
from app.core.cache import cached, cache_manager
from app.core.database_optimization import (
    cache_query, monitor_query_performance, optimized_session
)
from app.core.async_optimization import (
    async_cached, async_retry, async_timeout, task_manager
)
from app.core.performance_monitoring import performance_collector, MetricType

router = APIRouter()


# Response models with optimization
class OptimizedUserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role_count: int
    last_login: Optional[datetime]
    created_at: datetime
    
    class Config:
        orm_mode = True
        validate_assignment = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class PaginatedUsersResponse(BaseModel):
    users: List[OptimizedUserResponse]
    total: int
    page: int
    size: int
    pages: int
    cache_hit: bool = False
    execution_time: float


class UserAnalyticsResponse(BaseModel):
    total_users: int
    active_users: int
    users_by_role: dict
    growth_rate: float
    average_session_time: float


# Optimized user service with all patterns
class OptimizedUserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cache = cache_manager.get_cache("users")
    
    @async_cached(ttl=300, max_size=100)
    @monitor_query_performance(slow_threshold=0.5)
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID with caching and monitoring"""
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    @cache_query(cache_name="users", ttl=180)
    async def get_users_paginated(
        self, 
        skip: int, 
        limit: int,
        search: Optional[str] = None
    ) -> tuple[List[User], int]:
        """Get paginated users with search and caching"""
        query = select(User).options(selectinload(User.roles))
        count_query = select(func.count(User.id))
        
        if search:
            search_filter = User.full_name.ilike(f"%{search}%")
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)
        
        # Execute queries concurrently
        users_task = self.db.execute(query.offset(skip).limit(limit))
        count_task = self.db.execute(count_query)
        
        users_result, count_result = await asyncio.gather(users_task, count_task)
        
        users = users_result.scalars().all()
        total = count_result.scalar()
        
        return users, total
    
    @async_retry(max_attempts=3, delay=1.0)
    @async_timeout(5.0)
    async def get_user_analytics(self) -> UserAnalyticsResponse:
        """Get comprehensive user analytics with retry and timeout"""
        # Use task manager for concurrent operations
        analytics_tasks = [
            self._get_total_users(),
            self._get_active_users(),
            self._get_users_by_role(),
            self._calculate_growth_rate(),
            self._get_average_session_time()
        ]
        
        results = await task_manager.execute_concurrent(
            analytics_tasks,
            max_concurrent=5
        )
        
        return UserAnalyticsResponse(
            total_users=results[0],
            active_users=results[1],
            users_by_role=results[2],
            growth_rate=results[3],
            average_session_time=results[4]
        )
    
    async def _get_total_users(self) -> int:
        """Get total user count"""
        result = await self.db.execute(select(func.count(User.id)))
        return result.scalar()
    
    async def _get_active_users(self) -> int:
        """Get active user count (logged in within 30 days)"""
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        result = await self.db.execute(
            select(func.count(User.id))
            .where(User.last_login >= thirty_days_ago)
        )
        return result.scalar()
    
    async def _get_users_by_role(self) -> dict:
        """Get user count by role"""
        result = await self.db.execute(
            select(Role.name, func.count(User.id))
            .join(User.roles)
            .group_by(Role.name)
        )
        return dict(result.all())
    
    async def _calculate_growth_rate(self) -> float:
        """Calculate user growth rate"""
        # Simplified calculation
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        total_users = await self.db.execute(select(func.count(User.id)))
        recent_users = await self.db.execute(
            select(func.count(User.id))
            .where(User.created_at >= thirty_days_ago)
        )
        
        total = total_users.scalar()
        recent = recent_users.scalar()
        
        return (recent / total * 100) if total > 0 else 0.0
    
    async def _get_average_session_time(self) -> float:
        """Get average session time (mock implementation)"""
        # In real implementation, this would query session data
        return 15.5  # minutes


@router.get(
    "/users",
    response_model=PaginatedUsersResponse,
    summary="Get paginated users with optimization",
    description="Demonstrates all optimization patterns: caching, monitoring, async patterns"
)
async def get_optimized_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search term for user names"),
    db: AsyncSession = Depends(get_db)
) -> PaginatedUsersResponse:
    """
    Get paginated users with comprehensive optimization:
    - Response caching
    - Database query optimization
    - Performance monitoring
    - Concurrent execution
    """
    start_time = time.time()
    cache_hit = False
    
    # Check cache first
    cache_key = f"users_page:{skip}:{limit}:{search or 'all'}"
    cache = cache_manager.get_cache("api_responses")
    
    cached_response = await cache.get(cache_key) if cache else None
    if cached_response:
        cache_hit = True
        cached_response["cache_hit"] = True
        cached_response["execution_time"] = time.time() - start_time
        
        # Record cache hit metric
        performance_collector.add_metric(
            MetricType.CACHE_HIT_RATE, 
            1.0,
            labels={"endpoint": "get_users", "cache_type": "response"}
        )
        
        return PaginatedUsersResponse(**cached_response)
    
    # Cache miss - execute query
    async with optimized_session(lambda: db) as session:
        service = OptimizedUserService(session)
        users, total = await service.get_users_paginated(skip, limit, search)
    
    # Transform to response models
    user_responses = []
    for user in users:
        user_responses.append(OptimizedUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role_count=len(user.roles),
            last_login=user.last_login,
            created_at=user.created_at
        ))
    
    execution_time = time.time() - start_time
    pages = (total + limit - 1) // limit  # Ceiling division
    
    response_data = PaginatedUsersResponse(
        users=user_responses,
        total=total,
        page=(skip // limit) + 1,
        size=limit,
        pages=pages,
        cache_hit=cache_hit,
        execution_time=execution_time
    )
    
    # Cache the response
    if cache:
        await cache.set(cache_key, response_data.dict(), ttl=300)
    
    # Record performance metrics
    performance_collector.add_metric(
        MetricType.RESPONSE_TIME, 
        execution_time,
        labels={"endpoint": "get_users", "cache_miss": "true"}
    )
    
    performance_collector.add_metric(
        MetricType.CACHE_HIT_RATE, 
        0.0,
        labels={"endpoint": "get_users", "cache_type": "response"}
    )
    
    return response_data


@router.get(
    "/users/{user_id}",
    response_model=OptimizedUserResponse,
    summary="Get user by ID with optimization"
)
async def get_optimized_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
) -> OptimizedUserResponse:
    """Get single user with caching and monitoring"""
    start_time = time.time()
    
    service = OptimizedUserService(db)
    user = await service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    execution_time = time.time() - start_time
    
    # Record metrics
    performance_collector.add_metric(
        MetricType.RESPONSE_TIME,
        execution_time,
        labels={"endpoint": "get_user_by_id"}
    )
    
    return OptimizedUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role_count=len(user.roles),
        last_login=user.last_login,
        created_at=user.created_at
    )


@router.get(
    "/analytics",
    response_model=UserAnalyticsResponse,
    summary="Get user analytics with async optimization"
)
async def get_user_analytics(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> UserAnalyticsResponse:
    """
    Get comprehensive user analytics demonstrating:
    - Concurrent task execution
    - Retry mechanisms
    - Timeout handling
    - Background task scheduling
    """
    start_time = time.time()
    
    service = OptimizedUserService(db)
    analytics = await service.get_user_analytics()
    
    execution_time = time.time() - start_time
    
    # Schedule background task to update analytics cache
    background_tasks.add_task(
        update_analytics_cache,
        analytics.dict(),
        execution_time
    )
    
    # Record performance metrics
    performance_collector.add_metric(
        MetricType.RESPONSE_TIME,
        execution_time,
        labels={"endpoint": "get_analytics", "complexity": "high"}
    )
    
    return analytics


async def update_analytics_cache(analytics_data: dict, execution_time: float):
    """Background task to update analytics cache"""
    cache = cache_manager.get_cache("api_responses")
    if cache:
        await cache.set("user_analytics", analytics_data, ttl=1800)  # 30 minutes
        
        # Log cache update
        logger.info(
            "Analytics cache updated",
            execution_time=execution_time,
            data_size=len(str(analytics_data))
        )


@router.get(
    "/health-check",
    summary="Health check with performance metrics"
)
async def optimized_health_check() -> dict:
    """Health check that includes optimization metrics"""
    start_time = time.time()
    
    # Check various system components
    health_tasks = [
        check_database_health(),
        check_cache_health(),
        check_async_performance()
    ]
    
    db_health, cache_health, async_health = await asyncio.gather(
        *health_tasks,
        return_exceptions=True
    )
    
    execution_time = time.time() - start_time
    
    # Get optimization metrics
    optimization_metrics = {
        "task_manager": task_manager.get_metrics(),
        "performance_collector": {
            "total_requests": performance_collector.stats.get("get_users", {}).get("total_queries", 0),
            "cache_hits": performance_collector.stats.get("cache_hits", 0)
        }
    }
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "execution_time": execution_time,
        "components": {
            "database": db_health if not isinstance(db_health, Exception) else str(db_health),
            "cache": cache_health if not isinstance(cache_health, Exception) else str(cache_health),
            "async_tasks": async_health if not isinstance(async_health, Exception) else str(async_health)
        },
        "optimization_metrics": optimization_metrics
    }


async def check_database_health() -> dict:
    """Check database health"""
    # Implementation would test database connectivity
    return {"status": "healthy", "response_time": 0.05}


async def check_cache_health() -> dict:
    """Check cache health"""
    cache = cache_manager.get_cache("users")
    if cache:
        stats = await cache.get_stats()
        return {
            "status": "healthy",
            "hit_rate": stats.hit_rate,
            "total_requests": stats.hits + stats.misses
        }
    return {"status": "not_configured"}


async def check_async_performance() -> dict:
    """Check async task performance"""
    metrics = task_manager.get_metrics()
    return {
        "status": "healthy" if metrics["failed_tasks"] == 0 else "degraded",
        "metrics": metrics
    }


# Example of batch processing endpoint
@router.post(
    "/users/batch-process",
    summary="Batch process users with optimization"
)
async def batch_process_users(
    user_ids: List[int],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Batch process users demonstrating:
    - Batch processing optimization
    - Background task scheduling
    - Resource management
    """
    if len(user_ids) > 1000:
        raise HTTPException(
            status_code=400, 
            detail="Batch size too large. Maximum 1000 users."
        )
    
    start_time = time.time()
    
    # Process in batches to prevent resource exhaustion
    batch_size = 50
    total_processed = 0
    
    for i in range(0, len(user_ids), batch_size):
        batch = user_ids[i:i + batch_size]
        
        # Schedule background processing for this batch
        background_tasks.add_task(
            process_user_batch,
            batch,
            batch_number=i // batch_size + 1
        )
        
        total_processed += len(batch)
    
    execution_time = time.time() - start_time
    
    return {
        "message": "Batch processing initiated",
        "total_users": len(user_ids),
        "batches_scheduled": (len(user_ids) + batch_size - 1) // batch_size,
        "execution_time": execution_time,
        "status": "processing"
    }


async def process_user_batch(user_ids: List[int], batch_number: int):
    """Background task for processing user batch"""
    logger.info(f"Processing batch {batch_number} with {len(user_ids)} users")
    
    # Simulate batch processing with controlled concurrency
    tasks = [process_single_user(user_id) for user_id in user_ids]
    
    results = await task_manager.execute_concurrent(
        tasks,
        max_concurrent=10
    )
    
    successful = len([r for r in results if not isinstance(r, Exception)])
    failed = len(results) - successful
    
    logger.info(
        f"Batch {batch_number} completed",
        successful=successful,
        failed=failed,
        total=len(user_ids)
    )


async def process_single_user(user_id: int):
    """Process a single user (mock implementation)"""
    # Simulate processing time
    await asyncio.sleep(0.1)
    return f"Processed user {user_id}"