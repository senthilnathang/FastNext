"""
Module Pre-Installation Validator

Comprehensive validation service that checks modules before installation
to prevent post-installation errors.

Validates:
- Frontend assets (files exist, proper structure)
- Schema compatibility (table conflicts, FK references)
- Route conflicts (API paths, menus)
- Dependencies (modules, packages)
"""

import json
import logging
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Type

from fastapi import APIRouter
from sqlalchemy import Engine, inspect as sa_inspect
from sqlalchemy.orm import Session, DeclarativeBase

from app.core.config import settings
from app.core.modules import ModuleLoader, ModuleRegistry

logger = logging.getLogger(__name__)


# SQL reserved keywords that shouldn't be used as table/column names
SQL_RESERVED_KEYWORDS = {
    "select", "from", "where", "and", "or", "not", "in", "is", "null",
    "like", "between", "join", "on", "as", "order", "by", "group", "having",
    "insert", "into", "values", "update", "set", "delete", "create", "table",
    "drop", "alter", "index", "primary", "key", "foreign", "references",
    "constraint", "unique", "check", "default", "cascade", "user", "role",
    "grant", "revoke", "commit", "rollback", "transaction", "begin", "end",
}

# Type mappings for schema comparison (SQLAlchemy type -> PostgreSQL type patterns)
TYPE_MAPPINGS = {
    "VARCHAR": ["character varying", "varchar"],
    "TEXT": ["text"],
    "INTEGER": ["integer", "int", "int4"],
    "BIGINT": ["bigint", "int8"],
    "SMALLINT": ["smallint", "int2"],
    "BOOLEAN": ["boolean", "bool"],
    "FLOAT": ["double precision", "float8", "real", "float4"],
    "NUMERIC": ["numeric", "decimal"],
    "DATE": ["date"],
    "DATETIME": ["timestamp without time zone", "timestamp"],
    "TIMESTAMP": ["timestamp with time zone", "timestamptz"],
    "JSON": ["json"],
    "JSONB": ["jsonb"],
    "UUID": ["uuid"],
    "BYTEA": ["bytea"],
    "ARRAY": ["array"],
}


class ValidationCategory(str, Enum):
    """Categories of validation checks."""
    FRONTEND = "frontend"
    SCHEMA = "schema"
    ROUTE = "route"
    DEPENDENCY = "dependency"
    MANIFEST = "manifest"


class ValidationSeverity(str, Enum):
    """Severity levels for validation issues."""
    ERROR = "error"      # Blocks installation
    WARNING = "warning"  # Allows but warns


@dataclass
class ValidationIssue:
    """A single validation issue found during pre-installation check."""
    category: ValidationCategory
    severity: ValidationSeverity
    message: str
    details: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "category": self.category.value,
            "severity": self.severity.value,
            "message": self.message,
            "details": self.details,
        }


@dataclass
class ColumnDiff:
    """Difference found in a column."""
    column_name: str
    change_type: str  # "add", "remove", "modify_type", "modify_nullable", "modify_default"
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    auto_migratable: bool = True
    migration_sql: Optional[str] = None


@dataclass
class TableDiff:
    """Schema differences for a table."""
    table_name: str
    exists_in_db: bool
    column_diffs: List[ColumnDiff] = field(default_factory=list)
    new_indexes: List[str] = field(default_factory=list)
    new_constraints: List[str] = field(default_factory=list)

    @property
    def has_changes(self) -> bool:
        return bool(self.column_diffs or self.new_indexes or self.new_constraints)

    @property
    def is_safe_migration(self) -> bool:
        """Check if all changes can be auto-migrated safely."""
        return all(diff.auto_migratable for diff in self.column_diffs)


@dataclass
class ValidationResult:
    """Result of module validation."""
    module_name: str
    valid: bool
    errors: List[ValidationIssue] = field(default_factory=list)
    warnings: List[ValidationIssue] = field(default_factory=list)
    schema_diffs: List[TableDiff] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "module_name": self.module_name,
            "valid": self.valid,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [w.to_dict() for w in self.warnings],
            "schema_changes": len(self.schema_diffs),
        }


