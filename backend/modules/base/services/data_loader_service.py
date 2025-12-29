"""
Data Loader Service

Loads initial/seed data from JSON and YAML files.
Similar to Odoo's data loading system.

Features:
- Load JSON and YAML data files
- Create, update, or skip existing records
- Handle references between records (XML IDs)
- Support for noupdate records (don't overwrite on upgrade)
- Transaction handling with rollback on error
"""

import importlib
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Type, Union

import yaml
from sqlalchemy.orm import Session

from app.db.base import Base

logger = logging.getLogger(__name__)


class DataReference:
    """
    Represents a reference to another record using an XML ID.

    Used for linking related records during data loading.

    Example in JSON:
        {"partner_id": {"ref": "base.partner_admin"}}
    """

    def __init__(self, xml_id: str):
        self.xml_id = xml_id
        self.module, self.external_id = self._parse(xml_id)

    def _parse(self, xml_id: str) -> Tuple[str, str]:
        """Parse module.external_id format."""
        if "." in xml_id:
            parts = xml_id.split(".", 1)
            return parts[0], parts[1]
        return "", xml_id


class LoadedRecord:
    """Tracks a loaded record for reference resolution."""

    def __init__(
        self,
        xml_id: str,
        model_name: str,
        record_id: int,
        noupdate: bool = False,
    ):
        self.xml_id = xml_id
        self.model_name = model_name
        self.record_id = record_id
        self.noupdate = noupdate


