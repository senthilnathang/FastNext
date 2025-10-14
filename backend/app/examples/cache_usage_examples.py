"""
Cache Usage Examples for FastNext Framework
Demonstrates how to use the multi-level caching system
"""

from typing import List

from app.core.cache_optimization import (
    CachePolicy,
    cache_warming_service,
    cached_query,
    invalidation_strategy,
    query_cache_manager,
)
from app.core.redis_config import CacheStrategy, cache
from app.db.session import get_db
from app.middleware.enhanced_cache_middleware import cache_policy_decorator
from app.models.user import User
from app.utils.cache_invalidation_hooks import (
    BatchInvalidation,
    batch_invalidation,
    invalidate_cache,
)
from app.utils.query_cache_integration import CachedQuery, cached_db_query
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter()


# ============================================================================
# Example 1: Cached API Endpoint with Cache Policy
# ============================================================================


@router.get("/users/active")
@cache_policy_decorator(CachePolicy.redis_cache(ttl=600, tags={"users", "active"}))
async def get_active_users_cached(db: Session = Depends(get_db)):
    """
    Endpoint with explicit cache policy
    - Cached for 10 minutes
    - Tagged with 'users' and 'active'
    - Invalidated when users are created/updated/deleted
    """
    users = db.query(User).filter(User.is_active == True).all()
    return {"users": users}


# ============================================================================
# Example 2: Cached Database Query Function
# ============================================================================


@cached_db_query(ttl=600, tags={"users", "stats"})
async def get_user_statistics(db: Session) -> dict:
    """
    Cached database query with decorator
    - Automatically cached for 10 minutes
    - Tagged for invalidation
    - Returns same result until invalidated or expired
    """
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
    }


# ============================================================================
# Example 3: Query Cache with Context Manager
# ============================================================================


@router.get("/users/by-role/{role_id}")
async def get_users_by_role(role_id: int, db: Session = Depends(get_db)):
    """
    Use CachedQuery context manager for fine-grained control
    """
    async with CachedQuery(
        db, ttl=300, tags={"users", "roles", f"role:{role_id}"}  # 5 minutes
    ) as cache_ctx:
        # This query will be cached
        users = await cache_ctx.execute(
            db.query(User).join(User.roles).filter(User.roles.any(id=role_id))
        )

    return {"users": users}


# ============================================================================
# Example 4: Manual Cache Management
# ============================================================================


@router.post("/users/{user_id}/activate")
@invalidate_cache("users", "active_users", "user_stats")
async def activate_user(user_id: int, db: Session = Depends(get_db)):
    """
    Function with manual cache invalidation
    - Invalidates specific cache tags after execution
    """
    user = db.query(User).filter(User.id == user_id).first()
    user.is_active = True
    db.commit()

    return {"message": "User activated", "user_id": user_id}


# ============================================================================
# Example 5: Batch Operations with Batch Invalidation
# ============================================================================


@router.post("/users/bulk-create")
@batch_invalidation
async def bulk_create_users(users_data: List[dict], db: Session = Depends(get_db)):
    """
    Batch operation with optimized invalidation
    - All invalidations are batched and flushed at end
    - Prevents invalidation storm
    """
    created_users = []

    for user_data in users_data:
        user = User(**user_data)
        db.add(user)
        created_users.append(user)

    db.commit()

    # Cache invalidation happens automatically here (batched)
    return {"created": len(created_users), "users": created_users}


# Alternative: Using context manager for batch invalidation
@router.post("/users/bulk-update")
async def bulk_update_users(updates: List[dict], db: Session = Depends(get_db)):
    """
    Batch operations using BatchInvalidation context manager
    """
    updated_users = []

    async with BatchInvalidation():
        for update in updates:
            user = db.query(User).filter(User.id == update["id"]).first()
            for key, value in update.items():
                setattr(user, key, value)
            updated_users.append(user)

        db.commit()
        # All invalidations flushed here

    return {"updated": len(updated_users)}


# ============================================================================
# Example 6: Cache Warming
# ============================================================================


async def warm_user_cache(db: Session):
    """
    Warm critical user queries
    Called on startup or scheduled intervals
    """
    # Warm active users count
    active_count = db.query(User).filter(User.is_active == True).count()
    await query_cache_manager.cache_query_result(
        query="SELECT COUNT(*) FROM users WHERE is_active = true",
        result=active_count,
        ttl=CacheStrategy.USER_CACHE_TTL,
        tags={"users", "stats", "count"},
    )

    # Warm user list
    users = db.query(User).limit(100).all()
    await query_cache_manager.cache_query_result(
        query="SELECT * FROM users LIMIT 100",
        result=users,
        ttl=CacheStrategy.USER_CACHE_TTL,
        tags={"users", "list"},
    )


