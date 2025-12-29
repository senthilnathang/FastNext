"""
Module Loader

Discovers, validates, and loads modules from addon paths.
Handles dynamic import of module components (models, routers, services).
"""

import ast
import importlib
import importlib.util
import logging
import re
import shutil
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Type
from zipfile import ZipFile, is_zipfile

from fastapi import APIRouter
from sqlalchemy.orm import DeclarativeBase

from .exceptions import (
    InvalidModuleError,
    MissingDependenciesError,
    ModuleLoadError,
    ModuleNotFoundError,
)
from .manifest import ManifestSchema, parse_manifest
from .registry import ModuleInfo, ModuleRegistry, ModuleState

logger = logging.getLogger(__name__)

# Security constants
MAX_ZIP_SIZE = 100 * 1024 * 1024  # 100MB max uncompressed
MAX_ZIP_FILES = 1000  # Max files in ZIP
MAX_FILENAME_LENGTH = 255
MODULE_NAME_PATTERN = re.compile(r'^[a-zA-Z][a-zA-Z0-9_]*$')  # Valid Python identifier


class ModuleLoader:
    """
    Module discovery and loading system.

    Scans addon paths for modules, validates manifests,
    and dynamically imports module components.
    """

    def __init__(
        self,
        addon_paths: List[Path],
        registry: Optional[ModuleRegistry] = None,
    ):
        """
        Initialize the module loader.

        Args:
            addon_paths: List of paths to search for modules
            registry: Module registry to use (creates new if None)
        """
        self.addon_paths = [Path(p) for p in addon_paths]
        self.registry = registry or ModuleRegistry.get_registry()
        self._discovered: Dict[str, Path] = {}  # name -> path mapping
        self._manifest_cache: Dict[str, Dict[str, Any]] = {}  # name -> manifest
        self._cache_lock = threading.RLock()
        self._discovery_done = False

        logger.info(f"Module loader initialized with paths: {self.addon_paths}")

    def _validate_module_name(self, name: str) -> bool:
        """
        Validate that a module name is safe and valid.

        Args:
            name: Module name to validate

        Returns:
            True if valid, False otherwise
        """
        if not name or len(name) > MAX_FILENAME_LENGTH:
            return False
        if not MODULE_NAME_PATTERN.match(name):
            return False
        # Check for reserved/dangerous names
        dangerous_names = {'__pycache__', '__init__', '__manifest__', 'site-packages'}
        if name.lower() in dangerous_names:
            return False
        return True

    # -------------------------------------------------------------------------
    # Discovery
    # -------------------------------------------------------------------------

    def discover_modules(self, force: bool = False) -> List[str]:
        """
        Discover all modules in addon paths.

        Scans each addon path for directories containing __manifest__.py.

        Args:
            force: Force re-discovery even if already done

        Returns:
            List of discovered module names
        """
        with self._cache_lock:
            if self._discovery_done and not force:
                return list(self._discovered.keys())

            self._discovered.clear()

        for addon_path in self.addon_paths:
            if not addon_path.exists():
                logger.warning(f"Addon path does not exist: {addon_path}")
                continue

            if not addon_path.is_dir():
                logger.warning(f"Addon path is not a directory: {addon_path}")
                continue

            for item in addon_path.iterdir():
                if item.is_dir() and self._is_valid_module(item):
                    module_name = item.name

                    # Validate module name for security
                    if not self._validate_module_name(module_name):
                        logger.warning(f"Skipping module with invalid name: {module_name}")
                        continue

                    if module_name in self._discovered:
                        logger.warning(
                            f"Module '{module_name}' found in multiple paths, "
                            f"using: {self._discovered[module_name]}"
                        )
                        continue

                    self._discovered[module_name] = item
                    logger.debug(f"Discovered module: {module_name} at {item}")

        with self._cache_lock:
            self._discovery_done = True

        logger.info(f"Discovered {len(self._discovered)} modules")
        return list(self._discovered.keys())

    def _is_valid_module(self, path: Path) -> bool:
        """Check if a directory is a valid module."""
        manifest_file = path / "__manifest__.py"
        init_file = path / "__init__.py"

        return manifest_file.exists() and init_file.exists()

    def get_module_path(self, name: str) -> Optional[Path]:
        """Get the path to a module."""
        return self._discovered.get(name)

    # -------------------------------------------------------------------------
    # Manifest Loading
    # -------------------------------------------------------------------------

    def load_manifest(self, module_path: Path, use_cache: bool = True) -> Dict[str, Any]:
        """
        Load and parse a module's __manifest__.py file.

        Args:
            module_path: Path to the module directory
            use_cache: Whether to use cached manifest if available

        Returns:
            Manifest dictionary

        Raises:
            InvalidModuleError: If manifest is invalid or missing
        """
        module_name = module_path.name

        # Check cache first
        if use_cache:
            with self._cache_lock:
                if module_name in self._manifest_cache:
                    return self._manifest_cache[module_name]

        manifest_file = module_path / "__manifest__.py"

        if not manifest_file.exists():
            raise InvalidModuleError(
                f"Missing __manifest__.py in {module_path}",
                module_name
            )

        try:
            # Read and parse the manifest file safely
            content = manifest_file.read_text(encoding='utf-8')

            # Security: Limit manifest file size (max 100KB)
            if len(content) > 100 * 1024:
                raise InvalidModuleError(
                    f"Manifest file too large (max 100KB)",
                    module_name
                )

            # Use ast.literal_eval to safely evaluate the manifest dict
            # This only allows literals, not arbitrary code execution
            manifest = ast.literal_eval(content)

            if not isinstance(manifest, dict):
                raise InvalidModuleError(
                    f"Manifest must be a dictionary in {manifest_file}",
                    module_name
                )

            # Set technical name from directory name
            manifest.setdefault("technical_name", module_name)

            # Cache the manifest
            with self._cache_lock:
                self._manifest_cache[module_name] = manifest

            return manifest

        except SyntaxError as e:
            raise InvalidModuleError(
                f"Syntax error in manifest: {e}",
                module_name
            )
        except ValueError as e:
            raise InvalidModuleError(
                f"Invalid manifest format: {e}",
                module_name
            )

    def validate_manifest(self, manifest: Dict[str, Any]) -> ManifestSchema:
        """
        Validate a manifest dictionary.

        Args:
            manifest: Raw manifest dictionary

        Returns:
            Validated ManifestSchema

        Raises:
            InvalidModuleError: If validation fails
        """
        try:
            return parse_manifest(manifest)
        except Exception as e:
            raise InvalidModuleError(f"Manifest validation failed: {e}")

    # -------------------------------------------------------------------------
    # Dependency Checking
    # -------------------------------------------------------------------------

    def check_dependencies(self, manifest: ManifestSchema) -> List[str]:
        """
        Check for missing module dependencies.

        Args:
            manifest: Module manifest to check

        Returns:
            List of missing dependency names
        """
        missing = []

        for dep in manifest.depends:
            # Skip 'base' for the base module itself
            if dep == manifest.technical_name:
                continue

            if dep not in self._discovered and not self.registry.is_installed(dep):
                missing.append(dep)

        return missing

    def check_external_dependencies(
        self,
        manifest: ManifestSchema
    ) -> Dict[str, List[str]]:
        """
        Check for missing external dependencies.

        Args:
            manifest: Module manifest to check

        Returns:
            Dict with 'python' and 'bin' keys containing missing packages
        """
        missing = {"python": [], "bin": []}

        # Check Python packages
        for package in manifest.external_dependencies.python:
            try:
                importlib.import_module(package.split("[")[0])  # Handle extras
            except ImportError:
                missing["python"].append(package)

        # Check binary dependencies
        for binary in manifest.external_dependencies.bin:
            if shutil.which(binary) is None:
                missing["bin"].append(binary)

        return missing

    # -------------------------------------------------------------------------
    # Module Loading
    # -------------------------------------------------------------------------

    def load_module(self, name: str) -> ModuleInfo:
        """
        Load a single module.

        Args:
            name: Module name to load

        Returns:
            ModuleInfo for the loaded module

        Raises:
            ModuleNotFoundError: If module not found
            MissingDependenciesError: If dependencies are missing
            ModuleLoadError: If loading fails
        """
        path = self._discovered.get(name)
        if not path:
            raise ModuleNotFoundError(name)

        # Check if already loaded
        existing = self.registry.get(name)
        if existing and existing.python_module is not None:
            logger.debug(f"Module '{name}' already loaded, skipping")
            return existing

        # Load and validate manifest
        manifest_dict = self.load_manifest(path)
        manifest = self.validate_manifest(manifest_dict)

        # Check dependencies
        missing_deps = self.check_dependencies(manifest)
        if missing_deps:
            raise MissingDependenciesError(name, missing_deps)

        # Register the module only if not already registered
        if existing:
            module_info = existing
        else:
            module_info = self.registry.register(
                name=name,
                manifest=manifest,
                path=path,
                state=ModuleState.UNINSTALLED,
            )

        try:
            # Import the Python module (only if not already done)
            if module_info.python_module is None:
                module_info.python_module = self._import_module(name, path)

            # Load components (only if not already loaded)
            if module_info.models is None:
                module_info.models = self._import_models(name, path, manifest)
            if module_info.association_tables is None:
                module_info.association_tables = self._import_association_tables(name, path, manifest)
            if module_info.routers is None:
                module_info.routers = self._import_routers(name, path, manifest)
            if module_info.services is None:
                module_info.services = self._import_services(name, path, manifest)

            logger.info(f"Loaded module: {name}")

        except Exception as e:
            logger.error(f"Failed to load module '{name}': {e}")
            raise ModuleLoadError(name, str(e))

        return module_info

    def load_all_modules(self) -> List[ModuleInfo]:
        """
        Load all discovered modules in dependency order.

        Returns:
            List of loaded ModuleInfo objects
        """
        if not self._discovered:
            self.discover_modules()

        # First pass: register all modules for dependency resolution
        for name, path in self._discovered.items():
            try:
                manifest_dict = self.load_manifest(path)
                manifest = self.validate_manifest(manifest_dict)
                self.registry.register(name, manifest, path)
            except Exception as e:
                logger.error(f"Failed to register module '{name}': {e}")

        # Resolve load order
        try:
            load_order = self.registry.resolve_load_order()
        except Exception as e:
            logger.error(f"Failed to resolve load order: {e}")
            load_order = list(self._discovered.keys())

        # Second pass: actually load modules in order
        loaded = []
        for name in load_order:
            if name not in self._discovered:
                continue

            try:
                module_info = self.load_module(name)
                loaded.append(module_info)
            except Exception as e:
                logger.error(f"Failed to load module '{name}': {e}")

        logger.info(f"Loaded {len(loaded)} modules")
        return loaded

    # -------------------------------------------------------------------------
    # Dynamic Import Helpers
    # -------------------------------------------------------------------------

    def _get_full_import_path(self, name: str, path: Path) -> str:
        """
        Get the full import path for a module.

        If the module is in a directory like 'modules/', returns 'modules.{name}'.
        This ensures consistent import paths throughout the application.
        """
        parent_name = path.parent.name

        # If module is in a known addon directory (like 'modules'), use full path
        # Check if parent directory is importable (has __init__.py or is a namespace package)
        parent_path = path.parent
        parent_init = parent_path / "__init__.py"

        if parent_init.exists() or parent_name in ("modules",):
            # Use fully qualified import path: modules.base, modules.marketplace, etc.
            return f"{parent_name}.{name}"

        # Fall back to just the module name
        return name

    def _import_module(self, name: str, path: Path) -> Any:
        """Import the main Python module."""
        # Get the full import path (e.g., 'modules.base' instead of 'base')
        full_import_path = self._get_full_import_path(name, path)

        try:
            return importlib.import_module(full_import_path)
        except ImportError as e:
            logger.error(f"Failed to import module '{full_import_path}': {e}")
            raise

    def _import_models(
        self,
        module_name: str,
        path: Path,
        manifest: ManifestSchema
    ) -> List[Type[DeclarativeBase]]:
        """Import model classes from a module."""
        models = []

        # Get the full import path for this module
        full_import_path = self._get_full_import_path(module_name, path)

        for model_package in manifest.models:
            full_name = f"{full_import_path}.{model_package}"
            try:
                mod = importlib.import_module(full_name)

                # Find all SQLAlchemy model classes
                for attr_name in dir(mod):
                    attr = getattr(mod, attr_name)
                    if (
                        isinstance(attr, type)
                        and hasattr(attr, "__tablename__")
                        and attr_name != "Base"
                    ):
                        models.append(attr)
                        # Register in global model registry
                        self.registry.register_model(
                            f"{full_import_path}.{attr_name}",
                            attr
                        )

            except ImportError as e:
                logger.warning(f"Failed to import models from '{full_name}': {e}")

        return models

    def _import_association_tables(
        self,
        module_name: str,
        path: Path,
        manifest: ManifestSchema
    ) -> List[Any]:
        """
        Import association tables (many-to-many relationship tables) from a module.

        Association tables are SQLAlchemy Table objects that are used for
        many-to-many relationships between models. They don't have a __tablename__
        attribute like model classes do.

        Args:
            module_name: Name of the module
            path: Path to the module directory
            manifest: Module manifest

        Returns:
            List of SQLAlchemy Table objects
        """
        from sqlalchemy import Table

        association_tables = []

        # Get the full import path for this module
        full_import_path = self._get_full_import_path(module_name, path)

        for model_package in manifest.models:
            full_name = f"{full_import_path}.{model_package}"
            try:
                mod = importlib.import_module(full_name)

                # Find all SQLAlchemy Table objects (not model classes)
                for attr_name in dir(mod):
                    attr = getattr(mod, attr_name)
                    # Check if it's a Table object (not a class with __tablename__)
                    if isinstance(attr, Table):
                        # Only include tables that look like association tables
                        # (typically named with _association suffix or contain relationship columns only)
                        association_tables.append(attr)
                        logger.debug(f"Found association table '{attr.name}' in module '{module_name}'")

            except ImportError as e:
                logger.warning(f"Failed to import models from '{full_name}': {e}")

        return association_tables

    def _import_routers(
        self,
        module_name: str,
        path: Path,
        manifest: ManifestSchema
    ) -> List[APIRouter]:
        """Import FastAPI routers from a module."""
        routers = []

        # Get the full import path for this module
        full_import_path = self._get_full_import_path(module_name, path)

        for api_module in manifest.api:
            full_name = f"{full_import_path}.{api_module}"
            try:
                mod = importlib.import_module(full_name)

                # Look for 'router' attribute
                if hasattr(mod, "router"):
                    router = getattr(mod, "router")
                    if isinstance(router, APIRouter):
                        routers.append(router)

                # Also look for any APIRouter instances
                for attr_name in dir(mod):
                    attr = getattr(mod, attr_name)
                    if isinstance(attr, APIRouter) and attr not in routers:
                        routers.append(attr)

            except ImportError as e:
                logger.warning(f"Failed to import routers from '{full_name}': {e}")

        return routers

    def _import_services(
        self,
        module_name: str,
        path: Path,
        manifest: ManifestSchema
    ) -> Dict[str, Type]:
        """Import service classes from a module."""
        services = {}

        # Get the full import path for this module
        full_import_path = self._get_full_import_path(module_name, path)

        for service_package in manifest.services:
            full_name = f"{full_import_path}.{service_package}"
            try:
                mod = importlib.import_module(full_name)

                # Find service classes (classes ending with 'Service')
                for attr_name in dir(mod):
                    if attr_name.endswith("Service"):
                        attr = getattr(mod, attr_name)
                        if isinstance(attr, type):
                            services[attr_name] = attr

            except ImportError as e:
                logger.warning(f"Failed to import services from '{full_name}': {e}")

        return services

    # -------------------------------------------------------------------------
    # ZIP Installation
    # -------------------------------------------------------------------------

    def validate_zip_structure(self, zip_path: Path) -> bool:
        """
        Validate that a ZIP file contains a valid module.

        Includes security checks for:
        - Path traversal attacks
        - ZIP bombs (excessive file count or size)
        - Valid module structure

        Args:
            zip_path: Path to ZIP file

        Returns:
            True if valid module structure
        """
        if not is_zipfile(zip_path):
            return False

        try:
            with ZipFile(zip_path, 'r') as zf:
                names = zf.namelist()

                # Security: Check file count
                if len(names) > MAX_ZIP_FILES:
                    logger.warning(f"ZIP contains too many files: {len(names)} > {MAX_ZIP_FILES}")
                    return False

                # Security: Check for path traversal and calculate total size
                total_size = 0
                for info in zf.infolist():
                    # Check for path traversal
                    if info.filename.startswith('/') or '..' in info.filename:
                        logger.warning(f"Path traversal detected in ZIP: {info.filename}")
                        return False

                    # Check for absolute paths on Windows
                    if len(info.filename) > 1 and info.filename[1] == ':':
                        logger.warning(f"Absolute path detected in ZIP: {info.filename}")
                        return False

                    # Check filename length
                    if len(info.filename) > MAX_FILENAME_LENGTH:
                        logger.warning(f"Filename too long in ZIP: {info.filename}")
                        return False

                    # Calculate total uncompressed size
                    total_size += info.file_size

                # Security: Check total size (ZIP bomb protection)
                if total_size > MAX_ZIP_SIZE:
                    logger.warning(f"ZIP uncompressed size too large: {total_size} > {MAX_ZIP_SIZE}")
                    return False

                # Must contain __manifest__.py somewhere
                has_manifest = any(
                    n.endswith('__manifest__.py')
                    for n in names
                )

                # Must contain __init__.py
                has_init = any(
                    n.endswith('__init__.py')
                    for n in names
                )

                return has_manifest and has_init

        except Exception as e:
            logger.error(f"Error validating ZIP structure: {e}")
            return False

    def install_from_zip(
        self,
        zip_path: Path,
        target_dir: Optional[Path] = None
    ) -> str:
        """
        Extract and install a module from a ZIP file.

        Uses secure extraction with path sanitization to prevent
        path traversal attacks.

        Args:
            zip_path: Path to ZIP file
            target_dir: Directory to extract to (uses first addon path if None)

        Returns:
            Name of installed module

        Raises:
            InvalidModuleError: If ZIP is invalid
        """
        if not self.validate_zip_structure(zip_path):
            raise InvalidModuleError("Invalid module ZIP structure")

        target = target_dir or self.addon_paths[0]

        with ZipFile(zip_path, 'r') as zf:
            # Find the module name (top-level directory)
            names = zf.namelist()
            top_dirs = set()
            for name in names:
                parts = name.split('/')
                if len(parts) > 1 and parts[0]:
                    top_dirs.add(parts[0])

            if len(top_dirs) != 1:
                raise InvalidModuleError(
                    "ZIP must contain exactly one top-level module directory"
                )

            module_name = top_dirs.pop()

            # Validate module name
            if not self._validate_module_name(module_name):
                raise InvalidModuleError(
                    f"Invalid module name: {module_name}"
                )

            # Check if module already exists
            module_path = target / module_name
            if module_path.exists():
                # Backup existing module
                backup_path = module_path.with_suffix('.backup')
                if backup_path.exists():
                    shutil.rmtree(backup_path)
                shutil.move(module_path, backup_path)
                logger.info(f"Backed up existing module to {backup_path}")

            # Secure extraction - extract each file individually with path validation
            target_resolved = target.resolve()
            for info in zf.infolist():
                # Skip directories, they'll be created when extracting files
                if info.is_dir():
                    continue

                # Construct the target path safely
                target_file = target / info.filename
                target_file_resolved = target_file.resolve()

                # Security: Ensure the file is within the target directory
                try:
                    target_file_resolved.relative_to(target_resolved)
                except ValueError:
                    logger.warning(f"Skipping file outside target directory: {info.filename}")
                    continue

                # Create parent directories
                target_file.parent.mkdir(parents=True, exist_ok=True)

                # Extract file
                with zf.open(info) as src, open(target_file, 'wb') as dst:
                    shutil.copyfileobj(src, dst)

            logger.info(f"Extracted module '{module_name}' to {target}")

            # Invalidate cache for this module
            with self._cache_lock:
                self._manifest_cache.pop(module_name, None)
                self._discovery_done = False

            # Update discovery
            self._discovered[module_name] = module_path

            return module_name

    def uninstall_module(self, name: str) -> bool:
        """
        Uninstall a module by removing its directory.

        Args:
            name: Module name to uninstall

        Returns:
            True if uninstalled successfully
        """
        path = self._discovered.get(name)
        if not path or not path.exists():
            return False

        # Run uninstall hook if defined
        module_info = self.registry.get(name)
        if module_info and module_info.manifest.uninstall_hook:
            try:
                self._run_hook(module_info, module_info.manifest.uninstall_hook)
            except Exception as e:
                logger.error(f"Uninstall hook failed for '{name}': {e}")

        # Remove from registry
        self.registry.unregister(name)

        # Remove directory
        shutil.rmtree(path)
        del self._discovered[name]

        logger.info(f"Uninstalled module: {name}")
        return True

    def clear_cache(self, module_name: Optional[str] = None) -> None:
        """
        Clear cached data.

        Args:
            module_name: If provided, only clear cache for this module.
                        If None, clear all caches.
        """
        with self._cache_lock:
            if module_name:
                self._manifest_cache.pop(module_name, None)
            else:
                self._manifest_cache.clear()
                self._discovery_done = False

    def _run_hook(self, module_info: ModuleInfo, hook_name: str) -> Any:
        """Run a module lifecycle hook."""
        if not module_info.python_module:
            return None

        parts = hook_name.split('.')
        obj = module_info.python_module

        for part in parts:
            obj = getattr(obj, part, None)
            if obj is None:
                logger.warning(f"Hook '{hook_name}' not found in module")
                return None

        if callable(obj):
            return obj()

        return None
