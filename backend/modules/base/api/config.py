"""
Configuration Parameter API Routes

Endpoints for managing module configuration parameters.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_superuser, get_db
from app.models.user import User

from ..models.config_parameter import ConfigParameter, ConfigValueType
from ..services.config_parameter_service import ConfigParameterService

router = APIRouter(prefix="/config", tags=["Configuration"])


# -------------------------------------------------------------------------
# Response Models
# -------------------------------------------------------------------------


class ConfigParameterResponse(BaseModel):
    """Configuration parameter response."""

    id: int
    key: str
    value: Optional[str] = None
    typed_value: Optional[Any] = None
    value_type: str = "string"
    module_name: Optional[str] = None
    description: Optional[str] = None
    is_system: bool = False
    company_id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_config_parameter(cls, param: ConfigParameter) -> "ConfigParameterResponse":
        """Create response from ConfigParameter model."""
        return cls(
            id=param.id,
            key=param.key,
            value=param.value,
            typed_value=param.get_typed_value(),
            value_type=param.value_type,
            module_name=param.module_name,
            description=param.description,
            is_system=param.is_system,
            company_id=param.company_id,
            created_at=param.created_at.isoformat() if param.created_at else None,
            updated_at=param.updated_at.isoformat() if param.updated_at else None,
        )


class ConfigParameterCreate(BaseModel):
    """Create configuration parameter request."""

    key: str = Field(..., min_length=1, max_length=200)
    value: Any = None
    value_type: Optional[str] = None
    module_name: Optional[str] = None
    description: Optional[str] = None
    company_id: Optional[int] = None
    is_system: bool = False


class ConfigParameterUpdate(BaseModel):
    """Update configuration parameter request."""

    value: Optional[Any] = None
    description: Optional[str] = None


class ConfigBulkUpdate(BaseModel):
    """Bulk update configuration parameters request."""

    parameters: Dict[str, Any] = Field(..., description="Key-value pairs to set")
    module_name: Optional[str] = None
    company_id: Optional[int] = None


class ConfigValueResponse(BaseModel):
    """Simple key-value response."""

    key: str
    value: Any


# -------------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------------


def get_config_service(db: Session = Depends(get_db)) -> ConfigParameterService:
    """Get configuration parameter service."""
    return ConfigParameterService(db)


# -------------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------------


@router.get("/", response_model=List[ConfigParameterResponse])
def list_config_parameters(
    module_name: Optional[str] = Query(None, description="Filter by module"),
    company_id: Optional[int] = Query(None, description="Filter by company"),
    include_system: bool = Query(True, description="Include system parameters"),
    search: Optional[str] = Query(None, description="Search in key/description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[ConfigParameterResponse]:
    """
    List all configuration parameters.

    Optional filters:
    - module_name: Filter by module
    - company_id: Filter by company
    - include_system: Include protected parameters
    - search: Search in key and description
    """
    service = ConfigParameterService(db)

    if search:
        params = service.search_params(
            query=search,
            module_name=module_name,
            company_id=company_id
        )
    else:
        params = service.get_all_params(
            module_name=module_name,
            company_id=company_id,
            include_system=include_system
        )

    return [ConfigParameterResponse.from_config_parameter(p) for p in params]


@router.get("/value/{key}", response_model=ConfigValueResponse)
def get_config_value(
    key: str,
    default: Optional[str] = Query(None, description="Default value if not found"),
    company_id: Optional[int] = Query(None, description="Company ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ConfigValueResponse:
    """
    Get a configuration parameter value by key.

    Returns the typed value (e.g., integer for integer type).
    """
    service = ConfigParameterService(db)
    value = service.get_param(key, default=default, company_id=company_id)
    return ConfigValueResponse(key=key, value=value)


@router.get("/{key}", response_model=ConfigParameterResponse)
def get_config_parameter(
    key: str,
    company_id: Optional[int] = Query(None, description="Company ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ConfigParameterResponse:
    """
    Get a configuration parameter by key.

    Returns the full parameter object including metadata.
    """
    service = ConfigParameterService(db)
    param = service.get_param_by_key(key, company_id)

    if not param:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration parameter '{key}' not found"
        )

    return ConfigParameterResponse.from_config_parameter(param)


@router.post("/", response_model=ConfigParameterResponse, status_code=status.HTTP_201_CREATED)
def create_config_parameter(
    data: ConfigParameterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> ConfigParameterResponse:
    """
    Create a new configuration parameter.

    Requires superuser permissions.
    """
    service = ConfigParameterService(db)

    # Check if already exists
    existing = service.get_param_by_key(data.key, data.company_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Configuration parameter '{data.key}' already exists"
        )

    param = service.set_param(
        key=data.key,
        value=data.value,
        value_type=data.value_type,
        module_name=data.module_name,
        description=data.description,
        company_id=data.company_id,
        is_system=data.is_system
    )
    db.commit()

    return ConfigParameterResponse.from_config_parameter(param)


@router.put("/{key}", response_model=ConfigParameterResponse)
def update_config_parameter(
    key: str,
    data: ConfigParameterUpdate,
    company_id: Optional[int] = Query(None, description="Company ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> ConfigParameterResponse:
    """
    Update a configuration parameter.

    Requires superuser permissions.
    System parameters cannot be modified via UI.
    """
    service = ConfigParameterService(db)
    param = service.get_param_by_key(key, company_id)

    if not param:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration parameter '{key}' not found"
        )

    if param.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system parameter via API"
        )

    updated = service.update_param(
        param_id=param.id,
        value=data.value,
        description=data.description
    )
    db.commit()

    return ConfigParameterResponse.from_config_parameter(updated)


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_config_parameter(
    key: str,
    company_id: Optional[int] = Query(None, description="Company ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> None:
    """
    Delete a configuration parameter.

    Requires superuser permissions.
    System parameters cannot be deleted.
    """
    service = ConfigParameterService(db)

    try:
        deleted = service.delete_param(key, company_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration parameter '{key}' not found"
            )
        db.commit()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.get("/module/{module_name}", response_model=Dict[str, Any])
def get_module_config(
    module_name: str,
    company_id: Optional[int] = Query(None, description="Company ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Get all configuration parameters for a module.

    Returns a dictionary of key -> typed value.
    """
    service = ConfigParameterService(db)
    return service.get_module_config(module_name, company_id)


