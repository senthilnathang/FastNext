from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, DateTime, Enum, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from typing import Optional

from .base import FullAuditModel, BaseModel


class ImportStatus(str, enum.Enum):
    """Import job status"""
    PENDING = "pending"
    PARSING = "parsing"
    VALIDATING = "validating"
    IMPORTING = "importing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExportStatus(str, enum.Enum):
    """Export job status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DataFormat(str, enum.Enum):
    """Supported data formats"""
    CSV = "csv"
    JSON = "json"
    EXCEL = "excel"
    XML = "xml"
    YAML = "yaml"


class ImportJob(FullAuditModel):
    """Import job tracking table"""
    __tablename__ = "import_jobs"

    # Basic job info
    job_id = Column(String(36), unique=True, nullable=False, index=True)
    table_name = Column(String(100), nullable=False, index=True)
    status = Column(Enum(ImportStatus), default=ImportStatus.PENDING, nullable=False)
    
    # File information
    original_filename = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    file_format = Column(Enum(DataFormat), nullable=False)
    file_path = Column(String(1000), nullable=True)  # Path to stored file
    
    # Import configuration
    import_options = Column(JSON, default={}, nullable=False)  # Import settings
    field_mappings = Column(JSON, default={}, nullable=False)  # Field mapping configuration
    
    # Progress tracking
    progress_percent = Column(Float, default=0.0, nullable=False)
    total_rows = Column(Integer, nullable=True)
    processed_rows = Column(Integer, default=0, nullable=False)
    valid_rows = Column(Integer, default=0, nullable=False)
    error_rows = Column(Integer, default=0, nullable=False)
    skipped_rows = Column(Integer, default=0, nullable=False)
    
    # Results
    validation_results = Column(JSON, default={}, nullable=False)
    import_results = Column(JSON, default={}, nullable=False)
    error_details = Column(JSON, default=[], nullable=False)
    warnings = Column(JSON, default=[], nullable=False)
    
    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    processing_time_seconds = Column(Float, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    
    # Approval workflow
    requires_approval = Column(Boolean, default=False, nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approval_notes = Column(Text, nullable=True)
    
    # Relationships
    approver = relationship("User", foreign_keys=[approved_by], viewonly=True)


class ExportJob(FullAuditModel):
    """Export job tracking table"""
    __tablename__ = "export_jobs"

    # Basic job info
    job_id = Column(String(36), unique=True, nullable=False, index=True)
    table_name = Column(String(100), nullable=False, index=True)
    status = Column(Enum(ExportStatus), default=ExportStatus.PENDING, nullable=False)
    
    # Export configuration
    export_format = Column(Enum(DataFormat), nullable=False)
    export_options = Column(JSON, default={}, nullable=False)  # Export settings
    selected_columns = Column(JSON, default=[], nullable=False)  # Column selection
    filters = Column(JSON, default=[], nullable=False)  # Applied filters
    
    # File information
    filename = Column(String(500), nullable=True)
    file_path = Column(String(1000), nullable=True)  # Path to generated file
    file_size = Column(Integer, nullable=True)
    download_url = Column(String(1000), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # File expiry
    
    # Progress tracking
    progress_percent = Column(Float, default=0.0, nullable=False)
    estimated_rows = Column(Integer, nullable=True)
    processed_rows = Column(Integer, default=0, nullable=False)
    estimated_file_size = Column(Integer, nullable=True)
    
    # Results
    export_results = Column(JSON, default={}, nullable=False)
    
    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    processing_time_seconds = Column(Float, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)


class ImportTemplate(FullAuditModel):
    """Reusable import templates"""
    __tablename__ = "import_templates"
    
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    table_name = Column(String(100), nullable=False, index=True)
    
    # Template configuration
    field_mappings = Column(JSON, default={}, nullable=False)
    import_options = Column(JSON, default={}, nullable=False)
    validation_rules = Column(JSON, default={}, nullable=False)
    
    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Template sharing
    is_public = Column(Boolean, default=False, nullable=False)
    is_system_template = Column(Boolean, default=False, nullable=False)


class ExportTemplate(FullAuditModel):
    """Reusable export templates"""
    __tablename__ = "export_templates"
    
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    table_name = Column(String(100), nullable=False, index=True)
    
    # Template configuration
    selected_columns = Column(JSON, default=[], nullable=False)
    filters = Column(JSON, default=[], nullable=False)
    export_options = Column(JSON, default={}, nullable=False)
    export_format = Column(Enum(DataFormat), nullable=False)
    
    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Template sharing
    is_public = Column(Boolean, default=False, nullable=False)
    is_system_template = Column(Boolean, default=False, nullable=False)


class ImportPermission(BaseModel):
    """User permissions for import operations"""
    __tablename__ = "import_permissions"
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    table_name = Column(String(100), nullable=False, index=True)
    
    # Permission flags
    can_import = Column(Boolean, default=True, nullable=False)
    can_validate = Column(Boolean, default=True, nullable=False)
    can_preview = Column(Boolean, default=True, nullable=False)
    
    # Limits
    max_file_size_mb = Column(Integer, default=10, nullable=False)
    max_rows_per_import = Column(Integer, default=10000, nullable=False)
    allowed_formats = Column(JSON, default=["csv", "json", "excel"], nullable=False)
    
    # Approval workflow
    requires_approval = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    user = relationship("User", viewonly=True)


class ExportPermission(BaseModel):
    """User permissions for export operations"""
    __tablename__ = "export_permissions"
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    table_name = Column(String(100), nullable=False, index=True)
    
    # Permission flags
    can_export = Column(Boolean, default=True, nullable=False)
    can_preview = Column(Boolean, default=True, nullable=False)
    
    # Limits
    max_rows_per_export = Column(Integer, default=100000, nullable=False)
    allowed_formats = Column(JSON, default=["csv", "json", "excel"], nullable=False)
    allowed_columns = Column(JSON, default=[], nullable=False)  # Empty means all columns allowed
    
    # Relationships
    user = relationship("User", viewonly=True)


class ImportAuditLog(BaseModel):
    """Audit log for import operations"""
    __tablename__ = "import_audit_logs"
    
    import_job_id = Column(Integer, ForeignKey("import_jobs.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Event information
    event_type = Column(String(50), nullable=False, index=True)  # created, started, completed, failed, etc.
    event_data = Column(JSON, default={}, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Timing
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    import_job = relationship("ImportJob", viewonly=True)
    user = relationship("User", viewonly=True)


class ExportAuditLog(BaseModel):
    """Audit log for export operations"""
    __tablename__ = "export_audit_logs"
    
    export_job_id = Column(Integer, ForeignKey("export_jobs.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Event information
    event_type = Column(String(50), nullable=False, index=True)  # created, started, completed, downloaded, etc.
    event_data = Column(JSON, default={}, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Timing
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    export_job = relationship("ExportJob", viewonly=True)
    user = relationship("User", viewonly=True)