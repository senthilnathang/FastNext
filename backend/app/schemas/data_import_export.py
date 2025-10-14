from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

# Re-export enums from models
from app.models.data_import_export import DataFormat, ExportStatus, ImportStatus
from pydantic import BaseModel, Field, validator

# Request/Response schemas for Import


class ImportOptionsSchema(BaseModel):
    """Import options configuration"""

    format: DataFormat
    has_headers: bool = True
    delimiter: Optional[str] = ","
    encoding: Optional[str] = "utf-8"
    date_format: Optional[str] = "iso"
    skip_empty_rows: bool = True
    skip_first_rows: int = 0
    max_rows: Optional[int] = None
    on_duplicate: str = "skip"  # skip, update, error
    validate_only: bool = False
    batch_size: int = 1000

    class Config:
        extra = "allow"  # Allow additional fields for flexibility


class FieldMappingSchema(BaseModel):
    """Field mapping configuration"""

    source_column: str
    target_column: str
    transform: Optional[str] = None
    skip_empty: bool = False


class ValidationErrorSchema(BaseModel):
    """Validation error details"""

    row: int
    column: Optional[str] = None
    field: Optional[str] = None
    message: str
    severity: str = "error"  # error, warning
    value: Optional[Any] = None


class ValidationResultSchema(BaseModel):
    """Import validation results"""

    is_valid: bool
    total_rows: int
    valid_rows: int
    error_rows: int
    warnings: List[ValidationErrorSchema] = []
    errors: List[ValidationErrorSchema] = []


class ImportJobCreate(BaseModel):
    """Create import job request"""

    table_name: str
    original_filename: str
    file_format: DataFormat
    import_options: ImportOptionsSchema
    field_mappings: List[FieldMappingSchema] = []
    requires_approval: bool = False


class ImportJobResponse(BaseModel):
    """Import job response"""

    id: int
    job_id: str
    table_name: str
    status: ImportStatus
    original_filename: str
    file_format: DataFormat
    progress_percent: float
    total_rows: Optional[int] = None
    processed_rows: int
    valid_rows: int
    error_rows: int
    skipped_rows: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    requires_approval: bool
    approved_at: Optional[datetime] = None
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class ImportJobUpdate(BaseModel):
    """Update import job"""

    status: Optional[ImportStatus] = None
    progress_percent: Optional[float] = None
    processed_rows: Optional[int] = None
    valid_rows: Optional[int] = None
    error_rows: Optional[int] = None
    error_message: Optional[str] = None
    validation_results: Optional[Dict[str, Any]] = None


class ImportPreviewRequest(BaseModel):
    """Import preview request"""

    file_format: DataFormat
    import_options: ImportOptionsSchema


class ImportPreviewResponse(BaseModel):
    """Import preview response"""

    headers: List[str]
    sample_data: List[Dict[str, Any]]
    total_rows: int
    detected_format: Optional[DataFormat] = None
    suggested_mappings: List[FieldMappingSchema] = []


# Request/Response schemas for Export


class ExportFilterSchema(BaseModel):
    """Export filter configuration"""

    column: str
    operator: str  # equals, contains, greater_than, etc.
    value: Any
    label: Optional[str] = None


class ExportOptionsSchema(BaseModel):
    """Export options configuration"""

    format: DataFormat
    include_headers: bool = True
    filename: Optional[str] = None
    date_format: Optional[str] = "iso"
    delimiter: Optional[str] = ","
    encoding: Optional[str] = "utf-8"
    pretty_print: bool = False
    sheet_name: Optional[str] = "Data"
    auto_fit_columns: bool = True
    freeze_headers: bool = True
    # Additional filtering and limiting options
    row_limit: Optional[int] = None
    search_term: Optional[str] = None

    class Config:
        extra = "allow"  # Allow additional fields for flexibility


class ExportJobCreate(BaseModel):
    """Create export job request"""

    table_name: str
    export_format: DataFormat
    selected_columns: List[str] = []
    filters: List[ExportFilterSchema] = []
    export_options: ExportOptionsSchema


class ExportJobResponse(BaseModel):
    """Export job response"""

    id: int
    job_id: str
    table_name: str
    status: ExportStatus
    export_format: DataFormat
    filename: Optional[str] = None
    file_size: Optional[int] = None
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    progress_percent: float
    estimated_rows: Optional[int] = None
    processed_rows: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class ExportJobUpdate(BaseModel):
    """Update export job"""

    status: Optional[ExportStatus] = None
    progress_percent: Optional[float] = None
    processed_rows: Optional[int] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    download_url: Optional[str] = None
    error_message: Optional[str] = None


