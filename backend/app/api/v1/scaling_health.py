"""
Horizontal Scaling Health Checks and Monitoring
Advanced health checks for load balancers and orchestration platforms
"""

import asyncio
import os
import time
from typing import Any, Dict

import psutil
from app.auth.deps import get_current_active_user
from app.auth.permissions import require_admin
from app.core.redis_config import cache, redis_manager
from app.db.replication import db_router, replication_monitor
from app.db.session import get_db
from app.models.user import User
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/health/liveness")
async def liveness_probe():
    """
    Kubernetes liveness probe
    Returns 200 if the application is alive (not deadlocked)

    Used by K8s to determine if container should be restarted
    """
    return {"status": "alive", "timestamp": time.time()}


@router.get("/health/readiness")
async def readiness_probe(db: Session = Depends(get_db)):
    """
    Kubernetes readiness probe
    Returns 200 only if the application is ready to serve traffic

    Checks:
    - Database connectivity
    - Redis connectivity
    - Critical dependencies
    """
    checks = {"database": False, "redis": False, "overall": False}

    # Check database
    try:
        db.execute("SELECT 1")
        checks["database"] = True
    except Exception as e:
        checks["database_error"] = str(e)

    # Check Redis
    try:
        if redis_manager.is_connected:
            await cache.set("health_check", "ok", 10)
            checks["redis"] = True
    except Exception as e:
        checks["redis_error"] = str(e)

    # Overall readiness
    checks["overall"] = checks["database"] and checks["redis"]

    status_code = (
        status.HTTP_200_OK if checks["overall"] else status.HTTP_503_SERVICE_UNAVAILABLE
    )

    return Response(
        content=str(checks), status_code=status_code, media_type="application/json"
    )


@router.get("/health/startup")
async def startup_probe(db: Session = Depends(get_db)):
    """
    Kubernetes startup probe
    Returns 200 when application has fully started

    Used to prevent traffic before app is ready (slower than readiness)
    """
    startup_checks = {
        "database_migrated": False,
        "cache_initialized": False,
        "models_loaded": False,
        "ready": False,
    }

    try:
        # Check if database has tables (migrations run)
        result = db.execute(
            """
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'public'
        """
        )
        table_count = result.scalar()
        startup_checks["database_migrated"] = table_count > 0
        startup_checks["table_count"] = table_count

        # Check cache
        startup_checks["cache_initialized"] = redis_manager.is_connected

        # Check if models are loaded
        from app.models import activity_log, user

        startup_checks["models_loaded"] = True

        startup_checks["ready"] = all(
            [
                startup_checks["database_migrated"],
                startup_checks["cache_initialized"],
                startup_checks["models_loaded"],
            ]
        )

    except Exception as e:
        startup_checks["error"] = str(e)

    status_code = (
        status.HTTP_200_OK
        if startup_checks.get("ready")
        else status.HTTP_503_SERVICE_UNAVAILABLE
    )

    return Response(content=str(startup_checks), status_code=status_code)


