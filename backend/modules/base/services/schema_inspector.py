"""
Schema Inspector Service

Compares SQLAlchemy model definitions with actual database schema to detect changes.
Inspired by Odoo's ir.model and Django's migration autodetector.
"""

import hashlib
import json
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Type

from sqlalchemy import Engine, inspect as sa_inspect
from sqlalchemy.engine.reflection import Inspector
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)


class ChangeType(str, Enum):
    """Types of schema changes detected."""
    TABLE_CREATE = "create_table"
    TABLE_DROP = "drop_table"
    COLUMN_ADD = "add_column"
    COLUMN_DROP = "drop_column"
    COLUMN_ALTER = "alter_column"
    COLUMN_RENAME = "rename_column"
    INDEX_CREATE = "create_index"
    INDEX_DROP = "drop_index"
    FK_CREATE = "create_foreign_key"
    FK_DROP = "drop_foreign_key"
    CONSTRAINT_CREATE = "create_constraint"
    CONSTRAINT_DROP = "drop_constraint"


@dataclass
class ColumnDiff:
    """Represents differences in a column definition."""
    name: str
    changes: Dict[str, Dict[str, Any]] = field(default_factory=dict)  # {attr: {old: x, new: y}}

    def has_changes(self) -> bool:
        return len(self.changes) > 0


@dataclass
class SchemaDiff:
    """Represents differences between model definition and database schema."""
    table_name: str
    model_name: Optional[str] = None
    exists_in_db: bool = True
    exists_in_model: bool = True

    # Column changes
    columns_to_add: List[Dict[str, Any]] = field(default_factory=list)
    columns_to_drop: List[str] = field(default_factory=list)
    columns_to_alter: List[ColumnDiff] = field(default_factory=list)

    # Index changes
    indexes_to_create: List[Dict[str, Any]] = field(default_factory=list)
    indexes_to_drop: List[str] = field(default_factory=list)

    # Foreign key changes
    fks_to_create: List[Dict[str, Any]] = field(default_factory=list)
    fks_to_drop: List[str] = field(default_factory=list)

    # Constraint changes
    constraints_to_create: List[Dict[str, Any]] = field(default_factory=list)
    constraints_to_drop: List[str] = field(default_factory=list)

    def has_changes(self) -> bool:
        """Check if there are any schema changes."""
        return (
            not self.exists_in_db
            or not self.exists_in_model
            or len(self.columns_to_add) > 0
            or len(self.columns_to_drop) > 0
            or len(self.columns_to_alter) > 0
            or len(self.indexes_to_create) > 0
            or len(self.indexes_to_drop) > 0
            or len(self.fks_to_create) > 0
            or len(self.fks_to_drop) > 0
            or len(self.constraints_to_create) > 0
            or len(self.constraints_to_drop) > 0
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "table_name": self.table_name,
            "model_name": self.model_name,
            "exists_in_db": self.exists_in_db,
            "exists_in_model": self.exists_in_model,
            "columns_to_add": self.columns_to_add,
            "columns_to_drop": self.columns_to_drop,
            "columns_to_alter": [
                {"name": c.name, "changes": c.changes}
                for c in self.columns_to_alter
            ],
            "indexes_to_create": self.indexes_to_create,
            "indexes_to_drop": self.indexes_to_drop,
            "fks_to_create": self.fks_to_create,
            "fks_to_drop": self.fks_to_drop,
            "constraints_to_create": self.constraints_to_create,
            "constraints_to_drop": self.constraints_to_drop,
            "has_changes": self.has_changes(),
        }


