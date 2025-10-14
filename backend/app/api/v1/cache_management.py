"""
Cache Management and Monitoring API Endpoints
Provides admin endpoints for cache control and performance monitoring
"""

import logging
from typing import Any, Dict, List, Optional, Set

from app.auth.deps import get_current_active_user
from app.auth.permissions import require_admin
from app.core.cache_optimization import (
    CachePolicy,
    cache_warming_service,
    get_cache_statistics,
    invalidation_strategy,
    query_cache_manager,
)
from app.core.redis_config import cache
from app.db.session import get_db
from app.models.user import User
from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter()
logger = logging.getLogger(__name__)


# Request/Response Models
class InvalidateCacheRequest(BaseModel):
    """Request model for cache invalidation"""

    tags: Optional[Set[str]] = None
    pattern: Optional[str] = None
    table_name: Optional[str] = None


class CacheWarmingRequest(BaseModel):
    """Request model for cache warming"""

    critical_queries: bool = True


class CacheKeyRequest(BaseModel):
    """Request model for single cache key operations"""

    key: str


@router.get("/cache/stats")
async def get_cache_stats(
    current_user: User = Depends(require_admin),
) -> Dict[str, Any]:
    """
    Get comprehensive cache statistics

    Requires: Admin role

    Returns:
    - Redis cache stats (hit ratio, memory usage, etc.)
    - Query cache stats (cached queries, hit counts)
    - Invalidation stats (tracked tags and keys)
    - Cache warming stats (scheduled jobs)
    """
    try:
        stats = await get_cache_statistics()

        return {
            "success": True,
            "data": stats,
            "summary": {
                "redis_hit_ratio": stats["redis"].get("hit_ratio", 0),
                "cached_queries": stats["query_cache"]["total_cached_queries"],
                "query_cache_hits": stats["query_cache"]["total_cache_hits"],
                "tracked_tags": stats["invalidation"]["registered_tags"],
            },
        }

    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cache statistics",
        )


@router.get("/cache/query-stats")
async def get_query_cache_stats(
    current_user: User = Depends(require_admin),
) -> Dict[str, Any]:
    """
    Get detailed query cache statistics

    Requires: Admin role

    Returns:
    - Total cached queries
    - Cache hit statistics
    - Top 10 most cached queries
    - Average hits per query
    """
    try:
        stats = query_cache_manager.get_stats()

        return {"success": True, "data": stats}

    except Exception as e:
        logger.error(f"Error getting query cache stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve query cache statistics",
        )


