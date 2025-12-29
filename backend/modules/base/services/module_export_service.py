"""
Module Export/Import Service

Provides module packaging functionality with:
- ZIP export with code and optional data
- Data export to JSON/CSV
- Import validation and execution
- Rollback support
"""

import io
import json
import csv
import hashlib
import logging
import shutil
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import traceback

from sqlalchemy.orm import Session

from app.core.config import settings
from ..models.module_export import (
    ModuleExport,
    ModuleImport,
    DataExportTemplate,
    ExportType,
    ImportStatus,
    ConflictResolution,
)
from ..models.module import InstalledModule

logger = logging.getLogger(__name__)


class ModuleExportService:
    """Service for module export and import operations."""

    def __init__(self, db: Session):
        self.db = db

    # ==================== Module Export ====================

    def export_module_zip(
        self,
        module_name: str,
        include_data: bool = False,
        include_static: bool = True,
        data_models: Optional[List[str]] = None,
        output_path: Optional[str] = None,
        user_id: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> ModuleExport:
        """
        Export a module as a ZIP file.

        Args:
            module_name: Technical name of the module
            include_data: Include database records
            include_static: Include static files
            data_models: Specific models to export data from
            output_path: Custom output path
            user_id: User performing the export
            notes: Export notes

        Returns:
            ModuleExport record
        """
        # Get module info
        module = self._get_installed_module(module_name)
        if not module:
            raise ValueError(f"Module '{module_name}' not found or not installed")

        module_path = Path(module.module_path)
        if not module_path.exists():
            raise ValueError(f"Module path '{module_path}' does not exist")

        # Create export record
        export = ModuleExport(
            module_name=module_name,
            module_version=module.version,
            export_type=ExportType.ZIP.value,
            includes_data=include_data,
            includes_code=True,
            includes_static=include_static,
            fastvue_version=settings.VERSION,
            exported_by=user_id,
            notes=notes,
        )

        try:
            # Generate output path
            if not output_path:
                exports_dir = Path(settings.BASE_DIR) / 'exports'
                exports_dir.mkdir(parents=True, exist_ok=True)
                timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
                output_path = str(exports_dir / f"{module_name}_v{module.version}_{timestamp}.zip")

            # Create ZIP file
            record_counts = {}
            exported_models = []

            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                # Add module code files
                for file_path in module_path.rglob('*'):
                    if file_path.is_file():
                        # Skip cache and compiled files
                        if '__pycache__' in str(file_path) or file_path.suffix == '.pyc':
                            continue
                        # Skip static if not included
                        if not include_static and 'static' in str(file_path):
                            continue

                        arcname = file_path.relative_to(module_path.parent)
                        zf.write(file_path, arcname)

                # Add data if requested
                if include_data:
                    data_content, models, counts = self._export_module_data(
                        module_name,
                        data_models,
                    )
                    exported_models = models
                    record_counts = counts

                    # Add data file to zip
                    zf.writestr(f"{module_name}/data/export_data.json", data_content)

                # Add export metadata
                metadata = {
                    'module_name': module_name,
                    'module_version': module.version,
                    'export_date': datetime.utcnow().isoformat(),
                    'fastvue_version': settings.VERSION,
                    'includes_data': include_data,
                    'exported_models': exported_models,
                    'record_counts': record_counts,
                }
                zf.writestr(f"{module_name}/_export_metadata.json", json.dumps(metadata, indent=2))

            # Get file info
            file_path = Path(output_path)
            file_size = file_path.stat().st_size
            file_hash = self._calculate_file_hash(output_path)

            # Update export record
            export.file_path = output_path
            export.file_size = file_size
            export.file_hash = file_hash
            export.exported_models = exported_models
            export.record_counts = record_counts

            self.db.add(export)
            self.db.commit()
            self.db.refresh(export)

            logger.info(f"Exported module {module_name} to {output_path}")
            return export

        except Exception as e:
            logger.exception(f"Failed to export module {module_name}")
            raise

    def export_module_data(
        self,
        module_name: str,
        models: Optional[List[str]] = None,
        output_format: str = 'json',
        output_path: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> ModuleExport:
        """
        Export module data to JSON/CSV.

        Args:
            module_name: Module name
            models: Specific models to export
            output_format: json or csv
            output_path: Custom output path
            user_id: User performing export

        Returns:
            ModuleExport record
        """
        data_content, exported_models, record_counts = self._export_module_data(
            module_name,
            models,
        )

        # Generate output path
        if not output_path:
            exports_dir = Path(settings.BASE_DIR) / 'exports'
            exports_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            extension = 'json' if output_format == 'json' else 'csv'
            output_path = str(exports_dir / f"{module_name}_data_{timestamp}.{extension}")

        # Write file
        Path(output_path).write_text(data_content)

        # Create export record
        export = ModuleExport(
            module_name=module_name,
            export_type=ExportType.DATA_JSON.value if output_format == 'json' else ExportType.DATA_CSV.value,
            includes_data=True,
            includes_code=False,
            includes_static=False,
            exported_models=exported_models,
            record_counts=record_counts,
            file_path=output_path,
            file_size=Path(output_path).stat().st_size,
            file_hash=self._calculate_file_hash(output_path),
            fastvue_version=settings.VERSION,
            exported_by=user_id,
        )

        self.db.add(export)
        self.db.commit()
        self.db.refresh(export)

        return export

    def _export_module_data(
        self,
        module_name: str,
        models: Optional[List[str]] = None,
    ) -> Tuple[str, List[str], Dict[str, int]]:
        """Export data from module models."""
        from app.core.modules import ModuleRegistry

        registry = ModuleRegistry.get_registry()
        module_info = registry.get_module(module_name)

        if not module_info:
            raise ValueError(f"Module '{module_name}' not registered")

        # Get models to export
        if models:
            model_names = models
        else:
            # Get all models from module
            model_names = [m.model_name for m in module_info.models] if module_info.models else []

        data = {}
        record_counts = {}
        exported_models = []

        for model_name in model_names:
            model_class = registry.get_model_class(model_name)
            if not model_class:
                logger.warning(f"Model {model_name} not found, skipping")
                continue

            records = self.db.query(model_class).all()
            model_data = []

            for record in records:
                record_dict = {}
                for column in record.__table__.columns:
                    value = getattr(record, column.name)
                    # Handle special types
                    if isinstance(value, datetime):
                        value = value.isoformat()
                    elif hasattr(value, '__json__'):
                        value = value.__json__()
                    record_dict[column.name] = value
                model_data.append(record_dict)

            if model_data:
                data[model_name] = model_data
                record_counts[model_name] = len(model_data)
                exported_models.append(model_name)

        return json.dumps(data, indent=2, default=str), exported_models, record_counts

    # ==================== Module Import ====================

    def validate_import(
        self,
        file_path: str,
        user_id: Optional[int] = None,
    ) -> ModuleImport:
        """
        Validate an import file without executing.

        Args:
            file_path: Path to import file
            user_id: User performing validation

        Returns:
            ModuleImport record with validation results
        """
        path = Path(file_path)
        if not path.exists():
            raise ValueError(f"File not found: {file_path}")

        # Determine import type
        if path.suffix == '.zip':
            import_type = 'zip'
        elif path.suffix == '.json':
            import_type = 'data_json'
        else:
            raise ValueError(f"Unsupported file type: {path.suffix}")

        # Create import record
        import_record = ModuleImport(
            source_file=file_path,
            source_hash=self._calculate_file_hash(file_path),
            source_size=path.stat().st_size,
            import_type=import_type,
            status=ImportStatus.VALIDATING.value,
            imported_by=user_id,
        )

        self.db.add(import_record)
        self.db.commit()

        try:
            if import_type == 'zip':
                self._validate_zip_import(import_record)
            else:
                self._validate_data_import(import_record)

            if not import_record.validation_errors:
                import_record.status = ImportStatus.VALIDATED.value
            else:
                import_record.status = ImportStatus.FAILED.value

        except Exception as e:
            import_record.validation_errors = [str(e)]
            import_record.status = ImportStatus.FAILED.value

        self.db.commit()
        self.db.refresh(import_record)
        return import_record

    def _validate_zip_import(self, import_record: ModuleImport) -> None:
        """Validate ZIP import file."""
        errors = []
        warnings = []

        try:
            with zipfile.ZipFile(import_record.source_file, 'r') as zf:
                # Get file list
                files = zf.namelist()

                # Find module name (first directory)
                module_dirs = set()
                for f in files:
                    parts = f.split('/')
                    if len(parts) > 1:
                        module_dirs.add(parts[0])

                if len(module_dirs) != 1:
                    errors.append(f"Expected single module directory, found: {module_dirs}")
                    import_record.validation_errors = errors
                    return

                module_name = list(module_dirs)[0]
                import_record.module_name = module_name

                # Check for manifest
                manifest_path = f"{module_name}/__manifest__.py"
                if manifest_path not in files:
                    errors.append(f"Missing __manifest__.py in {module_name}")
                else:
                    # Parse manifest
                    manifest_content = zf.read(manifest_path).decode('utf-8')
                    try:
                        manifest = self._parse_manifest(manifest_content)
                        import_record.module_version = manifest.get('version', 'unknown')

                        # Check dependencies
                        depends = manifest.get('depends', [])
                        dep_check = self._check_dependencies(depends)
                        import_record.dependency_check = dep_check

                        if dep_check.get('missing'):
                            warnings.append(f"Missing dependencies: {dep_check['missing']}")

                    except Exception as e:
                        errors.append(f"Invalid manifest: {e}")

                # Check for export metadata
                metadata_path = f"{module_name}/_export_metadata.json"
                if metadata_path in files:
                    try:
                        metadata = json.loads(zf.read(metadata_path).decode('utf-8'))
                        import_record.version_check = {
                            'export_version': metadata.get('fastvue_version'),
                            'current_version': settings.VERSION,
                        }
                    except Exception as e:
                        warnings.append(f"Could not read export metadata: {e}")

        except zipfile.BadZipFile:
            errors.append("Invalid ZIP file")

        import_record.validation_errors = errors
        import_record.validation_warnings = warnings

    def _validate_data_import(self, import_record: ModuleImport) -> None:
        """Validate data import file."""
        errors = []
        warnings = []

        try:
            with open(import_record.source_file, 'r') as f:
                data = json.load(f)

            if not isinstance(data, dict):
                errors.append("Data file must be a JSON object with model names as keys")
            else:
                for model_name, records in data.items():
                    if not isinstance(records, list):
                        errors.append(f"Data for {model_name} must be a list")
                    else:
                        # Check if model exists
                        from app.core.modules import ModuleRegistry
                        registry = ModuleRegistry.get_registry()
                        if not registry.get_model_class(model_name):
                            warnings.append(f"Model {model_name} not found in registry")

        except json.JSONDecodeError as e:
            errors.append(f"Invalid JSON: {e}")

        import_record.validation_errors = errors
        import_record.validation_warnings = warnings

    def import_module(
        self,
        import_id: int,
        conflict_resolution: str = ConflictResolution.SKIP.value,
        install_after: bool = False,
    ) -> ModuleImport:
        """
        Execute a validated import.

        Args:
            import_id: ModuleImport ID
            conflict_resolution: How to handle conflicts
            install_after: Install module after import

        Returns:
            Updated ModuleImport record
        """
        import_record = self.db.query(ModuleImport).filter(
            ModuleImport.id == import_id
        ).first()

        if not import_record:
            raise ValueError(f"Import {import_id} not found")

        if import_record.status != ImportStatus.VALIDATED.value:
            raise ValueError(f"Import must be validated first (current status: {import_record.status})")

        import_record.conflict_resolution = conflict_resolution
        import_record.install_after_import = install_after
        import_record.start()
        self.db.commit()

        try:
            if import_record.import_type == 'zip':
                self._execute_zip_import(import_record)
            else:
                self._execute_data_import(import_record, conflict_resolution)

            import_record.complete()

            # Install if requested
            if install_after and import_record.module_name:
                from .module_service import ModuleService
                module_service = ModuleService(self.db)
                module_service.install_module(import_record.module_name)

        except Exception as e:
            logger.exception(f"Import failed: {e}")
            import_record.fail(str(e), traceback.format_exc())

        self.db.commit()
        self.db.refresh(import_record)
        return import_record

    def _execute_zip_import(self, import_record: ModuleImport) -> None:
        """Execute ZIP module import."""
        module_name = import_record.module_name
        target_dir = Path(settings.BASE_DIR) / 'modules' / module_name

        # Backup existing if present
        if target_dir.exists():
            backup_dir = target_dir.with_suffix('.backup')
            if backup_dir.exists():
                shutil.rmtree(backup_dir)
            shutil.move(str(target_dir), str(backup_dir))
            import_record.rollback_data = {'backup_path': str(backup_dir)}

        # Extract module
        with zipfile.ZipFile(import_record.source_file, 'r') as zf:
            # Extract to parent of target (since zip contains module_name folder)
            zf.extractall(target_dir.parent)

        logger.info(f"Imported module {module_name} to {target_dir}")

    def _execute_data_import(
        self,
        import_record: ModuleImport,
        conflict_resolution: str,
    ) -> None:
        """Execute data import."""
        from app.core.modules import ModuleRegistry

        registry = ModuleRegistry.get_registry()

        with open(import_record.source_file, 'r') as f:
            data = json.load(f)

        imported_records = {}
        skipped_records = {}
        updated_records = {}

        for model_name, records in data.items():
            model_class = registry.get_model_class(model_name)
            if not model_class:
                logger.warning(f"Skipping unknown model: {model_name}")
                skipped_records[model_name] = len(records)
                continue

            imported = 0
            skipped = 0
            updated = 0

            for record_data in records:
                record_id = record_data.get('id')

                if record_id:
                    existing = self.db.query(model_class).filter(
                        model_class.id == record_id
                    ).first()

                    if existing:
                        if conflict_resolution == ConflictResolution.SKIP.value:
                            skipped += 1
                            continue
                        elif conflict_resolution == ConflictResolution.ERROR.value:
                            raise ValueError(f"Record {model_name}:{record_id} already exists")
                        elif conflict_resolution == ConflictResolution.UPDATE.value:
                            for key, value in record_data.items():
                                if key != 'id' and hasattr(existing, key):
                                    setattr(existing, key, value)
                            updated += 1
                            continue
                        elif conflict_resolution == ConflictResolution.REPLACE.value:
                            self.db.delete(existing)

                # Create new record
                new_record = model_class(**record_data)
                self.db.add(new_record)
                imported += 1

            imported_records[model_name] = imported
            skipped_records[model_name] = skipped
            updated_records[model_name] = updated

        self.db.commit()

        import_record.imported_records = imported_records
        import_record.skipped_records = skipped_records
        import_record.updated_records = updated_records

    def rollback_import(self, import_id: int) -> ModuleImport:
        """Rollback a completed import."""
        import_record = self.db.query(ModuleImport).filter(
            ModuleImport.id == import_id
        ).first()

        if not import_record:
            raise ValueError(f"Import {import_id} not found")

        if import_record.status != ImportStatus.COMPLETED.value:
            raise ValueError("Can only rollback completed imports")

        rollback_data = import_record.rollback_data or {}

        if import_record.import_type == 'zip':
            backup_path = rollback_data.get('backup_path')
            if backup_path and Path(backup_path).exists():
                module_dir = Path(settings.BASE_DIR) / 'modules' / import_record.module_name
                if module_dir.exists():
                    shutil.rmtree(module_dir)
                shutil.move(backup_path, str(module_dir))
                logger.info(f"Rolled back module {import_record.module_name}")

        import_record.status = ImportStatus.ROLLED_BACK.value
        self.db.commit()
        self.db.refresh(import_record)
        return import_record

    # ==================== Export Templates ====================

    def create_template(
        self,
        code: str,
        name: str,
        models: List[str],
        **kwargs,
    ) -> DataExportTemplate:
        """Create a data export template."""
        existing = self.db.query(DataExportTemplate).filter(
            DataExportTemplate.code == code
        ).first()

        if existing:
            raise ValueError(f"Template with code '{code}' already exists")

        template = DataExportTemplate(
            code=code,
            name=name,
            models=models,
            **kwargs,
        )

        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def get_template_by_code(self, code: str) -> Optional[DataExportTemplate]:
        """Get template by code."""
        return self.db.query(DataExportTemplate).filter(
            DataExportTemplate.code == code
        ).first()

    def list_templates(
        self,
        module_name: Optional[str] = None,
        is_active: bool = True,
    ) -> List[DataExportTemplate]:
        """List export templates."""
        query = self.db.query(DataExportTemplate)

        if module_name:
            query = query.filter(DataExportTemplate.module_name == module_name)
        if is_active:
            query = query.filter(DataExportTemplate.is_active == True)

        return query.order_by(DataExportTemplate.name).all()

    def execute_template(
        self,
        template_code: str,
        output_path: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> ModuleExport:
        """Export data using a template."""
        template = self.db.query(DataExportTemplate).filter(
            DataExportTemplate.code == template_code,
            DataExportTemplate.is_active == True,
        ).first()

        if not template:
            raise ValueError(f"Template '{template_code}' not found")

        return self.export_module_data(
            module_name=template.module_name or 'custom',
            models=template.models,
            output_format=template.output_format,
            output_path=output_path,
            user_id=user_id,
        )

    def delete_template(self, template_id: int) -> bool:
        """Delete a template."""
        template = self.db.query(DataExportTemplate).filter(
            DataExportTemplate.id == template_id
        ).first()

        if not template:
            return False

        self.db.delete(template)
        self.db.commit()
        return True

    # ==================== History ====================

    def list_exports(
        self,
        module_name: Optional[str] = None,
        limit: int = 50,
    ) -> List[ModuleExport]:
        """List export history."""
        query = self.db.query(ModuleExport)

        if module_name:
            query = query.filter(ModuleExport.module_name == module_name)

        return query.order_by(
            ModuleExport.created_at.desc()
        ).limit(limit).all()

    def list_imports(
        self,
        module_name: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[ModuleImport]:
        """List import history."""
        query = self.db.query(ModuleImport)

        if module_name:
            query = query.filter(ModuleImport.module_name == module_name)
        if status:
            query = query.filter(ModuleImport.status == status)

        return query.order_by(
            ModuleImport.created_at.desc()
        ).limit(limit).all()

    def get_export(self, export_id: int) -> Optional[ModuleExport]:
        """Get export by ID."""
        return self.db.query(ModuleExport).filter(
            ModuleExport.id == export_id
        ).first()

    def get_import(self, import_id: int) -> Optional[ModuleImport]:
        """Get import by ID."""
        return self.db.query(ModuleImport).filter(
            ModuleImport.id == import_id
        ).first()

    def import_data(
        self,
        data: Dict[str, List[Dict]],
        conflict_resolution: str = ConflictResolution.SKIP.value,
    ) -> Dict[str, Any]:
        """
        Import data directly from a dictionary.

        Args:
            data: Dictionary with model names as keys and record lists as values
            conflict_resolution: How to handle conflicts

        Returns:
            Import statistics
        """
        from app.core.modules import ModuleRegistry

        registry = ModuleRegistry.get_registry()

        imported_records = {}
        skipped_records = {}
        updated_records = {}
        errors = []

        for model_name, records in data.items():
            model_class = registry.get_model_class(model_name)
            if not model_class:
                errors.append(f"Unknown model: {model_name}")
                skipped_records[model_name] = len(records)
                continue

            imported = 0
            skipped = 0
            updated = 0

            for record_data in records:
                try:
                    record_id = record_data.get('id')

                    if record_id:
                        existing = self.db.query(model_class).filter(
                            model_class.id == record_id
                        ).first()

                        if existing:
                            if conflict_resolution == ConflictResolution.SKIP.value:
                                skipped += 1
                                continue
                            elif conflict_resolution == ConflictResolution.ERROR.value:
                                raise ValueError(f"Record {model_name}:{record_id} already exists")
                            elif conflict_resolution == ConflictResolution.UPDATE.value:
                                for key, value in record_data.items():
                                    if key != 'id' and hasattr(existing, key):
                                        setattr(existing, key, value)
                                updated += 1
                                continue
                            elif conflict_resolution == ConflictResolution.REPLACE.value:
                                self.db.delete(existing)

                    # Create new record
                    new_record = model_class(**record_data)
                    self.db.add(new_record)
                    imported += 1

                except Exception as e:
                    errors.append(f"Error importing {model_name}: {e}")

            imported_records[model_name] = imported
            skipped_records[model_name] = skipped
            updated_records[model_name] = updated

        self.db.commit()

        return {
            'imported': imported_records,
            'skipped': skipped_records,
            'updated': updated_records,
            'errors': errors,
            'total_imported': sum(imported_records.values()),
            'total_skipped': sum(skipped_records.values()),
            'total_updated': sum(updated_records.values()),
        }

    # ==================== Helper Methods ====================

    def _get_installed_module(self, module_name: str) -> Optional[InstalledModule]:
        """Get installed module record."""
        return self.db.query(InstalledModule).filter(
            InstalledModule.name == module_name,
            InstalledModule.state == 'installed',
        ).first()

    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of file."""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

    def _parse_manifest(self, content: str) -> Dict[str, Any]:
        """Parse __manifest__.py content."""
        # Safe evaluation of manifest
        namespace = {}
        exec(content, namespace)
        return namespace.get('manifest', namespace)

    def _check_dependencies(self, depends: List[str]) -> Dict[str, Any]:
        """Check if dependencies are installed."""
        installed = []
        missing = []

        for dep in depends:
            if dep == 'base':
                installed.append(dep)
                continue

            module = self._get_installed_module(dep)
            if module:
                installed.append(dep)
            else:
                missing.append(dep)

        return {
            'installed': installed,
            'missing': missing,
            'all_satisfied': len(missing) == 0,
        }
