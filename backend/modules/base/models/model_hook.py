"""
Model Hook System

Implements hooks/triggers for model lifecycle events.
Similar to Odoo's @api.onchange, @api.constrains, and SQLAlchemy events.

Features:
- Before/After CRUD hooks
- Field change hooks (onchange)
- Validation hooks (constrains)
- Priority ordering for hook execution
- Module-specific hooks
"""

import functools
import logging
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Type, Union

from sqlalchemy import Boolean, Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.event import listen, remove
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import InstrumentedAttribute

from app.db.base import Base
from app.models.base import TimestampMixin

logger = logging.getLogger(__name__)


class HookEvent(str, Enum):
    """Model lifecycle events for hooks."""
    BEFORE_CREATE = "before_create"
    AFTER_CREATE = "after_create"
    BEFORE_UPDATE = "before_update"
    AFTER_UPDATE = "after_update"
    BEFORE_DELETE = "before_delete"
    AFTER_DELETE = "after_delete"
    ON_CHANGE = "on_change"  # Field value changed
    ON_VALIDATE = "on_validate"  # Validation before save
    ON_READ = "on_read"  # After loading from DB
    ON_FLUSH = "on_flush"  # Before committing to DB


class ModelHookDefinition(Base, TimestampMixin):
    """
    Stored definition of a model hook.

    For runtime-defined hooks that are stored in the database.
    For static hooks, use the decorators instead.
    """

    __tablename__ = "model_hook_definitions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Hook identification
    name = Column(String(100), nullable=False, index=True)
    model_name = Column(String(100), nullable=False, index=True)
    module_name = Column(String(100), nullable=True, index=True)

    # Hook configuration
    event = Column(String(30), nullable=False, index=True)
    fields = Column(JSONB, default=list, comment="Fields that trigger this hook")

    # Hook action
    python_code = Column(Text, nullable=True, comment="Python code to execute")
    method_name = Column(String(100), nullable=True, comment="Method to call")

    # Execution order
    sequence = Column(Integer, default=10)

    # Activation
    is_active = Column(Boolean, default=True, index=True)

    def __repr__(self) -> str:
        return f"<ModelHookDefinition({self.model_name}.{self.name}@{self.event})>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "model_name": self.model_name,
            "event": self.event,
            "fields": self.fields,
            "sequence": self.sequence,
            "is_active": self.is_active,
        }


# ---------------------------------------------------------------------------
# Hook Registry
# ---------------------------------------------------------------------------


class HookRegistry:
    """
    Central registry for all model hooks.

    Singleton pattern to ensure a single registry across the application.
    """

    _instance: Optional["HookRegistry"] = None
    _hooks: Dict[str, Dict[str, List[Callable]]] = {}

    def __new__(cls) -> "HookRegistry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._hooks = {}
        return cls._instance

    def register(
        self,
        model_name: str,
        event: HookEvent,
        callback: Callable,
        fields: List[str] = None,
        priority: int = 10,
    ):
        """
        Register a hook callback.

        Args:
            model_name: Target model name
            event: Hook event type
            callback: Function to call
            fields: For on_change, which fields trigger the hook
            priority: Execution priority (lower = earlier)
        """
        key = f"{model_name}:{event.value}"

        if key not in self._hooks:
            self._hooks[key] = []

        self._hooks[key].append({
            "callback": callback,
            "fields": fields or [],
            "priority": priority,
        })

        # Sort by priority
        self._hooks[key].sort(key=lambda h: h["priority"])

        logger.debug(f"Registered hook: {key}")

    def unregister(self, model_name: str, event: HookEvent, callback: Callable = None):
        """Unregister a hook."""
        key = f"{model_name}:{event.value}"

        if key not in self._hooks:
            return

        if callback:
            self._hooks[key] = [
                h for h in self._hooks[key] if h["callback"] != callback
            ]
        else:
            del self._hooks[key]

    def get_hooks(
        self,
        model_name: str,
        event: HookEvent,
        changed_fields: List[str] = None,
    ) -> List[Callable]:
        """
        Get all hooks for a model and event.

        Args:
            model_name: Model name
            event: Hook event
            changed_fields: For on_change, filter by field

        Returns:
            List of callback functions
        """
        key = f"{model_name}:{event.value}"
        hooks = self._hooks.get(key, [])

        if event == HookEvent.ON_CHANGE and changed_fields:
            # Filter to hooks that watch the changed fields
            hooks = [
                h for h in hooks
                if not h["fields"] or any(f in h["fields"] for f in changed_fields)
            ]

        return [h["callback"] for h in hooks]

    def execute_hooks(
        self,
        model_name: str,
        event: HookEvent,
        record: Any,
        context: Dict[str, Any] = None,
        changed_fields: List[str] = None,
    ) -> List[Any]:
        """
        Execute all hooks for an event.

        Args:
            model_name: Model name
            event: Hook event
            record: The record being operated on
            context: Additional context
            changed_fields: For on_change, which fields changed

        Returns:
            List of hook results
        """
        hooks = self.get_hooks(model_name, event, changed_fields)
        results = []

        ctx = context or {}
        ctx["changed_fields"] = changed_fields or []

        for callback in hooks:
            try:
                result = callback(record, ctx)
                results.append(result)
            except Exception as e:
                logger.error(f"Hook execution failed for {model_name}:{event.value}: {e}")
                raise

        return results

    def clear(self):
        """Clear all registered hooks."""
        self._hooks = {}


