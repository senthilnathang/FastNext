import enum
from typing import Optional

from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, Integer, String, Text
from sqlalchemy.sql import func

from .base import AuditableModel


class ConfigurationCategory(str, enum.Enum):
    """Configuration categories"""

    DATA_IMPORT_EXPORT = "data_import_export"
    PERMISSIONS = "permissions"
    SECURITY = "security"
    NOTIFICATIONS = "notifications"
    API = "api"
    THEME = "theme"
    EMAIL = "email"
    APPLICATION = "application"
    AUDIT = "audit"


class SystemConfiguration(AuditableModel):
    """System configuration storage"""

    __tablename__ = "system_configurations"

    # Configuration identification
    key = Column(String(255), unique=True, nullable=False, index=True)
    category = Column(Enum(ConfigurationCategory), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Configuration data
    config_data = Column(JSON, default={}, nullable=False)

    # Configuration properties
    is_active = Column(Boolean, default=True, nullable=False)
    is_system_config = Column(
        Boolean, default=False, nullable=False
    )  # System vs user configurable
    requires_restart = Column(
        Boolean, default=False, nullable=False
    )  # If changes require app restart

    # Validation and defaults
    default_value = Column(JSON, default={}, nullable=False)
    validation_schema = Column(
        JSON, default={}, nullable=False
    )  # JSON schema for validation

    # Version control
    version = Column(String(20), default="1.0.0", nullable=False)
    previous_version = Column(
        JSON, default={}, nullable=False
    )  # Store previous config for rollback

    # Metadata
    tags = Column(JSON, default=[], nullable=False)
    environment = Column(
        String(50), default="production", nullable=False
    )  # production, staging, development

    # Timestamps for configuration changes
    last_applied_at = Column(DateTime(timezone=True), nullable=True)
    last_validated_at = Column(DateTime(timezone=True), nullable=True)


class ConfigurationTemplate(AuditableModel):
    """Configuration templates for different environments or use cases"""

    __tablename__ = "configuration_templates"

    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(Enum(ConfigurationCategory), nullable=False, index=True)

    # Template data
    template_data = Column(JSON, default={}, nullable=False)
    variables = Column(
        JSON, default=[], nullable=False
    )  # Template variables to be replaced

    # Template properties
    is_active = Column(Boolean, default=True, nullable=False)
    is_system_template = Column(Boolean, default=False, nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)

    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    # Environment support
    supported_environments = Column(
        JSON, default=["production", "staging", "development"], nullable=False
    )


class ConfigurationAuditLog(AuditableModel):
    """Audit log for configuration changes"""

    __tablename__ = "configuration_audit_logs"

    configuration_key = Column(String(255), nullable=False, index=True)
    action = Column(
        String(50), nullable=False, index=True
    )  # created, updated, deleted, applied, validated

    # Change details
    old_value = Column(JSON, default={}, nullable=False)
    new_value = Column(JSON, default={}, nullable=False)
    change_reason = Column(Text, nullable=True)

    # Context
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    environment = Column(String(50), nullable=True)

    # Validation results
    validation_passed = Column(Boolean, nullable=True)
    validation_errors = Column(JSON, default=[], nullable=False)

    # Timing
    timestamp = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
