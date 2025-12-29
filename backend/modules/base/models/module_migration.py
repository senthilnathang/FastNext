"""
Module Migration Tracking Models

Tracks schema migrations per module and stores expected schema state for change detection.
Inspired by Odoo ir.module.module and Django migration system.
"""

import hashlib
import json
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.base import TimestampMixin


class MigrationType(str, Enum):
    """Types of module migrations."""
    SCHEMA = "schema"       # DDL operations (CREATE, ALTER, DROP)
    DATA = "data"           # Data migrations (INSERT, UPDATE)
    ROLLBACK = "rollback"   # Rollback operation
    INITIAL = "initial"     # Initial module installation


class MigrationStatus(str, Enum):
    """Migration execution status."""
    PENDING = "pending"
    APPLIED = "applied"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class ModuleMigration(Base, TimestampMixin):
    """
    Tracks schema migrations per module.

    Each migration represents a set of DDL operations applied to the database
    during module installation, upgrade, or uninstallation.

    Similar to Django's django_migrations table and Odoo's ir.model.data.
    """

    __tablename__ = "module_migrations"
    __table_args__ = (
        Index('ix_module_migrations_module_version', 'module_name', 'version'),
        Index('ix_module_migrations_applied_at', 'applied_at'),
        UniqueConstraint('module_name', 'migration_name', name='uq_module_migration_name'),
        {"extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)

    # Module identification
    module_name = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Technical module name"
    )
    version = Column(
        String(50),
        nullable=False,
        comment="Module version when migration was created"
    )

    # Migration identification
    migration_name = Column(
        String(200),
        nullable=False,
        comment="Unique migration identifier (e.g., '0001_initial', '0002_add_field')"
    )
    migration_type = Column(
        String(20),
        default=MigrationType.SCHEMA.value,
        nullable=False,
        comment="Type of migration: schema, data, rollback, initial"
    )

    # Operations performed
    operations = Column(
        JSONB,
        default=list,
        nullable=False,
        comment="List of DDL/DML operations performed"
    )

    # Rollback support
    rollback_sql = Column(
        Text,
        nullable=True,
        comment="SQL to rollback this migration"
    )
    rollback_operations = Column(
        JSONB,
        default=list,
        nullable=True,
        comment="Structured rollback operations"
    )

    # Execution state
    status = Column(
        String(20),
        default=MigrationStatus.PENDING.value,
        nullable=False,
        index=True,
        comment="Migration status: pending, applied, failed, rolled_back"
    )
    is_applied = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether migration is currently applied"
    )
    applied_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=True,
        comment="When the migration was applied"
    )
    rolled_back_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When the migration was rolled back"
    )

    # Integrity
    checksum = Column(
        String(64),
        nullable=True,
        comment="SHA-256 checksum of migration content"
    )

    # Error tracking
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if migration failed"
    )

    # Metadata
    description = Column(
        Text,
        nullable=True,
        comment="Human-readable description of changes"
    )

    def __repr__(self) -> str:
        return f"<ModuleMigration(module={self.module_name}, name={self.migration_name}, status={self.status})>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "module_name": self.module_name,
            "version": self.version,
            "migration_name": self.migration_name,
            "migration_type": self.migration_type,
            "operations": self.operations or [],
            "rollback_sql": self.rollback_sql,
            "status": self.status,
            "is_applied": self.is_applied,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
            "rolled_back_at": self.rolled_back_at.isoformat() if self.rolled_back_at else None,
            "checksum": self.checksum,
            "error_message": self.error_message,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def create_migration(
        cls,
        module_name: str,
        version: str,
        migration_name: str,
        operations: List[Dict[str, Any]],
        migration_type: MigrationType = MigrationType.SCHEMA,
        rollback_sql: Optional[str] = None,
        rollback_operations: Optional[List[Dict[str, Any]]] = None,
        description: Optional[str] = None,
    ) -> "ModuleMigration":
        """
        Create a new migration record.

        Args:
            module_name: Technical module name
            version: Module version
            migration_name: Unique migration identifier
            operations: List of operations to perform
            migration_type: Type of migration
            rollback_sql: SQL for rollback
            rollback_operations: Structured rollback operations
            description: Human-readable description

        Returns:
            ModuleMigration instance (not saved to DB)
        """
        # Generate checksum from operations
        ops_json = json.dumps(operations, sort_keys=True)
        checksum = hashlib.sha256(ops_json.encode()).hexdigest()

        return cls(
            module_name=module_name,
            version=version,
            migration_name=migration_name,
            migration_type=migration_type.value,
            operations=operations,
            rollback_sql=rollback_sql,
            rollback_operations=rollback_operations or [],
            status=MigrationStatus.PENDING.value,
            is_applied=False,
            checksum=checksum,
            description=description,
        )

    def mark_applied(self) -> None:
        """Mark this migration as successfully applied."""
        self.status = MigrationStatus.APPLIED.value
        self.is_applied = True
        self.applied_at = datetime.utcnow()
        self.error_message = None

    def mark_failed(self, error: str) -> None:
        """Mark this migration as failed."""
        self.status = MigrationStatus.FAILED.value
        self.is_applied = False
        self.error_message = error

    def mark_rolled_back(self) -> None:
        """Mark this migration as rolled back."""
        self.status = MigrationStatus.ROLLED_BACK.value
        self.is_applied = False
        self.rolled_back_at = datetime.utcnow()


