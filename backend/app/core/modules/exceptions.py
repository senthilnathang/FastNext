"""
Module System Exceptions

Custom exceptions for the FastVue module system.
"""

from typing import List, Optional


class ModuleError(Exception):
    """Base exception for module system errors."""

    def __init__(self, message: str, module_name: Optional[str] = None):
        self.message = message
        self.module_name = module_name
        super().__init__(self.message)


class ModuleNotFoundError(ModuleError):
    """Raised when a requested module is not found."""

    def __init__(self, module_name: str):
        super().__init__(
            f"Module '{module_name}' not found in any addon path",
            module_name
        )


class InvalidModuleError(ModuleError):
    """Raised when a module has invalid structure or manifest."""

    def __init__(self, message: str, module_name: Optional[str] = None):
        super().__init__(message, module_name)


class MissingDependenciesError(ModuleError):
    """Raised when a module has missing dependencies."""

    def __init__(self, module_name: str, missing: List[str]):
        self.missing_dependencies = missing
        super().__init__(
            f"Module '{module_name}' has missing dependencies: {', '.join(missing)}",
            module_name
        )


class CircularDependencyError(ModuleError):
    """Raised when modules have circular dependencies."""

    def __init__(self, cycle: List[str]):
        self.cycle = cycle
        cycle_str = " -> ".join(cycle)
        super().__init__(f"Circular dependency detected: {cycle_str}")


class ModuleInstallationError(ModuleError):
    """Raised when module installation fails."""

    def __init__(self, module_name: str, reason: str):
        self.reason = reason
        super().__init__(
            f"Failed to install module '{module_name}': {reason}",
            module_name
        )


class ModuleLoadError(ModuleError):
    """Raised when a module fails to load."""

    def __init__(self, module_name: str, reason: str):
        self.reason = reason
        super().__init__(
            f"Failed to load module '{module_name}': {reason}",
            module_name
        )


class ExternalDependencyError(ModuleError):
    """Raised when external dependencies cannot be satisfied."""

    def __init__(self, module_name: str, missing_packages: List[str]):
        self.missing_packages = missing_packages
        super().__init__(
            f"Module '{module_name}' requires missing packages: {', '.join(missing_packages)}",
            module_name
        )


class ModuleValidationError(ModuleError):
    """Raised when module pre-installation validation fails."""

    def __init__(self, module_name: str, errors: List):
        self.validation_errors = errors
        error_messages = [
            getattr(e, 'message', str(e)) for e in errors[:5]
        ]
        if len(errors) > 5:
            error_messages.append(f"... and {len(errors) - 5} more errors")
        super().__init__(
            f"Module '{module_name}' validation failed: {'; '.join(error_messages)}",
            module_name
        )


# ============================================================================
# Schema Exceptions
# ============================================================================


class SchemaError(ModuleError):
    """Base exception for schema operations."""

    def __init__(
        self,
        message: str,
        module_name: Optional[str] = None,
        table_name: Optional[str] = None,
    ):
        self.table_name = table_name
        super().__init__(message, module_name)


class TableExistsError(SchemaError):
    """Raised when attempting to create a table that already exists."""

    def __init__(self, table_name: str, module_name: Optional[str] = None):
        super().__init__(
            f"Table '{table_name}' already exists",
            module_name,
            table_name,
        )


class TableNotFoundError(SchemaError):
    """Raised when a required table doesn't exist."""

    def __init__(self, table_name: str, module_name: Optional[str] = None):
        super().__init__(
            f"Table '{table_name}' not found",
            module_name,
            table_name,
        )


class ColumnExistsError(SchemaError):
    """Raised when attempting to add a column that already exists."""

    def __init__(
        self,
        table_name: str,
        column_name: str,
        module_name: Optional[str] = None,
    ):
        self.column_name = column_name
        super().__init__(
            f"Column '{column_name}' already exists in table '{table_name}'",
            module_name,
            table_name,
        )


class ColumnNotFoundError(SchemaError):
    """Raised when a required column doesn't exist."""

    def __init__(
        self,
        table_name: str,
        column_name: str,
        module_name: Optional[str] = None,
    ):
        self.column_name = column_name
        super().__init__(
            f"Column '{column_name}' not found in table '{table_name}'",
            module_name,
            table_name,
        )


class DependencyBlockError(SchemaError):
    """Raised when FK dependencies prevent an operation."""

    def __init__(
        self,
        table_name: str,
        blocking_tables: List[str],
        operation: str = "drop",
        module_name: Optional[str] = None,
    ):
        self.blocking_tables = blocking_tables
        self.operation = operation
        super().__init__(
            f"Cannot {operation} table '{table_name}': blocked by foreign keys from {blocking_tables}",
            module_name,
            table_name,
        )


class MigrationError(SchemaError):
    """Raised when a migration fails to execute."""

    def __init__(
        self,
        migration_name: str,
        reason: str,
        module_name: Optional[str] = None,
    ):
        self.migration_name = migration_name
        self.reason = reason
        super().__init__(
            f"Migration '{migration_name}' failed: {reason}",
            module_name,
        )


class MigrationNotFoundError(SchemaError):
    """Raised when a requested migration is not found."""

    def __init__(
        self,
        migration_name: str,
        module_name: Optional[str] = None,
    ):
        self.migration_name = migration_name
        super().__init__(
            f"Migration '{migration_name}' not found",
            module_name,
        )


class RollbackError(SchemaError):
    """Raised when a migration rollback fails."""

    def __init__(
        self,
        migration_name: str,
        reason: str,
        module_name: Optional[str] = None,
    ):
        self.migration_name = migration_name
        self.reason = reason
        super().__init__(
            f"Failed to rollback migration '{migration_name}': {reason}",
            module_name,
        )


class SchemaValidationError(SchemaError):
    """Raised when schema validation fails."""

    def __init__(
        self,
        issues: List[str],
        module_name: Optional[str] = None,
    ):
        self.issues = issues
        super().__init__(
            f"Schema validation failed: {'; '.join(issues)}",
            module_name,
        )