@router.post("/cache/invalidate")
async def invalidate_cache(
    request: InvalidateCacheRequest, current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Invalidate cache entries by tags, pattern, or table name

    Requires: Admin role

    Request body:
    - tags: Set[str] - Invalidate by tags (e.g., {"users", "active"})
    - pattern: str - Invalidate by pattern (e.g., "user:*")
    - table_name: str - Invalidate all entries related to a table

    Returns:
    - Number of invalidated entries
    """
    try:
        invalidated = 0

        if request.tags:
            invalidated = await invalidation_strategy.invalidate_by_tags(request.tags)

        elif request.pattern:
            invalidated = await invalidation_strategy.invalidate_by_pattern(
                request.pattern
            )

        elif request.table_name:
            invalidated = await invalidation_strategy.invalidate_table_related(
                request.table_name
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must provide tags, pattern, or table_name",
            )

        logger.info(
            f"Admin {current_user.username} invalidated {invalidated} cache entries"
        )

        return {
            "success": True,
            "data": {
                "invalidated_count": invalidated,
                "invalidated_by": (
                    "tags"
                    if request.tags
                    else "pattern" if request.pattern else "table"
                ),
            },
            "message": f"Successfully invalidated {invalidated} cache entries",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error invalidating cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to invalidate cache",
        )


@router.post("/cache/clear-all")
async def clear_all_cache(
    current_user: User = Depends(require_admin),
) -> Dict[str, Any]:
    """
    Clear ALL cache entries (use with caution!)

    Requires: Admin role

    WARNING: This will clear all cached data, which may temporarily
    degrade performance until cache is rebuilt.
    """
    try:
        # Clear Redis cache
        await cache.clear_pattern("*")

        # Clear invalidation registry
        invalidation_strategy.dependency_graph.clear()
        invalidation_strategy.tag_registry.clear()

        # Clear query cache stats
        query_cache_manager.query_stats.clear()

        logger.warning(f"Admin {current_user.username} cleared ALL cache")

        return {
            "success": True,
            "message": "All cache cleared successfully",
            "warning": "Cache will be rebuilt as requests come in",
        }

    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear cache",
        )


@router.post("/cache/warm")
async def warm_cache(
    request: CacheWarmingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> Dict[str, Any]:
    """
    Proactively warm cache with critical queries

    Requires: Admin role

    Request body:
    - critical_queries: bool - Warm critical frequently-accessed queries

    Returns:
    - Number of queries warmed
    """
    try:
        warmed = 0

        if request.critical_queries:
            warmed = await cache_warming_service.warm_critical_queries(db)

        logger.info(f"Admin {current_user.username} warmed {warmed} cache entries")

        return {
            "success": True,
            "data": {"warmed_count": warmed},
            "message": f"Successfully warmed {warmed} cache entries",
        }

    except Exception as e:
        logger.error(f"Error warming cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to warm cache",
        )


@router.get("/cache/key/{cache_key}")
async def get_cache_entry(
    cache_key: str, current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get a specific cache entry by key

    Requires: Admin role

    Returns:
    - Cache entry value (if exists)
    - Cache metadata
    """
    try:
        value = await cache.get(cache_key)

        if value is None:
            return {"success": True, "data": None, "message": "Cache key not found"}

        # Get tags if available
        tags = await cache.get(f"cache_tags:{cache_key}")

        return {
            "success": True,
            "data": {"key": cache_key, "value": value, "tags": tags or []},
        }

    except Exception as e:
        logger.error(f"Error getting cache entry: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cache entry",
        )


@router.delete("/cache/key/{cache_key}")
async def delete_cache_entry(
    cache_key: str, current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Delete a specific cache entry by key

    Requires: Admin role

    Returns:
    - Success status
    """
    try:
        deleted = await cache.delete(cache_key)

        return {
            "success": True,
            "data": {"deleted": deleted},
            "message": f"Cache key {'deleted' if deleted else 'not found'}",
        }

    except Exception as e:
        logger.error(f"Error deleting cache entry: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete cache entry",
        )


@router.get("/cache/tags")
async def get_cache_tags(current_user: User = Depends(require_admin)) -> Dict[str, Any]:
    """
    Get all registered cache invalidation tags

    Requires: Admin role

    Returns:
    - List of all tags
    - Tag -> key dependencies
    """
    try:
        tags_data = {}

        for tag, keys in invalidation_strategy.dependency_graph.items():
            tags_data[tag] = {
                "dependent_keys_count": len(keys),
                "dependent_keys": list(keys)[:10],  # Limit to first 10
            }

        return {
            "success": True,
            "data": {"total_tags": len(tags_data), "tags": tags_data},
        }

    except Exception as e:
        logger.error(f"Error getting cache tags: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cache tags",
        )


@router.get("/cache/performance-report")
async def get_cache_performance_report(
    current_user: User = Depends(require_admin),
) -> Dict[str, Any]:
    """
    Generate comprehensive cache performance report

    Requires: Admin role

    Returns:
    - Cache hit ratios
    - Memory usage
    - Query cache effectiveness
    - Recommendations for optimization
    """
    try:
        stats = await get_cache_statistics()

        # Calculate performance metrics
        redis_hit_ratio = stats["redis"].get("hit_ratio", 0)
        query_cache_hits = stats["query_cache"]["total_cache_hits"]
        query_cache_total = stats["query_cache"]["total_cached_queries"]

        # Generate recommendations
        recommendations = []

        if redis_hit_ratio < 70:
            recommendations.append(
                {
                    "category": "redis",
                    "severity": "warning",
                    "message": f"Redis cache hit ratio is low ({redis_hit_ratio:.1f}%). Target: >80%",
                    "action": "Consider increasing cache TTLs or warming critical queries",
                }
            )

        if query_cache_total < 10:
            recommendations.append(
                {
                    "category": "query_cache",
                    "severity": "info",
                    "message": f"Only {query_cache_total} queries cached",
                    "action": "Use @cached_query decorator on frequently-accessed queries",
                }
            )

        if not recommendations:
            recommendations.append(
                {
                    "category": "general",
                    "severity": "success",
                    "message": "Cache performance is optimal",
                    "action": "Continue monitoring",
                }
            )

        return {
            "success": True,
            "data": {
                "timestamp": __import__("time").time(),
                "performance_metrics": {
                    "redis_hit_ratio_percent": redis_hit_ratio,
                    "query_cache_hits": query_cache_hits,
                    "cached_queries": query_cache_total,
                    "avg_hits_per_query": stats["query_cache"]["avg_hits_per_query"],
                },
                "redis_stats": stats["redis"],
                "query_cache_stats": stats["query_cache"],
                "invalidation_stats": stats["invalidation"],
            },
            "recommendations": recommendations,
        }

    except Exception as e:
        logger.error(f"Error generating cache performance report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate performance report",
        )