@router.get("/health/deep")
async def deep_health_check(
    db: Session = Depends(get_db), current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Deep health check with detailed component status
    Requires admin authentication
    """
    health = {"status": "healthy", "timestamp": time.time(), "components": {}}

    # Database health
    try:
        start = time.time()
        db.execute("SELECT 1")
        db_latency = (time.time() - start) * 1000

        health["components"]["database"] = {
            "status": "healthy",
            "latency_ms": round(db_latency, 2),
            "pool_size": db_router.primary_engine.pool.size(),
            "checked_out": db_router.primary_engine.pool.checkedout(),
        }
    except Exception as e:
        health["components"]["database"] = {"status": "unhealthy", "error": str(e)}
        health["status"] = "degraded"

    # Redis health
    try:
        start = time.time()
        await cache.set("health_deep", "ok", 10)
        await cache.get("health_deep")
        redis_latency = (time.time() - start) * 1000

        redis_stats = await cache.get_stats()

        health["components"]["redis"] = {
            "status": "healthy",
            "latency_ms": round(redis_latency, 2),
            "connected": redis_manager.is_connected,
            "hit_ratio": redis_stats.get("hit_ratio", 0),
            "memory": redis_stats.get("used_memory", "unknown"),
        }
    except Exception as e:
        health["components"]["redis"] = {"status": "unhealthy", "error": str(e)}
        health["status"] = "degraded"

    # Replication health (if configured)
    if db_router.replica_engines:
        try:
            repl_stats = await replication_monitor.check_replication_lag(db)
            health["components"]["replication"] = {
                "status": "configured",
                "replicas": repl_stats,
            }
        except Exception as e:
            health["components"]["replication"] = {"status": "error", "error": str(e)}

    # System resources
    health["components"]["system"] = {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage("/").percent,
        "load_average": os.getloadavg() if hasattr(os, "getloadavg") else None,
    }

    return health


@router.get("/metrics/prometheus")
async def prometheus_metrics(db: Session = Depends(get_db)):
    """
    Prometheus-compatible metrics endpoint

    Exposes metrics in Prometheus format for scraping
    """
    metrics = []

    # Database metrics
    try:
        pool = db_router.primary_engine.pool
        metrics.append(f"# HELP fastnext_db_pool_size Database connection pool size")
        metrics.append(f"# TYPE fastnext_db_pool_size gauge")
        metrics.append(f"fastnext_db_pool_size {pool.size()}")

        metrics.append(
            f"# HELP fastnext_db_pool_checked_out Checked out database connections"
        )
        metrics.append(f"# TYPE fastnext_db_pool_checked_out gauge")
        metrics.append(f"fastnext_db_pool_checked_out {pool.checkedout()}")

        metrics.append(
            f"# HELP fastnext_db_pool_overflow Overflow database connections"
        )
        metrics.append(f"# TYPE fastnext_db_pool_overflow gauge")
        metrics.append(f"fastnext_db_pool_overflow {pool.overflow()}")
    except:
        pass

    # Redis metrics
    try:
        if redis_manager.is_connected:
            redis_stats = await cache.get_stats()

            metrics.append(f"# HELP fastnext_redis_hit_ratio Redis cache hit ratio")
            metrics.append(f"# TYPE fastnext_redis_hit_ratio gauge")
            metrics.append(
                f"fastnext_redis_hit_ratio {redis_stats.get('hit_ratio', 0)}"
            )

            metrics.append(f"# HELP fastnext_redis_keyspace_hits Redis keyspace hits")
            metrics.append(f"# TYPE fastnext_redis_keyspace_hits counter")
            metrics.append(
                f"fastnext_redis_keyspace_hits {redis_stats.get('keyspace_hits', 0)}"
            )

            metrics.append(
                f"# HELP fastnext_redis_keyspace_misses Redis keyspace misses"
            )
            metrics.append(f"# TYPE fastnext_redis_keyspace_misses counter")
            metrics.append(
                f"fastnext_redis_keyspace_misses {redis_stats.get('keyspace_misses', 0)}"
            )
    except:
        pass

    # System metrics
    try:
        metrics.append(f"# HELP fastnext_cpu_percent CPU usage percentage")
        metrics.append(f"# TYPE fastnext_cpu_percent gauge")
        metrics.append(f"fastnext_cpu_percent {psutil.cpu_percent(interval=0.1)}")

        metrics.append(f"# HELP fastnext_memory_percent Memory usage percentage")
        metrics.append(f"# TYPE fastnext_memory_percent gauge")
        metrics.append(f"fastnext_memory_percent {psutil.virtual_memory().percent}")
    except:
        pass

    return Response(content="\n".join(metrics), media_type="text/plain; version=0.0.4")


@router.get("/scaling/info")
async def scaling_info(current_user: User = Depends(require_admin)) -> Dict[str, Any]:
    """
    Get horizontal scaling configuration info
    """
    info = {
        "load_balancing": {
            "enabled": True,
            "algorithm": "least_conn",
            "health_check_interval": "30s",
        },
        "database": {
            "replication_enabled": len(db_router.replica_engines) > 0,
            "primary_connections": db_router.primary_engine.pool.size(),
            "replica_count": len(db_router.replica_engines),
            "read_write_splitting": True,
        },
        "cache": {
            "type": (
                "redis_cluster"
                if len(db_router.replica_engines) > 0
                else "redis_single"
            ),
            "distributed": True,
            "nodes": 6 if len(db_router.replica_engines) > 0 else 1,
        },
        "auto_scaling": {
            "enabled": os.getenv("ENABLE_AUTO_SCALING", "false") == "true",
            "min_replicas": int(os.getenv("MIN_REPLICAS", 3)),
            "max_replicas": int(os.getenv("MAX_REPLICAS", 20)),
            "target_cpu": int(os.getenv("TARGET_CPU_PERCENT", 70)),
            "target_memory": int(os.getenv("TARGET_MEMORY_PERCENT", 80)),
        },
        "deployment": {
            "platform": os.getenv("DEPLOYMENT_PLATFORM", "docker-compose"),
            "environment": os.getenv("ENVIRONMENT", "development"),
            "instance_id": os.getenv("HOSTNAME", "unknown"),
        },
    }

    return info


@router.get("/replication/status")
async def replication_status(
    db: Session = Depends(get_db), current_user: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get database replication status and lag information
    """
    if not db_router.replica_engines:
        return {"replication_enabled": False, "message": "No read replicas configured"}

    stats = await replication_monitor.get_replication_stats(db)

    return {"replication_enabled": True, **stats}
