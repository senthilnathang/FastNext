"""
Module Service

Business logic for module installation, uninstallation, and management.
Includes schema lifecycle management (table creation, upgrade, deletion).
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Type

from sqlalchemy import Engine
from sqlalchemy.orm import Session, DeclarativeBase

from app.core.config import settings
from app.core.modules import (
    ModuleLoader,
    ModuleRegistry,
    ModuleState,
    ModuleNotFoundError,
    MissingDependenciesError,
)
from app.db.base import engine as db_engine

from app.core.modules.exceptions import ModuleValidationError

from ..models.module import InstalledModule, serialize_manifest
from .migration_engine import MigrationEngine, MigrationResult
from .module_validator import ModuleValidator, ValidationResult
from .schema_inspector import SchemaInspector
from .schema_manager import SchemaManager

logger = logging.getLogger(__name__)


class ModuleService:
    """
    Service for managing modules.

    Handles module installation, uninstallation, upgrades, and queries.
    Bridges between the module loader/registry and the database.
    """

    def __init__(self, db: Session, engine: Optional[Engine] = None):
        self.db = db
        self.engine = engine or db_engine
        self.registry = ModuleRegistry.get_registry()
        self.loader = ModuleLoader(settings.all_addon_paths, self.registry)

        # Schema management services
        self.schema_inspector = SchemaInspector(self.engine)
        self.schema_manager = SchemaManager(self.engine)
        self.migration_engine = MigrationEngine(db, self.engine)

        # Pre-installation validator
        self.validator = ModuleValidator(db, self.engine)

    # -------------------------------------------------------------------------
    # Query Methods
    # -------------------------------------------------------------------------

    def get_all_modules(
        self,
        installed_only: bool = False,
        category: Optional[str] = None,
        application_only: bool = False,
    ) -> List[InstalledModule]:
        """
        Get all modules (both installed and discovered).

        Args:
            installed_only: Only return installed modules
            category: Filter by category
            application_only: Only return application modules

        Returns:
            List of InstalledModule objects
        """
        # Refresh discovery
        self.loader.discover_modules()

        # Get installed modules from database
        query = self.db.query(InstalledModule)

        if installed_only:
            query = query.filter(InstalledModule.state == "installed")

        if category:
            query = query.filter(InstalledModule.category == category)

        if application_only:
            query = query.filter(InstalledModule.application == True)

        installed = {m.name: m for m in query.all()}

        # If only installed, return now
        if installed_only:
            return list(installed.values())

        # Add discovered but not installed modules
        result = list(installed.values())

        for name in self.loader._discovered:
            if name not in installed:
                try:
                    module_path = self.loader.get_module_path(name)
                    manifest = self.loader.load_manifest(module_path)

                    # Apply filters
                    if category and manifest.get("category") != category:
                        continue
                    if application_only and not manifest.get("application", False):
                        continue

                    module = InstalledModule.from_manifest(
                        name,
                        manifest,
                        str(module_path),
                    )
                    module.state = "uninstalled"
                    result.append(module)

                except Exception as e:
                    logger.warning(f"Failed to load manifest for '{name}': {e}")

        return result

    def get_installed_modules(self) -> List[InstalledModule]:
        """Get all installed modules."""
        return (
            self.db.query(InstalledModule)
            .filter(InstalledModule.state == "installed")
            .all()
        )

    def get_module(self, name: str) -> Optional[InstalledModule]:
        """
        Get a specific module by name.

        Returns installed module from DB or creates temporary object from manifest.
        """
        # Check database first
        module = (
            self.db.query(InstalledModule)
            .filter(InstalledModule.name == name)
            .first()
        )

        if module:
            return module

        # Try to load from filesystem
        self.loader.discover_modules()
        module_path = self.loader.get_module_path(name)

        if not module_path:
            return None

        try:
            manifest = self.loader.load_manifest(module_path)
            module = InstalledModule.from_manifest(name, manifest, str(module_path))
            module.state = "uninstalled"
            return module
        except Exception:
            return None

    def is_installed(self, name: str) -> bool:
        """Check if a module is installed."""
        return (
            self.db.query(InstalledModule)
            .filter(InstalledModule.name == name)
            .filter(InstalledModule.state == "installed")
            .count() > 0
        )

    def get_dependents(self, name: str) -> List[str]:
        """Get names of installed modules that depend on this module."""
        dependents = []

        installed = self.get_installed_modules()
        for module in installed:
            if name in (module.depends or []):
                dependents.append(module.name)

        return dependents

    # -------------------------------------------------------------------------
    # Validation Methods
    # -------------------------------------------------------------------------

    def validate_module(self, name: str) -> ValidationResult:
        """
        Run pre-installation validation on a module.

        Validates frontend assets, schema compatibility, route conflicts,
        and dependencies before installation.

        Args:
            name: Technical name of the module to validate

        Returns:
            ValidationResult with errors and warnings
        """
        return self.validator.validate_module(name)

    # -------------------------------------------------------------------------
    # Installation Methods
    # -------------------------------------------------------------------------

    def install_module(
        self,
        name: str,
        skip_validation: bool = False,
    ) -> InstalledModule:
        """
        Install a module.

        Args:
            name: Module name to install
            skip_validation: Skip pre-installation validation (not recommended)

        Returns:
            InstalledModule database record

        Raises:
            ModuleNotFoundError: If module not found
            MissingDependenciesError: If dependencies not satisfied
            ModuleValidationError: If pre-installation validation fails
        """
        # Ensure module is discovered
        self.loader.discover_modules()
        module_path = self.loader.get_module_path(name)

        if not module_path:
            raise ModuleNotFoundError(name)

        # Run pre-installation validation
        # Always run validation to get schema_diffs, but only fail on errors if not skipped
        validation_result = self.validator.validate_module(name)

        # Log warnings
        for warning in validation_result.warnings:
            logger.warning(
                f"Module '{name}' validation warning: {warning.message}"
            )

        # Fail on errors (unless validation is skipped)
        if not skip_validation and not validation_result.valid:
            raise ModuleValidationError(name, validation_result.errors)

        # Load and validate manifest
        manifest_dict = self.loader.load_manifest(module_path)
        manifest = self.loader.validate_manifest(manifest_dict)

        # Check dependencies - install them first if needed
        for dep in manifest.depends:
            if dep and not self.is_installed(dep):
                # Try to install dependency
                try:
                    logger.info(f"Installing dependency: {dep}")
                    self.install_module(dep)
                except Exception as e:
                    raise MissingDependenciesError(name, [dep])

        # Check if already installed
        existing = (
            self.db.query(InstalledModule)
            .filter(InstalledModule.name == name)
            .first()
        )

        is_reinstall = False
        if existing:
            if existing.state == "installed":
                # Module is already installed - check for schema changes
                is_reinstall = True
                logger.info(f"Module '{name}' already installed, checking for schema changes")
                module = existing
            else:
                # Update existing record (was uninstalled, now reinstalling)
                existing.state = "installed"
                existing.version = manifest.version
                existing.manifest_cache = serialize_manifest(manifest_dict)
                self.db.commit()
                self.db.refresh(existing)
                module = existing
        else:
            # Create new installation record
            module = InstalledModule.from_manifest(name, manifest_dict, str(module_path))
            module.state = "installed"

            self.db.add(module)
            self.db.commit()
            self.db.refresh(module)

        # Load the module into registry
        try:
            self.loader.load_module(name)
            self.registry.set_state(name, ModuleState.INSTALLED)
        except Exception as e:
            logger.error(f"Failed to load module '{name}' after installation: {e}")
            # Still keep it installed in DB, will try again on restart

        # Create database tables for module models
        # Pass schema_diffs from validation to handle existing table migrations
        schema_diffs = validation_result.schema_diffs if validation_result.schema_diffs else None
        if schema_diffs:
            logger.info(
                f"Module '{name}' has {len(schema_diffs)} tables with schema changes"
            )

        schema_result = self._create_module_schema(
            name, manifest.version, schema_diffs=schema_diffs
        )
        if schema_result and not schema_result.success:
            logger.warning(f"Schema creation warning for '{name}': {schema_result.error}")

        # Create frontend files (views, routes) based on menu structure
        frontend_files = self._install_frontend_files(name, manifest_dict)
        if frontend_files:
            logger.info(f"Created frontend files for '{name}': {len(frontend_files)} files")

        # Signal frontend reload
        self._signal_frontend_reload(name, "install")

        logger.info(f"Installed module: {name} v{manifest.version}")
        return module

    def uninstall_module(
        self,
        name: str,
        drop_tables: bool = True,
        cascade: bool = False,
        backup: bool = True,
        keep_data: bool = False,
    ) -> Dict[str, Any]:
        """
        Uninstall a module with full cleanup.

        Following Odoo's lifecycle pattern:
        1. Check dependencies
        2. Run pre-uninstall validation
        3. Run uninstall hook (if defined)
        4. Drop database tables (with backup)
        5. Clean up migration history
        6. Remove from registry
        7. Signal frontend reload

        Args:
            name: Module name to uninstall
            drop_tables: Drop database tables (default: True)
            cascade: CASCADE when dropping tables (uninstall dependents too)
            backup: Backup data before dropping tables (default: True)
            keep_data: Keep tables but uninstall module (for reinstall)

        Returns:
            Dict with uninstall result details
        """
        result = {
            "success": False,
            "module": name,
            "tables_dropped": [],
            "backup_file": None,
            "warnings": [],
            "requires_restart": False,
        }

        module = (
            self.db.query(InstalledModule)
            .filter(InstalledModule.name == name)
            .first()
        )

        if not module:
            result["error"] = f"Module '{name}' not found"
            return result

        if module.state != "installed":
            result["error"] = f"Module '{name}' is not installed"
            return result

        # Protect base module
        if name == "base":
            result["error"] = "Cannot uninstall the base module"
            return result

        # Check for dependent modules
        dependents = self.get_dependents(name)
        installed_dependents = [d for d in dependents if self.is_installed(d)]

        if installed_dependents:
            if cascade:
                # Uninstall dependents first (reverse order)
                for dep in reversed(installed_dependents):
                    logger.info(f"Cascade uninstalling dependent: {dep}")
                    dep_result = self.uninstall_module(
                        dep, drop_tables=drop_tables, cascade=True,
                        backup=backup, keep_data=keep_data
                    )
                    if not dep_result["success"]:
                        result["error"] = f"Failed to uninstall dependent '{dep}': {dep_result.get('error')}"
                        return result
            else:
                result["error"] = f"Cannot uninstall: required by {installed_dependents}"
                return result

        # Step 1: Run uninstall hook if defined
        module_info = self.registry.get(name)
        if module_info and module_info.manifest.uninstall_hook:
            try:
                hook_result = self._run_uninstall_hook(name, module_info)
                if not hook_result:
                    result["warnings"].append("Uninstall hook returned False")
            except Exception as e:
                logger.warning(f"Uninstall hook failed for '{name}': {e}")
                result["warnings"].append(f"Uninstall hook error: {str(e)}")

        # Step 2: Get table names before dropping
        table_names = self._get_module_table_names(name)

        # Step 3: Backup data if requested
        if backup and table_names and drop_tables and not keep_data:
            backup_file = self._backup_module_data(name, table_names)
            result["backup_file"] = backup_file

        # Step 4: Drop tables if requested
        # IMPORTANT: Commit the current transaction before schema operations.
        # The schema manager uses a separate database connection, and PostgreSQL
        # will block DROP TABLE if another connection holds read locks on the table.
        # Committing here releases any read locks from previous queries.
        self.db.commit()

        if drop_tables and not keep_data and table_names:
            schema_result = self._drop_module_schema(
                name, backup=False, cascade=cascade  # backup already done
            )
            if schema_result:
                if schema_result.success:
                    result["tables_dropped"] = table_names
                else:
                    logger.error(f"Schema removal failed for '{name}': {schema_result.error}")
                    result["warnings"].append(f"Table drop warning: {schema_result.error}")

        # Step 5: Clean up frontend files (Vue.js templates, components, etc.)
        frontend_cleanup = self._cleanup_frontend_files(name)
        if frontend_cleanup:
            result["frontend_removed"] = frontend_cleanup
            logger.info(f"Removed frontend files for '{name}': {frontend_cleanup}")

        # Step 6: Clean up migration history
        self._cleanup_migration_history(name)

        # Step 7: Update module state
        # Refresh the module object in case it was detached by earlier commits
        self.db.refresh(module)
        module.state = "uninstalled"
        module.uninstalled_at = datetime.utcnow()
        self.db.commit()

        # Step 8: Remove from registry
        self.registry.unregister(name)

        # Step 9: Signal that frontend needs reload
        self._signal_frontend_reload(name, "uninstall")
        result["requires_restart"] = True

        logger.info(f"Uninstalled module: {name} (tables: {len(result['tables_dropped'])}, frontend: {len(frontend_cleanup) if frontend_cleanup else 0})")
        result["success"] = True
        return result

    def _run_uninstall_hook(self, name: str, module_info) -> bool:
        """
        Run the module's uninstall hook.

        Similar to Odoo, the hook receives the database cursor and registry.
        """
        import importlib

        hook_name = module_info.manifest.uninstall_hook
        if not hook_name:
            return True

        try:
            # Import the module's hooks file
            hooks_module = importlib.import_module(f"modules.{name}.hooks")
            hook_func = getattr(hooks_module, hook_name, None)

            if hook_func and callable(hook_func):
                # Pass cursor and registry like Odoo
                from sqlalchemy import text
                with self.engine.connect() as conn:
                    # Create a simple cursor-like interface
                    result = hook_func(conn, self.registry)
                    return result if isinstance(result, bool) else True
            else:
                logger.warning(f"Uninstall hook '{hook_name}' not found in {name}.hooks")
                return True

        except ImportError:
            logger.debug(f"No hooks module found for {name}")
            return True
        except Exception as e:
            logger.error(f"Error running uninstall hook for {name}: {e}")
            raise

    def _cleanup_migration_history(self, name: str) -> None:
        """Clean up migration history for uninstalled module."""
        from modules.base.models.module_migration import ModuleMigration, ModuleModelState

        try:
            # Mark migrations as uninstalled (keep for audit)
            self.db.query(ModuleMigration).filter(
                ModuleMigration.module_name == name
            ).update({"is_applied": False})

            # Delete model states
            self.db.query(ModuleModelState).filter(
                ModuleModelState.module_name == name
            ).delete()

            self.db.commit()
            logger.debug(f"Cleaned up migration history for {name}")
        except Exception as e:
            logger.error(f"Failed to cleanup migration history: {e}")
            self.db.rollback()

    def _signal_frontend_reload(self, name: str, action: str) -> None:
        """
        Signal that frontend needs to reload module assets.

        Creates a reload signal that the frontend can poll or receive via WebSocket.
        """
        from modules.base.models.module import ModuleReloadSignal

        try:
            signal = ModuleReloadSignal(
                module_name=name,
                action=action,
                created_at=datetime.utcnow(),
            )
            self.db.add(signal)
            self.db.commit()
            logger.debug(f"Created reload signal for {name}: {action}")
        except Exception as e:
            # Don't fail uninstall if signal fails
            logger.warning(f"Failed to create reload signal: {e}")
            self.db.rollback()

    def _cleanup_frontend_files(self, name: str) -> List[str]:
        """
        Remove frontend files (Vue.js templates, components, API, etc.) for a module.

        Removes module-specific directories from the frontend app structure:
        - views/{module_name}/
        - components/{module_name}/
        - api/{module_name}/
        - stores/{module_name}/

        Args:
            name: Module name

        Returns:
            List of removed directory paths
        """
        import shutil

        removed = []

        # Get backend directory (where this code runs from)
        backend_dir = Path(__file__).parent.parent.parent.parent  # modules/base/services -> backend

        # Possible frontend paths relative to backend
        frontend_paths = [
            backend_dir.parent / "frontend" / "apps" / "web-fastvue" / "src",
            backend_dir.parent / "frontend" / "src",
            Path("/opt/FastVue/frontend/apps/web-fastvue/src"),
            Path("/opt/FastVue/frontend/src"),
        ]

        # Find the actual frontend path
        frontend_base = None
        for path in frontend_paths:
            if path.exists():
                frontend_base = path
                logger.debug(f"Found frontend base: {frontend_base}")
                break

        if not frontend_base:
            logger.warning(f"Frontend base path not found, skipping frontend cleanup for '{name}'")
            return removed

        # Directories to clean up (module-specific subdirectories)
        frontend_dirs = [
            "views",
            "components",
            "stores",
            "composables",
        ]

        # Also clean up the API directory for the module
        api_module_dir = frontend_base / "api" / name
        if api_module_dir.exists() and api_module_dir.is_dir():
            try:
                if str(api_module_dir.resolve()).startswith(str(frontend_base.resolve())):
                    shutil.rmtree(api_module_dir)
                    removed.append(str(api_module_dir))
                    logger.info(f"Removed frontend API directory: {api_module_dir}")
            except Exception as e:
                logger.warning(f"Failed to remove {api_module_dir}: {e}")

        for dir_name in frontend_dirs:
            module_dir = frontend_base / dir_name / name
            if module_dir.exists() and module_dir.is_dir():
                try:
                    # Safety check: only remove if it's under the frontend path
                    if str(module_dir.resolve()).startswith(str(frontend_base.resolve())):
                        shutil.rmtree(module_dir)
                        removed.append(str(module_dir))
                        logger.info(f"Removed frontend directory: {module_dir}")
                except Exception as e:
                    logger.warning(f"Failed to remove {module_dir}: {e}")

        # Remove router route file for the module
        route_file = frontend_base / "router" / "routes" / "modules" / f"{name}.ts"
        if route_file.exists() and route_file.is_file():
            try:
                if str(route_file.resolve()).startswith(str(frontend_base.resolve())):
                    route_file.unlink()
                    removed.append(str(route_file))
                    logger.info(f"Removed frontend route file: {route_file}")
            except Exception as e:
                logger.warning(f"Failed to remove route file {route_file}: {e}")

        # Also check for module's static directory in backend
        module_static = backend_dir / "modules" / name / "static"
        if module_static.exists() and module_static.is_dir():
            try:
                shutil.rmtree(module_static)
                removed.append(str(module_static))
                logger.info(f"Removed module static directory: {module_static}")
            except Exception as e:
                logger.warning(f"Failed to remove {module_static}: {e}")

        return removed

    def _install_frontend_files(self, name: str, manifest: Dict[str, Any]) -> List[str]:
        """
        Create frontend files (Vue.js views, routes) for a module based on its menu structure.

        Creates:
        - views/{module_name}/*.vue placeholder components
        - router/routes/modules/{module_name}.ts route file

        Args:
            name: Module name
            manifest: Module manifest dictionary containing menus

        Returns:
            List of created file paths
        """
        created = []

        # Get backend directory
        backend_dir = Path(__file__).parent.parent.parent.parent

        # Find frontend path
        frontend_paths = [
            backend_dir.parent / "frontend" / "apps" / "web-fastvue" / "src",
            backend_dir.parent / "frontend" / "src",
            Path("/opt/FastVue/frontend/apps/web-fastvue/src"),
            Path("/opt/FastVue/frontend/src"),
        ]

        frontend_base = None
        for path in frontend_paths:
            if path.exists():
                frontend_base = path
                break

        if not frontend_base:
            logger.warning(f"Frontend base path not found, skipping frontend file creation for '{name}'")
            return created

        menus = manifest.get("menus", [])
        if not menus:
            logger.info(f"No menus defined for module '{name}', skipping frontend file creation")
            return created

        # Collect all menu paths for view creation
        view_paths = []
        route_children = []

        def process_menu(menu: Dict, parent_path: str = "") -> Dict[str, Any]:
            """Process a menu item and its children, return route definition."""
            menu_name = menu.get("name", "")
            menu_path = menu.get("path", "")
            menu_icon = menu.get("icon", "lucide:circle")
            children = menu.get("children", [])

            # Calculate relative path for route
            if parent_path and menu_path.startswith(parent_path + "/"):
                relative_path = menu_path[len(parent_path) + 1:]
            else:
                relative_path = menu_path

            route_name = menu_name.replace(" ", "")

            if children:
                # Parent menu with children
                child_routes = [process_menu(child, menu_path) for child in children]
                return {
                    "name": route_name,
                    "path": relative_path,
                    "redirect": children[0].get("path", "") if children else None,
                    "icon": menu_icon,
                    "title": menu_name,
                    "children": child_routes,
                }
            else:
                # Leaf menu - needs a view
                view_paths.append(menu_path)
                return {
                    "name": route_name,
                    "path": relative_path,
                    "icon": menu_icon,
                    "title": menu_name,
                    "component_path": menu_path,
                }

        # Process top-level menus
        top_routes = []
        for menu in menus:
            route_info = process_menu(menu)
            top_routes.append(route_info)

        # Collect entities for API client generation
        entities = []

        # Create view directories and Vue files
        views_base = frontend_base / "views"
        for view_path in view_paths:
            # Convert /crm/dashboard to views/crm/dashboard/index.vue
            # Convert /crm/settings/pipelines to views/crm/settings/pipelines.vue
            path_parts = view_path.strip("/").split("/")

            if len(path_parts) >= 2 and path_parts[-2] == "settings":
                # Settings-type path: /crm/settings/pipelines -> pipelines.vue
                view_dir = views_base / "/".join(path_parts[:-1])
                view_file = view_dir / f"{path_parts[-1]}.vue"
                view_type = "settings"
                entity_name = path_parts[-1]
            else:
                # Regular path: /crm/dashboard -> dashboard/index.vue
                view_dir = views_base / "/".join(path_parts)
                view_file = view_dir / "index.vue"
                entity_name = path_parts[-1]
                # Determine view type based on name
                if entity_name == "dashboard":
                    view_type = "dashboard"
                elif entity_name in ["activities"]:
                    view_type = "list"  # Activities is a list view
                else:
                    view_type = "list"
                    entities.append(entity_name)

            # Create directory
            view_dir.mkdir(parents=True, exist_ok=True)

            # Create Vue component if it doesn't exist
            if not view_file.exists():
                # Generate appropriate view type
                if view_type == "dashboard":
                    vue_content = self._generate_dashboard_view(name)
                elif view_type == "settings":
                    vue_content = self._generate_settings_view(entity_name, name)
                else:
                    vue_content = self._generate_vue_list_view(entity_name, name)

                try:
                    view_file.write_text(vue_content)
                    created.append(str(view_file))
                    logger.info(f"Created frontend view: {view_file}")
                except Exception as e:
                    logger.warning(f"Failed to create view file {view_file}: {e}")

        # Create API client file
        if entities:
            api_dir = frontend_base / "api" / name
            api_dir.mkdir(parents=True, exist_ok=True)
            api_file = api_dir / "index.ts"
            if not api_file.exists():
                api_content = self._generate_api_client(name, entities)
                try:
                    api_file.write_text(api_content)
                    created.append(str(api_file))
                    logger.info(f"Created frontend API client: {api_file}")
                except Exception as e:
                    logger.warning(f"Failed to create API file {api_file}: {e}")

        # Create routes file
        routes_dir = frontend_base / "router" / "routes" / "modules"
        routes_dir.mkdir(parents=True, exist_ok=True)
        route_file = routes_dir / f"{name}.ts"

        if not route_file.exists():
            route_content = self._generate_routes_file(name, top_routes)
            try:
                route_file.write_text(route_content)
                created.append(str(route_file))
                logger.info(f"Created frontend route file: {route_file}")
            except Exception as e:
                logger.warning(f"Failed to create route file {route_file}: {e}")

        return created

    def _generate_vue_list_view(self, entity_name: str, module_name: str) -> str:
        """Generate a Vue list view component with data table."""
        # Convert entity name to various formats
        entity_lower = entity_name.lower()
        entity_title = entity_name.replace("-", " ").replace("_", " ").title()
        entity_camel = entity_name.replace("-", " ").replace("_", " ").title().replace(" ", "")
        api_prefix = f"/{module_name}/{entity_lower}"

        return f'''<script lang="ts" setup>
import {{ computed, onMounted, ref }} from 'vue';
import {{ useRouter }} from 'vue-router';

import {{ Page }} from '@vben/common-ui';

import {{
  Button,
  Card,
  Input,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
}} from 'ant-design-vue';
import {{
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
}} from '@ant-design/icons-vue';

import {{ requestClient }} from '#/api/request';

defineOptions({{
  name: '{module_name.upper()}{entity_camel}List',
}});

const router = useRouter();

// Pagination state
const pagination = ref({{
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `Total ${{total}} items`,
}});

// State
const loading = ref(false);
const items = ref<any[]>([]);
const searchText = ref('');

// Table columns - customize based on your model fields
const columns = computed(() => [
  {{ title: 'ID', dataIndex: 'id', key: 'id', width: 80 }},
  {{ title: 'Name', dataIndex: 'name', key: 'name', sorter: true }},
  {{ title: 'Status', key: 'status', width: 100 }},
  {{ title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 150 }},
  {{ title: 'Actions', key: 'actions', width: 150, fixed: 'right' as const }},
]);

// Fetch data
async function fetchData() {{
  loading.value = true;
  try {{
    const params = {{
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
      search: searchText.value || undefined,
    }};
    const response = await requestClient.get<any>('{api_prefix}/', {{ params }});
    items.value = response.items || [];
    pagination.value.total = response.total || 0;
  }} catch (error) {{
    console.error('Failed to fetch data:', error);
    message.error('Failed to load data');
  }} finally {{
    loading.value = false;
  }}
}}

function onTableChange(pag: any) {{
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchData();
}}

function handleSearch() {{
  pagination.value.current = 1;
  fetchData();
}}

function handleCreate() {{
  router.push({{ name: '{module_name.upper()}{entity_camel}Create' }});
}}

function handleEdit(record: any) {{
  router.push({{ name: '{module_name.upper()}{entity_camel}Edit', params: {{ id: record.id }} }});
}}

function handleView(record: any) {{
  router.push({{ name: '{module_name.upper()}{entity_camel}View', params: {{ id: record.id }} }});
}}

async function handleDelete(record: any) {{
  try {{
    await requestClient.delete(`{api_prefix}/${{record.id}}`);
    message.success('Deleted successfully');
    fetchData();
  }} catch (error) {{
    console.error('Failed to delete:', error);
    message.error('Failed to delete');
  }}
}}

onMounted(() => {{
  fetchData();
}});
</script>

<template>
  <Page
    title="{entity_title}"
    description="Manage {entity_title.lower()} records"
  >
    <Card>
      <!-- Toolbar -->
      <div class="mb-4 flex items-center justify-between">
        <Space>
          <Input
            v-model:value="searchText"
            placeholder="Search..."
            style="width: 250px"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </Input>
          <Button @click="handleSearch">Search</Button>
        </Space>
        <Space>
          <Button @click="fetchData">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
          <Button type="primary" @click="handleCreate">
            <template #icon><PlusOutlined /></template>
            Create
          </Button>
        </Space>
      </div>

      <!-- Table -->
      <Table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        @change="onTableChange"
      >
        <template #bodyCell="{{ column, record }}">
          <template v-if="column.key === 'status'">
            <Tag :color="record.is_active !== false ? 'green' : 'red'">
              {{{{ record.is_active !== false ? 'Active' : 'Inactive' }}}}
            </Tag>
          </template>
          <template v-else-if="column.key === 'created_at'">
            {{{{ record.created_at ? new Date(record.created_at).toLocaleDateString() : '-' }}}}
          </template>
          <template v-else-if="column.key === 'actions'">
            <Space>
              <Button type="link" size="small" @click="handleView(record)">
                <template #icon><EyeOutlined /></template>
              </Button>
              <Button type="link" size="small" @click="handleEdit(record)">
                <template #icon><EditOutlined /></template>
              </Button>
              <Popconfirm
                title="Are you sure you want to delete this item?"
                ok-text="Yes"
                cancel-text="No"
                @confirm="handleDelete(record)"
              >
                <Button type="link" size="small" danger>
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>
  </Page>
</template>
'''

    def _generate_dashboard_view(self, module_name: str) -> str:
        """Generate a dashboard view component."""
        return f'''<script lang="ts" setup>
import {{ onMounted, ref }} from 'vue';

import {{ Page }} from '@vben/common-ui';

import {{ Card, Col, Row, Statistic }} from 'ant-design-vue';
import {{
  BarChartOutlined,
  RiseOutlined,
  TeamOutlined,
  TrophyOutlined,
}} from '@ant-design/icons-vue';

import {{ requestClient }} from '#/api/request';

defineOptions({{
  name: '{module_name.upper()}Dashboard',
}});

// Statistics
const stats = ref({{
  total: 0,
  active: 0,
  thisMonth: 0,
  growth: 0,
}});

const loading = ref(false);

async function fetchStats() {{
  loading.value = true;
  try {{
    // Fetch dashboard statistics from API
    // const response = await requestClient.get('/{module_name}/stats');
    // stats.value = response;
  }} catch (error) {{
    console.error('Failed to fetch stats:', error);
  }} finally {{
    loading.value = false;
  }}
}}

onMounted(() => {{
  fetchStats();
}});
</script>

<template>
  <Page
    title="{module_name.upper()} Dashboard"
    description="Overview and analytics"
  >
    <Row :gutter="[16, 16]">
      <Col :xs="24" :sm="12" :lg="6">
        <Card :loading="loading">
          <Statistic title="Total Records" :value="stats.total">
            <template #prefix>
              <BarChartOutlined />
            </template>
          </Statistic>
        </Card>
      </Col>
      <Col :xs="24" :sm="12" :lg="6">
        <Card :loading="loading">
          <Statistic title="Active" :value="stats.active" value-style="{{ color: '#3f8600' }}">
            <template #prefix>
              <TeamOutlined />
            </template>
          </Statistic>
        </Card>
      </Col>
      <Col :xs="24" :sm="12" :lg="6">
        <Card :loading="loading">
          <Statistic title="This Month" :value="stats.thisMonth">
            <template #prefix>
              <TrophyOutlined />
            </template>
          </Statistic>
        </Card>
      </Col>
      <Col :xs="24" :sm="12" :lg="6">
        <Card :loading="loading">
          <Statistic title="Growth" :value="stats.growth" suffix="%">
            <template #prefix>
              <RiseOutlined />
            </template>
          </Statistic>
        </Card>
      </Col>
    </Row>

    <Row :gutter="[16, 16]" class="mt-4">
      <Col :span="24">
        <Card title="Recent Activity">
          <p class="text-gray-500">Dashboard charts and activity feed will be displayed here.</p>
        </Card>
      </Col>
    </Row>
  </Page>
</template>
'''

    def _generate_settings_view(self, setting_name: str, module_name: str) -> str:
        """Generate a settings view component."""
        setting_title = setting_name.replace("-", " ").replace("_", " ").title()

        return f'''<script lang="ts" setup>
import {{ onMounted, ref }} from 'vue';

import {{ Page }} from '@vben/common-ui';

import {{ Button, Card, Form, FormItem, Input, message, Switch }} from 'ant-design-vue';
import {{ SaveOutlined }} from '@ant-design/icons-vue';

import {{ requestClient }} from '#/api/request';

defineOptions({{
  name: '{module_name.upper()}{setting_name.title().replace(" ", "")}Settings',
}});

const loading = ref(false);
const saving = ref(false);

const formState = ref({{
  // Add setting fields here
  enabled: true,
  name: '',
}});

async function fetchSettings() {{
  loading.value = true;
  try {{
    // const response = await requestClient.get('/{module_name}/settings/{setting_name}');
    // formState.value = response;
  }} catch (error) {{
    console.error('Failed to fetch settings:', error);
  }} finally {{
    loading.value = false;
  }}
}}

async function saveSettings() {{
  saving.value = true;
  try {{
    // await requestClient.put('/{module_name}/settings/{setting_name}', formState.value);
    message.success('Settings saved successfully');
  }} catch (error) {{
    console.error('Failed to save settings:', error);
    message.error('Failed to save settings');
  }} finally {{
    saving.value = false;
  }}
}}

onMounted(() => {{
  fetchSettings();
}});
</script>

<template>
  <Page
    title="{setting_title}"
    description="Configure {setting_title.lower()}"
  >
    <Card :loading="loading">
      <Form layout="vertical" :model="formState">
        <FormItem label="Name" name="name">
          <Input v-model:value="formState.name" placeholder="Enter name" />
        </FormItem>

        <FormItem label="Enabled" name="enabled">
          <Switch v-model:checked="formState.enabled" />
        </FormItem>

        <FormItem>
          <Button type="primary" :loading="saving" @click="saveSettings">
            <template #icon><SaveOutlined /></template>
            Save Settings
          </Button>
        </FormItem>
      </Form>
    </Card>
  </Page>
</template>
'''

    def _generate_api_client(self, module_name: str, entities: List[str]) -> str:
        """Generate API client TypeScript file for a module."""
        imports = []
        api_functions = []

        for entity in entities:
            entity_lower = entity.lower()
            entity_camel = entity.replace("-", " ").replace("_", " ").title().replace(" ", "")
            entity_title = entity.replace("-", " ").replace("_", " ").title()

            api_functions.append(f'''
// =============================================================================
// {entity_title.upper()} API
// =============================================================================

export namespace {entity_camel}Api {{
  export interface {entity_camel} {{
    id: number;
    name: string;
    created_at: string;
    updated_at: string | null;
    [key: string]: any;
  }}

  export interface {entity_camel}Create {{
    name: string;
    [key: string]: any;
  }}

  export interface {entity_camel}Update {{
    name?: string;
    [key: string]: any;
  }}

  export interface ListParams {{
    skip?: number;
    limit?: number;
    search?: string;
  }}

  export interface ListResponse {{
    items: {entity_camel}[];
    total: number;
    page: number;
    page_size: number;
  }}
}}

export async function get{entity_camel}sApi(params?: {entity_camel}Api.ListParams) {{
  return requestClient.get<{entity_camel}Api.ListResponse>('/{module_name}/{entity_lower}/', {{ params }});
}}

export async function get{entity_camel}Api(id: number) {{
  return requestClient.get<{entity_camel}Api.{entity_camel}>(`/{module_name}/{entity_lower}/${{id}}`);
}}

export async function create{entity_camel}Api(data: {entity_camel}Api.{entity_camel}Create) {{
  return requestClient.post<{entity_camel}Api.{entity_camel}>('/{module_name}/{entity_lower}/', data);
}}

export async function update{entity_camel}Api(id: number, data: {entity_camel}Api.{entity_camel}Update) {{
  return requestClient.put<{entity_camel}Api.{entity_camel}>(`/{module_name}/{entity_lower}/${{id}}`, data);
}}

export async function delete{entity_camel}Api(id: number) {{
  return requestClient.delete(`/{module_name}/{entity_lower}/${{id}}`);
}}
''')

        return f'''/**
 * {module_name.upper()} Module API Client
 * Auto-generated by FastVue Module System
 */

