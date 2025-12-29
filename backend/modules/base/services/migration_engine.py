"""
Migration Engine Service

Executes migrations with transaction support and tracks them in the database.
Inspired by Django's migration executor and Odoo's module update mechanism.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Type

from sqlalchemy import Engine, text
from sqlalchemy.orm import Session, DeclarativeBase

from modules.base.models.module_migration import (
    ModuleMigration,
    ModuleModelState,
    MigrationType,
    MigrationStatus,
)
from .schema_manager import SchemaManager, DDLOperation
from .schema_inspector import SchemaInspector

logger = logging.getLogger(__name__)


@dataclass
class MigrationResult:
    """Result of a migration execution."""
    success: bool
    module_name: str
    version: str
    migration_name: str
    operations_count: int = 0
    executed_count: int = 0
    error: Optional[str] = None
    operations: List[Dict[str, Any]] = field(default_factory=list)
    duration_ms: float = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "module_name": self.module_name,
            "version": self.version,
            "migration_name": self.migration_name,
            "operations_count": self.operations_count,
            "executed_count": self.executed_count,
            "error": self.error,
            "operations": self.operations,
            "duration_ms": self.duration_ms,
        }


class MigrationEngine:
    """
    Executes migrations with transaction support.

    Provides functionality to:
    - Execute schema migrations for modules
    - Execute data migrations
    - Track migration history
    - Rollback migrations
    - Validate migration state
    """

    def __init__(self, db: Session, engine: Engine):
        """
        Initialize the migration engine.

        Args:
            db: SQLAlchemy session for ORM operations
            engine: SQLAlchemy engine for DDL operations
        """
        self.db = db
        self.engine = engine
        self.schema_manager = SchemaManager(engine)
        self.schema_inspector = SchemaInspector(engine)

    # =========================================================================
    # Migration Execution
    # =========================================================================

    def execute_migration(
        self,
        module_name: str,
        version: str,
        operations: List[DDLOperation],
        migration_type: MigrationType = MigrationType.SCHEMA,
        description: Optional[str] = None,
    ) -> MigrationResult:
        """
        Execute a migration with transaction support.

        Args:
            module_name: Name of the module
            version: Module version
            operations: List of DDL operations to execute
            migration_type: Type of migration
            description: Human-readable description

        Returns:
            MigrationResult with execution status
        """
        import time
        start_time = time.time()

        # Generate migration name
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        migration_name = f"{timestamp}_{migration_type.value}"

        result = MigrationResult(
            success=False,
            module_name=module_name,
            version=version,
            migration_name=migration_name,
            operations_count=len(operations),
        )

        if not operations:
            result.success = True
            result.duration_ms = (time.time() - start_time) * 1000
            return result

        # Create migration record
        migration = ModuleMigration.create_migration(
            module_name=module_name,
            version=version,
            migration_name=migration_name,
            operations=[op.to_dict() for op in operations],
            migration_type=migration_type,
            rollback_sql=self._combine_rollback_sql(operations),
            rollback_operations=[op.to_dict() for op in operations if op.rollback_sql],
            description=description,
        )

        try:
            # Execute operations within transaction
            executed_ops = self.schema_manager.execute_operations(
                operations,
                rollback_on_error=True,
            )

            # Count successful operations
            executed_count = sum(1 for op in executed_ops if op.executed)
            result.executed_count = executed_count
            result.operations = [op.to_dict() for op in executed_ops]

            # Check for errors
            errors = [op.error for op in executed_ops if op.error]
            if errors:
                result.error = "; ".join(errors)
                migration.mark_failed(result.error)
            else:
                result.success = True
                migration.mark_applied()

        except Exception as e:
            result.error = str(e)
            migration.mark_failed(str(e))
            logger.error(f"Migration {migration_name} failed: {e}")

        # Save migration record
        try:
            self.db.add(migration)
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to save migration record: {e}")
            self.db.rollback()

        result.duration_ms = (time.time() - start_time) * 1000
        return result

    def _combine_rollback_sql(self, operations: List[DDLOperation]) -> str:
        """Combine rollback SQL from all operations."""
        rollback_statements = []
        for op in reversed(operations):
            if op.rollback_sql and not op.rollback_sql.startswith("--"):
                rollback_statements.append(op.rollback_sql)
        return "\n".join(rollback_statements)

    # =========================================================================
    # Module Schema Operations
    # =========================================================================

    def install_module_schema(
        self,
        module_name: str,
        version: str,
        models: List[Type[DeclarativeBase]],
        schema_diffs: Optional[List] = None,
        association_tables: Optional[List] = None,
    ) -> MigrationResult:
        """
        Create tables for a new module installation.

        If schema_diffs are provided (from pre-installation validation),
        applies migrations for existing tables instead of creating them.

        Args:
            module_name: Name of the module
            version: Module version
            models: List of SQLAlchemy model classes
            schema_diffs: Optional list of TableDiff from validation
            association_tables: Optional list of SQLAlchemy Table objects (many-to-many)

        Returns:
            MigrationResult with execution status
        """
        logger.info(f"Installing schema for module {module_name} v{version}")

        # If we have schema diffs, apply them first
        if schema_diffs:
            diff_result = self.apply_schema_diffs(module_name, version, schema_diffs)
            if not diff_result.success:
                return diff_result

        # Generate operations for new tables (including association tables)
        operations = self.schema_manager.create_tables_for_module(
            module_name, models, association_tables=association_tables
        )

        # Execute migration
        result = self.execute_migration(
            module_name=module_name,
            version=version,
            operations=operations,
            migration_type=MigrationType.INITIAL,
            description=f"Initial schema creation for module {module_name}",
        )

        # Save model states
        if result.success:
            self._save_model_states(module_name, version, models, result.migration_name)

        return result

    def apply_schema_diffs(
        self,
        module_name: str,
        version: str,
        schema_diffs: List,
    ) -> MigrationResult:
        """
        Apply schema diffs from pre-installation validation.

        This handles upgrading existing tables with new columns, type changes, etc.
        Only applies auto-migratable changes.

        Args:
            module_name: Name of the module
            version: Module version
            schema_diffs: List of TableDiff from ModuleValidator

        Returns:
            MigrationResult with execution status
        """
        from .schema_manager import DDLOperation, OperationType

        logger.info(f"Applying schema diffs for module {module_name} ({len(schema_diffs)} tables)")

        operations = []

        for table_diff in schema_diffs:
            if not table_diff.has_changes:
                continue

            for col_diff in table_diff.column_diffs:
                # Skip non-auto-migratable changes (they're validation errors)
                if not col_diff.auto_migratable:
                    logger.warning(
                        f"Skipping non-auto-migratable change: "
                        f"{col_diff.change_type} on {table_diff.table_name}.{col_diff.column_name}"
                    )
                    continue

                # Skip comment-only SQL (unused columns)
                if col_diff.migration_sql and col_diff.migration_sql.startswith("--"):
                    logger.debug(f"Skipping comment: {col_diff.migration_sql[:50]}")
                    continue

                if col_diff.migration_sql:
                    # Map change_type to OperationType
                    op_type_map = {
                        "add": OperationType.ADD_COLUMN,
                        "modify_type": OperationType.ALTER_COLUMN,
                        "modify_nullable": OperationType.ALTER_COLUMN,
                        "modify_default": OperationType.ALTER_COLUMN,
                        "unused": OperationType.ALTER_COLUMN,  # Just for logging
                    }
                    op_type = op_type_map.get(col_diff.change_type, OperationType.ALTER_COLUMN)

                    # Generate rollback SQL
                    rollback_sql = self._generate_rollback_for_diff(table_diff.table_name, col_diff)

                    operations.append(DDLOperation(
                        operation_type=op_type,
                        table_name=table_diff.table_name,
                        details={
                            "column": col_diff.column_name,
                            "change_type": col_diff.change_type,
                            "old_value": str(col_diff.old_value) if col_diff.old_value else None,
                            "new_value": str(col_diff.new_value) if col_diff.new_value else None,
                        },
                        sql=col_diff.migration_sql,
                        rollback_sql=rollback_sql,
                    ))

        if not operations:
            logger.info(f"No schema migrations needed for {module_name}")
            return MigrationResult(
                success=True,
                module_name=module_name,
                version=version,
                migration_name="no_changes",
            )

        # Execute migration
        return self.execute_migration(
            module_name=module_name,
            version=version,
            operations=operations,
            migration_type=MigrationType.SCHEMA,
            description=f"Schema migration for existing tables in module {module_name}",
        )

    def _generate_rollback_for_diff(self, table_name: str, col_diff) -> str:
        """Generate rollback SQL for a column diff."""
        if col_diff.change_type == "add":
            return f'ALTER TABLE {table_name} DROP COLUMN IF EXISTS "{col_diff.column_name}";'
        elif col_diff.change_type == "modify_nullable":
            if col_diff.old_value == "NULL allowed":
                return f'ALTER TABLE {table_name} ALTER COLUMN "{col_diff.column_name}" DROP NOT NULL;'
            else:
                return f'ALTER TABLE {table_name} ALTER COLUMN "{col_diff.column_name}" SET NOT NULL;'
        elif col_diff.change_type == "modify_type":
            old_type = str(col_diff.old_value).upper() if col_diff.old_value else "VARCHAR(255)"
            return f'ALTER TABLE {table_name} ALTER COLUMN "{col_diff.column_name}" TYPE {old_type};'
        return f"-- Cannot auto-rollback {col_diff.change_type} on {col_diff.column_name}"

    def upgrade_module_schema(
        self,
        module_name: str,
        version: str,
        models: List[Type[DeclarativeBase]],
    ) -> MigrationResult:
        """
        Upgrade schema for a module update.

        Args:
            module_name: Name of the module
            version: New module version
            models: List of SQLAlchemy model classes

        Returns:
            MigrationResult with execution status
        """
        logger.info(f"Upgrading schema for module {module_name} to v{version}")

        # Generate upgrade operations
        operations = self.schema_manager.upgrade_module_schema(module_name, models)

        if not operations:
            logger.info(f"No schema changes detected for module {module_name}")
            return MigrationResult(
                success=True,
                module_name=module_name,
                version=version,
                migration_name="no_changes",
            )

        # Execute migration
        result = self.execute_migration(
            module_name=module_name,
            version=version,
            operations=operations,
            migration_type=MigrationType.SCHEMA,
            description=f"Schema upgrade for module {module_name} to v{version}",
        )

        # Update model states
        if result.success:
            self._save_model_states(module_name, version, models, result.migration_name)

        return result

    def uninstall_module_schema(
        self,
        module_name: str,
        table_names: List[str],
        cascade: bool = False,
    ) -> MigrationResult:
        """
        Drop tables for module uninstallation.

        Args:
            module_name: Name of the module
            table_names: List of table names to drop
            cascade: Whether to CASCADE dependent objects

        Returns:
            MigrationResult with execution status
        """
        logger.info(f"Uninstalling schema for module {module_name}")

        # Generate drop operations
        operations = self.schema_manager.drop_tables_for_module(
            module_name, table_names, cascade
        )

        # Get current version from last migration
        last_migration = self._get_last_migration(module_name)
        version = last_migration.version if last_migration else "0.0.0"

        # Execute migration
        result = self.execute_migration(
            module_name=module_name,
            version=version,
            operations=operations,
            migration_type=MigrationType.ROLLBACK,
            description=f"Schema removal for module {module_name}",
        )

        # Remove model states
        if result.success:
            self._delete_model_states(module_name)

        return result

    # =========================================================================
    # Model State Management
    # =========================================================================

    def _save_model_states(
        self,
        module_name: str,
        version: str,
        models: List[Type[DeclarativeBase]],
        migration_name: str,
    ) -> None:
        """Save model state snapshots."""
        for model in models:
            try:
                state = ModuleModelState.from_model(
                    module_name=module_name,
                    model_class=model,
                    version=version,
                    last_migration=migration_name,
                )

                # Check for existing state
                existing = self.db.query(ModuleModelState).filter(
                    ModuleModelState.module_name == module_name,
                    ModuleModelState.model_name == model.__name__,
                ).first()

                if existing:
                    # Update existing
                    existing.schema_snapshot = state.schema_snapshot
                    existing.columns = state.columns
                    existing.indexes = state.indexes
                    existing.foreign_keys = state.foreign_keys
                    existing.constraints = state.constraints
                    existing.checksum = state.checksum
                    existing.version = version
                    existing.last_migration = migration_name
                else:
                    # Insert new
                    self.db.add(state)

                self.db.commit()
            except Exception as e:
                logger.error(f"Failed to save model state for {model.__name__}: {e}")
                self.db.rollback()

    def _delete_model_states(self, module_name: str) -> None:
        """Delete model states for a module."""
        try:
            self.db.query(ModuleModelState).filter(
                ModuleModelState.module_name == module_name
            ).delete()
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to delete model states for {module_name}: {e}")
            self.db.rollback()

    # =========================================================================
    # Migration History
    # =========================================================================

    def get_migration_history(
        self,
        module_name: Optional[str] = None,
        limit: int = 50,
    ) -> List[ModuleMigration]:
        """
        Get migration history.

        Args:
            module_name: Optional module to filter by
            limit: Maximum number of records

        Returns:
            List of ModuleMigration records
        """
        query = self.db.query(ModuleMigration)
        if module_name:
            query = query.filter(ModuleMigration.module_name == module_name)
        return query.order_by(ModuleMigration.applied_at.desc()).limit(limit).all()

    def _get_last_migration(self, module_name: str) -> Optional[ModuleMigration]:
        """Get the last applied migration for a module."""
        return self.db.query(ModuleMigration).filter(
            ModuleMigration.module_name == module_name,
            ModuleMigration.is_applied == True,
        ).order_by(ModuleMigration.applied_at.desc()).first()

    def get_pending_changes(
        self,
        module_name: str,
        models: List[Type[DeclarativeBase]],
    ) -> List[DDLOperation]:
        """
        Get pending schema changes for a module.

        Args:
            module_name: Name of the module
            models: List of SQLAlchemy model classes

        Returns:
            List of DDL operations that would be applied
        """
        all_operations = []

        for model in models:
            diff = self.schema_inspector.compare_schemas(model)
            if diff.has_changes():
                if not diff.exists_in_db:
                    # Would create table
                    from sqlalchemy import inspect as sa_inspect
                    mapper = sa_inspect(model)
                    table = mapper.local_table
                    all_operations.append(DDLOperation(
                        operation_type=self.schema_manager.OperationType.CREATE_TABLE,
                        table_name=table.name,
                        details={
                            "model_name": model.__name__,
                            "columns": [col.name for col in table.columns],
                        },
                    ))
                else:
                    # Would upgrade
                    ops = self.schema_manager._generate_upgrade_operations(diff, model)
                    all_operations.extend(ops)

        return all_operations

    # =========================================================================
    # Rollback Operations
    # =========================================================================

    def rollback_migration(
        self,
        module_name: str,
        migration_name: str,
    ) -> MigrationResult:
        """
        Rollback a specific migration.

        Args:
            module_name: Name of the module
            migration_name: Name of migration to rollback

        Returns:
            MigrationResult with status
        """
        logger.info(f"Rolling back migration {migration_name} for {module_name}")

        # Get migration record
        migration = self.db.query(ModuleMigration).filter(
            ModuleMigration.module_name == module_name,
            ModuleMigration.migration_name == migration_name,
        ).first()

        if not migration:
            return MigrationResult(
                success=False,
                module_name=module_name,
                version="",
                migration_name=migration_name,
                error=f"Migration {migration_name} not found",
            )

        if not migration.is_applied:
            return MigrationResult(
                success=False,
                module_name=module_name,
                version=migration.version,
                migration_name=migration_name,
                error="Migration is not currently applied",
            )

        result = MigrationResult(
            success=False,
            module_name=module_name,
            version=migration.version,
            migration_name=migration_name,
        )

        # Execute rollback SQL
        if migration.rollback_sql:
            try:
                with self.engine.begin() as conn:
                    for stmt in migration.rollback_sql.split(";"):
                        stmt = stmt.strip()
                        if stmt and not stmt.startswith("--"):
                            conn.execute(text(stmt))

                migration.mark_rolled_back()
                self.db.commit()
                result.success = True
                logger.info(f"Successfully rolled back {migration_name}")
            except Exception as e:
                result.error = str(e)
                logger.error(f"Rollback failed: {e}")
                self.db.rollback()
        else:
            result.error = "No rollback SQL available"

        return result

    # =========================================================================
    # Data Migrations
    # =========================================================================

    def execute_data_migration(
        self,
        module_name: str,
        version: str,
        migration_func: Callable[[Session], bool],
        description: Optional[str] = None,
    ) -> MigrationResult:
        """
        Execute a data migration function.

        Args:
            module_name: Name of the module
            version: Module version
            migration_func: Function that takes a Session and returns success boolean
            description: Human-readable description

        Returns:
            MigrationResult with status
        """
        import time
        start_time = time.time()

        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        migration_name = f"{timestamp}_data"

        result = MigrationResult(
            success=False,
            module_name=module_name,
            version=version,
            migration_name=migration_name,
        )

        # Create migration record
        migration = ModuleMigration.create_migration(
            module_name=module_name,
            version=version,
            migration_name=migration_name,
            operations=[{"type": "data_migration", "function": migration_func.__name__}],
            migration_type=MigrationType.DATA,
            description=description,
        )

        try:
            success = migration_func(self.db)
            if success:
                self.db.commit()
                migration.mark_applied()
                result.success = True
            else:
                self.db.rollback()
                migration.mark_failed("Migration function returned False")
                result.error = "Migration function returned False"
        except Exception as e:
            self.db.rollback()
            migration.mark_failed(str(e))
            result.error = str(e)
            logger.error(f"Data migration failed: {e}")

        # Save migration record
        try:
            self.db.add(migration)
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to save migration record: {e}")
            self.db.rollback()

        result.duration_ms = (time.time() - start_time) * 1000
        return result

    # =========================================================================
    # Validation
    # =========================================================================

    def validate_module_schema(
        self,
        module_name: str,
        models: List[Type[DeclarativeBase]],
    ) -> Dict[str, Any]:
        """
        Validate module schema against database.

        Args:
            module_name: Name of the module
            models: List of SQLAlchemy model classes

        Returns:
            Validation report
        """
        report = {
            "module_name": module_name,
            "valid": True,
            "models": [],
            "issues": [],
        }

        for model in models:
            model_report = {
                "name": model.__name__,
                "valid": True,
                "issues": [],
            }

            diff = self.schema_inspector.compare_schemas(model)

            if not diff.exists_in_db:
                model_report["valid"] = False
                model_report["issues"].append(f"Table {diff.table_name} does not exist")
                report["valid"] = False
            elif diff.has_changes():
                model_report["valid"] = False
                if diff.columns_to_add:
                    cols = [c["name"] for c in diff.columns_to_add]
                    model_report["issues"].append(f"Missing columns: {cols}")
                if diff.columns_to_drop:
                    model_report["issues"].append(f"Extra columns: {diff.columns_to_drop}")
                if diff.columns_to_alter:
                    cols = [c.name for c in diff.columns_to_alter]
                    model_report["issues"].append(f"Column changes needed: {cols}")
                report["valid"] = False

            report["models"].append(model_report)

        if not report["valid"]:
            report["issues"].append(
                f"Run schema upgrade to fix {sum(1 for m in report['models'] if not m['valid'])} model(s)"
            )

        return report


def get_migration_engine(db: Session, engine: Engine) -> MigrationEngine:
    """
    Factory function to create a MigrationEngine.

    Args:
        db: SQLAlchemy session
        engine: SQLAlchemy engine

    Returns:
        MigrationEngine instance
    """
    return MigrationEngine(db, engine)