class DataLoaderService:
    """
    Service for loading data from JSON/YAML files.

    Supports:
    - JSON files (.json)
    - YAML files (.yaml, .yml)
    - XML ID references for linking records
    - noupdate flag to prevent overwrites
    - Batch loading with dependency resolution

    Usage:
        service = DataLoaderService(db)

        # Load a single file
        service.load_file("data/initial_data.json", module_name="base")

        # Load all data files for a module
        service.load_module_data(module_path, module_name)

        # Load with options
        service.load_file(
            "data/demo.json",
            module_name="demo",
            mode="update",  # or "create", "skip"
            noupdate=False
        )
    """

    def __init__(self, db: Session):
        self.db = db
        self._model_cache: Dict[str, Type] = {}
        self._xml_id_cache: Dict[str, LoadedRecord] = {}
        self._loaded_files: Set[str] = set()

    # -------------------------------------------------------------------------
    # Main Loading Methods
    # -------------------------------------------------------------------------

    def load_file(
        self,
        file_path: Union[str, Path],
        module_name: str,
        mode: str = "create_or_update",
        noupdate: bool = False,
    ) -> Dict[str, Any]:
        """
        Load data from a JSON or YAML file.

        Args:
            file_path: Path to the data file
            module_name: Module that owns this data
            mode: Load mode - "create", "update", "create_or_update", "skip"
            noupdate: If True, don't update existing records on module upgrade

        Returns:
            Dict with loading statistics
        """
        file_path = Path(file_path)

        if not file_path.exists():
            logger.warning(f"Data file not found: {file_path}")
            return {"status": "not_found", "file": str(file_path)}

        # Check if already loaded
        file_key = f"{module_name}:{file_path}"
        if file_key in self._loaded_files:
            return {"status": "skipped", "reason": "already_loaded"}

        # Load file content
        data = self._load_file_content(file_path)
        if data is None:
            return {"status": "error", "error": "failed_to_parse"}

        # Process the data
        stats = {
            "file": str(file_path),
            "created": 0,
            "updated": 0,
            "skipped": 0,
            "errors": 0,
        }

        try:
            records = data.get("records", data if isinstance(data, list) else [])

            for record_data in records:
                result = self._load_record(record_data, module_name, mode, noupdate)
                stats[result] += 1

            self.db.commit()
            self._loaded_files.add(file_key)
            stats["status"] = "success"

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error loading data file {file_path}: {e}")
            stats["status"] = "error"
            stats["error"] = str(e)

        return stats

    def load_module_data(
        self,
        module_path: Path,
        module_name: str,
        data_files: List[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Load all data files for a module.

        Args:
            module_path: Path to the module directory
            module_name: Module name
            data_files: List of relative paths to data files

        Returns:
            List of loading results for each file
        """
        results = []

        if data_files:
            # Load specified files in order
            for rel_path in data_files:
                file_path = module_path / rel_path
                result = self.load_file(file_path, module_name)
                results.append(result)
        else:
            # Auto-discover data files
            data_dir = module_path / "data"
            if data_dir.exists():
                for ext in ["json", "yaml", "yml"]:
                    for file_path in sorted(data_dir.glob(f"*.{ext}")):
                        result = self.load_file(file_path, module_name)
                        results.append(result)

        return results

    def load_permissions(
        self,
        file_path: Union[str, Path],
        module_name: str,
    ) -> Dict[str, Any]:
        """
        Load permission definitions from a file.

        Special handling for permission/security files.

        Args:
            file_path: Path to permissions file
            module_name: Module name

        Returns:
            Loading result
        """
        file_path = Path(file_path)
        data = self._load_file_content(file_path)

        if not data:
            return {"status": "error", "error": "failed_to_parse"}

        stats = {"permissions": 0, "groups": 0, "rules": 0}

        try:
            # Load permission groups
            for group_data in data.get("groups", []):
                self._load_permission_group(group_data, module_name)
                stats["groups"] += 1

            # Load permissions
            for perm_data in data.get("permissions", []):
                self._load_permission(perm_data, module_name)
                stats["permissions"] += 1

            # Load access rules
            for rule_data in data.get("rules", []):
                self._load_access_rule(rule_data, module_name)
                stats["rules"] += 1

            self.db.commit()
            stats["status"] = "success"

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error loading permissions: {e}")
            stats["status"] = "error"
            stats["error"] = str(e)

        return stats

    # -------------------------------------------------------------------------
    # Record Loading
    # -------------------------------------------------------------------------

    def _load_record(
        self,
        record_data: Dict[str, Any],
        module_name: str,
        mode: str,
        noupdate: bool,
    ) -> str:
        """
        Load a single record.

        Returns: 'created', 'updated', 'skipped', or 'errors'
        """
        model_name = record_data.get("model")
        xml_id = record_data.get("id") or record_data.get("xml_id")
        values = record_data.get("values", {})
        record_noupdate = record_data.get("noupdate", noupdate)

        if not model_name:
            logger.warning(f"Missing model in record: {record_data}")
            return "errors"

        # Get model class
        model_class = self._get_model_class(model_name)
        if not model_class:
            logger.warning(f"Model not found: {model_name}")
            return "errors"

        # Resolve references in values
        resolved_values = self._resolve_values(values)

        # Build full XML ID
        full_xml_id = f"{module_name}.{xml_id}" if xml_id and "." not in xml_id else xml_id

        # Check if record exists
        existing = self._get_existing_record(full_xml_id, model_class)

        if existing:
            if mode == "create" or record_noupdate:
                return "skipped"
            elif mode in ("update", "create_or_update"):
                return self._update_record(existing, resolved_values, full_xml_id, model_name)
        else:
            if mode == "update":
                return "skipped"
            else:
                return self._create_record(model_class, resolved_values, full_xml_id, model_name, record_noupdate)

    def _create_record(
        self,
        model_class: Type,
        values: Dict[str, Any],
        xml_id: str,
        model_name: str,
        noupdate: bool,
    ) -> str:
        """Create a new record."""
        try:
            record = model_class(**values)
            self.db.add(record)
            self.db.flush()

            # Track the XML ID
            if xml_id:
                self._register_xml_id(xml_id, model_name, record.id, noupdate)

            logger.debug(f"Created {model_name} record: {xml_id or record.id}")
            return "created"

        except Exception as e:
            logger.error(f"Error creating {model_name}: {e}")
            return "errors"

    def _update_record(
        self,
        record: Any,
        values: Dict[str, Any],
        xml_id: str,
        model_name: str,
    ) -> str:
        """Update an existing record."""
        try:
            for key, value in values.items():
                if hasattr(record, key):
                    setattr(record, key, value)

            self.db.flush()
            logger.debug(f"Updated {model_name} record: {xml_id or record.id}")
            return "updated"

        except Exception as e:
            logger.error(f"Error updating {model_name}: {e}")
            return "errors"

    # -------------------------------------------------------------------------
    # Reference Resolution
    # -------------------------------------------------------------------------

    def _resolve_values(self, values: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve all references in a values dict."""
        resolved = {}

        for key, value in values.items():
            resolved[key] = self._resolve_value(value)

        return resolved

    def _resolve_value(self, value: Any) -> Any:
        """Resolve a single value, handling references."""
        if isinstance(value, dict):
            if "ref" in value:
                # XML ID reference
                return self._resolve_reference(value["ref"])
            elif "eval" in value:
                # Python expression
                return self._eval_expression(value["eval"])
            else:
                # Nested dict - resolve recursively
                return {k: self._resolve_value(v) for k, v in value.items()}

        elif isinstance(value, list):
            return [self._resolve_value(v) for v in value]

        return value

    def _resolve_reference(self, xml_id: str) -> Optional[int]:
        """Resolve an XML ID reference to a record ID."""
        # Check cache first
        if xml_id in self._xml_id_cache:
            return self._xml_id_cache[xml_id].record_id

        # Try to look up in database
        # This requires an IrModelData-like table
        loaded = self._lookup_xml_id(xml_id)
        if loaded:
            self._xml_id_cache[xml_id] = loaded
            return loaded.record_id

        logger.warning(f"Unresolved reference: {xml_id}")
        return None

    def _lookup_xml_id(self, xml_id: str) -> Optional[LoadedRecord]:
        """Look up an XML ID in the database."""
        # Try to find in a model data table if it exists
        try:
            from ..models.model_data import IrModelData

            ref = DataReference(xml_id)
            record = (
                self.db.query(IrModelData)
                .filter(
                    IrModelData.module == ref.module,
                    IrModelData.name == ref.external_id,
                )
                .first()
            )

            if record:
                return LoadedRecord(
                    xml_id=xml_id,
                    model_name=record.model,
                    record_id=record.res_id,
                    noupdate=record.noupdate,
                )
        except ImportError:
            pass

        return None

    def _register_xml_id(
        self,
        xml_id: str,
        model_name: str,
        record_id: int,
        noupdate: bool,
    ):
        """Register an XML ID in the cache and database."""
        loaded = LoadedRecord(xml_id, model_name, record_id, noupdate)
        self._xml_id_cache[xml_id] = loaded

        # Try to persist to database
        try:
            from ..models.model_data import IrModelData

            ref = DataReference(xml_id)
            existing = (
                self.db.query(IrModelData)
                .filter(
                    IrModelData.module == ref.module,
                    IrModelData.name == ref.external_id,
                )
                .first()
            )

            if existing:
                existing.res_id = record_id
                existing.model = model_name
            else:
                data = IrModelData(
                    module=ref.module,
                    name=ref.external_id,
                    model=model_name,
                    res_id=record_id,
                    noupdate=noupdate,
                )
                self.db.add(data)

        except ImportError:
            # IrModelData model doesn't exist, just use cache
            pass

    def _eval_expression(self, expression: str) -> Any:
        """Evaluate a Python expression safely."""
        from datetime import date, datetime, timedelta

        context = {
            "datetime": datetime,
            "date": date,
            "timedelta": timedelta,
            "True": True,
            "False": False,
            "None": None,
        }

        try:
            return eval(expression, {"__builtins__": {}}, context)
        except Exception as e:
            logger.warning(f"Failed to eval expression '{expression}': {e}")
            return None

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------

    def _load_file_content(self, file_path: Path) -> Optional[Dict]:
        """Load and parse a JSON or YAML file."""
        try:
            content = file_path.read_text(encoding="utf-8")

            if file_path.suffix == ".json":
                return json.loads(content)
            elif file_path.suffix in (".yaml", ".yml"):
                return yaml.safe_load(content)
            else:
                logger.warning(f"Unsupported file format: {file_path.suffix}")
                return None

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error in {file_path}: {e}")
        except yaml.YAMLError as e:
            logger.error(f"YAML parse error in {file_path}: {e}")
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")

        return None

    def _get_model_class(self, model_name: str) -> Optional[Type]:
        """Get a model class by name."""
        if model_name in self._model_cache:
            return self._model_cache[model_name]

        try:
            parts = model_name.split(".")
            if len(parts) == 2:
                mod = importlib.import_module(f"modules.{parts[0]}.models")
                model_class = getattr(mod, parts[1], None)
                if model_class:
                    self._model_cache[model_name] = model_class
                    return model_class

            # Try app.models for core models
            try:
                mod = importlib.import_module("app.models")
                model_class = getattr(mod, model_name, None)
                if model_class:
                    self._model_cache[model_name] = model_class
                    return model_class
            except ImportError:
                pass

        except Exception as e:
            logger.debug(f"Error loading model {model_name}: {e}")

        return None

    def _get_existing_record(
        self,
        xml_id: str,
        model_class: Type,
    ) -> Optional[Any]:
        """Get an existing record by XML ID."""
        if not xml_id:
            return None

        loaded = self._xml_id_cache.get(xml_id) or self._lookup_xml_id(xml_id)
        if loaded:
            return self.db.query(model_class).filter(
                model_class.id == loaded.record_id
            ).first()

        return None

    def _load_permission_group(self, data: Dict, module_name: str):
        """Load a permission group."""
        # Implementation depends on your permission model
        pass

    def _load_permission(self, data: Dict, module_name: str):
        """Load a permission record."""
        # Implementation depends on your permission model
        pass

    def _load_access_rule(self, data: Dict, module_name: str):
        """Load an access rule."""
        # Implementation depends on your access rule model
        pass


def get_data_loader_service(db: Session) -> DataLoaderService:
    """Factory function for DataLoaderService."""
    return DataLoaderService(db)
