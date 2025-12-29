"""
Hook Service

Manages model hooks including:
- Loading stored hook definitions
- Executing hooks programmatically
- Managing hook lifecycle
"""

import importlib
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Type

from sqlalchemy.orm import Session

from ..models.model_hook import (
    HookEvent,
    HookRegistry,
    ModelHookDefinition,
    hook_registry,
)

logger = logging.getLogger(__name__)


class HookService:
    """
    Service for managing model hooks.

    Provides methods for:
    - Loading hook definitions from database
    - Creating and managing hook definitions
    - Executing hooks with proper error handling
    - Integration with the automation system

    Usage:
        service = HookService(db)

        # Load all stored hooks
        service.load_stored_hooks()

        # Create a new hook definition
        service.create_hook(
            name="set_default_values",
            model_name="sale.SaleOrder",
            event="before_create",
            python_code="record.state = 'draft'"
        )

        # Execute hooks manually
        service.execute_hooks(record, "before_create")
    """

    def __init__(self, db: Session):
        self.db = db
        self._loaded_definitions: Dict[int, bool] = {}

    # -------------------------------------------------------------------------
    # Hook Loading
    # -------------------------------------------------------------------------

    def load_stored_hooks(self, module_name: str = None) -> int:
        """
        Load hook definitions from the database.

        Args:
            module_name: Optional filter by module

        Returns:
            Number of hooks loaded
        """
        query = self.db.query(ModelHookDefinition).filter(
            ModelHookDefinition.is_active == True
        )

        if module_name:
            query = query.filter(ModelHookDefinition.module_name == module_name)

        definitions = query.order_by(ModelHookDefinition.sequence).all()
        loaded = 0

        for definition in definitions:
            if definition.id in self._loaded_definitions:
                continue

            try:
                self._register_definition(definition)
                self._loaded_definitions[definition.id] = True
                loaded += 1
            except Exception as e:
                logger.error(f"Failed to load hook {definition.name}: {e}")

        logger.info(f"Loaded {loaded} hook definitions")
        return loaded

    def reload_hooks(self, module_name: str = None) -> int:
        """
        Reload all hooks, clearing existing ones.

        Args:
            module_name: Optional filter by module

        Returns:
            Number of hooks loaded
        """
        # Clear existing loaded definitions
        if module_name:
            self._unload_module_hooks(module_name)
        else:
            hook_registry.clear()
            self._loaded_definitions = {}

        return self.load_stored_hooks(module_name)

    def _register_definition(self, definition: ModelHookDefinition):
        """Register a stored hook definition."""
        event = HookEvent(definition.event)

        if definition.python_code:
            callback = self._create_code_callback(definition)
        elif definition.method_name:
            callback = self._create_method_callback(definition)
        else:
            logger.warning(f"Hook {definition.name} has no action defined")
            return

        hook_registry.register(
            model_name=definition.model_name,
            event=event,
            callback=callback,
            fields=definition.fields,
            priority=definition.sequence,
        )

    def _create_code_callback(
        self,
        definition: ModelHookDefinition,
    ) -> Callable:
        """Create a callback that executes Python code."""
        code = definition.python_code

        def callback(record: Any, context: Dict[str, Any]) -> Any:
            exec_context = {
                "record": record,
                "self": record,
                "context": context,
                "db": self.db,
                "datetime": datetime,
                "logger": logger,
                "result": None,
            }

            try:
                exec(code, exec_context)
                return exec_context.get("result")
            except Exception as e:
                logger.error(f"Hook code execution failed ({definition.name}): {e}")
                raise

        return callback

    def _create_method_callback(
        self,
        definition: ModelHookDefinition,
    ) -> Callable:
        """Create a callback that calls a model method."""
        method_name = definition.method_name

        def callback(record: Any, context: Dict[str, Any]) -> Any:
            method = getattr(record, method_name, None)
            if method and callable(method):
                return method(context)
            else:
                logger.warning(
                    f"Method {method_name} not found on {type(record).__name__}"
                )
                return None

        return callback

    def _unload_module_hooks(self, module_name: str):
        """Unload all hooks for a module."""
        definitions = (
            self.db.query(ModelHookDefinition)
            .filter(ModelHookDefinition.module_name == module_name)
            .all()
        )

        for definition in definitions:
            if definition.id in self._loaded_definitions:
                del self._loaded_definitions[definition.id]
                # Note: We can't easily unregister specific hooks,
                # so we clear and reload

    # -------------------------------------------------------------------------
    # Hook Execution
    # -------------------------------------------------------------------------

    def execute_hooks(
        self,
        record: Any,
        event: str,
        context: Dict[str, Any] = None,
        changed_fields: List[str] = None,
    ) -> List[Any]:
        """
        Execute all hooks for a record and event.

        Args:
            record: The record
            event: Event name (e.g., 'before_create')
            context: Additional context
            changed_fields: For on_change, which fields changed

        Returns:
            List of hook results
        """
        model_name = self._get_model_name(type(record))
        hook_event = HookEvent(event)

        return hook_registry.execute_hooks(
            model_name=model_name,
            event=hook_event,
            record=record,
            context=context,
            changed_fields=changed_fields,
        )

    def execute_onchange(
        self,
        record: Any,
        changed_fields: List[str],
        context: Dict[str, Any] = None,
    ) -> List[Any]:
        """
        Execute onchange hooks for changed fields.

        Args:
            record: The record
            changed_fields: Fields that changed
            context: Additional context

        Returns:
            List of hook results
        """
        return self.execute_hooks(
            record=record,
            event="on_change",
            context=context,
            changed_fields=changed_fields,
        )

    def validate(
        self,
        record: Any,
        context: Dict[str, Any] = None,
    ) -> List[Any]:
        """
        Execute validation hooks.

        Args:
            record: The record to validate
            context: Additional context

        Returns:
            List of validation results

        Raises:
            ValueError: If validation fails
        """
        return self.execute_hooks(
            record=record,
            event="on_validate",
            context=context,
        )

    # -------------------------------------------------------------------------
    # Hook Definition Management
    # -------------------------------------------------------------------------

    def create_hook(
        self,
        name: str,
        model_name: str,
        event: str,
        python_code: str = None,
        method_name: str = None,
        fields: List[str] = None,
        module_name: str = None,
        sequence: int = 10,
    ) -> ModelHookDefinition:
        """
        Create a new hook definition.

        Args:
            name: Hook name
            model_name: Target model
            event: Hook event
            python_code: Python code to execute
            method_name: Or method name to call
            fields: Fields that trigger the hook
            module_name: Owning module
            sequence: Execution order

        Returns:
            Created hook definition
        """
        definition = ModelHookDefinition(
            name=name,
            model_name=model_name,
            event=event,
            python_code=python_code,
            method_name=method_name,
            fields=fields or [],
            module_name=module_name,
            sequence=sequence,
            is_active=True,
        )

        self.db.add(definition)
        self.db.commit()
        self.db.refresh(definition)

        # Register immediately
        self._register_definition(definition)
        self._loaded_definitions[definition.id] = True

        logger.info(f"Created hook: {model_name}.{name}@{event}")
        return definition

    def update_hook(
        self,
        hook_id: int,
        **kwargs,
    ) -> Optional[ModelHookDefinition]:
        """
        Update a hook definition.

        Args:
            hook_id: Hook ID
            **kwargs: Fields to update

        Returns:
            Updated hook definition
        """
        definition = (
            self.db.query(ModelHookDefinition)
            .filter(ModelHookDefinition.id == hook_id)
            .first()
        )

        if not definition:
            return None

        for key, value in kwargs.items():
            if hasattr(definition, key):
                setattr(definition, key, value)

        self.db.commit()
        self.db.refresh(definition)

        # Re-register the hook
        if definition.id in self._loaded_definitions:
            del self._loaded_definitions[definition.id]
            self._register_definition(definition)
            self._loaded_definitions[definition.id] = True

        return definition

    def delete_hook(self, hook_id: int) -> bool:
        """
        Delete a hook definition.

        Args:
            hook_id: Hook ID

        Returns:
            True if deleted
        """
        definition = (
            self.db.query(ModelHookDefinition)
            .filter(ModelHookDefinition.id == hook_id)
            .first()
        )

        if not definition:
            return False

        self.db.delete(definition)
        self.db.commit()

        if hook_id in self._loaded_definitions:
            del self._loaded_definitions[hook_id]

        return True

    def get_hooks_for_model(
        self,
        model_name: str,
        event: str = None,
    ) -> List[ModelHookDefinition]:
        """
        Get all hook definitions for a model.

        Args:
            model_name: Model name
            event: Optional event filter

        Returns:
            List of hook definitions
        """
        query = self.db.query(ModelHookDefinition).filter(
            ModelHookDefinition.model_name == model_name,
            ModelHookDefinition.is_active == True,
        )

        if event:
            query = query.filter(ModelHookDefinition.event == event)

        return query.order_by(ModelHookDefinition.sequence).all()

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------

    def _get_model_name(self, model_class: Type) -> str:
        """Get the full model name."""
        module = model_class.__module__
        parts = module.split(".")
        if "modules" in parts:
            idx = parts.index("modules")
            if idx + 1 < len(parts):
                return f"{parts[idx + 1]}.{model_class.__name__}"
        return model_class.__name__


def get_hook_service(db: Session) -> HookService:
    """Factory function for HookService."""
    return HookService(db)
