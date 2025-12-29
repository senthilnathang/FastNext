"""
Schema Manager Service

Manages DDL operations for module tables - creation, alteration, and deletion.
Inspired by Odoo's ir.model and Django's schema editor.
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Type

from sqlalchemy import (
    Column,
    Engine,
    MetaData,
    Table,
    create_engine,
    text,
)
from sqlalchemy.orm import Session, DeclarativeBase
from sqlalchemy.schema import (
    AddConstraint,
    CreateIndex,
    CreateTable,
    DropConstraint,
    DropIndex,
    DropTable,
)

from .schema_inspector import SchemaInspector, SchemaDiff, ChangeType

logger = logging.getLogger(__name__)


class OperationType(str, Enum):
    """Types of DDL operations."""
    CREATE_TABLE = "create_table"
    DROP_TABLE = "drop_table"
    ADD_COLUMN = "add_column"
    DROP_COLUMN = "drop_column"
    ALTER_COLUMN = "alter_column"
    RENAME_COLUMN = "rename_column"
    CREATE_INDEX = "create_index"
    DROP_INDEX = "drop_index"
    ADD_FK = "add_foreign_key"
    DROP_FK = "drop_foreign_key"
    ADD_CONSTRAINT = "add_constraint"
    DROP_CONSTRAINT = "drop_constraint"


@dataclass
class DDLOperation:
    """Represents a single DDL operation."""
    operation_type: OperationType
    table_name: str
    details: Dict[str, Any] = field(default_factory=dict)
    sql: str = ""
    rollback_sql: str = ""
    executed: bool = False
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "operation_type": self.operation_type.value,
            "table_name": self.table_name,
            "details": self.details,
            "sql": self.sql,
            "rollback_sql": self.rollback_sql,
            "executed": self.executed,
            "error": self.error,
        }


class SchemaManager:
    """
    Manages DDL operations for module tables.

    Provides functionality to:
    - Create tables for module models
    - Alter existing tables (add/drop columns, indexes, FKs)
    - Drop tables for uninstalled modules
    - Sort tables by dependency order
    - Generate rollback SQL
    """

    def __init__(self, engine: Engine):
        """
        Initialize the schema manager.

        Args:
            engine: SQLAlchemy engine connected to the database
        """
        self.engine = engine
        self.inspector = SchemaInspector(engine)
        self.metadata = MetaData()

    # =========================================================================
    # Table Creation
    # =========================================================================

    def create_tables_for_module(
        self,
        module_name: str,
        models: List[Type[DeclarativeBase]],
        association_tables: Optional[List[Table]] = None,
    ) -> List[DDLOperation]:
        """
        Create database tables for all models in a module.

        Args:
            module_name: Name of the module
            models: List of SQLAlchemy model classes
            association_tables: Optional list of SQLAlchemy Table objects (many-to-many association tables)

        Returns:
            List of DDL operations performed
        """
        operations = []

        # Sort models by dependencies (FKs)
        sorted_models = self.sort_by_dependencies(models, reverse=False)

        for model in sorted_models:
            op = self.create_table(model)
            if op:
                operations.append(op)
                logger.info(f"Created table {op.table_name} for module {module_name}")

        # Create association tables (many-to-many relationships)
        # These are Table objects, not model classes
        if association_tables:
            for table in association_tables:
                op = self.create_table_from_table_object(table, module_name)
                if op:
                    operations.append(op)
                    logger.info(f"Created association table {op.table_name} for module {module_name}")

        return operations

    def create_table_from_table_object(
        self,
        table: Table,
        module_name: str,
    ) -> Optional[DDLOperation]:
        """
        Create a database table from a SQLAlchemy Table object.

        This is used for association tables (many-to-many relationships)
        which are defined as Table objects rather than model classes.

        Args:
            table: SQLAlchemy Table object
            module_name: Name of the module

        Returns:
            DDLOperation if table was created, None if already exists
        """
        table_name = table.name

        # Check if table already exists
        if self.inspector.table_exists(table_name):
            logger.debug(f"Table {table_name} already exists, skipping creation")
            return None

        # Generate CREATE TABLE SQL
        create_stmt = CreateTable(table)
        sql = str(create_stmt.compile(self.engine))

        # Generate rollback SQL
        rollback_sql = f"DROP TABLE IF EXISTS {table_name} CASCADE;"

        operation = DDLOperation(
            operation_type=OperationType.CREATE_TABLE,
            table_name=table_name,
            details={
                "module_name": module_name,
                "columns": [col.name for col in table.columns],
                "is_association_table": True,
            },
            sql=sql,
            rollback_sql=rollback_sql,
        )

        # Execute the creation
        try:
            with self.engine.begin() as conn:
                table.create(conn, checkfirst=True)
            operation.executed = True
            self.inspector.refresh()
        except Exception as e:
            operation.error = str(e)
            logger.error(f"Failed to create association table {table_name}: {e}")

        return operation

    def create_table(self, model_class: Type[DeclarativeBase]) -> Optional[DDLOperation]:
        """
        Create a database table from a SQLAlchemy model.

        Args:
            model_class: SQLAlchemy model class

        Returns:
            DDLOperation if table was created, None if already exists
        """
        try:
            from sqlalchemy import inspect as sa_inspect
            mapper = sa_inspect(model_class)
            table = mapper.local_table
            table_name = table.name
        except Exception as e:
            logger.error(f"Failed to inspect model {model_class}: {e}")
            return None

        # Check if table already exists
        if self.inspector.table_exists(table_name):
            logger.debug(f"Table {table_name} already exists, skipping creation")
            return None

        # Generate CREATE TABLE SQL
        create_stmt = CreateTable(table)
        sql = str(create_stmt.compile(self.engine))

        # Generate rollback SQL
        rollback_sql = f"DROP TABLE IF EXISTS {table_name} CASCADE;"

        operation = DDLOperation(
            operation_type=OperationType.CREATE_TABLE,
            table_name=table_name,
            details={
                "model_name": model_class.__name__,
                "columns": [col.name for col in table.columns],
            },
            sql=sql,
            rollback_sql=rollback_sql,
        )

        # Execute the creation
        try:
            with self.engine.begin() as conn:
                table.create(conn, checkfirst=True)
            operation.executed = True
            self.inspector.refresh()
        except Exception as e:
            operation.error = str(e)
            logger.error(f"Failed to create table {table_name}: {e}")

        return operation

    # =========================================================================
    # Schema Upgrade
    # =========================================================================

    def upgrade_module_schema(
        self,
        module_name: str,
        models: List[Type[DeclarativeBase]],
    ) -> List[DDLOperation]:
        """
        Detect and apply schema changes for a module's models.

        Args:
            module_name: Name of the module
            models: List of SQLAlchemy model classes

        Returns:
            List of DDL operations performed
        """
        operations = []

        for model in models:
            # Compare current model with database
            diff = self.inspector.compare_schemas(model)

            if not diff.has_changes():
                continue

            # Generate operations for this model
            model_ops = self._generate_upgrade_operations(diff, model)
            operations.extend(model_ops)

        return operations

    def _generate_upgrade_operations(
        self,
        diff: SchemaDiff,
        model_class: Type[DeclarativeBase],
    ) -> List[DDLOperation]:
        """Generate DDL operations from a schema diff."""
        operations = []

        # If table doesn't exist, create it
        if not diff.exists_in_db:
            op = self.create_table(model_class)
            if op:
                operations.append(op)
            return operations

        # Add columns
        for col_def in diff.columns_to_add:
            op = self._add_column_operation(diff.table_name, col_def)
            operations.append(op)

        # Drop columns
        for col_name in diff.columns_to_drop:
            op = self._drop_column_operation(diff.table_name, col_name)
            operations.append(op)

        # Alter columns
        for col_diff in diff.columns_to_alter:
            op = self._alter_column_operation(diff.table_name, col_diff)
            if op:
                operations.append(op)

        # Create indexes
        for idx_def in diff.indexes_to_create:
            op = self._create_index_operation(diff.table_name, idx_def)
            operations.append(op)

        # Drop indexes
        for idx_name in diff.indexes_to_drop:
            op = self._drop_index_operation(idx_name)
            operations.append(op)

        return operations

    def _add_column_operation(
        self,
        table_name: str,
        col_def: Dict[str, Any],
    ) -> DDLOperation:
        """Generate operation to add a column."""
        col_name = col_def["name"]
        col_type = col_def.get("type", "VARCHAR(255)")
        nullable = col_def.get("nullable", True)
        default = col_def.get("server_default") or col_def.get("default")

        # Build SQL
        null_clause = "NULL" if nullable else "NOT NULL"
        default_clause = f"DEFAULT {default}" if default else ""
        sql = f'ALTER TABLE {table_name} ADD COLUMN "{col_name}" {col_type} {null_clause} {default_clause};'

        rollback_sql = f'ALTER TABLE {table_name} DROP COLUMN IF EXISTS "{col_name}";'

        return DDLOperation(
            operation_type=OperationType.ADD_COLUMN,
            table_name=table_name,
            details={"column": col_name, "type": col_type},
            sql=sql.strip(),
            rollback_sql=rollback_sql,
        )

    def _drop_column_operation(
        self,
        table_name: str,
        col_name: str,
    ) -> DDLOperation:
        """Generate operation to drop a column."""
        sql = f'ALTER TABLE {table_name} DROP COLUMN IF EXISTS "{col_name}";'

        # Rollback is complex - we'd need to know the original definition
        rollback_sql = f"-- Cannot auto-rollback DROP COLUMN {col_name}"

        return DDLOperation(
            operation_type=OperationType.DROP_COLUMN,
            table_name=table_name,
            details={"column": col_name},
            sql=sql,
            rollback_sql=rollback_sql,
        )

    def _alter_column_operation(
        self,
        table_name: str,
        col_diff: Any,
    ) -> Optional[DDLOperation]:
        """Generate operation to alter a column."""
        from .schema_inspector import ColumnDiff

        if not isinstance(col_diff, ColumnDiff) or not col_diff.has_changes():
            return None

        col_name = col_diff.name
        changes = col_diff.changes

        sql_parts = []
        rollback_parts = []

        if "nullable" in changes:
            new_nullable = changes["nullable"]["new"]
            old_nullable = changes["nullable"]["old"]
            if new_nullable:
                sql_parts.append(f'ALTER TABLE {table_name} ALTER COLUMN "{col_name}" DROP NOT NULL;')
                rollback_parts.append(f'ALTER TABLE {table_name} ALTER COLUMN "{col_name}" SET NOT NULL;')
            else:
                sql_parts.append(f'ALTER TABLE {table_name} ALTER COLUMN "{col_name}" SET NOT NULL;')
                rollback_parts.append(f'ALTER TABLE {table_name} ALTER COLUMN "{col_name}" DROP NOT NULL;')

        if "type" in changes:
            new_type = changes["type"]["new"]
            old_type = changes["type"]["old"]
            sql_parts.append(f'ALTER TABLE {table_name} ALTER COLUMN "{col_name}" TYPE {new_type} USING "{col_name}"::{new_type};')
            rollback_parts.append(f'ALTER TABLE {table_name} ALTER COLUMN "{col_name}" TYPE {old_type} USING "{col_name}"::{old_type};')

        if not sql_parts:
            return None

        return DDLOperation(
            operation_type=OperationType.ALTER_COLUMN,
            table_name=table_name,
            details={"column": col_name, "changes": changes},
            sql="\n".join(sql_parts),
            rollback_sql="\n".join(rollback_parts),
        )

    def _create_index_operation(
        self,
        table_name: str,
        idx_def: Dict[str, Any],
    ) -> DDLOperation:
        """Generate operation to create an index."""
        idx_name = idx_def.get("name", f"ix_{table_name}_{'_'.join(idx_def['columns'])}")
        columns = idx_def.get("columns", [])
        unique = idx_def.get("unique", False)

        unique_clause = "UNIQUE " if unique else ""
        cols_str = ", ".join(f'"{c}"' for c in columns)
        sql = f'CREATE {unique_clause}INDEX IF NOT EXISTS "{idx_name}" ON {table_name} ({cols_str});'

        rollback_sql = f'DROP INDEX IF EXISTS "{idx_name}";'

        return DDLOperation(
            operation_type=OperationType.CREATE_INDEX,
            table_name=table_name,
            details={"index_name": idx_name, "columns": columns, "unique": unique},
            sql=sql,
            rollback_sql=rollback_sql,
        )

    def _drop_index_operation(self, idx_name: str) -> DDLOperation:
        """Generate operation to drop an index."""
        sql = f'DROP INDEX IF EXISTS "{idx_name}";'
        rollback_sql = f"-- Cannot auto-rollback DROP INDEX {idx_name}"

        return DDLOperation(
            operation_type=OperationType.DROP_INDEX,
            table_name="",
            details={"index_name": idx_name},
            sql=sql,
            rollback_sql=rollback_sql,
        )

    # =========================================================================
    # Table Deletion
    # =========================================================================

    def drop_tables_for_module(
        self,
        module_name: str,
        table_names: List[str],
        cascade: bool = False,
    ) -> List[DDLOperation]:
        """
        Drop database tables for a module.

        Args:
            module_name: Name of the module
            table_names: List of table names to drop
            cascade: Whether to CASCADE dependent objects

        Returns:
            List of DDL operations performed
        """
        operations = []

        # Sort tables in reverse dependency order for safe dropping
        sorted_tables = self._sort_tables_for_drop(table_names)
        logger.info(f"Dropping {len(sorted_tables)} tables for module {module_name} in order: {sorted_tables}")

        for table_name in sorted_tables:
            op = self.drop_table(table_name, cascade)
            if op:
                operations.append(op)
                if op.executed and not op.error:
                    logger.info(f"Successfully dropped table {table_name} for module {module_name}")
                elif op.error:
                    logger.error(f"Failed to drop table {table_name}: {op.error}")

        return operations

    def drop_table(
        self,
        table_name: str,
        cascade: bool = False,
    ) -> Optional[DDLOperation]:
        """
        Drop a database table.

        Args:
            table_name: Name of table to drop
            cascade: Whether to CASCADE dependent objects

        Returns:
            DDLOperation if table was dropped, None if doesn't exist
        """
        if not self.inspector.table_exists(table_name):
            logger.debug(f"Table {table_name} doesn't exist, skipping drop")
            return None

        cascade_clause = "CASCADE" if cascade else ""
        sql = f"DROP TABLE IF EXISTS {table_name} {cascade_clause};"

        # Rollback is complex - we'd need to recreate the table
        rollback_sql = f"-- Cannot auto-rollback DROP TABLE {table_name}"

        operation = DDLOperation(
            operation_type=OperationType.DROP_TABLE,
            table_name=table_name,
            details={"cascade": cascade},
            sql=sql.strip(),
            rollback_sql=rollback_sql,
        )

        # Execute
        try:
            with self.engine.begin() as conn:
                conn.execute(text(sql))
            operation.executed = True
            self.inspector.refresh()
        except Exception as e:
            operation.error = str(e)
            logger.error(f"Failed to drop table {table_name}: {e}")

        return operation

    # =========================================================================
    # Dependency Management
    # =========================================================================

    def sort_by_dependencies(
        self,
        models: List[Type[DeclarativeBase]],
        reverse: bool = False,
    ) -> List[Type[DeclarativeBase]]:
        """
        Sort models by foreign key dependencies (topological sort).

        Args:
            models: List of SQLAlchemy model classes
            reverse: If True, sort for deletion order (dependents first)

        Returns:
            Sorted list of models
        """
        from sqlalchemy import inspect as sa_inspect

        # Build dependency graph
        model_map = {}  # table_name -> model
        dependencies = {}  # table_name -> set of table_names it depends on

        for model in models:
            try:
                mapper = sa_inspect(model)
                table = mapper.local_table
                table_name = table.name
                model_map[table_name] = model

                # Find FK dependencies
                deps = set()
                for fk in table.foreign_keys:
                    ref_table = fk.column.table.name
                    if ref_table != table_name:  # Avoid self-reference
                        deps.add(ref_table)
                dependencies[table_name] = deps
            except Exception as e:
                logger.warning(f"Could not inspect model {model}: {e}")
                continue

        # Topological sort
        sorted_tables = self._topological_sort(dependencies)

        # Map back to models
        sorted_models = []
        for table_name in sorted_tables:
            if table_name in model_map:
                sorted_models.append(model_map[table_name])

        if reverse:
            sorted_models.reverse()

        return sorted_models

    def _sort_tables_for_drop(self, table_names: List[str]) -> List[str]:
        """
        Sort tables for safe dropping (dependents first).

        Tables with FKs to other tables should be dropped BEFORE the tables they reference.
        Example: if crm_leads has FK to crm_contacts, drop crm_leads first, then crm_contacts.

        Args:
            table_names: List of table names

        Returns:
            Sorted list of table names (dependents first)
        """
        if not table_names:
            return []

        table_set = set(table_names)

        # Build a graph: for each table, which tables must be dropped AFTER it
        # (i.e., which tables does it reference via FK)
        must_drop_after = {table: set() for table in table_names}

        for table_name in table_names:
            if not self.inspector.table_exists(table_name):
                continue

            # Get FKs FROM this table (what this table references)
            try:
                fks = self.inspector.get_foreign_keys(table_name)
                for fk in fks:
                    ref_table = fk.get("referred_table")
                    # If this table references another table in our set,
                    # the referenced table must be dropped AFTER this one
                    if ref_table and ref_table in table_set and ref_table != table_name:
                        must_drop_after[table_name].add(ref_table)
            except Exception as e:
                logger.warning(f"Could not get FKs for {table_name}: {e}")

        # Now perform topological sort
        # Tables with no dependencies (nothing must be dropped after them) go last
        result = []
        remaining = set(table_names)
        iteration = 0
        max_iterations = len(table_names) * 2  # Prevent infinite loops

        while remaining and iteration < max_iterations:
            iteration += 1
            # Find tables that can be safely dropped
            # (all tables they reference have already been added to result or aren't in remaining)
            droppable = []
            for table in remaining:
                # Check if all tables this one references are already scheduled
                refs_remaining = must_drop_after.get(table, set()) & remaining
                if not refs_remaining:
                    droppable.append(table)

            if not droppable:
                # Circular dependency or all remaining have dependencies
                # Just add them in any order (CASCADE will handle it)
                logger.warning(f"Circular FK dependencies detected among: {remaining}")
                result.extend(sorted(remaining))
                break

            # Add droppable tables to result
            for table in sorted(droppable):  # Sort for deterministic order
                result.append(table)
                remaining.remove(table)

        logger.debug(f"Table drop order: {result}")
        return result

    def _topological_sort(self, dependencies: Dict[str, Set[str]]) -> List[str]:
        """
        Perform topological sort on dependency graph.

        Args:
            dependencies: Dict mapping node -> set of nodes it depends on

        Returns:
            Sorted list of nodes
        """
        result = []
        visited = set()
        temp_visited = set()

        def visit(node: str):
            if node in temp_visited:
                # Circular dependency - just continue
                return
            if node in visited:
                return
            temp_visited.add(node)
            for dep in dependencies.get(node, set()):
                visit(dep)
            temp_visited.remove(node)
            visited.add(node)
            result.append(node)

        for node in dependencies:
            if node not in visited:
                visit(node)

        return result

    # =========================================================================
    # DDL Execution
    # =========================================================================

    def execute_operations(
        self,
        operations: List[DDLOperation],
        rollback_on_error: bool = True,
    ) -> List[DDLOperation]:
        """
        Execute a list of DDL operations.

        Args:
            operations: List of DDL operations to execute
            rollback_on_error: Whether to rollback on error

        Returns:
            List of operations with execution status updated
        """
        executed = []

        try:
            with self.engine.begin() as conn:
                for op in operations:
                    if op.executed:
                        continue
                    try:
                        conn.execute(text(op.sql))
                        op.executed = True
                        executed.append(op)
                        logger.info(f"Executed {op.operation_type.value} on {op.table_name}")
                    except Exception as e:
                        op.error = str(e)
                        logger.error(f"Failed to execute {op.operation_type.value}: {e}")
                        if rollback_on_error:
                            raise
        except Exception as e:
            if rollback_on_error and executed:
                logger.info("Rolling back executed operations...")
                self._rollback_operations(executed)

        self.inspector.refresh()
        return operations

    def _rollback_operations(self, operations: List[DDLOperation]) -> None:
        """Rollback a list of executed operations."""
        # Rollback in reverse order
        for op in reversed(operations):
            if not op.executed or not op.rollback_sql:
                continue
            if op.rollback_sql.startswith("--"):
                # Cannot auto-rollback
                logger.warning(f"Cannot auto-rollback: {op.operation_type.value} on {op.table_name}")
                continue
            try:
                with self.engine.begin() as conn:
                    conn.execute(text(op.rollback_sql))
                logger.info(f"Rolled back {op.operation_type.value} on {op.table_name}")
            except Exception as e:
                logger.error(f"Failed to rollback {op.operation_type.value}: {e}")

    # =========================================================================
    # Utility Methods
    # =========================================================================

    def get_model_tables(
        self,
        models: List[Type[DeclarativeBase]],
    ) -> Dict[str, str]:
        """
        Get table names for a list of models.

        Args:
            models: List of SQLAlchemy model classes

        Returns:
            Dict mapping model_name -> table_name
        """
        from sqlalchemy import inspect as sa_inspect

        result = {}
        for model in models:
            try:
                mapper = sa_inspect(model)
                table = mapper.local_table
                result[model.__name__] = table.name
            except Exception:
                continue
        return result

    def backup_table_schema(self, table_name: str) -> Dict[str, Any]:
        """
        Backup a table's schema definition.

        Args:
            table_name: Name of the table

        Returns:
            Complete schema definition for recreation
        """
        return self.inspector.get_table_schema(table_name)


def get_schema_manager(engine: Engine) -> SchemaManager:
    """
    Factory function to create a SchemaManager.

    Args:
        engine: SQLAlchemy engine

    Returns:
        SchemaManager instance
    """
    return SchemaManager(engine)
