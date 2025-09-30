from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum

# Re-export enums from models
from app.models.system_configuration import ConfigurationCategory


# Configuration schemas

class ConfigurationCreate(BaseModel):
    """Create configuration request"""
    key: str = Field(..., min_length=1, max_length=255)
    category: ConfigurationCategory
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    config_data: Dict[str, Any] = {}
    is_active: bool = True
    requires_restart: bool = False
    default_value: Dict[str, Any] = {}
    validation_schema: Dict[str, Any] = {}
    version: str = "1.0.0"
    tags: List[str] = []
    environment: str = "production"

    @validator('key')
    def validate_key(cls, v):
        """Validate configuration key format"""
        if not v.replace('_', '').replace('-', '').replace('.', '').isalnum():
            raise ValueError('Key must contain only alphanumeric characters, underscores, hyphens, and dots')
        return v.lower()

    @validator('environment')
    def validate_environment(cls, v):
        """Validate environment values"""
        valid_envs = ['production', 'staging', 'development', 'testing']
        if v.lower() not in valid_envs:
            raise ValueError(f'Environment must be one of: {valid_envs}')
        return v.lower()


class ConfigurationUpdate(BaseModel):
    """Update configuration request"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    config_data: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    requires_restart: Optional[bool] = None
    default_value: Optional[Dict[str, Any]] = None
    validation_schema: Optional[Dict[str, Any]] = None
    version: Optional[str] = None
    tags: Optional[List[str]] = None
    environment: Optional[str] = None
    change_reason: Optional[str] = None

    @validator('environment')
    def validate_environment(cls, v):
        """Validate environment values"""
        if v is not None:
            valid_envs = ['production', 'staging', 'development', 'testing']
            if v.lower() not in valid_envs:
                raise ValueError(f'Environment must be one of: {valid_envs}')
            return v.lower()
        return v


class ConfigurationResponse(BaseModel):
    """Configuration response"""
    id: int
    key: str
    category: ConfigurationCategory
    name: str
    description: Optional[str] = None
    config_data: Dict[str, Any]
    is_active: bool
    is_system_config: bool
    requires_restart: bool
    default_value: Dict[str, Any]
    validation_schema: Dict[str, Any]
    version: str
    previous_version: Dict[str, Any]
    tags: List[str]
    environment: str
    last_applied_at: Optional[datetime] = None
    last_validated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True


class ConfigurationListResponse(BaseModel):
    """Configuration list response"""
    configurations: List[ConfigurationResponse]
    total: int
    page: int
    size: int
    has_next: bool
    has_prev: bool


# Data Import/Export specific configuration schemas

class DataImportExportConfigData(BaseModel):
    """Data Import/Export configuration data schema"""
    # Import settings
    max_file_size_mb: int = Field(default=100, ge=1, le=1000)
    allowed_formats: List[str] = ["csv", "json", "xlsx"]
    batch_size: int = Field(default=1000, ge=100, le=10000)
    timeout_seconds: int = Field(default=300, ge=60, le=3600)
    enable_validation: bool = True
    enable_audit_log: bool = True
    require_approval: bool = False
    notify_on_completion: bool = True
    
    # Export settings
    compression_level: str = Field(default="medium", pattern="^(none|low|medium|high)$")
    retention_days: int = Field(default=30, ge=1, le=365)
    
    # Security settings
    encryption_enabled: bool = False
    encryption_algorithm: str = "AES-256"
    
    # Performance settings
    parallel_processing: bool = True
    max_concurrent_jobs: int = Field(default=5, ge=1, le=20)
    memory_limit_mb: int = Field(default=512, ge=256, le=4096)

    @validator('allowed_formats')
    def validate_formats(cls, v):
        """Validate allowed file formats"""
        valid_formats = ['csv', 'json', 'xlsx', 'xml', 'tsv', 'parquet']
        for format_type in v:
            if format_type.lower() not in valid_formats:
                raise ValueError(f'Format {format_type} not supported. Valid formats: {valid_formats}')
        return [f.lower() for f in v]


class DataImportExportConfigCreate(ConfigurationCreate):
    """Create data import/export configuration"""
    category: ConfigurationCategory = ConfigurationCategory.DATA_IMPORT_EXPORT
    config_data: DataImportExportConfigData

    class Config:
        json_schema_extra = {
            "example": {
                "key": "data_import_export.default",
                "name": "Default Data Import/Export Configuration",
                "description": "Default settings for data import and export operations",
                "config_data": {
                    "max_file_size_mb": 100,
                    "allowed_formats": ["csv", "json", "xlsx"],
                    "batch_size": 1000,
                    "timeout_seconds": 300,
                    "enable_validation": True,
                    "enable_audit_log": True,
                    "require_approval": False,
                    "notify_on_completion": True,
                    "compression_level": "medium",
                    "retention_days": 30,
                    "encryption_enabled": False,
                    "parallel_processing": True,
                    "max_concurrent_jobs": 5,
                    "memory_limit_mb": 512
                }
            }
        }


class DataImportExportConfigUpdate(ConfigurationUpdate):
    """Update data import/export configuration"""
    config_data: Optional[DataImportExportConfigData] = None


# Template schemas

class ConfigurationTemplateCreate(BaseModel):
    """Create configuration template"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: ConfigurationCategory
    template_data: Dict[str, Any] = {}
    variables: List[str] = []
    is_active: bool = True
    is_public: bool = False
    supported_environments: List[str] = ["production", "staging", "development"]

    @validator('supported_environments')
    def validate_environments(cls, v):
        """Validate supported environments"""
        valid_envs = ['production', 'staging', 'development', 'testing']
        for env in v:
            if env.lower() not in valid_envs:
                raise ValueError(f'Environment {env} not valid. Valid environments: {valid_envs}')
        return [e.lower() for e in v]


