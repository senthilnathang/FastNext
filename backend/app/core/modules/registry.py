"""
Module Registry

Central registry for all loaded modules in the FastVue system.
Handles module registration, dependency resolution, and lifecycle hooks.
"""

import logging
import threading
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Type

from fastapi import APIRouter
from sqlalchemy.orm import DeclarativeBase

from .manifest import ManifestSchema

logger = logging.getLogger(__name__)

# Thread lock for singleton creation
_registry_lock = threading.Lock()


class ModuleState(str, Enum):
    """Module installation state."""

    UNINSTALLED = "uninstalled"
    INSTALLED = "installed"
    TO_INSTALL = "to_install"
    TO_UPGRADE = "to_upgrade"
    TO_REMOVE = "to_remove"


@dataclass
class ModuleInfo:
    """Information about a loaded module."""

    name: str
    manifest: ManifestSchema
    path: Path
    state: ModuleState = ModuleState.UNINSTALLED

    # Loaded components (None means not yet loaded, empty list means loaded but no items)
    routers: Optional[List[APIRouter]] = None
    models: Optional[List[Type[DeclarativeBase]]] = None
    services: Optional[Dict[str, Type]] = None

    # Association tables (many-to-many relationship tables)
    # These are SQLAlchemy Table objects, not model classes
    association_tables: Optional[List[Any]] = None

    # Python module reference
    python_module: Optional[Any] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "name": self.name,
            "version": self.manifest.version,
            "display_name": self.manifest.name,
            "summary": self.manifest.summary,
            "description": self.manifest.description,
            "author": self.manifest.author,
            "category": self.manifest.category,
            "application": self.manifest.application,
            "state": self.state.value,
            "depends": self.manifest.depends,
            "path": str(self.path),
        }