class ExportPreviewRequest(BaseModel):
    """Export preview request"""

    table_name: str
    selected_columns: List[str] = []
    filters: List[ExportFilterSchema] = []
    export_options: ExportOptionsSchema


class ExportPreviewResponse(BaseModel):
    """Export preview response"""

    columns: List[Dict[str, str]]  # {key, label, type}
    sample_data: List[Dict[str, Any]]
    total_rows: int
    estimated_size: int


# Template schemas


class ImportTemplateCreate(BaseModel):
    """Create import template"""

    name: str
    description: Optional[str] = None
    table_name: str
    field_mappings: List[FieldMappingSchema] = []
    import_options: ImportOptionsSchema
    validation_rules: Dict[str, Any] = {}
    is_public: bool = False


class ImportTemplateResponse(BaseModel):
    """Import template response"""

    id: int
    name: str
    description: Optional[str] = None
    table_name: str
    field_mappings: List[FieldMappingSchema]
    import_options: ImportOptionsSchema
    validation_rules: Dict[str, Any]
    usage_count: int
    last_used_at: Optional[datetime] = None
    is_public: bool
    is_system_template: bool
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class ExportTemplateCreate(BaseModel):
    """Create export template"""

    name: str
    description: Optional[str] = None
    table_name: str
    selected_columns: List[str] = []
    filters: List[ExportFilterSchema] = []
    export_options: ExportOptionsSchema
    is_public: bool = False


class ExportTemplateResponse(BaseModel):
    """Export template response"""

    id: int
    name: str
    description: Optional[str] = None
    table_name: str
    selected_columns: List[str]
    filters: List[ExportFilterSchema]
    export_options: ExportOptionsSchema
    usage_count: int
    last_used_at: Optional[datetime] = None
    is_public: bool
    is_system_template: bool
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


# Permission schemas


class ImportPermissionCreate(BaseModel):
    """Create import permission"""

    user_id: int
    table_name: str
    can_import: bool = True
    can_validate: bool = True
    can_preview: bool = True
    max_file_size_mb: int = 10
    max_rows_per_import: int = 10000
    allowed_formats: List[DataFormat] = [
        DataFormat.CSV,
        DataFormat.JSON,
        DataFormat.EXCEL,
    ]
    requires_approval: bool = False
    approver_user_ids: List[int] = []
    max_imports_per_hour: int = 5
    max_imports_per_day: int = 20


class ImportPermissionResponse(BaseModel):
    """Import permission response"""

    id: int
    user_id: int
    table_name: str
    can_import: bool
    can_validate: bool
    can_preview: bool
    max_file_size_mb: int
    max_rows_per_import: int
    allowed_formats: List[DataFormat]
    requires_approval: bool
    approver_user_ids: List[int]
    max_imports_per_hour: int
    max_imports_per_day: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExportPermissionCreate(BaseModel):
    """Create export permission"""

    user_id: int
    table_name: str
    can_export: bool = True
    can_preview: bool = True
    max_rows_per_export: int = 100000
    allowed_formats: List[DataFormat] = [
        DataFormat.CSV,
        DataFormat.JSON,
        DataFormat.EXCEL,
    ]
    allowed_columns: List[str] = []  # Empty means all columns allowed
    max_exports_per_hour: int = 10
    max_exports_per_day: int = 50
    file_retention_hours: int = 24


class ExportPermissionResponse(BaseModel):
    """Export permission response"""

    id: int
    user_id: int
    table_name: str
    can_export: bool
    can_preview: bool
    max_rows_per_export: int
    allowed_formats: List[DataFormat]
    allowed_columns: List[str]
    max_exports_per_hour: int
    max_exports_per_day: int
    file_retention_hours: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Bulk operation schemas


class BulkImportRequest(BaseModel):
    """Bulk import request"""

    jobs: List[ImportJobCreate]


class BulkExportRequest(BaseModel):
    """Bulk export request"""

    jobs: List[ExportJobCreate]


class BulkOperationResponse(BaseModel):
    """Bulk operation response"""

    success_count: int
    error_count: int
    job_ids: List[str]
    errors: List[str] = []


# Statistics and monitoring schemas


class ImportStatistics(BaseModel):
    """Import statistics"""

    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    pending_jobs: int
    average_processing_time: float
    total_rows_imported: int
    success_rate: float


class ExportStatistics(BaseModel):
    """Export statistics"""

    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    pending_jobs: int
    average_processing_time: float
    total_rows_exported: int
    total_file_size: int
    success_rate: float


# Health check schemas


class ImportExportHealth(BaseModel):
    """Import/Export system health"""

    import_service_status: str
    export_service_status: str
    active_import_jobs: int
    active_export_jobs: int
    queue_size: int
    system_load: float
    available_storage_gb: float