class ConfigurationTemplateResponse(BaseModel):
    """Configuration template response"""
    id: int
    name: str
    description: Optional[str] = None
    category: ConfigurationCategory
    template_data: Dict[str, Any]
    variables: List[str]
    is_active: bool
    is_system_template: bool
    is_public: bool
    usage_count: int
    last_used_at: Optional[datetime] = None
    supported_environments: List[str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


# Validation schemas

class ConfigurationValidationRequest(BaseModel):
    """Configuration validation request"""
    config_data: Dict[str, Any]
    validation_schema: Optional[Dict[str, Any]] = None


class ConfigurationValidationResponse(BaseModel):
    """Configuration validation response"""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    validated_data: Optional[Dict[str, Any]] = None


# Bulk operation schemas

class BulkConfigurationUpdate(BaseModel):
    """Bulk configuration update"""
    configurations: List[Dict[str, Any]]
    change_reason: Optional[str] = None


class BulkConfigurationResponse(BaseModel):
    """Bulk configuration response"""
    success_count: int
    error_count: int
    updated_keys: List[str]
    errors: List[str] = []


# Audit schemas

class ConfigurationAuditResponse(BaseModel):
    """Configuration audit log response"""
    id: int
    configuration_key: str
    action: str
    old_value: Dict[str, Any]
    new_value: Dict[str, Any]
    change_reason: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    environment: Optional[str] = None
    validation_passed: Optional[bool] = None
    validation_errors: List[str]
    timestamp: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


# Export/Import schemas for configurations

class ConfigurationExportRequest(BaseModel):
    """Configuration export request"""
    keys: Optional[List[str]] = None
    categories: Optional[List[ConfigurationCategory]] = None
    environment: Optional[str] = None
    include_system_configs: bool = False


class ConfigurationImportRequest(BaseModel):
    """Configuration import request"""
    configurations: List[Dict[str, Any]]
    merge_strategy: str = Field(default="replace", pattern="^(replace|merge|skip)$")
    validate_only: bool = False
    target_environment: Optional[str] = None


class ConfigurationImportResponse(BaseModel):
    """Configuration import response"""
    imported_count: int
    skipped_count: int
    error_count: int
    imported_keys: List[str]
    skipped_keys: List[str]
    errors: List[str] = []