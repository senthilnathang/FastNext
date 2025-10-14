"""
Automatic Cache Invalidation Hooks for SQLAlchemy Models
Automatically invalidates cache when models are created, updated, or deleted
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from app.core.cache_optimization import invalidation_strategy
from sqlalchemy import event
from sqlalchemy.orm import Session
from sqlalchemy.orm.mapper import Mapper

logger = logging.getLogger(__name__)


class CacheInvalidationHooks:
    """
    Manages automatic cache invalidation based on model changes

    Features:
    - Automatic invalidation on INSERT, UPDATE, DELETE
    - Model-specific invalidation rules
    - Relationship-aware invalidation
    - Batch invalidation optimization
    """

    def __init__(self):
        self.model_rules: Dict[str, Dict[str, Any]] = {}
        self.pending_invalidations: Set[str] = set()
        self.batch_mode = False

    def register_model_invalidation_rule(
        self,
        model_class: Any,
        tags: Set[str],
        on_create: bool = True,
        on_update: bool = True,
        on_delete: bool = True,
        related_tables: Optional[List[str]] = None,
    ):
        """
        Register cache invalidation rule for a model

        Args:
            model_class: SQLAlchemy model class
            tags: Cache tags to invalidate
            on_create: Invalidate on create
            on_update: Invalidate on update
            on_delete: Invalidate on delete
            related_tables: List of related table names to also invalidate
        """
        model_name = model_class.__tablename__

        self.model_rules[model_name] = {
            "model_class": model_class,
            "tags": tags,
            "on_create": on_create,
            "on_update": on_update,
            "on_delete": on_delete,
            "related_tables": related_tables or [],
        }

        logger.info(f"Registered cache invalidation rule for model: {model_name}")

    async def invalidate_for_model(
        self,
        model_name: str,
        operation: str,  # 'create', 'update', 'delete'
        instance: Optional[Any] = None,
    ):
        """Invalidate cache for a specific model operation"""
        if model_name not in self.model_rules:
            return

        rule = self.model_rules[model_name]

        # Check if invalidation is enabled for this operation
        should_invalidate = (
            (operation == "create" and rule["on_create"])
            or (operation == "update" and rule["on_update"])
            or (operation == "delete" and rule["on_delete"])
        )

        if not should_invalidate:
            return

        # Collect tags to invalidate
        tags_to_invalidate = rule["tags"].copy()

        # Add table tag
        tags_to_invalidate.add(f"table:{model_name}")

        # Add related table tags
        for related_table in rule["related_tables"]:
            tags_to_invalidate.add(f"table:{related_table}")

        # Instance-specific tags (e.g., user:123)
        if instance and hasattr(instance, "id"):
            tags_to_invalidate.add(f"{model_name}:{instance.id}")

        # Batch mode: collect invalidations
        if self.batch_mode:
            self.pending_invalidations.update(tags_to_invalidate)
            logger.debug(f"Queued invalidation for {model_name}: {operation}")
            return

        # Immediate invalidation
        invalidated = await invalidation_strategy.invalidate_by_tags(tags_to_invalidate)
        logger.info(
            f"Invalidated {invalidated} cache entries for {model_name} ({operation})"
        )

    async def flush_pending_invalidations(self):
        """Flush all pending invalidations (used in batch mode)"""
        if not self.pending_invalidations:
            return

        invalidated = await invalidation_strategy.invalidate_by_tags(
            self.pending_invalidations
        )

        logger.info(
            f"Flushed {invalidated} cache entries "
            f"({len(self.pending_invalidations)} tags)"
        )

        self.pending_invalidations.clear()

    def start_batch_mode(self):
        """Start batch invalidation mode (collect invalidations, flush later)"""
        self.batch_mode = True
        self.pending_invalidations.clear()
        logger.debug("Started batch invalidation mode")

    async def end_batch_mode(self):
        """End batch mode and flush pending invalidations"""
        self.batch_mode = False
        await self.flush_pending_invalidations()
        logger.debug("Ended batch invalidation mode")


# Global hooks instance
cache_invalidation_hooks = CacheInvalidationHooks()


def setup_model_invalidation_hooks(Base: Any):
    """
    Set up SQLAlchemy event listeners for automatic cache invalidation

    Should be called after all models are defined:
        setup_model_invalidation_hooks(Base)
    """

    # Note: SQLAlchemy event handlers must be synchronous
    # We queue invalidations and process them after commit

    @event.listens_for(Session, "after_flush")
    def after_flush(session, flush_context):
        """Queue cache invalidations after flush (before commit)"""
        # Collect all changes
        for obj in session.new:
            if hasattr(obj, "__tablename__"):
                model_name = obj.__tablename__
                if model_name in cache_invalidation_hooks.model_rules:
                    cache_invalidation_hooks.pending_invalidations.add(
                        f"table:{model_name}"
                    )

        for obj in session.dirty:
            if hasattr(obj, "__tablename__"):
                model_name = obj.__tablename__
                if model_name in cache_invalidation_hooks.model_rules:
                    cache_invalidation_hooks.pending_invalidations.add(
                        f"table:{model_name}"
                    )

        for obj in session.deleted:
            if hasattr(obj, "__tablename__"):
                model_name = obj.__tablename__
                if model_name in cache_invalidation_hooks.model_rules:
                    cache_invalidation_hooks.pending_invalidations.add(
                        f"table:{model_name}"
                    )

    @event.listens_for(Session, "after_commit")
    def after_commit(session):
        """Process pending cache invalidations after successful commit"""
        if cache_invalidation_hooks.pending_invalidations:
            # Note: We can't use async here, so we just log for now
            # In production, you might want to use a background task queue
            tags = cache_invalidation_hooks.pending_invalidations.copy()
            cache_invalidation_hooks.pending_invalidations.clear()
            logger.debug(f"Cache invalidation queued for tags: {tags}")
            # TODO: Implement background task to process these invalidations

    # Note: SQLAlchemy 2.x doesn't have after_bulk_* events on Session
    # Bulk operations don't trigger per-instance events, so we handle them differently
    # Applications should manually invalidate cache after bulk operations

    logger.info("✅ Model cache invalidation hooks registered")


def register_default_invalidation_rules():
    """
    Register default cache invalidation rules for common models

    Should be called during application startup after models are imported
    """
    try:
        from app.models.activity_log import ActivityLog
        from app.models.user import User

        # User model invalidation
        cache_invalidation_hooks.register_model_invalidation_rule(
            model_class=User,
            tags={"users", "authentication"},
            on_create=True,
            on_update=True,
            on_delete=True,
            related_tables=["user_roles", "sessions"],
        )

        # Activity log invalidation
        cache_invalidation_hooks.register_model_invalidation_rule(
            model_class=ActivityLog,
            tags={"activity_logs", "audit"},
            on_create=True,
            on_update=False,  # Activity logs typically don't update
            on_delete=True,
            related_tables=[],
        )

        logger.info("✅ Default cache invalidation rules registered")

    except ImportError as e:
        logger.warning(f"Could not register default invalidation rules: {e}")


# Decorators for manual cache invalidation


def invalidate_cache(*tags: str):
    """
    Decorator to invalidate cache tags after function execution

    Usage:
        @invalidate_cache('users', 'active_users')
        async def create_user(data: dict):
            # ... create user
            return user
    """

    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)

            # Invalidate tags
            tag_set = set(tags)
            invalidated = await invalidation_strategy.invalidate_by_tags(tag_set)

            logger.debug(
                f"Invalidated {invalidated} entries for tags: {tags} "
                f"(function: {func.__name__})"
            )

            return result

        def sync_wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            logger.warning(
                f"Sync function {func.__name__} - cache invalidation skipped "
                "(use async functions for automatic invalidation)"
            )
            return result

        import asyncio

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


def batch_invalidation(func):
    """
    Decorator to batch cache invalidations within a function

    All invalidations will be collected and flushed at the end

    Usage:
        @batch_invalidation
        async def bulk_update_users(user_ids: List[int]):
            for user_id in user_ids:
                # ... update user
                # invalidations are batched
            # all invalidations flushed at end
    """

    async def async_wrapper(*args, **kwargs):
        cache_invalidation_hooks.start_batch_mode()

        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            await cache_invalidation_hooks.end_batch_mode()

    def sync_wrapper(*args, **kwargs):
        logger.warning(
            f"Sync function {func.__name__} - batch invalidation not supported"
        )
        return func(*args, **kwargs)

    import asyncio

    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


# Context manager for batch invalidation
class BatchInvalidation:
    """
    Context manager for batching cache invalidations

    Usage:
        async with BatchInvalidation():
            await create_user(data1)
            await create_user(data2)
            await create_user(data3)
            # All invalidations flushed here
    """

    async def __aenter__(self):
        cache_invalidation_hooks.start_batch_mode()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await cache_invalidation_hooks.end_batch_mode()