# Global registry instance
hook_registry = HookRegistry()


# ---------------------------------------------------------------------------
# Hook Decorators
# ---------------------------------------------------------------------------


def before_create(model_class: Type = None, priority: int = 10):
    """
    Decorator for before create hooks.

    Example:
        @before_create(SaleOrder)
        def set_order_number(record, context):
            record.number = generate_sequence()
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        # Register the hook
        if model_class:
            model_name = _get_model_name(model_class)
            hook_registry.register(model_name, HookEvent.BEFORE_CREATE, func, priority=priority)

        wrapper._hook_info = {
            "event": HookEvent.BEFORE_CREATE,
            "priority": priority,
        }
        return wrapper

    return decorator


def after_create(model_class: Type = None, priority: int = 10):
    """Decorator for after create hooks."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        if model_class:
            model_name = _get_model_name(model_class)
            hook_registry.register(model_name, HookEvent.AFTER_CREATE, func, priority=priority)

        wrapper._hook_info = {
            "event": HookEvent.AFTER_CREATE,
            "priority": priority,
        }
        return wrapper

    return decorator


def before_update(model_class: Type = None, priority: int = 10):
    """Decorator for before update hooks."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        if model_class:
            model_name = _get_model_name(model_class)
            hook_registry.register(model_name, HookEvent.BEFORE_UPDATE, func, priority=priority)

        wrapper._hook_info = {
            "event": HookEvent.BEFORE_UPDATE,
            "priority": priority,
        }
        return wrapper

    return decorator


def after_update(model_class: Type = None, priority: int = 10):
    """Decorator for after update hooks."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        if model_class:
            model_name = _get_model_name(model_class)
            hook_registry.register(model_name, HookEvent.AFTER_UPDATE, func, priority=priority)

        wrapper._hook_info = {
            "event": HookEvent.AFTER_UPDATE,
            "priority": priority,
        }
        return wrapper

    return decorator


def before_delete(model_class: Type = None, priority: int = 10):
    """Decorator for before delete hooks."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        if model_class:
            model_name = _get_model_name(model_class)
            hook_registry.register(model_name, HookEvent.BEFORE_DELETE, func, priority=priority)

        wrapper._hook_info = {
            "event": HookEvent.BEFORE_DELETE,
            "priority": priority,
        }
        return wrapper

    return decorator


def after_delete(model_class: Type = None, priority: int = 10):
    """Decorator for after delete hooks."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        if model_class:
            model_name = _get_model_name(model_class)
            hook_registry.register(model_name, HookEvent.AFTER_DELETE, func, priority=priority)

        wrapper._hook_info = {
            "event": HookEvent.AFTER_DELETE,
            "priority": priority,
        }
        return wrapper

    return decorator


def onchange(*fields: str, priority: int = 10):
    """
    Decorator for field change hooks.

    Example:
        class SaleOrder(HookableMixin, Base):
            @onchange('price', 'quantity')
            def _onchange_amounts(self, context):
                self.total = self.price * self.quantity
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        wrapper._hook_info = {
            "event": HookEvent.ON_CHANGE,
            "fields": list(fields),
            "priority": priority,
        }
        return wrapper

    return decorator


def constrains(*fields: str, priority: int = 10):
    """
    Decorator for validation hooks.

    Example:
        class SaleOrder(HookableMixin, Base):
            @constrains('quantity')
            def _check_quantity(self, context):
                if self.quantity <= 0:
                    raise ValueError("Quantity must be positive")
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        wrapper._hook_info = {
            "event": HookEvent.ON_VALIDATE,
            "fields": list(fields),
            "priority": priority,
        }
        return wrapper

    return decorator


