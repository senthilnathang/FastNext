import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.auth.deps import get_current_active_user as get_current_user
from app.auth.permissions import require_admin
from app.db.session import get_db
from app.models.system_configuration import (
    ConfigurationAuditLog,
    ConfigurationCategory,
    SystemConfiguration,
)
from app.models.user import User
from app.schemas.system_configuration import (
    BulkConfigurationResponse,
    BulkConfigurationUpdate,
    ConfigurationAuditResponse,
    ConfigurationCreate,
    ConfigurationExportRequest,
    ConfigurationImportRequest,
    ConfigurationImportResponse,
    ConfigurationListResponse,
    ConfigurationResponse,
    ConfigurationUpdate,
    ConfigurationValidationRequest,
    ConfigurationValidationResponse,
    DataImportExportConfigCreate,
    DataImportExportConfigUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session


def check_config_permission(user: User, permission_type: str = "read"):
    """Simple permission check for configuration access"""
    if user.is_superuser:
        return True
    # For now, allow any authenticated user to read/write configs
    # You can enhance this with proper role-based permissions later
    return True


router = APIRouter()


def log_configuration_change(
    db: Session,
    configuration_key: str,
    action: str,
    old_value: Dict[str, Any],
    new_value: Dict[str, Any],
    user_id: Optional[int] = None,
    request: Optional[Request] = None,
    change_reason: Optional[str] = None,
    validation_passed: Optional[bool] = None,
    validation_errors: List[str] = None,
):
    """Log configuration changes for audit purposes"""
    audit_log = ConfigurationAuditLog(
        configuration_key=configuration_key,
        action=action,
        old_value=old_value,
        new_value=new_value,
        change_reason=change_reason,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
        validation_passed=validation_passed,
        validation_errors=validation_errors or [],
        created_by=user_id,
    )
    db.add(audit_log)
    db.commit()


@router.get("/", response_model=ConfigurationListResponse)
async def get_configurations(
    category: Optional[ConfigurationCategory] = None,
    environment: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get configurations with filtering and pagination"""
    check_config_permission(current_user, "read")

    query = db.query(SystemConfiguration)

    # Apply filters
    if category:
        query = query.filter(SystemConfiguration.category == category)
    if environment:
        query = query.filter(SystemConfiguration.environment == environment)
    if is_active is not None:
        query = query.filter(SystemConfiguration.is_active == is_active)
    if search:
        query = query.filter(
            SystemConfiguration.name.ilike(f"%{search}%")
            | SystemConfiguration.key.ilike(f"%{search}%")
            | SystemConfiguration.description.ilike(f"%{search}%")
        )

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * size
    configurations = query.offset(offset).limit(size).all()

    return ConfigurationListResponse(
        configurations=configurations,
        total=total,
        page=page,
        size=size,
        has_next=offset + size < total,
        has_prev=page > 1,
    )


@router.get("/{key}", response_model=ConfigurationResponse)
async def get_configuration(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get configuration by key"""
    check_config_permission(current_user, "read")

    config = (
        db.query(SystemConfiguration).filter(SystemConfiguration.key == key).first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    return config


@router.post("/", response_model=ConfigurationResponse)
async def create_configuration(
    config_data: ConfigurationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create new configuration"""
    check_config_permission(current_user, "write")

    # Check if configuration already exists
    existing = (
        db.query(SystemConfiguration)
        .filter(SystemConfiguration.key == config_data.key)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Configuration with this key already exists"
        )

    # Create configuration
    config = SystemConfiguration(**config_data.dict(), created_by=current_user.id)

    db.add(config)
    db.commit()
    db.refresh(config)

    # Log the creation
    log_configuration_change(
        db=db,
        configuration_key=config.key,
        action="created",
        old_value={},
        new_value=config.config_data,
        user_id=current_user.id,
        request=request,
    )

    return config


@router.put("/{key}", response_model=ConfigurationResponse)
async def update_configuration(
    key: str,
    config_data: ConfigurationUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update configuration"""
    check_config_permission(current_user, "write")

    config = (
        db.query(SystemConfiguration).filter(SystemConfiguration.key == key).first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    # Store old values for audit
    old_value = config.config_data.copy()

    # Store previous version
    config.previous_version = {
        "version": config.version,
        "config_data": config.config_data,
        "updated_at": config.updated_at.isoformat() if config.updated_at else None,
    }

    # Update configuration
    update_data = config_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field != "change_reason":  # Don't set change_reason on the model
            setattr(config, field, value)

    config.updated_by = current_user.id

    db.commit()
    db.refresh(config)

    # Log the update
    log_configuration_change(
        db=db,
        configuration_key=config.key,
        action="updated",
        old_value=old_value,
        new_value=config.config_data,
        user_id=current_user.id,
        request=request,
        change_reason=config_data.change_reason,
    )

    return config


@router.delete("/{key}")
async def delete_configuration(
    key: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete configuration"""
    check_config_permission(current_user, "delete")

    config = (
        db.query(SystemConfiguration).filter(SystemConfiguration.key == key).first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    if config.is_system_config:
        raise HTTPException(
            status_code=400, detail="Cannot delete system configuration"
        )

    # Log the deletion
    log_configuration_change(
        db=db,
        configuration_key=config.key,
        action="deleted",
        old_value=config.config_data,
        new_value={},
        user_id=current_user.id,
        request=request,
    )

    db.delete(config)
    db.commit()

    return {"message": "Configuration deleted successfully"}


# Data Import/Export specific endpoints


@router.get("/data-import-export/current", response_model=ConfigurationResponse)
async def get_data_import_export_config(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get current data import/export configuration"""
    check_config_permission(current_user, "read")

    config = (
        db.query(SystemConfiguration)
        .filter(
            SystemConfiguration.category == ConfigurationCategory.DATA_IMPORT_EXPORT,
            SystemConfiguration.is_active == True,
        )
        .first()
    )

    if not config:
        # Create default configuration if none exists
        default_config = DataImportExportConfigCreate(
            key="data_import_export.default",
            name="Default Data Import/Export Configuration",
            description="Default settings for data import and export operations",
            config_data={
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
                "memory_limit_mb": 512,
            },
        )

        config = SystemConfiguration(
            **default_config.dict(), is_system_config=True, created_by=current_user.id
        )

        db.add(config)
        db.commit()
        db.refresh(config)

    return config


@router.put("/data-import-export/current", response_model=ConfigurationResponse)
async def update_data_import_export_config(
    config_data: DataImportExportConfigUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update data import/export configuration"""
    check_config_permission(current_user, "read")

    config = (
        db.query(SystemConfiguration)
        .filter(
            SystemConfiguration.category == ConfigurationCategory.DATA_IMPORT_EXPORT,
            SystemConfiguration.is_active == True,
        )
        .first()
    )

    if not config:
        raise HTTPException(
            status_code=404, detail="Data import/export configuration not found"
        )

    # Store old values for audit
    old_value = config.config_data.copy()

    # Update configuration
    if config_data.config_data:
        config.config_data = config_data.config_data.dict()

    if config_data.name:
        config.name = config_data.name
    if config_data.description is not None:
        config.description = config_data.description

    config.updated_by = current_user.id
    config.last_applied_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(config)

    # Log the update
    log_configuration_change(
        db=db,
        configuration_key=config.key,
        action="updated",
        old_value=old_value,
        new_value=config.config_data,
        user_id=current_user.id,
        request=request,
        change_reason=config_data.change_reason,
    )

    return config


@router.post("/validate", response_model=ConfigurationValidationResponse)
async def validate_configuration(
    validation_request: ConfigurationValidationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate configuration data"""
    check_config_permission(current_user, "read")

    errors = []
    warnings = []

    try:
        # Basic validation (you can extend this with JSON schema validation)
        config_data = validation_request.config_data

        # Validate data import/export specific fields if present
        if "max_file_size_mb" in config_data:
            if (
                not isinstance(config_data["max_file_size_mb"], int)
                or config_data["max_file_size_mb"] < 1
            ):
                errors.append("max_file_size_mb must be a positive integer")

        if "allowed_formats" in config_data:
            valid_formats = ["csv", "json", "xlsx", "xml", "tsv", "parquet"]
            for fmt in config_data["allowed_formats"]:
                if fmt.lower() not in valid_formats:
                    errors.append(f"Format '{fmt}' is not supported")

        if "batch_size" in config_data:
            if (
                not isinstance(config_data["batch_size"], int)
                or config_data["batch_size"] < 100
            ):
                errors.append("batch_size must be at least 100")

        # Add more validation rules as needed

        is_valid = len(errors) == 0

        return ConfigurationValidationResponse(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            validated_data=config_data if is_valid else None,
        )

    except Exception as e:
        return ConfigurationValidationResponse(
            is_valid=False, errors=[f"Validation error: {str(e)}"], warnings=warnings
        )


@router.get("/{key}/audit", response_model=List[ConfigurationAuditResponse])
async def get_configuration_audit_log(
    key: str,
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get audit log for a configuration"""
    check_config_permission(current_user, "read")

    audit_logs = (
        db.query(ConfigurationAuditLog)
        .filter(ConfigurationAuditLog.configuration_key == key)
        .order_by(ConfigurationAuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )

    return audit_logs


@router.post("/reset/{key}")
async def reset_configuration(
    key: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reset configuration to default values"""
    check_config_permission(current_user, "write")

    config = (
        db.query(SystemConfiguration).filter(SystemConfiguration.key == key).first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    # Store old values for audit
    old_value = config.config_data.copy()

    # Reset to default
    config.config_data = config.default_value.copy()
    config.updated_by = current_user.id

    db.commit()
    db.refresh(config)

    # Log the reset
    log_configuration_change(
        db=db,
        configuration_key=config.key,
        action="reset",
        old_value=old_value,
        new_value=config.config_data,
        user_id=current_user.id,
        request=request,
        change_reason="Reset to default values",
    )

    return {"message": "Configuration reset to default values"}
