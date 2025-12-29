"""
Model Inheritance System

Allows modules to extend and override existing models using mixins.
Inspired by Odoo's model inheritance patterns.
"""

import logging
from collections import defaultdict
from typing import Any, Callable, Dict, List, Optional, Type

from sqlalchemy.orm import DeclarativeBase

from .registry import ModuleRegistry

logger = logging.getLogger(__name__)


class ModelExtender:
    """
    Handles model inheritance and extension.

    Allows modules to:
    - Add new fields to existing models via mixins
    - Override methods on existing models
    - Register hooks that are called on model operations
    """

    def __init__(self, registry: Optional[ModuleRegistry] = None):
        self.registry = registry or ModuleRegistry.get_registry()

        # Base models that can be extended
        self._base_models: Dict[str, Type[DeclarativeBase]] = {}

        # Extensions registered for each base model
        self._extensions: Dict[str, List[Type]] = defaultdict(list)

        # Method overrides: model_name -> method_name -> [callables]
        self._method_overrides: Dict[str, Dict[str, List[Callable]]] = defaultdict(
            lambda: defaultdict(list)
        )

        # Field extensions (columns added by modules)
        self._field_extensions: Dict[str, Dict[str, Any]] = defaultdict(dict)

        # Computed models (after applying extensions)
        self._computed_models: Dict[str, Type[DeclarativeBase]] = {}

    def register_base_model(self, name: str, model: Type[DeclarativeBase]) -> None:
        """
        Register a base model that can be extended by modules.

        Args:
            name: Fully qualified model name (e.g., 'base.User', 'auth.Token')
            model: SQLAlchemy model class
        """
        if name in self._base_models:
            logger.warning(f"Base model '{name}' already registered, updating")

        self._base_models[name] = model
        self.registry.register_model(name, model)
        logger.debug(f"Registered base model: {name}")

    def register_extension(
        self,
        base_model_name: str,
        extension_mixin: Type,
        module_name: Optional[str] = None,
    ) -> None:
        """
        Register an extension mixin for a base model.

        The mixin will be applied to the model class, adding its attributes
        and methods to the base model.

        Args:
            base_model_name: Name of the model to extend
            extension_mixin: Mixin class with additional fields/methods
            module_name: Optional name of the module providing this extension
        """
        if base_model_name not in self._base_models:
            logger.warning(
                f"Registering extension for unknown base model: {base_model_name}. "
                "Extension will be applied if model is registered later."
            )

        self._extensions[base_model_name].append(extension_mixin)
        logger.info(
            f"Registered extension for {base_model_name} "
            f"from module {module_name or 'unknown'}"
        )

    def register_method_override(
        self,
        model_name: str,
        method_name: str,
        override_func: Callable,
    ) -> None:
        """
        Register a method override for a model.

        The override function receives the original method as its first argument,
        allowing it to call super() behavior.

        Args:
            model_name: Name of the model
            method_name: Name of the method to override
            override_func: Function that wraps/replaces the method
        """
        self._method_overrides[model_name][method_name].append(override_func)
        logger.debug(f"Registered method override: {model_name}.{method_name}")

    def register_field_extension(
        self,
        model_name: str,
        field_name: str,
        field_definition: Any,
    ) -> None:
        """
        Register a new field to be added to a model.

        Args:
            model_name: Name of the model to extend
            field_name: Name of the new field
            field_definition: SQLAlchemy Column or relationship definition
        """
        self._field_extensions[model_name][field_name] = field_definition
        logger.debug(f"Registered field extension: {model_name}.{field_name}")

    def apply_extensions(self) -> Dict[str, Type[DeclarativeBase]]:
        """
        Apply all registered extensions to base models.

        Creates new model classes that inherit from extensions and base models.

        Returns:
            Dictionary of model_name -> extended model class
        """
        self._computed_models.clear()

        for name, base_model in self._base_models.items():
            extensions = self._extensions.get(name, [])
            field_extensions = self._field_extensions.get(name, {})
            method_overrides = self._method_overrides.get(name, {})

            if extensions or field_extensions or method_overrides:
                # Create extended model class
                extended_model = self._create_extended_model(
                    name,
                    base_model,
                    extensions,
                    field_extensions,
                    method_overrides,
                )
                self._computed_models[name] = extended_model
                logger.info(f"Applied {len(extensions)} extensions to {name}")
            else:
                # No extensions, use base model as-is
                self._computed_models[name] = base_model

        return self._computed_models

    def _create_extended_model(
        self,
        name: str,
        base_model: Type[DeclarativeBase],
        mixins: List[Type],
        fields: Dict[str, Any],
        method_overrides: Dict[str, List[Callable]],
    ) -> Type[DeclarativeBase]:
        """
        Create an extended model class.

        Args:
            name: Model name
            base_model: Original model class
            mixins: Mixin classes to apply
            fields: Additional fields to add
            method_overrides: Methods to override

        Returns:
            New model class with extensions applied
        """
        # Build class attributes
        class_attrs: Dict[str, Any] = {}

        # Add new fields
        class_attrs.update(fields)

        # Create wrapped methods for overrides
        for method_name, overrides in method_overrides.items():
            original_method = getattr(base_model, method_name, None)
            if original_method:
                wrapped = self._wrap_method(original_method, overrides)
                class_attrs[method_name] = wrapped

        # Determine base classes (mixins first, then original model)
        bases = tuple(mixins) + (base_model,)

        # Create new class
        extended_class_name = f"Extended{base_model.__name__}"
        extended_model = type(extended_class_name, bases, class_attrs)

        # Preserve table name and other SQLAlchemy attributes
        if hasattr(base_model, "__tablename__"):
            extended_model.__tablename__ = base_model.__tablename__

        return extended_model

    def _wrap_method(
        self,
        original: Callable,
        overrides: List[Callable],
    ) -> Callable:
        """
        Wrap a method with override functions.

        Each override receives the previous function in the chain,
        allowing super() behavior.
        """
        current = original

        for override in overrides:
            # Create closure to capture current value
            def make_wrapper(prev, ovr):
                def wrapper(self, *args, **kwargs):
                    return ovr(prev, self, *args, **kwargs)
                return wrapper

            current = make_wrapper(current, override)

        return current

    def get_model(self, name: str) -> Optional[Type[DeclarativeBase]]:
        """
        Get a model by name.

        Returns the extended model if extensions have been applied,
        otherwise returns the base model.
        """
        if name in self._computed_models:
            return self._computed_models[name]
        return self._base_models.get(name)

    def get_all_models(self) -> Dict[str, Type[DeclarativeBase]]:
        """Get all models (extended where applicable)."""
        result = dict(self._base_models)
        result.update(self._computed_models)
        return result

    def clear_extensions(self) -> None:
        """Clear all registered extensions (mainly for testing)."""
        self._extensions.clear()
        self._method_overrides.clear()
        self._field_extensions.clear()
        self._computed_models.clear()


# Global instance
_extender: Optional[ModelExtender] = None


def get_model_extender() -> ModelExtender:
    """Get the global ModelExtender instance."""
    global _extender
    if _extender is None:
        _extender = ModelExtender()
    return _extender


def extend_model(base_model_name: str):
    """
    Decorator to register a mixin as an extension for a model.

    Usage:
        @extend_model('base.User')
        class UserExtension:
            extra_field = Column(String(100))

            def custom_method(self):
                pass
    """
    def decorator(cls: Type) -> Type:
        extender = get_model_extender()
        extender.register_extension(base_model_name, cls)
        return cls

    return decorator