import {{ requestClient }} from '#/api/request';

{"".join(api_functions)}
'''

    def _generate_routes_file(self, name: str, routes: List[Dict]) -> str:
        """Generate a TypeScript routes file for the module."""

        def format_child_route(route: Dict, indent: int = 6) -> str:
            """Format a child route definition."""
            spaces = " " * indent
            lines = ["{"]

            # Route name (prefixed with module name for uniqueness)
            route_name = f'{name.upper()}{route["name"]}'
            lines.append(f'{spaces}  name: \'{route_name}\',')

            # Path (relative for children)
            lines.append(f'{spaces}  path: \'{route["path"]}\',')

            # Redirect (for parent routes)
            if route.get("redirect"):
                # Convert absolute redirect to relative
                redirect = route["redirect"]
                if redirect.startswith(f'/{name}/'):
                    redirect = redirect[len(f'/{name}/'):]
                lines.append(f'{spaces}  redirect: \'{redirect}\',')

            # Component (for leaf routes)
            if route.get("component_path"):
                comp_path = route["component_path"]
                # Convert /crm/dashboard to #/views/crm/dashboard/index.vue
                path_parts = comp_path.strip("/").split("/")
                if len(path_parts) >= 2 and path_parts[-2] == "settings":
                    import_path = f'#/views/{"/".join(path_parts)}.vue'
                else:
                    import_path = f'#/views/{"/".join(path_parts)}/index.vue'
                lines.append(f'{spaces}  component: () => import(\'{import_path}\'),')

            # Meta
            lines.append(f'{spaces}  meta: {{')
            lines.append(f'{spaces}    icon: \'{route.get("icon", "lucide:circle")}\',')
            lines.append(f'{spaces}    title: \'{route.get("title", route["name"])}\',')
            lines.append(f'{spaces}  }},')

            # Children
            if route.get("children"):
                lines.append(f'{spaces}  children: [')
                for child in route["children"]:
                    child_str = format_child_route(child, indent + 4)
                    lines.append(f'{spaces}    {child_str},')
                lines.append(f'{spaces}  ],')

            lines.append(f'{spaces}}}')
            return "\n".join(lines)

        # Get the top-level menu (e.g., CRM)
        if not routes:
            return ""

        top_menu = routes[0]  # e.g., {"name": "CRM", "path": "/crm", "children": [...]}
        children = top_menu.get("children", [])

        # Format child routes
        child_route_strs = []
        for child in children:
            child_route_strs.append(format_child_route(child))

        children_content = ",\n      ".join(child_route_strs)

        # Get first child path for redirect
        first_child_path = ""
        if children:
            first_child_path = children[0].get("path", "").strip("/")
            if first_child_path.startswith(f"{name}/"):
                first_child_path = first_child_path[len(f"{name}/"):]

        return f'''import type {{ RouteRecordRaw }} from 'vue-router';