class ModuleModelState(Base, TimestampMixin):
    """
    Stores expected schema state for change detection.

    Captures a snapshot of each model's schema (columns, indexes, foreign keys)
    so we can detect what changed between module versions.

    Similar to Django's django_migrations table tracking migrations state.
    """

    __tablename__ = "module_model_states"
    __table_args__ = (
        Index('ix_module_model_states_module', 'module_name'),
        Index('ix_module_model_states_table', 'table_name'),
        UniqueConstraint('module_name', 'model_name', name='uq_module_model_state'),
        {"extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)

    # Module identification
    module_name = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Technical module name"
    )

    # Model identification
    model_name = Column(
        String(100),
        nullable=False,
        comment="Python model class name"
    )
    table_name = Column(
        String(100),
        nullable=False,
        comment="Database table name"
    )

    # Schema snapshot
    schema_snapshot = Column(
        JSONB,
        nullable=False,
        comment="Complete schema definition: columns, indexes, constraints"
    )

    # Fields breakdown (for quick access)
    columns = Column(
        JSONB,
        default=list,
        nullable=False,
        comment="List of column definitions"
    )
    indexes = Column(
        JSONB,
        default=list,
        nullable=True,
        comment="List of index definitions"
    )
    foreign_keys = Column(
        JSONB,
        default=list,
        nullable=True,
        comment="List of foreign key definitions"
    )
    constraints = Column(
        JSONB,
        default=list,
        nullable=True,
        comment="List of other constraints"
    )

    # Integrity
    checksum = Column(
        String(64),
        nullable=False,
        comment="SHA-256 checksum of schema snapshot"
    )

    # Version tracking
    version = Column(
        String(50),
        nullable=False,
        comment="Module version when state was captured"
    )
    last_migration = Column(
        String(200),
        nullable=True,
        comment="Last migration that modified this model"
    )

    def __repr__(self) -> str:
        return f"<ModuleModelState(module={self.module_name}, model={self.model_name}, table={self.table_name})>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "module_name": self.module_name,
            "model_name": self.model_name,
            "table_name": self.table_name,
            "columns": self.columns or [],
            "indexes": self.indexes or [],
            "foreign_keys": self.foreign_keys or [],
            "constraints": self.constraints or [],
            "checksum": self.checksum,
            "version": self.version,
            "last_migration": self.last_migration,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def from_model(
        cls,
        module_name: str,
        model_class: type,
        version: str,
        last_migration: Optional[str] = None,
    ) -> "ModuleModelState":
        """
        Create a model state snapshot from a SQLAlchemy model class.

        Args:
            module_name: Technical module name
            model_class: SQLAlchemy model class
            version: Module version
            last_migration: Name of last applied migration

        Returns:
            ModuleModelState instance (not saved to DB)
        """
        from sqlalchemy import inspect as sa_inspect

        mapper = sa_inspect(model_class)
        table = mapper.local_table

        # Extract columns
        columns = []
        for col in table.columns:
            col_def = {
                "name": col.name,
                "type": str(col.type),
                "nullable": col.nullable,
                "primary_key": col.primary_key,
                "default": str(col.default.arg) if col.default and hasattr(col.default, 'arg') else None,
                "server_default": str(col.server_default.arg) if col.server_default and hasattr(col.server_default, 'arg') else None,
                "unique": col.unique,
                "index": col.index,
                "comment": col.comment,
            }
            columns.append(col_def)

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
                "target_table": fk.column.table.name,
                "target_column": fk.column.name,
            }
            foreign_keys.append(fk_def)

        # Extract other constraints
        constraints = []
        for const in table.constraints:
            if hasattr(const, 'name') and const.name:
                const_def = {
                    "name": const.name,
                    "type": type(const).__name__,
                }
                constraints.append(const_def)

        # Build complete schema snapshot
        schema_snapshot = {
            "columns": columns,
            "indexes": indexes,
            "foreign_keys": foreign_keys,
            "constraints": constraints,
        }

        # Generate checksum
        snapshot_json = json.dumps(schema_snapshot, sort_keys=True)
        checksum = hashlib.sha256(snapshot_json.encode()).hexdigest()

        return cls(
            module_name=module_name,
            model_name=model_class.__name__,
            table_name=table.name,
            schema_snapshot=schema_snapshot,
            columns=columns,
            indexes=indexes,
            foreign_keys=foreign_keys,
            constraints=constraints,
            checksum=checksum,
            version=version,
            last_migration=last_migration,
        )

    def has_changed(self, new_checksum: str) -> bool:
        """Check if schema has changed based on checksum."""
        return self.checksum != new_checksum

    @staticmethod
    def compute_checksum(schema: Dict[str, Any]) -> str:
        """Compute checksum for a schema definition."""
        schema_json = json.dumps(schema, sort_keys=True)
        return hashlib.sha256(schema_json.encode()).hexdigest()