class ModuleValidator:
    """
    Pre-installation validator for modules.

    Runs comprehensive checks before module installation to catch
    issues that would cause errors after installation.
    """

    def __init__(self, db: Session, engine: Engine):
        """
        Initialize the validator.

        Args:
            db: SQLAlchemy session
            engine: SQLAlchemy engine for schema inspection
        """
        self.db = db
        self.engine = engine
        self.registry = ModuleRegistry.get_registry()
        self.loader = ModuleLoader(settings.all_addon_paths, self.registry)

    def validate_module(self, name: str) -> ValidationResult:
        """
        Run all validation checks on a module.

        Args:
            name: Technical name of the module to validate

        Returns:
            ValidationResult with all errors and warnings
        """
        errors: List[ValidationIssue] = []
        warnings: List[ValidationIssue] = []

        # Discover and load manifest
        self.loader.discover_modules()
        module_path = self.loader.get_module_path(name)

        if not module_path:
            errors.append(ValidationIssue(
                category=ValidationCategory.MANIFEST,
                severity=ValidationSeverity.ERROR,
                message=f"Module '{name}' not found in any addon path",
            ))
            return ValidationResult(
                module_name=name,
                valid=False,
                errors=errors,
                warnings=warnings,
            )

        # Load manifest
        try:
            manifest = self.loader.load_manifest(module_path)
        except Exception as e:
            errors.append(ValidationIssue(
                category=ValidationCategory.MANIFEST,
                severity=ValidationSeverity.ERROR,
                message=f"Failed to load manifest: {str(e)}",
            ))
            return ValidationResult(
                module_name=name,
                valid=False,
                errors=errors,
                warnings=warnings,
            )

        # Run all validation checks
        errors.extend(self._validate_manifest(manifest))
        warnings.extend(self.validate_frontend_assets(module_path, manifest))

        # Schema validation - now returns issues + diffs
        schema_issues, schema_diffs = self.validate_schema_compatibility(name, module_path, manifest)
        for issue in schema_issues:
            if issue.severity == ValidationSeverity.ERROR:
                errors.append(issue)
            else:
                warnings.append(issue)

        # Route conflict detection
        route_issues = self.validate_route_conflicts(name, module_path, manifest)
        for issue in route_issues:
            if issue.severity == ValidationSeverity.ERROR:
                errors.append(issue)
            else:
                warnings.append(issue)

        # Dependency validation
        dep_issues = self.validate_dependencies(name, manifest)
        for issue in dep_issues:
            if issue.severity == ValidationSeverity.ERROR:
                errors.append(issue)
            else:
                warnings.append(issue)

        return ValidationResult(
            module_name=name,
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            schema_diffs=schema_diffs,
        )

    def _validate_manifest(self, manifest: dict) -> List[ValidationIssue]:
        """Validate manifest structure and required fields."""
        issues = []

        # Check required fields
        required_fields = ["name", "version"]
        for field in required_fields:
            if not manifest.get(field):
                issues.append(ValidationIssue(
                    category=ValidationCategory.MANIFEST,
                    severity=ValidationSeverity.ERROR,
                    message=f"Missing required manifest field: {field}",
                ))

        # Validate version format
        version = manifest.get("version", "")
        if version:
            parts = version.split(".")
            if len(parts) < 2:
                issues.append(ValidationIssue(
                    category=ValidationCategory.MANIFEST,
                    severity=ValidationSeverity.ERROR,
                    message=f"Invalid version format: {version}. Use major.minor[.patch]",
                ))

        return issues

    def validate_frontend_assets(
        self, module_path: Path, manifest: dict
    ) -> List[ValidationIssue]:
        """
        Validate frontend asset declarations.

        Checks:
        - Routes file exists
        - Store files exist
        - Component files exist
        - View files exist
        - Locale files are valid JSON

        Args:
            module_path: Path to the module directory
            manifest: Module manifest dictionary

        Returns:
            List of validation issues (warnings)
        """
        issues = []
        assets = manifest.get("assets", {})

        if not assets:
            return issues  # No frontend assets declared

        # Check routes file
        if routes_path := assets.get("routes"):
            full_path = module_path / routes_path
            if not full_path.exists():
                issues.append(ValidationIssue(
                    category=ValidationCategory.FRONTEND,
                    severity=ValidationSeverity.WARNING,
                    message=f"Routes file not found: {routes_path}",
                    details={"expected_path": str(full_path)},
                ))
            elif not self._is_within_static(routes_path):
                issues.append(ValidationIssue(
                    category=ValidationCategory.FRONTEND,
                    severity=ValidationSeverity.ERROR,
                    message=f"Routes path must be within static/ directory: {routes_path}",
                ))

        # Check store files
        for store_path in assets.get("stores", []):
            full_path = module_path / store_path
            if not full_path.exists():
                issues.append(ValidationIssue(
                    category=ValidationCategory.FRONTEND,
                    severity=ValidationSeverity.WARNING,
                    message=f"Store file not found: {store_path}",
                    details={"expected_path": str(full_path)},
                ))

        # Check component files
        for comp_path in assets.get("components", []):
            full_path = module_path / comp_path
            if not full_path.exists():
                issues.append(ValidationIssue(
                    category=ValidationCategory.FRONTEND,
                    severity=ValidationSeverity.WARNING,
                    message=f"Component file not found: {comp_path}",
                    details={"expected_path": str(full_path)},
                ))

        # Check view files
        for view_path in assets.get("views", []):
            full_path = module_path / view_path
            if not full_path.exists():
                issues.append(ValidationIssue(
                    category=ValidationCategory.FRONTEND,
                    severity=ValidationSeverity.WARNING,
                    message=f"View file not found: {view_path}",
                    details={"expected_path": str(full_path)},
                ))

        # Check locale files (must be valid JSON)
        for locale_path in assets.get("locales", []):
            full_path = module_path / locale_path
            if not full_path.exists():
                issues.append(ValidationIssue(
                    category=ValidationCategory.FRONTEND,
                    severity=ValidationSeverity.WARNING,
                    message=f"Locale file not found: {locale_path}",
                    details={"expected_path": str(full_path)},
                ))
            elif full_path.suffix == ".json":
                try:
                    with open(full_path) as f:
                        json.load(f)
                except json.JSONDecodeError as e:
                    issues.append(ValidationIssue(
                        category=ValidationCategory.FRONTEND,
                        severity=ValidationSeverity.ERROR,
                        message=f"Invalid JSON in locale file: {locale_path}",
                        details={"error": str(e)},
                    ))

        return issues

    def _is_within_static(self, path: str) -> bool:
        """Check if path is within static/ directory."""
        return path.startswith("static/") or path.startswith("static\\")

    def validate_schema_compatibility(
        self, name: str, module_path: Path, manifest: dict
    ) -> tuple[List[ValidationIssue], List[TableDiff]]:
        """
        Validate database schema compatibility.

        Instead of blocking when tables exist, compares schemas and generates
        migration plans for differences.

        Checks:
        - New tables can be created
        - Existing tables: compares columns and generates diffs
        - Foreign key references are valid
        - No SQL reserved keywords in names

        Args:
            name: Module name
            module_path: Path to module directory
            manifest: Module manifest

        Returns:
            Tuple of (validation issues, table diffs for migration)
        """
        issues = []
        table_diffs = []

        # Get existing tables from database
        inspector = sa_inspect(self.engine)
        existing_tables = set(inspector.get_table_names())

        # Try to load module models temporarily
        models = self._load_module_models(name, module_path, manifest)
        if not models:
            return issues, table_diffs

        new_tables: Dict[str, Type] = {}

        for model in models:
            if not hasattr(model, "__tablename__"):
                continue

            table_name = model.__tablename__

            # Check for reserved keywords
            if table_name.lower() in SQL_RESERVED_KEYWORDS:
                issues.append(ValidationIssue(
                    category=ValidationCategory.SCHEMA,
                    severity=ValidationSeverity.ERROR,
                    message=f"Table name '{table_name}' is a SQL reserved keyword",
                    details={"model": model.__name__},
                ))

            # Validate column names for reserved keywords
            if hasattr(model, "__table__"):
                for column in model.__table__.columns:
                    if column.name.lower() in SQL_RESERVED_KEYWORDS:
                        issues.append(ValidationIssue(
                            category=ValidationCategory.SCHEMA,
                            severity=ValidationSeverity.WARNING,
                            message=f"Column '{column.name}' in '{table_name}' is a SQL reserved keyword",
                            details={"model": model.__name__, "column": column.name},
                        ))

            # If table exists, compare schemas instead of erroring
            if table_name in existing_tables:
                diff = self._compare_table_schema(table_name, model, inspector)
                if diff.has_changes:
                    table_diffs.append(diff)

                    # Generate warnings for safe migrations
                    for col_diff in diff.column_diffs:
                        if col_diff.auto_migratable:
                            issues.append(ValidationIssue(
                                category=ValidationCategory.SCHEMA,
                                severity=ValidationSeverity.WARNING,
                                message=f"Schema change: {col_diff.change_type} column '{col_diff.column_name}' in '{table_name}'",
                                details={
                                    "table": table_name,
                                    "column": col_diff.column_name,
                                    "change_type": col_diff.change_type,
                                    "old_value": str(col_diff.old_value) if col_diff.old_value else None,
                                    "new_value": str(col_diff.new_value) if col_diff.new_value else None,
                                    "migration_sql": col_diff.migration_sql,
                                },
                            ))
                        else:
                            issues.append(ValidationIssue(
                                category=ValidationCategory.SCHEMA,
                                severity=ValidationSeverity.ERROR,
                                message=f"Breaking schema change: {col_diff.change_type} on '{col_diff.column_name}' in '{table_name}'",
                                details={
                                    "table": table_name,
                                    "column": col_diff.column_name,
                                    "change_type": col_diff.change_type,
                                    "reason": "Cannot auto-migrate this change",
                                },
                            ))
            else:
                # New table - will be created
                new_tables[table_name] = model

            new_tables[table_name] = model

        # Validate foreign key references
        for table_name, model in new_tables.items():
            if not hasattr(model, "__table__"):
                continue

            for fk in model.__table__.foreign_keys:
                ref_table = fk.column.table.name
                # FK must reference existing table or table being created
                if ref_table not in existing_tables and ref_table not in new_tables:
                    issues.append(ValidationIssue(
                        category=ValidationCategory.SCHEMA,
                        severity=ValidationSeverity.ERROR,
                        message=f"Foreign key references non-existent table: {ref_table}",
                        details={
                            "table": table_name,
                            "foreign_key": str(fk),
                            "referenced_table": ref_table,
                        },
                    ))

        # Detect circular FK dependencies
        circular_issues = self._detect_circular_fk_dependencies(new_tables, existing_tables)
        issues.extend(circular_issues)

        return issues, table_diffs

    def _detect_circular_fk_dependencies(
        self, new_tables: Dict[str, Type], existing_tables: Set[str]
    ) -> List[ValidationIssue]:
        """
        Detect circular foreign key dependencies between tables.

        Circular FKs prevent table creation because neither table can be created first.
        The solution is to use use_alter=True on one of the FK constraints.

        Args:
            new_tables: Dict of table_name -> model class
            existing_tables: Set of existing table names in database

        Returns:
            List of validation issues for circular dependencies
        """
        issues = []

        # Build dependency graph: table -> list of tables it depends on via FK
        dependencies: Dict[str, Set[str]] = {}

        for table_name, model in new_tables.items():
            if not hasattr(model, "__table__"):
                continue

            dependencies[table_name] = set()

            for fk in model.__table__.foreign_keys:
                ref_table = fk.column.table.name

                # Only consider dependencies on other new tables (not existing ones)
                if ref_table in new_tables and ref_table != table_name:
                    # Check if this FK uses use_alter=True (deferred constraint)
                    use_alter = getattr(fk, 'use_alter', False)
                    if not use_alter:
                        dependencies[table_name].add(ref_table)

        # Detect cycles using DFS
        visited: Set[str] = set()
        rec_stack: Set[str] = set()
        cycles_found: List[List[str]] = []

        def dfs(table: str, path: List[str]) -> bool:
            """DFS to detect cycles. Returns True if cycle found."""
            visited.add(table)
            rec_stack.add(table)
            path.append(table)

            for dep in dependencies.get(table, set()):
                if dep not in visited:
                    if dfs(dep, path):
                        return True
                elif dep in rec_stack:
                    # Found a cycle - extract it
                    cycle_start = path.index(dep)
                    cycle = path[cycle_start:] + [dep]
                    cycles_found.append(cycle)
                    return True

            path.pop()
            rec_stack.remove(table)
            return False

        # Run DFS from each unvisited node
        for table in dependencies:
            if table not in visited:
                dfs(table, [])

        # Generate issues for each cycle
        for cycle in cycles_found:
            cycle_str = " -> ".join(cycle)

            # Find which FKs are involved
            fk_details = []
            for i in range(len(cycle) - 1):
                from_table = cycle[i]
                to_table = cycle[i + 1]
                model = new_tables.get(from_table)
                if model and hasattr(model, "__table__"):
                    for fk in model.__table__.foreign_keys:
                        if fk.column.table.name == to_table:
                            fk_details.append({
                                "from_table": from_table,
                                "to_table": to_table,
                                "column": fk.parent.name,
                                "constraint": str(fk),
                            })

            issues.append(ValidationIssue(
                category=ValidationCategory.SCHEMA,
                severity=ValidationSeverity.ERROR,
                message=f"Circular foreign key dependency detected: {cycle_str}",
                details={
                    "cycle": cycle,
                    "foreign_keys": fk_details,
                    "solution": "Add use_alter=True to one of the ForeignKey constraints to defer its creation. "
                               "Example: ForeignKey('table.id', use_alter=True, name='fk_name')",
                },
            ))

        return issues

    def _compare_table_schema(
        self, table_name: str, model: Type, inspector
    ) -> TableDiff:
        """
        Compare model schema with existing database table.

        Args:
            table_name: Name of the table
            model: SQLAlchemy model class
            inspector: Database inspector

        Returns:
            TableDiff with all differences found
        """
        diff = TableDiff(table_name=table_name, exists_in_db=True)

        # Get existing columns from database
        db_columns = {col["name"]: col for col in inspector.get_columns(table_name)}

        # Get model columns
        model_columns = {}
        if hasattr(model, "__table__"):
            for column in model.__table__.columns:
                model_columns[column.name] = column

        # Find new columns (in model but not in DB)
        for col_name, model_col in model_columns.items():
            if col_name not in db_columns:
                # New column to add
                col_type = self._get_column_type_sql(model_col)
                nullable = model_col.nullable if model_col.nullable is not None else True
                default = self._get_default_sql(model_col)

                migration_sql = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"
                if not nullable:
                    if default:
                        migration_sql += f" DEFAULT {default} NOT NULL"
                    else:
                        # Non-nullable without default - needs special handling
                        migration_sql += f" DEFAULT '' NOT NULL"  # Will need data migration

                diff.column_diffs.append(ColumnDiff(
                    column_name=col_name,
                    change_type="add",
                    new_value=col_type,
                    auto_migratable=True,
                    migration_sql=migration_sql,
                ))

        # Find type changes and removed columns
        for col_name, db_col in db_columns.items():
            if col_name not in model_columns:
                # Column removed from model - don't drop, just warn
                diff.column_diffs.append(ColumnDiff(
                    column_name=col_name,
                    change_type="unused",
                    old_value=str(db_col["type"]),
                    auto_migratable=True,  # Safe to ignore
                    migration_sql=f"-- Column '{col_name}' no longer in model (kept for data safety)",
                ))
            else:
                # Compare types
                model_col = model_columns[col_name]
                type_change = self._check_type_compatibility(
                    table_name, col_name, db_col, model_col
                )
                if type_change:
                    diff.column_diffs.append(type_change)

                # Compare nullable
                db_nullable = db_col.get("nullable", True)
                model_nullable = model_col.nullable if model_col.nullable is not None else True

                if db_nullable and not model_nullable:
                    # Making non-nullable - need to check for nulls
                    diff.column_diffs.append(ColumnDiff(
                        column_name=col_name,
                        change_type="modify_nullable",
                        old_value="NULL allowed",
                        new_value="NOT NULL",
                        auto_migratable=True,
                        migration_sql=f"ALTER TABLE {table_name} ALTER COLUMN {col_name} SET NOT NULL",
                    ))
                elif not db_nullable and model_nullable:
                    # Making nullable - always safe
                    diff.column_diffs.append(ColumnDiff(
                        column_name=col_name,
                        change_type="modify_nullable",
                        old_value="NOT NULL",
                        new_value="NULL allowed",
                        auto_migratable=True,
                        migration_sql=f"ALTER TABLE {table_name} ALTER COLUMN {col_name} DROP NOT NULL",
                    ))

        return diff

    def _get_column_type_sql(self, column) -> str:
        """Get SQL type string for a SQLAlchemy column."""
        col_type = column.type
        type_name = col_type.__class__.__name__.upper()

        # Handle common types
        if type_name == "VARCHAR" or type_name == "STRING":
            length = getattr(col_type, "length", None)
            if length:
                return f"VARCHAR({length})"
            return "VARCHAR(255)"
        elif type_name == "TEXT":
            return "TEXT"
        elif type_name == "INTEGER":
            return "INTEGER"
        elif type_name == "BIGINT":
            return "BIGINT"
        elif type_name == "SMALLINT":
            return "SMALLINT"
        elif type_name == "BOOLEAN":
            return "BOOLEAN"
        elif type_name == "FLOAT" or type_name == "REAL":
            return "DOUBLE PRECISION"
        elif type_name == "NUMERIC" or type_name == "DECIMAL":
            precision = getattr(col_type, "precision", 10)
            scale = getattr(col_type, "scale", 2)
            return f"NUMERIC({precision},{scale})"
        elif type_name == "DATE":
            return "DATE"
        elif type_name == "DATETIME" or type_name == "TIMESTAMP":
            return "TIMESTAMP WITH TIME ZONE"
        elif type_name == "JSON":
            return "JSONB"
        elif type_name == "UUID":
            return "UUID"
        elif type_name == "ARRAY":
            return "TEXT[]"  # Simplified
        else:
            return str(col_type)

    def _get_default_sql(self, column) -> Optional[str]:
        """Get SQL default value for a column."""
        if column.default is None:
            return None

        default = column.default
        if hasattr(default, "arg"):
            arg = default.arg
            if callable(arg):
                return None  # Can't represent callable defaults
            if isinstance(arg, str):
                return f"'{arg}'"
            if isinstance(arg, bool):
                return "true" if arg else "false"
            return str(arg)
        return None

    def _check_type_compatibility(
        self, table_name: str, col_name: str, db_col: dict, model_col
    ) -> Optional[ColumnDiff]:
        """
        Check if column types are compatible and generate migration if needed.

        Returns ColumnDiff if types differ, None if compatible.
        """
        db_type_str = str(db_col["type"]).lower()
        model_type_str = self._get_column_type_sql(model_col).lower()

        # Normalize and compare
        db_type_base = db_type_str.split("(")[0].strip()
        model_type_base = model_type_str.split("(")[0].strip()

        # Check if types are compatible
        for canonical, variants in TYPE_MAPPINGS.items():
            db_matches = any(v in db_type_base for v in variants) or canonical.lower() in db_type_base
            model_matches = any(v in model_type_base for v in variants) or canonical.lower() in model_type_base

            if db_matches and model_matches:
                # Same base type - check for size changes
                if "varchar" in db_type_base or "character varying" in db_type_base:
                    # Check length change
                    db_length = self._extract_length(db_type_str)
                    model_length = self._extract_length(model_type_str)

                    if db_length and model_length and model_length > db_length:
                        return ColumnDiff(
                            column_name=col_name,
                            change_type="modify_type",
                            old_value=f"VARCHAR({db_length})",
                            new_value=f"VARCHAR({model_length})",
                            auto_migratable=True,  # Increasing size is safe
                            migration_sql=f"ALTER TABLE {table_name} ALTER COLUMN {col_name} TYPE VARCHAR({model_length})",
                        )
                    elif db_length and model_length and model_length < db_length:
                        return ColumnDiff(
                            column_name=col_name,
                            change_type="modify_type",
                            old_value=f"VARCHAR({db_length})",
                            new_value=f"VARCHAR({model_length})",
                            auto_migratable=False,  # Decreasing size may truncate data
                            migration_sql=f"-- WARNING: Decreasing size may truncate data\nALTER TABLE {table_name} ALTER COLUMN {col_name} TYPE VARCHAR({model_length})",
                        )
                return None  # Compatible types

        # Type mismatch - check if migration is possible
        safe_migrations = {
            # From -> To: Safe to migrate
            ("integer", "bigint"): True,
            ("smallint", "integer"): True,
            ("smallint", "bigint"): True,
            ("real", "double precision"): True,
            ("varchar", "text"): True,
            ("character varying", "text"): True,
            ("json", "jsonb"): True,
        }

        migration_key = (db_type_base, model_type_base)
        is_safe = safe_migrations.get(migration_key, False)

        if db_type_base != model_type_base:
            return ColumnDiff(
                column_name=col_name,
                change_type="modify_type",
                old_value=db_type_str,
                new_value=model_type_str,
                auto_migratable=is_safe,
                migration_sql=f"ALTER TABLE {table_name} ALTER COLUMN {col_name} TYPE {model_type_str.upper()} USING {col_name}::{model_type_str.upper()}",
            )

        return None

    def _extract_length(self, type_str: str) -> Optional[int]:
        """Extract length from type string like VARCHAR(255)."""
        import re
        match = re.search(r'\((\d+)\)', type_str)
        if match:
            return int(match.group(1))
        return None

    def _load_module_models(
        self, name: str, module_path: Path, manifest: dict
    ) -> List[Type[DeclarativeBase]]:
        """
        Temporarily load module models for validation.

        Args:
            name: Module name
            module_path: Path to module directory
            manifest: Module manifest

        Returns:
            List of SQLAlchemy model classes
        """
        models = []
        model_packages = manifest.get("models", [])

        if not model_packages:
            return models

        import importlib
        import sys

        # Determine import path
        for addon_path in settings.all_addon_paths:
            if str(addon_path) in str(module_path):
                # Add to sys.path if not already there
                addon_str = str(addon_path.parent)
                if addon_str not in sys.path:
                    sys.path.insert(0, addon_str)
                break

        for model_package in model_packages:
            try:
                full_name = f"modules.{name}.{model_package}"
                mod = importlib.import_module(full_name)

                # Find model classes
                for attr_name in dir(mod):
                    attr = getattr(mod, attr_name)
                    if (
                        isinstance(attr, type)
                        and hasattr(attr, "__tablename__")
                        and attr_name not in ("Base", "DeclarativeBase")
                    ):
                        models.append(attr)
            except Exception as e:
                logger.debug(f"Could not load models from {model_package}: {e}")

        return models

    def validate_route_conflicts(
        self, name: str, module_path: Path, manifest: dict
    ) -> List[ValidationIssue]:
        """
        Validate for API route conflicts.

        Checks:
        - Route paths don't conflict with existing routes (from OTHER modules)
        - Menu paths don't conflict

        Args:
            name: Module name
            module_path: Path to module directory
            manifest: Module manifest

        Returns:
            List of validation issues
        """
        issues = []

        # Get existing registered routes, but exclude routes from the module being validated
        # This handles the case where the module was already loaded at startup
        from app.api.v1 import api_router
        existing_routes = self._get_route_paths(api_router, exclude_prefix=f"/{name}/")

        # Try to load module routers
        routers = self._load_module_routers(name, module_path, manifest)

        for router in routers:
            module_routes = self._get_route_paths(router)
            for path, methods in module_routes.items():
                # Check against existing routes (from other modules only)
                if path in existing_routes:
                    conflicting_methods = methods & existing_routes[path]
                    if conflicting_methods:
                        issues.append(ValidationIssue(
                            category=ValidationCategory.ROUTE,
                            severity=ValidationSeverity.ERROR,
                            message=f"Route conflict: {path} [{', '.join(conflicting_methods)}]",
                            details={
                                "path": path,
                                "methods": list(conflicting_methods),
                            },
                        ))

        # Check menu paths
        menus = manifest.get("menus", [])
        existing_menu_paths = self._get_existing_menu_paths()

        for menu in menus:
            menu_path = menu.get("path", "")
            if menu_path in existing_menu_paths:
                issues.append(ValidationIssue(
                    category=ValidationCategory.ROUTE,
                    severity=ValidationSeverity.WARNING,
                    message=f"Menu path already exists: {menu_path}",
                    details={"menu_name": menu.get("name")},
                ))

        return issues

    def _get_route_paths(
        self, router: APIRouter, exclude_prefix: Optional[str] = None
    ) -> Dict[str, Set[str]]:
        """
        Extract route paths and methods from a router.

        Args:
            router: FastAPI router to extract paths from
            exclude_prefix: Optional prefix to exclude (e.g., "/crm/" to skip CRM routes)

        Returns:
            Dict mapping path to set of HTTP methods
        """
        paths: Dict[str, Set[str]] = {}
        for route in router.routes:
            if hasattr(route, "path") and hasattr(route, "methods"):
                path = route.path
                # Skip routes matching the exclude prefix
                if exclude_prefix and path.startswith(exclude_prefix):
                    continue
                methods = route.methods or {"GET"}
                if path not in paths:
                    paths[path] = set()
                paths[path].update(methods)
        return paths

    def _load_module_routers(
        self, name: str, module_path: Path, manifest: dict
    ) -> List[APIRouter]:
        """Load module routers for validation."""
        routers = []
        api_packages = manifest.get("api", [])

        if not api_packages:
            return routers

        import importlib

        for api_package in api_packages:
            try:
                full_name = f"modules.{name}.{api_package}"
                mod = importlib.import_module(full_name)
                if hasattr(mod, "router") and isinstance(mod.router, APIRouter):
                    routers.append(mod.router)
            except Exception as e:
                logger.debug(f"Could not load router from {api_package}: {e}")

        return routers

    def _get_existing_menu_paths(self) -> Set[str]:
        """Get menu paths from installed modules."""
        paths = set()
        try:
            from modules.base.models.module import InstalledModule
            installed = self.db.query(InstalledModule).filter(
                InstalledModule.state == "installed"
            ).all()

            for module in installed:
                manifest = module.manifest_cache or {}
                for menu in manifest.get("menus", []):
                    if path := menu.get("path"):
                        paths.add(path)
        except Exception:
            pass
        return paths

    def validate_dependencies(
        self, name: str, manifest: dict
    ) -> List[ValidationIssue]:
        """
        Validate module dependencies.

        Checks:
        - Module dependencies can be resolved
        - External Python packages are available
        - System binaries are available

        Args:
            name: Module name
            manifest: Module manifest

        Returns:
            List of validation issues
        """
        issues = []

        # Check module dependencies
        depends = manifest.get("depends", [])
        for dep in depends:
            if dep == name:
                continue  # Skip self-reference

            # Check if dependency is installed or discoverable
            dep_path = self.loader.get_module_path(dep)
            if not dep_path:
                issues.append(ValidationIssue(
                    category=ValidationCategory.DEPENDENCY,
                    severity=ValidationSeverity.ERROR,
                    message=f"Required module not found: {dep}",
                    details={"dependency": dep},
                ))

        # Check external Python dependencies
        ext_deps = manifest.get("external_dependencies", {})
        python_deps = ext_deps.get("python", [])

        import importlib
        for package in python_deps:
            # Handle package[extra] format
            pkg_name = package.split("[")[0]
            try:
                importlib.import_module(pkg_name)
            except ImportError:
                issues.append(ValidationIssue(
                    category=ValidationCategory.DEPENDENCY,
                    severity=ValidationSeverity.ERROR,
                    message=f"Python package not installed: {package}",
                    details={"package": package},
                ))

        # Check system binary dependencies
        import shutil
        bin_deps = ext_deps.get("bin", [])
        for binary in bin_deps:
            if shutil.which(binary) is None:
                issues.append(ValidationIssue(
                    category=ValidationCategory.DEPENDENCY,
                    severity=ValidationSeverity.ERROR,
                    message=f"System binary not found: {binary}",
                    details={"binary": binary},
                ))

        return issues