@router.post("/module/{module_name}/init", response_model=List[ConfigParameterResponse])
def initialize_module_config(
    module_name: str,
    defaults: Dict[str, Dict[str, Any]],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> List[ConfigParameterResponse]:
    """
    Initialize module configuration from defaults.

    Only creates parameters that don't already exist.
    Typically called during module installation.

    Request body format:
    ```json
    {
        "module.param1": {"value": "default", "type": "string", "description": "..."},
        "module.param2": {"value": 123, "type": "integer", "description": "..."}
    }
    ```
    """
    service = ConfigParameterService(db)
    created = service.load_defaults_from_manifest(module_name, defaults)
    db.commit()

    return [ConfigParameterResponse.from_config_parameter(p) for p in created]


@router.post("/bulk", response_model=List[ConfigParameterResponse])
def bulk_set_config(
    data: ConfigBulkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> List[ConfigParameterResponse]:
    """
    Set multiple configuration parameters at once.

    Requires superuser permissions.
    """
    service = ConfigParameterService(db)
    params = service.bulk_set_params(
        params=data.parameters,
        module_name=data.module_name,
        company_id=data.company_id
    )
    db.commit()

    return [ConfigParameterResponse.from_config_parameter(p) for p in params]


@router.get("/types/", response_model=List[str])
def list_value_types(
    current_user: User = Depends(get_current_active_user),
) -> List[str]:
    """
    Get list of supported value types.
    """
    return [t.value for t in ConfigValueType]