class SchemaInspector:
    """
    Inspects and compares database schema with model definitions.

    Provides functionality to:
    - Check if tables exist
    - Get current table schema from database
    - Extract expected schema from model definitions
    - Compare schemas and detect differences
    - Generate checksums for schema tracking
    """

    def __init__(self, engine: Engine):
        """
        Initialize the schema inspector.

        Args:
            engine: SQLAlchemy engine connected to the database
        """
        self.engine = engine
        self._inspector: Optional[Inspector] = None

    @property
    def inspector(self) -> Inspector:
        """Lazily create and cache the inspector."""
        if self._inspector is None:
            self._inspector = sa_inspect(self.engine)
        return self._inspector

    def refresh(self) -> None:
        """Refresh the inspector to get latest schema."""
        self._inspector = sa_inspect(self.engine)

    # =========================================================================
    # Table Existence
    # =========================================================================

    def table_exists(self, table_name: str) -> bool:
        """
        Check if a table exists in the database.

        Args:
            table_name: Name of the table to check

        Returns:
            True if table exists, False otherwise
        """
        return table_name in self.get_table_names()

    def get_table_names(self, schema: Optional[str] = None) -> List[str]:
        """
        Get all table names in the database.

        Args:
            schema: Optional schema name

        Returns:
            List of table names
        """
        return self.inspector.get_table_names(schema=schema)

    # =========================================================================
    # Column Introspection
    # =========================================================================

    def get_table_columns(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Get all columns for a table from the database.

        Args:
            table_name: Name of the table

        Returns:
            List of column definitions with name, type, nullable, default, etc.
        """
        if not self.table_exists(table_name):
            return []

        columns = []
        for col in self.inspector.get_columns(table_name):
            col_def = {
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable", True),
                "default": col.get("default"),
                "autoincrement": col.get("autoincrement", False),
                "comment": col.get("comment"),
            }
            columns.append(col_def)
        return columns

    # =========================================================================
    # Index Introspection
    # =========================================================================

    def get_table_indexes(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Get all indexes for a table from the database.

        Args:
            table_name: Name of the table

        Returns:
            List of index definitions
        """
        if not self.table_exists(table_name):
            return []

        indexes = []
        for idx in self.inspector.get_indexes(table_name):
            idx_def = {
                "name": idx["name"],
                "columns": idx["column_names"],
                "unique": idx.get("unique", False),
            }
            indexes.append(idx_def)
        return indexes

    # =========================================================================
    # Primary Key Introspection
    # =========================================================================

    def get_primary_keys(self, table_name: str) -> List[str]:
        """
        Get primary key columns for a table.

        Args:
            table_name: Name of the table

        Returns:
            List of primary key column names
        """
        if not self.table_exists(table_name):
            return []

        pk = self.inspector.get_pk_constraint(table_name)
        return pk.get("constrained_columns", []) if pk else []

    # =========================================================================
    # Foreign Key Introspection
    # =========================================================================

    def get_foreign_keys(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Get all foreign keys for a table from the database.

        Args:
            table_name: Name of the table

        Returns:
            List of foreign key definitions
        """
        if not self.table_exists(table_name):
            return []

        fks = []
        for fk in self.inspector.get_foreign_keys(table_name):
            fk_def = {
                "name": fk.get("name"),
                "columns": fk["constrained_columns"],
                "referred_table": fk["referred_table"],
                "referred_columns": fk["referred_columns"],
            }
            fks.append(fk_def)
        return fks

    # =========================================================================
    # Constraint Introspection
    # =========================================================================

    def get_unique_constraints(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Get unique constraints for a table.

        Args:
            table_name: Name of the table

        Returns:
            List of unique constraint definitions
        """
        if not self.table_exists(table_name):
            return []

        constraints = []
        for const in self.inspector.get_unique_constraints(table_name):
            const_def = {
                "name": const.get("name"),
                "columns": const["column_names"],
            }
            constraints.append(const_def)
        return constraints

    def get_check_constraints(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Get check constraints for a table.

        Args:
            table_name: Name of the table

        Returns:
            List of check constraint definitions
        """
        if not self.table_exists(table_name):
            return []

        constraints = []
        for const in self.inspector.get_check_constraints(table_name):
            const_def = {
                "name": const.get("name"),
                "sqltext": str(const.get("sqltext", "")),
            }
            constraints.append(const_def)
        return constraints

    # =========================================================================
    # Full Table Schema
    # =========================================================================

    def get_table_schema(self, table_name: str) -> Dict[str, Any]:
        """
        Get complete schema definition for a table from database.

        Args:
            table_name: Name of the table

        Returns:
            Dictionary with columns, indexes, foreign keys, constraints
        """
        return {
            "table_name": table_name,
            "exists": self.table_exists(table_name),
            "columns": self.get_table_columns(table_name),
            "indexes": self.get_table_indexes(table_name),
            "primary_keys": self.get_primary_keys(table_name),
            "foreign_keys": self.get_foreign_keys(table_name),
            "unique_constraints": self.get_unique_constraints(table_name),
            "check_constraints": self.get_check_constraints(table_name),
        }

    # =========================================================================
    # Model Schema Extraction
    # =========================================================================

    def get_model_schema(self, model_class: Type[DeclarativeBase]) -> Dict[str, Any]:
        """
        Extract expected schema from a SQLAlchemy model class.

        Args:
            model_class: SQLAlchemy model class

        Returns:
            Dictionary with columns, indexes, foreign keys, constraints
        """
        try:
            mapper = sa_inspect(model_class)
            table = mapper.local_table
        except Exception as e:
            logger.error(f"Failed to inspect model {model_class}: {e}")
            return {"error": str(e)}

        # Extract columns
        columns = []
        primary_keys = []
        for col in table.columns:
            col_def = {
                "name": col.name,
                "type": str(col.type),
                "nullable": col.nullable,
                "primary_key": col.primary_key,
                "default": self._serialize_default(col.default),
                "server_default": self._serialize_default(col.server_default),
                "unique": col.unique,
                "index": col.index,
                "comment": col.comment,
                "autoincrement": getattr(col, 'autoincrement', None),
            }
            columns.append(col_def)
            if col.primary_key:
                primary_keys.append(col.name)

        # Extract indexes
        indexes = []
        for idx in table.indexes:
            idx_def = {
                "name": idx.name,
                "columns": [col.name for col in idx.columns],
                "unique": idx.unique,
            }
            indexes.append(idx_def)

        # Extract foreign keys
        foreign_keys = []
        for fk in table.foreign_keys:
            fk_def = {
                "name": fk.constraint.name if fk.constraint else None,
                "column": fk.parent.name,
                "referred_table": fk.column.table.name,
                "referred_column": fk.column.name,
            }
            foreign_keys.append(fk_def)

        # Extract unique constraints
        unique_constraints = []
        for const in table.constraints:
            if hasattr(const, 'columns') and hasattr(const, '_is_unique') and const._is_unique:
                if hasattr(const, 'name') and const.name:
                    const_def = {
                        "name": const.name,
                        "columns": [col.name for col in const.columns],
                    }
                    unique_constraints.append(const_def)

        # Extract check constraints
        check_constraints = []
        for const in table.constraints:
            if type(const).__name__ == 'CheckConstraint':
                const_def = {
                    "name": const.name,
                    "sqltext": str(const.sqltext),
                }
                check_constraints.append(const_def)

        return {
            "table_name": table.name,
            "model_name": model_class.__name__,
            "columns": columns,
            "indexes": indexes,
            "primary_keys": primary_keys,
            "foreign_keys": foreign_keys,
            "unique_constraints": unique_constraints,
            "check_constraints": check_constraints,
        }

    def _serialize_default(self, default: Any) -> Optional[str]:
        """Serialize a column default value to string."""
        if default is None:
            return None
        if hasattr(default, 'arg'):
            arg = default.arg
            if callable(arg):
                return f"<callable:{arg.__name__}>"
            return str(arg)
        return str(default)

    # =========================================================================
    # Schema Comparison
    # =========================================================================

    def compare_schemas(
        self,
        model_class: Type[DeclarativeBase],
        ignore_columns: Optional[Set[str]] = None,
    ) -> SchemaDiff:
        """
        Compare model definition with database schema.

        Args:
            model_class: SQLAlchemy model class to compare
            ignore_columns: Set of column names to ignore in comparison

        Returns:
            SchemaDiff object describing all differences
        """
        ignore_columns = ignore_columns or set()

        # Get schemas
        model_schema = self.get_model_schema(model_class)
        table_name = model_schema.get("table_name", "")
        db_schema = self.get_table_schema(table_name)

        diff = SchemaDiff(
            table_name=table_name,
            model_name=model_schema.get("model_name"),
            exists_in_db=db_schema.get("exists", False),
            exists_in_model=True,
        )

        # If table doesn't exist, return early
        if not diff.exists_in_db:
            # All model columns need to be added
            for col in model_schema.get("columns", []):
                if col["name"] not in ignore_columns:
                    diff.columns_to_add.append(col)
            return diff

        # Compare columns
        self._compare_columns(
            model_schema.get("columns", []),
            db_schema.get("columns", []),
            ignore_columns,
            diff,
        )

        # Compare indexes
        self._compare_indexes(
            model_schema.get("indexes", []),
            db_schema.get("indexes", []),
            diff,
        )

        # Compare foreign keys
        self._compare_foreign_keys(
            model_schema.get("foreign_keys", []),
            db_schema.get("foreign_keys", []),
            diff,
        )

        return diff

    def _compare_columns(
        self,
        model_columns: List[Dict],
        db_columns: List[Dict],
        ignore_columns: Set[str],
        diff: SchemaDiff,
    ) -> None:
        """Compare columns between model and database."""
        model_col_map = {c["name"]: c for c in model_columns}
        db_col_map = {c["name"]: c for c in db_columns}

        model_col_names = set(model_col_map.keys()) - ignore_columns
        db_col_names = set(db_col_map.keys()) - ignore_columns

        # Columns to add (in model but not in DB)
        for col_name in model_col_names - db_col_names:
            diff.columns_to_add.append(model_col_map[col_name])

        # Columns to drop (in DB but not in model)
        for col_name in db_col_names - model_col_names:
            diff.columns_to_drop.append(col_name)

        # Columns to potentially alter (in both)
        for col_name in model_col_names & db_col_names:
            model_col = model_col_map[col_name]
            db_col = db_col_map[col_name]
            col_diff = self._compare_column_definition(model_col, db_col)
            if col_diff.has_changes():
                diff.columns_to_alter.append(col_diff)

    def _compare_column_definition(
        self,
        model_col: Dict[str, Any],
        db_col: Dict[str, Any],
    ) -> ColumnDiff:
        """Compare two column definitions."""
        col_diff = ColumnDiff(name=model_col["name"])

        # Compare nullable
        model_nullable = model_col.get("nullable", True)
        db_nullable = db_col.get("nullable", True)
        if model_nullable != db_nullable:
            col_diff.changes["nullable"] = {"old": db_nullable, "new": model_nullable}

        # Compare type (simplified - full type comparison is complex)
        model_type = self._normalize_type(model_col.get("type", ""))
        db_type = self._normalize_type(db_col.get("type", ""))
        if model_type.upper() != db_type.upper():
            col_diff.changes["type"] = {"old": db_type, "new": model_type}

        return col_diff

    def _normalize_type(self, type_str: str) -> str:
        """Normalize type string for comparison."""
        # Handle common type variations
        type_str = str(type_str).upper()
        type_map = {
            "INTEGER": "INTEGER",
            "INT": "INTEGER",
            "BIGINT": "BIGINT",
            "SMALLINT": "SMALLINT",
            "VARCHAR": "VARCHAR",
            "STRING": "VARCHAR",
            "TEXT": "TEXT",
            "BOOLEAN": "BOOLEAN",
            "BOOL": "BOOLEAN",
            "DATETIME": "TIMESTAMP",
            "TIMESTAMP": "TIMESTAMP",
            "DATE": "DATE",
            "FLOAT": "FLOAT",
            "DOUBLE": "DOUBLE",
            "NUMERIC": "NUMERIC",
            "DECIMAL": "NUMERIC",
            "JSON": "JSON",
            "JSONB": "JSONB",
        }
        # Strip length specifications for comparison
        base_type = type_str.split("(")[0].strip()
        return type_map.get(base_type, base_type)

    def _compare_indexes(
        self,
        model_indexes: List[Dict],
        db_indexes: List[Dict],
        diff: SchemaDiff,
    ) -> None:
        """Compare indexes between model and database."""
        model_idx_map = {idx["name"]: idx for idx in model_indexes if idx.get("name")}
        db_idx_map = {idx["name"]: idx for idx in db_indexes if idx.get("name")}

        # Indexes to create
        for idx_name in set(model_idx_map.keys()) - set(db_idx_map.keys()):
            diff.indexes_to_create.append(model_idx_map[idx_name])

        # Indexes to drop
        for idx_name in set(db_idx_map.keys()) - set(model_idx_map.keys()):
            diff.indexes_to_drop.append(idx_name)

    def _compare_foreign_keys(
        self,
        model_fks: List[Dict],
        db_fks: List[Dict],
        diff: SchemaDiff,
    ) -> None:
        """Compare foreign keys between model and database."""
        # Create comparison keys based on column -> referred_table.referred_column
        def fk_key(fk: Dict) -> str:
            col = fk.get("column") or (fk.get("columns", [None])[0])
            ref_table = fk.get("referred_table")
            ref_col = fk.get("referred_column") or (fk.get("referred_columns", [None])[0])
            return f"{col}->{ref_table}.{ref_col}"

        model_fk_map = {fk_key(fk): fk for fk in model_fks}
        db_fk_map = {fk_key(fk): fk for fk in db_fks}

        # FKs to create
        for key in set(model_fk_map.keys()) - set(db_fk_map.keys()):
            diff.fks_to_create.append(model_fk_map[key])

        # FKs to drop
        for key in set(db_fk_map.keys()) - set(model_fk_map.keys()):
            diff.fks_to_drop.append(db_fk_map[key].get("name", key))

    # =========================================================================
    # Checksum Generation
    # =========================================================================

    def generate_model_checksum(self, model_class: Type[DeclarativeBase]) -> str:
        """
        Generate a checksum for a model's schema.

        Args:
            model_class: SQLAlchemy model class

        Returns:
            SHA-256 checksum string
        """
        schema = self.get_model_schema(model_class)
        # Remove model_name as it doesn't affect DB schema
        schema.pop("model_name", None)
        schema_json = json.dumps(schema, sort_keys=True, default=str)
        return hashlib.sha256(schema_json.encode()).hexdigest()

    def generate_table_checksum(self, table_name: str) -> str:
        """
        Generate a checksum for a database table's schema.

        Args:
            table_name: Name of the table

        Returns:
            SHA-256 checksum string
        """
        schema = self.get_table_schema(table_name)
        schema_json = json.dumps(schema, sort_keys=True, default=str)
        return hashlib.sha256(schema_json.encode()).hexdigest()


def get_schema_inspector(engine: Engine) -> SchemaInspector:
    """
    Factory function to create a SchemaInspector.

    Args:
        engine: SQLAlchemy engine

    Returns:
        SchemaInspector instance
    """
    return SchemaInspector(engine)