@router.post("/cache/warm")
async def trigger_cache_warming(db: Session = Depends(get_db)):
    """
    Trigger manual cache warming
    """
    # Warm critical queries
    warmed = await cache_warming_service.warm_critical_queries(db)

    # Warm custom queries
    await warm_user_cache(db)

    return {"warmed_queries": warmed + 2}


# ============================================================================
# Example 7: Programmatic Cache Invalidation
# ============================================================================


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete user with manual cache invalidation
    """
    user = db.query(User).filter(User.id == user_id).first()
    db.delete(user)
    db.commit()

    # Invalidate specific user cache
    await invalidation_strategy.invalidate_by_tags(
        {"users", f"user:{user_id}", "user_stats"}
    )

    # Or invalidate entire users table cache
    # await invalidation_strategy.invalidate_table_related('users')

    return {"message": "User deleted and cache invalidated"}


# ============================================================================
# Example 8: Custom Cache Key and TTL
# ============================================================================


async def get_user_dashboard_data(user_id: int, db: Session) -> dict:
    """
    Custom caching with manual control
    """
    cache_key = f"dashboard:user:{user_id}"

    # Try to get from cache
    cached_data = await cache.get(cache_key)
    if cached_data:
        return cached_data

    # Fetch fresh data
    user = db.query(User).filter(User.id == user_id).first()
    dashboard_data = {
        "user": user,
        "stats": get_user_statistics(db),
        # ... more dashboard data
    }

    # Cache with custom TTL
    await cache.set(cache_key, dashboard_data, ttl=300)  # 5 minutes

    # Register for invalidation
    await invalidation_strategy.register_cache_entry(
        cache_key, tags={"dashboard", f"user:{user_id}"}
    )

    return dashboard_data


# ============================================================================
# Example 9: Conditional Caching
# ============================================================================


@cached_query(
    ttl=CacheStrategy.API_RESPONSE_TTL,
    tags={"users"},
    bypass_on=lambda: False,  # Condition to bypass cache
)
async def get_users_conditional(
    db: Session, include_inactive: bool = False
) -> List[User]:
    """
    Conditional caching based on parameters
    """
    query = db.query(User)

    if not include_inactive:
        query = query.filter(User.is_active == True)

    return query.all()


# ============================================================================
# Example 10: Cache Statistics and Monitoring
# ============================================================================


@router.get("/cache/stats/custom")
async def get_custom_cache_stats():
    """
    Get custom cache statistics
    """
    # Get query cache stats
    query_stats = query_cache_manager.get_stats()

    # Get Redis cache stats
    redis_stats = await cache.get_stats()

    # Custom metrics
    return {
        "query_cache": {
            "total_queries": query_stats["total_cached_queries"],
            "total_hits": query_stats["total_cache_hits"],
            "hit_ratio": query_stats["avg_hits_per_query"],
        },
        "redis": {
            "hit_ratio": redis_stats.get("hit_ratio", 0),
            "memory": redis_stats.get("used_memory", "0B"),
            "connected_clients": redis_stats.get("connected_clients", 0),
        },
    }


# ============================================================================
# Example 11: Full Cache Policy with All Options
# ============================================================================


@router.get("/reports/monthly")
@cache_policy_decorator(
    CachePolicy(
        ttl=3600,  # 1 hour
        cache_levels=[
            # CacheLevel.BROWSER,  # Browser cache
            # CacheLevel.CDN,      # CDN cache
            CacheLevel.REDIS  # Redis cache
        ],
        invalidation_tags={"reports", "monthly", "analytics"},
        vary_by=["user", "role"],  # Vary by user and role
        stale_while_revalidate=300,  # Serve stale for 5 min while refreshing
        stale_if_error=3600,  # Serve stale for 1 hour if error
    )
)
async def get_monthly_report(db: Session = Depends(get_db)):
    """
    Complex cache policy with multiple options
    - 1 hour TTL
    - Varies by user and role
    - Stale-while-revalidate support
    - Tagged for invalidation
    """
    # Generate report...
    return {"report": "Monthly analytics data"}


# ============================================================================
# Example 12: Integration with Existing Code
# ============================================================================


# Before (no caching):
async def get_dashboard_old(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    stats = db.query(User).count()
    return {"user": user, "total_users": stats}


# After (with caching):
@cached_db_query(ttl=300, tags={"dashboard", "users"})
async def get_dashboard_cached(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    stats = db.query(User).count()
    return {"user": user, "total_users": stats}