# ---------------------------------------------------------------------------
# Hookable Model Mixin
# ---------------------------------------------------------------------------


class HookableMixin:
    """
    Mixin that enables hooks on a model.

    Usage:
        class MyModel(HookableMixin, Base):
            __tablename__ = 'my_model'

            @onchange('price', 'quantity')
            def _onchange_total(self, context):
                self.total = self.price * self.quantity

            @constrains('quantity')
            def _check_quantity(self, context):
                if self.quantity <= 0:
                    raise ValueError("Quantity must be positive")

            @before_create()
            def _before_create(self, context):
                self.created_by = context.get('user_id')
    """

    _registered_hooks: bool = False

    @classmethod
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls._register_hooks()

    @classmethod
    def _register_hooks(cls):
        """Register all decorated hooks from the class."""
        if cls._registered_hooks:
            return

        model_name = _get_model_name(cls)

        for name in dir(cls):
            method = getattr(cls, name, None)
            if method and hasattr(method, "_hook_info"):
                info = method._hook_info
                hook_registry.register(
                    model_name=model_name,
                    event=info["event"],
                    callback=method,
                    fields=info.get("fields"),
                    priority=info.get("priority", 10),
                )

        cls._registered_hooks = True

    def trigger_hooks(
        self,
        event: HookEvent,
        context: Dict[str, Any] = None,
        changed_fields: List[str] = None,
    ):
        """Manually trigger hooks for this record."""
        model_name = _get_model_name(type(self))
        hook_registry.execute_hooks(
            model_name=model_name,
            event=event,
            record=self,
            context=context,
            changed_fields=changed_fields,
        )

    def validate(self, context: Dict[str, Any] = None):
        """Run all validation hooks."""
        self.trigger_hooks(HookEvent.ON_VALIDATE, context)


# ---------------------------------------------------------------------------
# SQLAlchemy Event Integration
# ---------------------------------------------------------------------------


def setup_sqlalchemy_hooks(model_class: Type):
    """
    Set up SQLAlchemy event listeners for automatic hook execution.

    Call this after defining your model to enable automatic hook
    execution on SQLAlchemy events.
    """
    model_name = _get_model_name(model_class)

    # Before insert
    def before_insert_handler(mapper, connection, target):
        hook_registry.execute_hooks(
            model_name, HookEvent.BEFORE_CREATE, target
        )

    # After insert
    def after_insert_handler(mapper, connection, target):
        hook_registry.execute_hooks(
            model_name, HookEvent.AFTER_CREATE, target
        )

    # Before update
    def before_update_handler(mapper, connection, target):
        hook_registry.execute_hooks(
            model_name, HookEvent.BEFORE_UPDATE, target
        )

    # After update
    def after_update_handler(mapper, connection, target):
        hook_registry.execute_hooks(
            model_name, HookEvent.AFTER_UPDATE, target
        )

    # Before delete
    def before_delete_handler(mapper, connection, target):
        hook_registry.execute_hooks(
            model_name, HookEvent.BEFORE_DELETE, target
        )

    # After delete
    def after_delete_handler(mapper, connection, target):
        hook_registry.execute_hooks(
            model_name, HookEvent.AFTER_DELETE, target
        )

    # Register listeners
    listen(model_class, "before_insert", before_insert_handler)
    listen(model_class, "after_insert", after_insert_handler)
    listen(model_class, "before_update", before_update_handler)
    listen(model_class, "after_update", after_update_handler)
    listen(model_class, "before_delete", before_delete_handler)
    listen(model_class, "after_delete", after_delete_handler)


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------


def _get_model_name(model_class: Type) -> str:
    """Get the full model name for hook registration."""
    module = model_class.__module__
    parts = module.split(".")
    if "modules" in parts:
        idx = parts.index("modules")
        if idx + 1 < len(parts):
            return f"{parts[idx + 1]}.{model_class.__name__}"
    return model_class.__name__
