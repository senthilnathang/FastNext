"""
Database Performance Monitoring API
Provides endpoints for database performance metrics and monitoring
"""

import logging
from typing import Any, Dict

from app.auth.deps import get_current_active_user
from app.auth.permissions import require_admin
from app.db.session import get_db
from app.models.user import User
from app.utils.db_monitoring import (
    DatabaseMonitor,
    generate_performance_report,
    get_system_metrics,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/performance/pool-stats")
async def get_pool_stats(current_user: User = Depends(require_admin)) -> Dict[str, Any]:
    """
    Get connection pool statistics

    Requires: Admin role
    """
    try:
        monitor = DatabaseMonitor()
        stats = monitor.get_connection_pool_stats()
        return {"success": True, "data": stats}
    except Exception as e:
        logger.error(f"Error getting pool stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pool statistics",
        )


@router.get("/performance/database-stats")
async def get_database_stats(
    db: Session = Depends(get_db), current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get database statistics including size, connections, and slow queries

    Requires: Admin role
    """
    try:
        monitor = DatabaseMonitor()
        stats = await monitor.get_database_stats(db)
        return {"success": True, "data": stats}
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve database statistics",
        )


@router.get("/performance/index-usage")
async def get_index_usage(
    db: Session = Depends(get_db), current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get index usage statistics

    Requires: Admin role
    """
    try:
        monitor = DatabaseMonitor()
        usage_stats = monitor.get_index_usage_stats(db)
        unused_indexes = monitor.get_unused_indexes(db)

        return {
            "success": True,
            "data": {"most_used": usage_stats, "potentially_unused": unused_indexes},
        }
    except Exception as e:
        logger.error(f"Error getting index usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve index usage statistics",
        )


@router.get("/performance/cache-stats")
async def get_cache_stats(
    db: Session = Depends(get_db), current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get database cache hit ratio

    Requires: Admin role
    Target: >90% cache hit ratio for good performance
    """
    try:
        monitor = DatabaseMonitor()
        cache_stats = monitor.get_cache_hit_ratio(db)

        # Add performance assessment
        ratio = cache_stats.get("cache_hit_ratio_percent", 0)
        if ratio >= 90:
            assessment = "excellent"
        elif ratio >= 80:
            assessment = "good"
        elif ratio >= 70:
            assessment = "fair"
        else:
            assessment = "poor"

        cache_stats["performance_assessment"] = assessment

        return {"success": True, "data": cache_stats}
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cache statistics",
        )


@router.get("/performance/table-bloat")
async def get_table_bloat(
    db: Session = Depends(get_db), current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get table bloat information

    Requires: Admin role
    """
    try:
        monitor = DatabaseMonitor()
        bloat_info = monitor.get_table_bloat(db)

        return {"success": True, "data": bloat_info}
    except Exception as e:
        logger.error(f"Error getting table bloat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve table bloat information",
        )


@router.get("/performance/system-metrics")
async def get_system_metrics_endpoint(
    current_user: User = Depends(require_admin),
) -> Dict[str, Any]:
    """
    Get system-level metrics (CPU, memory, etc.)

    Requires: Admin role
    """
    try:
        metrics = get_system_metrics()
        return {"success": True, "data": metrics}
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system metrics",
        )


@router.get("/performance/full-report")
async def get_full_performance_report(
    db: Session = Depends(get_db), current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Generate comprehensive performance report

    Requires: Admin role
    Returns: Complete performance analysis including:
    - Connection pool stats
    - Database statistics
    - Cache hit ratios
    - Index usage
    - System metrics
    """
    try:
        report = await generate_performance_report(db)
        return {
            "success": True,
            "data": report,
            "recommendations": generate_recommendations(report),
        }
    except Exception as e:
        logger.error(f"Error generating performance report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate performance report",
        )


def generate_recommendations(report: Dict[str, Any]) -> list:
    """Generate performance recommendations based on report"""
    recommendations = []

    # Check connection pool
    pool = report.get("connection_pool", {})
    if pool.get("checked_out_connections", 0) > pool.get("pool_size", 0) * 0.8:
        recommendations.append(
            {
                "category": "connection_pool",
                "severity": "warning",
                "message": "Connection pool usage is high. Consider increasing pool_size.",
                "action": "Increase pool_size in database configuration",
            }
        )

    # Check cache hit ratio
    cache = report.get("cache_hit_ratio", {})
    ratio = cache.get("cache_hit_ratio_percent", 0)
    if ratio < 80:
        recommendations.append(
            {
                "category": "cache",
                "severity": "warning",
                "message": f"Cache hit ratio is low ({ratio}%). Target: >90%",
                "action": "Increase shared_buffers in PostgreSQL config or optimize queries",
            }
        )

    # Check unused indexes
    unused = report.get("unused_indexes", [])
    if len(unused) > 5:
        recommendations.append(
            {
                "category": "indexes",
                "severity": "info",
                "message": f"Found {len(unused)} potentially unused indexes",
                "action": "Review and consider dropping unused indexes to save space",
            }
        )

    # Check system metrics
    system = report.get("system_metrics", {})
    memory_percent = system.get("memory_percent", 0)
    if memory_percent > 80:
        recommendations.append(
            {
                "category": "system",
                "severity": "warning",
                "message": f"High memory usage ({memory_percent}%)",
                "action": "Monitor memory usage and consider scaling",
            }
        )

    return (
        recommendations
        if recommendations
        else [
            {
                "category": "general",
                "severity": "success",
                "message": "All metrics look good!",
                "action": "Continue monitoring",
            }
        ]
    )
