"""
Messaging Configuration API

Manage messaging rules that control who can message whom.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_pagination, PaginationParams, get_current_active_user
from app.api.deps.auth import PermissionChecker
from app.models import User
from app.schemas.messaging_config import (
    MessagingConfigCreate,
    MessagingConfigUpdate,
    MessagingConfigResponse,
    MessagingConfigList,
)
from app.services.messaging_config import get_messaging_config_service

router = APIRouter()


@router.get("/", response_model=MessagingConfigList)
def list_messaging_configs(
    pagination: PaginationParams = Depends(get_pagination),
    current_user: User = Depends(PermissionChecker("settings.read")),
    db: Session = Depends(get_db),
):
    """
    List messaging configurations for the current company.

    Requires settings.read permission.
    """
    service = get_messaging_config_service(db)

    if not current_user.current_company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No company selected",
        )

    items, total = service.get_by_company(
        company_id=current_user.current_company_id,
        skip=pagination.skip,
        limit=pagination.page_size,
    )

    return MessagingConfigList(
        total=total,
        items=[MessagingConfigResponse.model_validate(item) for item in items],
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{config_id}", response_model=MessagingConfigResponse)
def get_messaging_config(
    config_id: int,
    current_user: User = Depends(PermissionChecker("settings.read")),
    db: Session = Depends(get_db),
):
    """
    Get a specific messaging configuration.

    Requires settings.read permission.
    """
    service = get_messaging_config_service(db)
    config = service.get(config_id)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Messaging config not found",
        )

    # Verify access (same company or global)
    if config.company_id and config.company_id != current_user.current_company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this configuration",
        )

    return MessagingConfigResponse.model_validate(config)


@router.post("/", response_model=MessagingConfigResponse, status_code=status.HTTP_201_CREATED)
def create_messaging_config(
    data: MessagingConfigCreate,
    current_user: User = Depends(PermissionChecker("settings.create")),
    db: Session = Depends(get_db),
):
    """
    Create a new messaging configuration.

    Requires settings.create permission.
    """
    service = get_messaging_config_service(db)

    # Default to current company if not specified
    if data.company_id is None:
        data.company_id = current_user.current_company_id

    # Verify user can create for this company
    if data.company_id and data.company_id != current_user.current_company_id:
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create config for another company",
            )

    config = service.create(data)
    return MessagingConfigResponse.model_validate(config)


@router.put("/{config_id}", response_model=MessagingConfigResponse)
def update_messaging_config(
    config_id: int,
    data: MessagingConfigUpdate,
    current_user: User = Depends(PermissionChecker("settings.update")),
    db: Session = Depends(get_db),
):
    """
    Update a messaging configuration.

    Requires settings.update permission.
    """
    service = get_messaging_config_service(db)
    config = service.get(config_id)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Messaging config not found",
        )

    # Verify access
    if config.company_id and config.company_id != current_user.current_company_id:
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this configuration",
            )

    updated = service.update(config_id, data)
    return MessagingConfigResponse.model_validate(updated)


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_messaging_config(
    config_id: int,
    current_user: User = Depends(PermissionChecker("settings.delete")),
    db: Session = Depends(get_db),
):
    """
    Delete a messaging configuration.

    Requires settings.delete permission.
    """
    service = get_messaging_config_service(db)
    config = service.get(config_id)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Messaging config not found",
        )

    # Verify access
    if config.company_id and config.company_id != current_user.current_company_id:
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this configuration",
            )

    service.delete(config_id)


@router.post("/ensure-default", response_model=MessagingConfigResponse)
def ensure_default_config(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Ensure a default messaging configuration exists for the current company.

    This creates a rule allowing all users in the same company to message each other.
    Available to all authenticated users.
    """
    service = get_messaging_config_service(db)

    if not current_user.current_company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No company selected",
        )

    config = service.ensure_default_rule(current_user.current_company_id)
    return MessagingConfigResponse.model_validate(config)
