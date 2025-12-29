"""
Module Export/Import Models

Provides module packaging functionality with:
- ZIP export with code and data
- Data export to JSON
- Import validation and history
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, String, Text,
    ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import Session, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class ExportType(str, Enum):
    """Export types."""
    ZIP = "zip"
    DATA_JSON = "data_json"
    DATA_CSV = "data_csv"


class ImportStatus(str, Enum):
    """Import status."""
    PENDING = "pending"
    VALIDATING = "validating"
    VALIDATED = "validated"
    IMPORTING = "importing"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class ConflictResolution(str, Enum):
    """Data import conflict resolution strategies."""
    SKIP = "skip"
    UPDATE = "update"
    ERROR = "error"
    REPLACE = "replace"


class ModuleExport(Base, TimestampMixin):
    """
    Module export history.

    Tracks all module exports with metadata for auditing.

    Example:
        ModuleExport(
            module_name="sales",
            export_type="zip",
            includes_data=True,
            includes_code=True,
            file_path="/exports/sales_v1.0.0.zip"
        )
    """

    __tablename__ = "module_exports"
    __table_args__ = (
        Index("ix_module_exports_module", "module_name"),
        Index("ix_module_exports_created", "created_at"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Module identification
    module_name = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Module technical name"
    )
    module_version = Column(
        String(50),
        nullable=True,
        comment="Module version at export time"
    )

    # Export type
    export_type = Column(
        String(20),
        nullable=False,
        comment="Export type: zip, data_json, data_csv"
    )

    # Content flags
    includes_data = Column(
        Boolean,
        default=False,
        comment="Whether export includes data"
    )
    includes_code = Column(
        Boolean,
        default=True,
        comment="Whether export includes code"
    )
    includes_static = Column(
        Boolean,
        default=True,
        comment="Whether export includes static files"
    )

    # Data export details
    exported_models = Column(
        JSONB,
        default=list,
        comment="List of models included in data export"
    )
    record_counts = Column(
        JSONB,
        default=dict,
        comment="Record count per model"
    )

    # File info
    file_path = Column(
        String(500),
        nullable=True,
        comment="Path to exported file"
    )
    file_size = Column(
        Integer,
        nullable=True,
        comment="File size in bytes"
    )
    file_hash = Column(
        String(64),
        nullable=True,
        comment="SHA-256 hash of file"
    )

    # Metadata
    fastvue_version = Column(
        String(50),
        nullable=True,
        comment="FastVue version at export time"
    )
    exported_by = Column(
        Integer,
        nullable=True,
        comment="User ID who created the export"
    )
    notes = Column(
        Text,
        nullable=True,
        comment="Export notes"
    )

    def __repr__(self) -> str:
        return f"<ModuleExport({self.id}: {self.module_name} - {self.export_type})>"

    @classmethod
    def get_latest(cls, db: Session, module_name: str) -> Optional["ModuleExport"]:
        """Get latest export for a module."""
        return db.query(cls).filter(
            cls.module_name == module_name
        ).order_by(cls.created_at.desc()).first()


class ModuleImport(Base, TimestampMixin):
    """
    Module import history.

    Tracks all module imports with validation and status.

    Example:
        ModuleImport(
            module_name="sales",
            source_file="/imports/sales_v1.0.0.zip",
            status="completed"
        )
    """

    __tablename__ = "module_imports"
    __table_args__ = (
        Index("ix_module_imports_module", "module_name"),
        Index("ix_module_imports_status", "status"),
        Index("ix_module_imports_created", "created_at"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Source file
    source_file = Column(
        String(500),
        nullable=False,
        comment="Path to import file"
    )
    source_hash = Column(
        String(64),
        nullable=True,
        comment="SHA-256 hash of import file"
    )
    source_size = Column(
        Integer,
        nullable=True,
        comment="File size in bytes"
    )

    # Module info (from manifest)
    module_name = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Module technical name"
    )
    module_version = Column(
        String(50),
        nullable=True,
        comment="Module version from manifest"
    )

    # Import configuration
    import_type = Column(
        String(20),
        nullable=False,
        comment="Import type: zip, data_json"
    )
    conflict_resolution = Column(
        String(20),
        default=ConflictResolution.SKIP.value,
        comment="Conflict resolution: skip, update, error, replace"
    )
    install_after_import = Column(
        Boolean,
        default=False,
        comment="Whether to install module after import"
    )

    # Status
    status = Column(
        String(20),
        default=ImportStatus.PENDING.value,
        index=True,
        comment="Import status"
    )

    # Validation results
    validation_errors = Column(
        JSONB,
        default=list,
        comment="List of validation errors"
    )
    validation_warnings = Column(
        JSONB,
        default=list,
        comment="List of validation warnings"
    )
    dependency_check = Column(
        JSONB,
        default=dict,
        comment="Dependency check results"
    )
    version_check = Column(
        JSONB,
        default=dict,
        comment="Version compatibility check"
    )

    # Import results
    imported_records = Column(
        JSONB,
        default=dict,
        comment="Count of imported records per model"
    )
    skipped_records = Column(
        JSONB,
        default=dict,
        comment="Count of skipped records per model"
    )
    updated_records = Column(
        JSONB,
        default=dict,
        comment="Count of updated records per model"
    )

    # Timing
    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When import started"
    )
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When import completed"
    )
    duration_ms = Column(
        Integer,
        nullable=True,
        comment="Duration in milliseconds"
    )

    # Error info
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if failed"
    )
    error_traceback = Column(
        Text,
        nullable=True,
        comment="Full traceback for debugging"
    )

    # Rollback support
    rollback_data = Column(
        JSONB,
        default=dict,
        comment="Data needed for rollback"
    )

    # Metadata
    imported_by = Column(
        Integer,
        nullable=True,
        comment="User ID who performed the import"
    )
    notes = Column(
        Text,
        nullable=True,
        comment="Import notes"
    )

    def __repr__(self) -> str:
        return f"<ModuleImport({self.id}: {self.module_name} - {self.status})>"

    def start(self) -> None:
        """Mark import as started."""
        self.status = ImportStatus.IMPORTING.value
        self.started_at = datetime.utcnow()

    def complete(self) -> None:
        """Mark import as completed."""
        self.status = ImportStatus.COMPLETED.value
        self.completed_at = datetime.utcnow()
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_ms = int(delta.total_seconds() * 1000)

    def fail(self, error: str, traceback: Optional[str] = None) -> None:
        """Mark import as failed."""
        self.status = ImportStatus.FAILED.value
        self.error_message = error
        self.error_traceback = traceback
        self.completed_at = datetime.utcnow()
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_ms = int(delta.total_seconds() * 1000)

    @property
    def is_valid(self) -> bool:
        """Check if import passed validation."""
        return (
            self.status == ImportStatus.VALIDATED.value and
            not self.validation_errors
        )


class DataExportTemplate(Base, TimestampMixin):
    """
    Data export template for custom exports.

    Configures reusable data export configurations.
    """

    __tablename__ = "data_export_templates"
    __table_args__ = (
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Identification
    name = Column(
        String(200),
        nullable=False,
        comment="Template name"
    )
    code = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique code"
    )
    description = Column(
        Text,
        nullable=True,
        comment="Template description"
    )

    # Module scope
    module_name = Column(
        String(100),
        nullable=True,
        comment="Module this template belongs to"
    )

    # Export configuration
    models = Column(
        JSONB,
        default=list,
        comment="List of models to export"
    )
    include_dependencies = Column(
        Boolean,
        default=True,
        comment="Include dependent records"
    )
    filters = Column(
        JSONB,
        default=dict,
        comment="Filters per model: {model: domain}"
    )
    field_mapping = Column(
        JSONB,
        default=dict,
        comment="Field mapping per model"
    )
    exclude_fields = Column(
        JSONB,
        default=dict,
        comment="Fields to exclude per model"
    )

    # Output configuration
    output_format = Column(
        String(20),
        default="json",
        comment="Output format: json, csv, xlsx"
    )
    single_file = Column(
        Boolean,
        default=True,
        comment="Export all models in single file"
    )

    # Status
    is_active = Column(
        Boolean,
        default=True,
        comment="Whether this template is active"
    )

    def __repr__(self) -> str:
        return f"<DataExportTemplate({self.code}: {self.name})>"

    @classmethod
    def get_by_code(cls, db: Session, code: str) -> Optional["DataExportTemplate"]:
        """Get template by code."""
        return db.query(cls).filter(
            cls.code == code,
            cls.is_active == True
        ).first()
