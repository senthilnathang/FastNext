"""
FastNext Module System

A modular addon/plugin architecture inspired by Odoo and Django.
Allows dynamic loading of FastAPI + Next.js modules with dependency management.
"""

from .registry import ModuleRegistry, ModuleInfo, ModuleState
from .loader import ModuleLoader
from .manifest import ManifestSchema, AssetConfig, ExternalDeps
from .exceptions import (
    ModuleError,
    ModuleNotFoundError,
    InvalidModuleError,
    MissingDependenciesError,
    CircularDependencyError,
    ModuleInstallationError,
    ModuleLoadError,
    ExternalDependencyError,
    ModuleValidationError,
    # Schema exceptions
    SchemaError,
    TableExistsError,
    TableNotFoundError,
    ColumnExistsError,
    ColumnNotFoundError,
    DependencyBlockError,
    MigrationError,
    MigrationNotFoundError,
    RollbackError,
    SchemaValidationError,
)
from .inheritance import (
    ModelExtender,
    get_model_extender,
    extend_model,
)
from .overrides import (
    RouterOverrider,
    get_router_overrider,
    override_route,
    wrap_route,
    extend_router,
)

__all__ = [
    # Registry
    "ModuleRegistry",
    "ModuleInfo",
    "ModuleState",
    # Loader
    "ModuleLoader",
    # Manifest
    "ManifestSchema",
    "AssetConfig",
    "ExternalDeps",
    # Exceptions
    "ModuleError",
    "ModuleNotFoundError",
    "InvalidModuleError",
    "MissingDependenciesError",
    "CircularDependencyError",
    "ModuleInstallationError",
    "ModuleLoadError",
    "ExternalDependencyError",
    "ModuleValidationError",
    # Schema exceptions
    "SchemaError",
    "TableExistsError",
    "TableNotFoundError",
    "ColumnExistsError",
    "ColumnNotFoundError",
    "DependencyBlockError",
    "MigrationError",
    "MigrationNotFoundError",
    "RollbackError",
    "SchemaValidationError",
    # Inheritance
    "ModelExtender",
    "get_model_extender",
    "extend_model",
    # Overrides
    "RouterOverrider",
    "get_router_overrider",
    "override_route",
    "wrap_route",
    "extend_router",
]