class ModuleRegistry:
    """
    Central registry for all loaded modules.

    Manages module registration, dependency resolution, and event hooks.
    Singleton pattern - use get_registry() to get the instance.
    Thread-safe using double-checked locking.
    """

    _instance: Optional["ModuleRegistry"] = None

    def __new__(cls) -> "ModuleRegistry":
        # Double-checked locking for thread safety
        if cls._instance is None:
            with _registry_lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._modules: Dict[str, ModuleInfo] = {}
        self._load_order: List[str] = []
        self._hooks: Dict[str, List[Callable]] = defaultdict(list)
        self._models: Dict[str, Type[DeclarativeBase]] = {}
        self._lock = threading.RLock()  # Lock for thread-safe access
        self._initialized = True

        logger.info("Module registry initialized")

    @classmethod
    def get_registry(cls) -> "ModuleRegistry":
        """Get the singleton registry instance."""
        return cls()

    def reset(self) -> None:
        """Reset the registry (mainly for testing)."""
        self._modules.clear()
        self._load_order.clear()
        self._hooks.clear()
        self._models.clear()

    # -------------------------------------------------------------------------
    # Module Registration
    # -------------------------------------------------------------------------

    def register(
        self,
        name: str,
        manifest: ManifestSchema,
        path: Path,
        state: ModuleState = ModuleState.UNINSTALLED,
    ) -> ModuleInfo:
        """
        Register a new module.

        Args:
            name: Module technical name
            manifest: Validated manifest schema
            path: Path to module directory
            state: Initial module state

        Returns:
            ModuleInfo for the registered module
        """
        if name in self._modules:
            logger.warning(f"Module '{name}' already registered, updating")

        module_info = ModuleInfo(
            name=name,
            manifest=manifest,
            path=path,
            state=state,
        )

        self._modules[name] = module_info
        logger.info(f"Registered module: {name} v{manifest.version}")

        return module_info

    def unregister(self, name: str) -> bool:
        """
        Unregister a module.

        Args:
            name: Module technical name

        Returns:
            True if module was unregistered, False if not found
        """
        if name not in self._modules:
            return False

        del self._modules[name]
        if name in self._load_order:
            self._load_order.remove(name)

        logger.info(f"Unregistered module: {name}")
        return True

    def get(self, name: str) -> Optional[ModuleInfo]:
        """Get a module by name."""
        return self._modules.get(name)

    def get_all(self) -> List[ModuleInfo]:
        """Get all registered modules in load order."""
        ordered = []
        for name in self._load_order:
            if name in self._modules:
                ordered.append(self._modules[name])

        # Add any modules not in load order
        for name, module in self._modules.items():
            if name not in self._load_order:
                ordered.append(module)

        return ordered

    def get_installed(self) -> List[ModuleInfo]:
        """Get all installed modules."""
        return [m for m in self._modules.values() if m.state == ModuleState.INSTALLED]

    def is_installed(self, name: str) -> bool:
        """Check if a module is installed."""
        module = self._modules.get(name)
        return module is not None and module.state == ModuleState.INSTALLED

    def get_names(self) -> List[str]:
        """Get all registered module names."""
        return list(self._modules.keys())

    # -------------------------------------------------------------------------
    # Dependency Resolution
    # -------------------------------------------------------------------------

    def get_dependents(self, name: str) -> List[str]:
        """
        Get modules that depend on the given module.

        Args:
            name: Module name to find dependents for

        Returns:
            List of module names that depend on this module
        """
        dependents = []
        for module_name, module in self._modules.items():
            if name in module.manifest.depends:
                dependents.append(module_name)
        return dependents

    def get_dependencies(self, name: str, recursive: bool = False) -> List[str]:
        """
        Get dependencies for a module.

        Args:
            name: Module name
            recursive: If True, get all transitive dependencies

        Returns:
            List of dependency module names
        """
        module = self._modules.get(name)
        if not module:
            return []

        if not recursive:
            return list(module.manifest.depends)

        # Recursive dependency resolution
        all_deps: Set[str] = set()
        to_process = list(module.manifest.depends)

        while to_process:
            dep = to_process.pop(0)
            if dep in all_deps:
                continue
            all_deps.add(dep)

            dep_module = self._modules.get(dep)
            if dep_module:
                to_process.extend(dep_module.manifest.depends)

        return list(all_deps)

    def check_dependencies(self, name: str) -> List[str]:
        """
        Check for missing dependencies.

        Args:
            name: Module name to check

        Returns:
            List of missing dependency names
        """
        module = self._modules.get(name)
        if not module:
            return []

        missing = []
        for dep in module.manifest.depends:
            if dep not in self._modules:
                missing.append(dep)

        return missing

    def resolve_load_order(self) -> List[str]:
        """
        Resolve the correct load order based on dependencies.

        Uses topological sort to ensure dependencies are loaded first.

        Returns:
            List of module names in correct load order

        Raises:
            CircularDependencyError: If circular dependencies detected
        """
        from .exceptions import CircularDependencyError

        # Build dependency graph
        in_degree: Dict[str, int] = {name: 0 for name in self._modules}
        graph: Dict[str, List[str]] = {name: [] for name in self._modules}

        for name, module in self._modules.items():
            for dep in module.manifest.depends:
                if dep in self._modules:
                    graph[dep].append(name)
                    in_degree[name] += 1

        # Kahn's algorithm for topological sort
        queue = [name for name, degree in in_degree.items() if degree == 0]
        result = []

        while queue:
            # Sort for deterministic order
            queue.sort()
            node = queue.pop(0)
            result.append(node)

            for dependent in graph[node]:
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)

        if len(result) != len(self._modules):
            # Find the cycle
            remaining = set(self._modules.keys()) - set(result)
            cycle = list(remaining)[:5]  # Show first 5 modules in cycle
            raise CircularDependencyError(cycle)

        self._load_order = result
        return result

    # -------------------------------------------------------------------------
    # Hook System
    # -------------------------------------------------------------------------

    def register_hook(self, event: str, callback: Callable) -> None:
        """
        Register a callback for an event.

        Args:
            event: Event name (e.g., 'startup', 'shutdown', 'module_loaded')
            callback: Callable to invoke when event triggers
        """
        self._hooks[event].append(callback)
        logger.debug(f"Registered hook for event '{event}'")

    def trigger_hook(self, event: str, *args: Any, **kwargs: Any) -> List[Any]:
        """
        Trigger all callbacks for an event.

        Args:
            event: Event name
            *args: Positional arguments to pass to callbacks
            **kwargs: Keyword arguments to pass to callbacks

        Returns:
            List of return values from all callbacks
        """
        results = []
        for callback in self._hooks.get(event, []):
            try:
                result = callback(*args, **kwargs)
                results.append(result)
            except Exception as e:
                logger.error(f"Error in hook callback for '{event}': {e}")
        return results

    async def trigger_hook_async(self, event: str, *args: Any, **kwargs: Any) -> List[Any]:
        """
        Trigger all callbacks for an event asynchronously.

        Args:
            event: Event name
            *args: Positional arguments to pass to callbacks
            **kwargs: Keyword arguments to pass to callbacks

        Returns:
            List of return values from all callbacks
        """
        import asyncio

        results = []
        for callback in self._hooks.get(event, []):
            try:
                if asyncio.iscoroutinefunction(callback):
                    result = await callback(*args, **kwargs)
                else:
                    result = callback(*args, **kwargs)
                results.append(result)
            except Exception as e:
                logger.error(f"Error in async hook callback for '{event}': {e}")
        return results

    # -------------------------------------------------------------------------
    # Model Registry
    # -------------------------------------------------------------------------

    def register_model(self, name: str, model: Type[DeclarativeBase]) -> None:
        """
        Register a model class.

        Args:
            name: Full model name (e.g., 'base.User', 'sales.Order')
            model: SQLAlchemy model class
        """
        self._models[name] = model
        logger.debug(f"Registered model: {name}")

    def get_model(self, name: str) -> Optional[Type[DeclarativeBase]]:
        """Get a registered model by name."""
        return self._models.get(name)

    def get_all_models(self) -> Dict[str, Type[DeclarativeBase]]:
        """Get all registered models."""
        return dict(self._models)

    # -------------------------------------------------------------------------
    # State Management
    # -------------------------------------------------------------------------

    def set_state(self, name: str, state: ModuleState) -> bool:
        """
        Set the state of a module.

        Args:
            name: Module name
            state: New state

        Returns:
            True if state was set, False if module not found
        """
        module = self._modules.get(name)
        if not module:
            return False

        old_state = module.state
        module.state = state
        logger.info(f"Module '{name}' state: {old_state.value} -> {state.value}")

        # Trigger state change hook
        self.trigger_hook("module_state_changed", name, old_state, state)

        return True


def get_registry() -> ModuleRegistry:
    """Get the global module registry instance."""
    return ModuleRegistry.get_registry()
