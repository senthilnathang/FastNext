"""
Module Introspection Service

Discovers and returns technical information about modules:
- Models and their fields
- Views (list, form) per model
- API routes
- Services
- Other technical details
"""

import ast
import importlib
import inspect
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Type

from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.modules import ModuleLoader, ModuleRegistry
from app.db.base import Base

logger = logging.getLogger(__name__)


class ModuleIntrospectionService:
    """
    Service for introspecting module technical details.

    Provides methods to discover:
    - Models defined in a module
    - Fields for each model
    - Views (list, form) configurations
    - API endpoints
    - Services
    - Static assets
    """

    def __init__(self, db: Session):
        self.db = db
        self.registry = ModuleRegistry.get_registry()
        self.loader = ModuleLoader(settings.all_addon_paths, self.registry)
        # Ensure modules are discovered
        self.loader.discover_modules()

    def get_module_technical_info(self, module_name: str) -> Dict[str, Any]:
        """
        Get comprehensive technical information about a module.

        Args:
            module_name: Name of the module

        Returns:
            Dictionary with technical details
        """
        module_path = self.loader.get_module_path(module_name)
        if not module_path:
            return {"error": f"Module '{module_name}' not found"}

        manifest = self.loader.load_manifest(module_path)

        return {
            "name": module_name,
            "path": str(module_path),
            "manifest": {
                "version": manifest.get("version", "1.0.0"),
                "depends": manifest.get("depends", []),
                "application": manifest.get("application", False),
            },
            "models": self._get_models_info(module_name, module_path),
            "views": self._get_views_info(module_path),
            "api_routes": self._get_api_routes_info(module_name, module_path),
            "services": self._get_services_info(module_path),
            "data_files": self._get_data_files_info(module_path),
            "static_assets": self._get_static_assets_info(module_path),
            "statistics": self._get_module_statistics(module_path),
        }

    def _get_models_info(self, module_name: str, module_path: Path) -> List[Dict[str, Any]]:
        """Get information about models defined in the module."""
        models = []
        models_dir = module_path / "models"

        if not models_dir.exists():
            return models

        # Try to import the models module
        try:
            models_module = importlib.import_module(f"modules.{module_name}.models")

            # Find all SQLAlchemy model classes
            for name, obj in inspect.getmembers(models_module):
                if (
                    inspect.isclass(obj)
                    and issubclass(obj, Base)
                    and obj is not Base
                    and hasattr(obj, "__tablename__")
                ):
                    model_info = self._get_single_model_info(obj)
                    models.append(model_info)

        except ImportError as e:
            logger.debug(f"Could not import models for {module_name}: {e}")
            # Fall back to AST parsing
            models = self._parse_models_from_files(models_dir)

        return models

    def _get_single_model_info(self, model_class: Type) -> Dict[str, Any]:
        """Get detailed info for a single model class."""
        try:
            mapper = sa_inspect(model_class)
            columns = []

            for column in mapper.columns:
                col_info = {
                    "name": column.name,
                    "type": str(column.type),
                    "nullable": column.nullable,
                    "primary_key": column.primary_key,
                    "default": str(column.default.arg) if column.default else None,
                    "comment": column.comment,
                }
                columns.append(col_info)

            # Get relationships
            relationships = []
            for rel in mapper.relationships:
                rel_info = {
                    "name": rel.key,
                    "target": rel.mapper.class_.__name__,
                    "type": "one-to-many" if rel.uselist else "many-to-one",
                }
                relationships.append(rel_info)

            return {
                "name": model_class.__name__,
                "table_name": model_class.__tablename__,
                "module": model_class.__module__,
                "fields": columns,
                "relationships": relationships,
                "field_count": len(columns),
                "has_timestamps": any(c["name"] in ("created_at", "updated_at") for c in columns),
            }

        except Exception as e:
            logger.debug(f"Error inspecting model {model_class}: {e}")
            return {
                "name": model_class.__name__,
                "table_name": getattr(model_class, "__tablename__", "unknown"),
                "error": str(e),
            }

    def _parse_models_from_files(self, models_dir: Path) -> List[Dict[str, Any]]:
        """Parse model info from Python files using AST (fallback method)."""
        models = []

        for py_file in models_dir.glob("*.py"):
            if py_file.name.startswith("_"):
                continue

            try:
                content = py_file.read_text()
                tree = ast.parse(content)

                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        # Check if it inherits from Base or has __tablename__
                        is_model = False
                        table_name = None

                        for base in node.bases:
                            if isinstance(base, ast.Name) and base.id in ("Base", "TimestampMixin"):
                                is_model = True

                        # Look for __tablename__
                        for item in node.body:
                            if isinstance(item, ast.Assign):
                                for target in item.targets:
                                    if isinstance(target, ast.Name) and target.id == "__tablename__":
                                        if isinstance(item.value, ast.Constant):
                                            table_name = item.value.value
                                            is_model = True

                        if is_model:
                            fields = self._extract_fields_from_ast(node)
                            models.append({
                                "name": node.name,
                                "table_name": table_name or node.name.lower(),
                                "file": py_file.name,
                                "fields": fields,
                                "field_count": len(fields),
                            })

            except Exception as e:
                logger.debug(f"Error parsing {py_file}: {e}")

        return models

    def _extract_fields_from_ast(self, class_node: ast.ClassDef) -> List[Dict[str, Any]]:
        """Extract field information from AST class definition."""
        fields = []

        for item in class_node.body:
            if isinstance(item, ast.Assign):
                for target in item.targets:
                    if isinstance(target, ast.Name):
                        field_name = target.id
                        if field_name.startswith("_"):
                            continue

                        field_type = "unknown"
                        if isinstance(item.value, ast.Call):
                            if isinstance(item.value.func, ast.Name):
                                field_type = item.value.func.id
                            elif isinstance(item.value.func, ast.Attribute):
                                field_type = item.value.func.attr

                        fields.append({
                            "name": field_name,
                            "type": field_type,
                        })

        return fields

    def _get_views_info(self, module_path: Path) -> Dict[str, List[Dict[str, Any]]]:
        """Get information about views defined in the module."""
        views = {
            "list_views": [],
            "form_views": [],
            "other_views": [],
        }

        # Check static/src/views directory
        views_dir = module_path / "static" / "src" / "views"
        if views_dir.exists():
            for view_file in views_dir.rglob("*.vue"):
                relative_path = view_file.relative_to(views_dir)
                view_info = {
                    "name": view_file.stem,
                    "path": str(relative_path),
                    "full_path": str(view_file),
                }

                # Categorize by naming convention
                name_lower = view_file.stem.lower()
                if "list" in name_lower or "index" in name_lower:
                    views["list_views"].append(view_info)
                elif "form" in name_lower or "edit" in name_lower or "detail" in name_lower:
                    views["form_views"].append(view_info)
                else:
                    views["other_views"].append(view_info)

        # Also check for view configurations in data files
        data_dir = module_path / "data"
        if data_dir.exists():
            for data_file in data_dir.glob("*.json"):
                if "view" in data_file.name.lower():
                    views["other_views"].append({
                        "name": data_file.stem,
                        "path": str(data_file.relative_to(module_path)),
                        "type": "configuration",
                    })

        return views

    def _get_api_routes_info(self, module_name: str, module_path: Path) -> List[Dict[str, Any]]:
        """Get information about API routes defined in the module."""
        routes = []
        api_dir = module_path / "api"

        if not api_dir.exists():
            return routes

        # Try to import and inspect routers
        try:
            api_module = importlib.import_module(f"modules.{module_name}.api")

            # Look for router objects
            for name, obj in inspect.getmembers(api_module):
                if hasattr(obj, "routes"):
                    for route in obj.routes:
                        if hasattr(route, "path"):
                            routes.append({
                                "path": route.path,
                                "methods": list(route.methods) if hasattr(route, "methods") else ["GET"],
                                "name": route.name if hasattr(route, "name") else None,
                                "endpoint": route.endpoint.__name__ if hasattr(route, "endpoint") else None,
                            })

        except ImportError:
            # Fall back to file listing
            for py_file in api_dir.glob("*.py"):
                if not py_file.name.startswith("_"):
                    routes.append({
                        "file": py_file.name,
                        "type": "router_file",
                    })

        return routes

    def _get_services_info(self, module_path: Path) -> List[Dict[str, Any]]:
        """Get information about services defined in the module."""
        services = []
        services_dir = module_path / "services"

        if not services_dir.exists():
            return services

        for py_file in services_dir.glob("*.py"):
            if py_file.name.startswith("_"):
                continue

            try:
                content = py_file.read_text()
                tree = ast.parse(content)

                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        # Check if it looks like a service class
                        if node.name.endswith("Service"):
                            methods = [
                                item.name for item in node.body
                                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
                                and not item.name.startswith("_")
                            ]
                            services.append({
                                "name": node.name,
                                "file": py_file.name,
                                "methods": methods,
                                "method_count": len(methods),
                            })

            except Exception as e:
                logger.debug(f"Error parsing service {py_file}: {e}")

        return services

    def _get_data_files_info(self, module_path: Path) -> List[Dict[str, Any]]:
        """Get information about data files in the module."""
        data_files = []
        data_dir = module_path / "data"

        if data_dir.exists():
            for data_file in data_dir.iterdir():
                if data_file.is_file():
                    data_files.append({
                        "name": data_file.name,
                        "type": data_file.suffix,
                        "size": data_file.stat().st_size,
                    })

        # Also check security directory
        security_dir = module_path / "security"
        if security_dir.exists():
            for sec_file in security_dir.iterdir():
                if sec_file.is_file():
                    data_files.append({
                        "name": sec_file.name,
                        "type": sec_file.suffix,
                        "size": sec_file.stat().st_size,
                        "category": "security",
                    })

        return data_files

    def _get_static_assets_info(self, module_path: Path) -> Dict[str, Any]:
        """Get information about static assets in the module."""
        static_dir = module_path / "static"

        if not static_dir.exists():
            return {"exists": False}

        assets = {
            "exists": True,
            "components": [],
            "stores": [],
            "styles": [],
            "locales": [],
            "images": [],
        }

        # Components
        components_dir = static_dir / "src" / "components"
        if components_dir.exists():
            assets["components"] = [
                {"name": f.stem, "path": str(f.relative_to(static_dir))}
                for f in components_dir.rglob("*.vue")
            ]

        # Stores
        stores_dir = static_dir / "src" / "stores"
        if stores_dir.exists():
            assets["stores"] = [
                {"name": f.stem, "path": str(f.relative_to(static_dir))}
                for f in stores_dir.glob("*.ts")
            ]

        # Styles
        styles_dir = static_dir / "src" / "styles"
        if styles_dir.exists():
            assets["styles"] = [
                {"name": f.stem, "path": str(f.relative_to(static_dir))}
                for f in styles_dir.rglob("*.*")
                if f.suffix in (".css", ".scss", ".less")
            ]

        # Locales
        locales_dir = static_dir / "src" / "locales"
        if locales_dir.exists():
            assets["locales"] = [
                {"name": f.stem, "path": str(f.relative_to(static_dir))}
                for f in locales_dir.glob("*.json")
            ]

        # Images/assets
        assets_dir = static_dir / "assets"
        if assets_dir.exists():
            assets["images"] = [
                {"name": f.name, "path": str(f.relative_to(static_dir))}
                for f in assets_dir.rglob("*.*")
                if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".svg", ".gif", ".ico")
            ]

        return assets

    def _get_module_statistics(self, module_path: Path) -> Dict[str, int]:
        """Get statistics about the module."""
        stats = {
            "python_files": 0,
            "vue_files": 0,
            "total_lines": 0,
            "directories": 0,
        }

        for item in module_path.rglob("*"):
            if item.is_dir():
                stats["directories"] += 1
            elif item.is_file():
                if item.suffix == ".py":
                    stats["python_files"] += 1
                    try:
                        stats["total_lines"] += len(item.read_text().splitlines())
                    except:
                        pass
                elif item.suffix == ".vue":
                    stats["vue_files"] += 1

        return stats

    def get_model_details(self, module_name: str, model_name: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific model.

        Args:
            module_name: Module name
            model_name: Model class name

        Returns:
            Detailed model information including views
        """
        try:
            models_module = importlib.import_module(f"modules.{module_name}.models")
            model_class = getattr(models_module, model_name, None)

            if not model_class:
                return {"error": f"Model '{model_name}' not found in {module_name}"}

            model_info = self._get_single_model_info(model_class)

            # Find associated views
            module_path = self.loader.get_module_path(module_name)
            if module_path:
                views_info = self._get_views_info(module_path)
                model_name_lower = model_name.lower()

                model_info["views"] = {
                    "list": [v for v in views_info["list_views"] if model_name_lower in v["name"].lower()],
                    "form": [v for v in views_info["form_views"] if model_name_lower in v["name"].lower()],
                    "other": [v for v in views_info["other_views"] if model_name_lower in v["name"].lower()],
                }

            return model_info

        except ImportError as e:
            return {"error": f"Could not import module: {e}"}


def get_module_introspection_service(db: Session) -> ModuleIntrospectionService:
    """Factory function for ModuleIntrospectionService."""
    return ModuleIntrospectionService(db)