const routes: RouteRecordRaw[] = [
  {{
    meta: {{
      icon: '{top_menu.get("icon", "lucide:folder")}',
      order: 20,
      title: '{top_menu.get("title", name.upper())}',
    }},
    name: '{name.upper()}',
    path: '/{name}',
    redirect: '/{name}/{first_child_path}',
    children: [
      {children_content}
    ],
  }},
];

export default routes;
'''

    def upgrade_module(self, name: str) -> InstalledModule:
        """
        Upgrade a module to the latest version on disk.

        Args:
            name: Module name to upgrade

        Returns:
            Updated InstalledModule record
        """
        # Get current installation
        module = (
            self.db.query(InstalledModule)
            .filter(InstalledModule.name == name)
            .first()
        )

        if not module:
            raise ModuleNotFoundError(name)

        # Reload from disk
        self.loader.discover_modules()
        module_path = self.loader.get_module_path(name)

        if not module_path:
            raise ModuleNotFoundError(name)

        manifest_dict = self.loader.load_manifest(module_path)
        manifest = self.loader.validate_manifest(manifest_dict)

        # Update database record
        old_version = module.version
        module.version = manifest.version
        module.display_name = manifest.name
        module.summary = manifest.summary
        module.description = manifest.description
        module.author = manifest.author
        module.website = manifest.website
        module.category = manifest.category
        module.application = manifest.application
        module.depends = manifest.depends
        module.manifest_cache = serialize_manifest(manifest_dict)
        module.state = "installed"

        self.db.commit()
        self.db.refresh(module)

        # Reload module in registry
        try:
            self.loader.load_module(name)
        except Exception as e:
            logger.error(f"Failed to reload module '{name}': {e}")

        # Upgrade database schema if version changed
        if old_version != manifest.version:
            schema_result = self._upgrade_module_schema(name, manifest.version)
            if schema_result and not schema_result.success:
                logger.warning(f"Schema upgrade warning for '{name}': {schema_result.error}")

        logger.info(f"Upgraded module: {name} from {old_version} to {manifest.version}")
        return module

    # -------------------------------------------------------------------------
    # Frontend Configuration
    # -------------------------------------------------------------------------

    def get_frontend_configs(self) -> List[Dict[str, Any]]:
        """
        Get frontend configuration for all installed modules.

        Returns list of frontend config dictionaries for the module loader.
        """
        configs = []

        for module in self.get_installed_modules():
            manifest = module.manifest_cache or {}
            assets = manifest.get("assets", {})

            # Build static URL prefix
            static_prefix = f"/modules/{module.name}/static"

            config = {
                "name": module.name,
                "displayName": module.display_name,
                "routes": self._build_asset_url(static_prefix, assets.get("routes")),
                "stores": self._build_asset_urls(static_prefix, assets.get("stores", [])),
                "components": self._build_asset_urls(static_prefix, assets.get("components", [])),
                "views": self._build_asset_urls(static_prefix, assets.get("views", [])),
                "locales": self._build_asset_urls(static_prefix, assets.get("locales", [])),
                "menus": manifest.get("menus", []),
            }

            configs.append(config)

        return configs

    def _build_asset_url(
        self,
        prefix: str,
        path: Optional[str]
    ) -> Optional[str]:
        """Build full URL for a single asset path."""
        if not path:
            return None
        # Remove 'static/' prefix if present
        if path.startswith("static/"):
            path = path[7:]
        return f"{prefix}/{path}"

    def _build_asset_urls(
        self,
        prefix: str,
        paths: List[str]
    ) -> List[str]:
        """Build full URLs for a list of asset paths."""
        urls = []
        for path in paths:
            url = self._build_asset_url(prefix, path)
            if url:
                urls.append(url)
        return urls

    def get_all_menus(self) -> List[Dict[str, Any]]:
        """Get all menu items from installed modules."""
        menus = []

        for module in self.get_installed_modules():
            manifest = module.manifest_cache or {}
            module_menus = manifest.get("menus", [])

            for menu in module_menus:
                # Add module name for namespacing
                menu_copy = dict(menu)
                menu_copy["module"] = module.name
                menus.append(menu_copy)

        # Sort by sequence
        menus.sort(key=lambda m: m.get("sequence", 10))

        return menus

    # -------------------------------------------------------------------------
    # Schema Management Methods
    # -------------------------------------------------------------------------

    def _get_module_models(self, name: str) -> List[Type[DeclarativeBase]]:
        """Get SQLAlchemy model classes for a module."""
        module_info = self.registry.get(name)
        if not module_info or not module_info.models:
            return []
        # Handle both list and dict formats
        if isinstance(module_info.models, dict):
            return list(module_info.models.values())
        return list(module_info.models)

    def _get_module_association_tables(self, name: str) -> List:
        """Get SQLAlchemy Table objects (association tables) for a module."""
        module_info = self.registry.get(name)
        if not module_info or not module_info.association_tables:
            return []
        return list(module_info.association_tables)

    def _get_module_table_names(self, name: str) -> List[str]:
        """Get table names for a module's models and association tables."""
        from sqlalchemy import inspect as sa_inspect

        models = self._get_module_models(name)
        table_names = []

        for model in models:
            try:
                mapper = sa_inspect(model)
                table_names.append(mapper.local_table.name)
            except Exception:
                continue

        # Also include association tables
        association_tables = self._get_module_association_tables(name)
        for table in association_tables:
            if hasattr(table, 'name') and table.name not in table_names:
                table_names.append(table.name)

        return table_names

    def _create_module_schema(
        self,
        name: str,
        version: str,
        schema_diffs: Optional[list] = None,
    ) -> Optional[MigrationResult]:
        """
        Create database tables for a module.

        If schema_diffs are provided (from pre-installation validation),
        applies migrations to existing tables before creating new ones.

        Args:
            name: Module name
            version: Module version
            schema_diffs: Optional list of TableDiff from validation

        Returns:
            MigrationResult or None if no models
        """
        models = self._get_module_models(name)
        association_tables = self._get_module_association_tables(name)

        if not models and not association_tables:
            logger.debug(f"No models or association tables found for module '{name}'")
            return None

        logger.info(
            f"Creating schema for module '{name}' "
            f"({len(models)} models, {len(association_tables)} association tables)"
        )
        return self.migration_engine.install_module_schema(
            name, version, models,
            schema_diffs=schema_diffs,
            association_tables=association_tables
        )

    def _upgrade_module_schema(
        self,
        name: str,
        version: str,
    ) -> Optional[MigrationResult]:
        """Upgrade database schema for a module."""
        models = self._get_module_models(name)
        if not models:
            return None

        logger.info(f"Upgrading schema for module '{name}' to v{version}")
        return self.migration_engine.upgrade_module_schema(name, version, models)

    def _drop_module_schema(
        self,
        name: str,
        backup: bool = True,
        cascade: bool = False,
    ) -> Optional[MigrationResult]:
        """Drop database tables for a module."""
        table_names = self._get_module_table_names(name)
        if not table_names:
            logger.debug(f"No tables found for module '{name}'")
            return None

        # Backup if requested
        if backup:
            self._backup_module_data(name, table_names)

        logger.info(f"Dropping schema for module '{name}' ({len(table_names)} tables)")
        return self.migration_engine.uninstall_module_schema(name, table_names, cascade)

    def _backup_module_data(self, name: str, table_names: List[str]) -> Optional[str]:
        """Backup module data to JSON file."""
        import json
        from datetime import datetime
        from pathlib import Path

        # Get backend directory (where this code runs from)
        backend_dir = Path(__file__).parent.parent.parent.parent  # modules/base/services -> backend
        backup_dir = backend_dir / "backups" / "modules"
        backup_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"{name}_{timestamp}.json"

        backup_data = {
            "module_name": name,
            "timestamp": timestamp,
            "tables": {},
        }

        try:
            from sqlalchemy import text

            with self.engine.connect() as conn:
                for table_name in table_names:
                    if self.schema_inspector.table_exists(table_name):
                        result = conn.execute(text(f"SELECT * FROM {table_name}"))
                        rows = [dict(row._mapping) for row in result]
                        backup_data["tables"][table_name] = {
                            "row_count": len(rows),
                            "data": self._serialize_rows(rows),
                        }

            with open(backup_file, "w") as f:
                json.dump(backup_data, f, indent=2, default=str)

            logger.info(f"Backed up module '{name}' data to {backup_file}")
            return str(backup_file)
        except Exception as e:
            logger.error(f"Failed to backup module '{name}' data: {e}")
            return None

    def _serialize_rows(self, rows: List[Dict]) -> List[Dict]:
        """Serialize database rows to JSON-compatible format."""
        from datetime import datetime, date
        from decimal import Decimal
        import uuid

        serialized = []
        for row in rows:
            serialized_row = {}
            for key, value in row.items():
                if isinstance(value, (datetime, date)):
                    serialized_row[key] = value.isoformat()
                elif isinstance(value, Decimal):
                    serialized_row[key] = float(value)
                elif isinstance(value, uuid.UUID):
                    serialized_row[key] = str(value)
                elif isinstance(value, bytes):
                    serialized_row[key] = value.decode("utf-8", errors="replace")
                else:
                    serialized_row[key] = value
            serialized.append(serialized_row)
        return serialized

    # -------------------------------------------------------------------------
    # Schema Query Methods (for API)
    # -------------------------------------------------------------------------

    def get_schema_status(self, name: str) -> Dict[str, Any]:
        """Get schema status for a module."""
        models = self._get_module_models(name)
        if not models:
            return {
                "module_name": name,
                "has_models": False,
                "models": [],
                "pending_changes": False,
            }

        validation = self.migration_engine.validate_module_schema(name, models)
        pending = self.migration_engine.get_pending_changes(name, models)

        return {
            "module_name": name,
            "has_models": True,
            "models": [m.__name__ for m in models],
            "validation": validation,
            "pending_changes": len(pending) > 0,
            "pending_operations": [op.to_dict() for op in pending],
        }

    def get_migration_history(
        self,
        name: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Get migration history for a module or all modules."""
        migrations = self.migration_engine.get_migration_history(name, limit)
        return [m.to_dict() for m in migrations]

    def sync_schema(
        self,
        name: str,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """Sync schema for a module (apply pending changes)."""
        models = self._get_module_models(name)
        if not models:
            return {
                "success": True,
                "message": "No models to sync",
                "operations": [],
            }

        # Get module version
        module = self.get_module(name)
        version = module.version if module else "0.0.0"

        if dry_run:
            # Just return what would be done
            pending = self.migration_engine.get_pending_changes(name, models)
            return {
                "success": True,
                "dry_run": True,
                "operations": [op.to_dict() for op in pending],
            }

        # Actually apply changes
        result = self._upgrade_module_schema(name, version)
        if result:
            return result.to_dict()
        return {
            "success": True,
            "message": "No changes needed",
            "operations": [],
        }

    # -------------------------------------------------------------------------
    # State Machine Methods (Batch Operations)
    # -------------------------------------------------------------------------

    def mark_for_install(
        self,
        names: List[str],
        user_id: Optional[int] = None,
        batch_id: Optional[str] = None
    ) -> str:
        """
        Mark modules for installation.

        Creates pending operations that can be applied later as a batch.

        Args:
            names: List of module technical names to install
            user_id: User ID who marked the operations
            batch_id: Optional batch ID (generates new if not provided)

        Returns:
            Batch ID for the operations
        """
        from ..models.module_operation import ModuleOperation, OperationType

        if batch_id is None:
            batch_id = ModuleOperation.create_batch_id()

        # Resolve dependencies and determine install order
        all_to_install = []
        for name in names:
            # Check module exists
            module_path = self.loader.get_module_path(name)
            if not module_path:
                raise ModuleNotFoundError(name)

            # Get dependencies recursively
            deps = self.registry.get_dependencies(name, recursive=True)
            for dep in deps:
                if dep not in all_to_install and not self.is_installed(dep):
                    all_to_install.append(dep)

            if name not in all_to_install and not self.is_installed(name):
                all_to_install.append(name)

        # Create operations in dependency order
        sequence = 10
        for module_name in all_to_install:
            # Check if already has pending operation
            if ModuleOperation.has_pending_for_module(self.db, module_name):
                logger.warning(f"Module {module_name} already has pending operations")
                continue

            ModuleOperation.create_operation(
                db=self.db,
                module_name=module_name,
                operation=OperationType.INSTALL,
                batch_id=batch_id,
                sequence=sequence,
                marked_by=user_id
            )
            sequence += 10

        logger.info(f"Marked {len(all_to_install)} modules for install: batch={batch_id}")
        return batch_id

    def mark_for_upgrade(
        self,
        names: List[str],
        user_id: Optional[int] = None,
        batch_id: Optional[str] = None
    ) -> str:
        """
        Mark modules for upgrade.

        Args:
            names: List of module technical names to upgrade
            user_id: User ID who marked the operations
            batch_id: Optional batch ID

        Returns:
            Batch ID for the operations
        """
        from ..models.module_operation import ModuleOperation, OperationType

        if batch_id is None:
            batch_id = ModuleOperation.create_batch_id()

        sequence = 10
        for name in names:
            # Check module is installed
            module = self.get_module(name)
            if not module or module.state != "installed":
                logger.warning(f"Module {name} is not installed, skipping upgrade mark")
                continue

            if ModuleOperation.has_pending_for_module(self.db, name):
                logger.warning(f"Module {name} already has pending operations")
                continue

            ModuleOperation.create_operation(
                db=self.db,
                module_name=name,
                operation=OperationType.UPGRADE,
                batch_id=batch_id,
                sequence=sequence,
                marked_by=user_id,
                previous_version=module.version,
                previous_state=module.state
            )
            sequence += 10

        logger.info(f"Marked {len(names)} modules for upgrade: batch={batch_id}")
        return batch_id

    def mark_for_remove(
        self,
        names: List[str],
        user_id: Optional[int] = None,
        batch_id: Optional[str] = None
    ) -> str:
        """
        Mark modules for removal.

        Args:
            names: List of module technical names to remove
            user_id: User ID who marked the operations
            batch_id: Optional batch ID

        Returns:
            Batch ID for the operations
        """
        from ..models.module_operation import ModuleOperation, OperationType

        if batch_id is None:
            batch_id = ModuleOperation.create_batch_id()

        # Check for dependents (reverse dependency order)
        sequence = 10
        for name in names:
            if name == "base":
                raise ValueError("Cannot remove the base module")

            module = self.get_module(name)
            if not module or module.state != "installed":
                logger.warning(f"Module {name} is not installed, skipping remove mark")
                continue

            # Check for dependents
            dependents = self.get_dependents(name)
            installed_dependents = [d for d in dependents if self.is_installed(d)]
            if installed_dependents:
                raise ValueError(
                    f"Cannot remove {name}: required by {installed_dependents}"
                )

            if ModuleOperation.has_pending_for_module(self.db, name):
                logger.warning(f"Module {name} already has pending operations")
                continue

            ModuleOperation.create_operation(
                db=self.db,
                module_name=name,
                operation=OperationType.REMOVE,
                batch_id=batch_id,
                sequence=sequence,
                marked_by=user_id,
                previous_state=module.state
            )
            sequence += 10

        logger.info(f"Marked {len(names)} modules for removal: batch={batch_id}")
        return batch_id

    def get_pending_operations(
        self,
        batch_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all pending module operations.

        Args:
            batch_id: Optional filter by batch

        Returns:
            List of pending operation dictionaries
        """
        from ..models.module_operation import ModuleOperation

        ops = ModuleOperation.get_pending_operations(self.db, batch_id)
        return [
            {
                "id": op.id,
                "batch_id": op.batch_id,
                "module_name": op.module_name,
                "operation": op.operation,
                "status": op.status,
                "sequence": op.sequence,
                "marked_by": op.marked_by,
                "created_at": op.created_at.isoformat() if op.created_at else None,
            }
            for op in ops
        ]

    def apply_pending_operations(
        self,
        batch_id: Optional[str] = None,
        user_id: Optional[int] = None,
        drop_tables: bool = False,
        cascade: bool = False,
        backup: bool = True
    ) -> Dict[str, Any]:
        """
        Apply all pending module operations.

        Executes operations in sequence order with transaction support.
        On failure, marks failed operation and stops (later ops remain pending).

        Args:
            batch_id: Optional batch filter
            user_id: User ID executing the operations
            drop_tables: For remove operations, drop database tables
            cascade: For remove operations, cascade to dependent tables
            backup: For remove operations, backup data first

        Returns:
            Result dictionary with success status and operation results
        """
        from ..models.module_operation import ModuleOperation, OperationType, OperationStatus
        import traceback

        ops = ModuleOperation.get_pending_operations(self.db, batch_id)
        if not ops:
            return {"success": True, "message": "No pending operations", "results": []}

        results = []
        all_success = True

        for op in ops:
            op.start()
            op.executed_by = user_id
            self.db.flush()

            try:
                if op.operation == OperationType.INSTALL.value:
                    module = self.install_module(op.module_name)
                    op.complete_success()
                    results.append({
                        "module": op.module_name,
                        "operation": op.operation,
                        "status": "success",
                        "version": module.version
                    })

                elif op.operation == OperationType.UPGRADE.value:
                    module = self.upgrade_module(op.module_name)
                    op.complete_success()
                    results.append({
                        "module": op.module_name,
                        "operation": op.operation,
                        "status": "success",
                        "version": module.version
                    })

                elif op.operation == OperationType.REMOVE.value:
                    uninstall_result = self.uninstall_module(
                        op.module_name,
                        drop_tables=drop_tables,
                        cascade=cascade,
                        backup=backup
                    )
                    if uninstall_result.get("success"):
                        op.complete_success()
                        results.append({
                            "module": op.module_name,
                            "operation": op.operation,
                            "status": "success",
                            "tables_dropped": uninstall_result.get("tables_dropped", []),
                            "backup_file": uninstall_result.get("backup_file"),
                        })
                    else:
                        error = uninstall_result.get("error", "Uninstall failed")
                        op.complete_failure(error)
                        all_success = False
                        results.append({
                            "module": op.module_name,
                            "operation": op.operation,
                            "status": "failed",
                            "error": error
                        })
                        break

            except Exception as e:
                tb = traceback.format_exc()
                op.complete_failure(str(e), tb)
                all_success = False
                results.append({
                    "module": op.module_name,
                    "operation": op.operation,
                    "status": "failed",
                    "error": str(e)
                })
                logger.error(f"Operation failed for {op.module_name}: {e}")
                break

            self.db.flush()

        return {
            "success": all_success,
            "batch_id": ops[0].batch_id if ops else None,
            "total": len(ops),
            "executed": len(results),
            "results": results
        }

    def rollback_operation(self, batch_id: str) -> Dict[str, Any]:
        """
        Rollback a batch of operations.

        Only rolls back successful operations in reverse order.
        For install -> uninstall, for upgrade -> downgrade (if possible).

        Args:
            batch_id: Batch ID to rollback

        Returns:
            Result dictionary
        """
        from ..models.module_operation import ModuleOperation, OperationType, OperationStatus

        ops = ModuleOperation.get_batch_operations(self.db, batch_id)
        if not ops:
            return {"success": False, "message": "Batch not found"}

        # Get successful operations in reverse order
        successful = [op for op in reversed(ops) if op.is_success]
        if not successful:
            return {"success": True, "message": "No successful operations to rollback"}

        results = []
        for op in successful:
            try:
                if op.operation == OperationType.INSTALL.value:
                    # Rollback install = uninstall
                    uninstall_result = self.uninstall_module(
                        op.module_name, drop_tables=True, backup=True
                    )
                    if uninstall_result.get("success"):
                        op.mark_rolled_back()
                        results.append({
                            "module": op.module_name,
                            "rollback": "uninstalled",
                            "status": "success"
                        })
                    else:
                        results.append({
                            "module": op.module_name,
                            "rollback": "failed",
                            "status": "error",
                            "error": uninstall_result.get("error", "Uninstall failed")
                        })

                elif op.operation == OperationType.UPGRADE.value:
                    # Rollback upgrade - mark as rolled back (can't easily downgrade)
                    op.mark_rolled_back()
                    results.append({
                        "module": op.module_name,
                        "rollback": "marked",
                        "status": "success",
                        "note": "Manual downgrade may be required"
                    })

                elif op.operation == OperationType.REMOVE.value:
                    # Rollback remove = reinstall (if still available)
                    try:
                        self.install_module(op.module_name)
                        op.mark_rolled_back()
                        results.append({
                            "module": op.module_name,
                            "rollback": "reinstalled",
                            "status": "success"
                        })
                    except Exception as e:
                        results.append({
                            "module": op.module_name,
                            "rollback": "failed",
                            "status": "error",
                            "error": str(e)
                        })

            except Exception as e:
                results.append({
                    "module": op.module_name,
                    "rollback": "failed",
                    "status": "error",
                    "error": str(e)
                })

            self.db.flush()

        return {
            "success": True,
            "batch_id": batch_id,
            "rolled_back": len([r for r in results if r["status"] == "success"]),
            "results": results
        }

    def clear_marks(self, batch_id: Optional[str] = None) -> int:
        """
        Cancel and clear pending operation marks.

        Args:
            batch_id: Optional batch filter

        Returns:
            Number of cancelled operations
        """
        from ..models.module_operation import ModuleOperation

        count = ModuleOperation.cancel_pending(self.db, batch_id)
        logger.info(f"Cleared {count} pending module operations")
        return count

    def get_recent_batches(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent operation batches.

        Args:
            limit: Maximum number of batches

        Returns:
            List of batch summaries
        """
        from ..models.module_operation import ModuleOperation

        return ModuleOperation.get_recent_batches(self.db, limit)
