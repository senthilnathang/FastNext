"""
Module Management API Routes

Provides REST endpoints for module management operations.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from modules.base.models.module import InstalledModule
from modules.base.services.module_service import ModuleService, get_module_service


router = APIRouter(prefix="/modules", tags=["modules"])


# Pydantic schemas for API
class ModuleResponse(BaseModel):
    """Response schema for module data."""
    id: int
    name: str
    display_name: str
    version: str
    summary: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    website: Optional[str] = None
    category: str
    license: str
    application: bool
    state: str
    installed_at: Optional[str] = None
    updated_at: Optional[str] = None
    depends: List[str] = []
    module_path: Optional[str] = None
    auto_install: bool

    class Config:
        from_attributes = True


class ModuleListResponse(BaseModel):
    """Response schema for module list."""
    modules: List[ModuleResponse]
    total: int


class ReloadSignalResponse(BaseModel):
    """Response schema for reload signals."""
    id: int
    module_name: str
    action: str
    created_at: Optional[str] = None
    acknowledged: bool


class AcknowledgeRequest(BaseModel):
    """Request schema for acknowledging signals."""
    signal_ids: List[int]


@router.get("/", response_model=ModuleListResponse)
def list_modules(
    include_uninstalled: bool = False,
    category: Optional[str] = None,
    applications_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    List all installed modules.

    Args:
        include_uninstalled: Include uninstalled modules
        category: Filter by category
        applications_only: Only return application modules

    Returns:
        List of modules
    """
    service = get_module_service(db)

    if applications_only:
        modules = service.get_applications()
    elif category:
        modules = service.get_modules_by_category(category)
    else:
        modules = service.get_all_modules(include_uninstalled)

    return ModuleListResponse(
        modules=[ModuleResponse(**m.to_dict()) for m in modules],
        total=len(modules)
    )


@router.get("/{name}", response_model=ModuleResponse)
def get_module(name: str, db: Session = Depends(get_db)):
    """
    Get a module by name.

    Args:
        name: Technical module name

    Returns:
        Module details
    """
    service = get_module_service(db)
    module = service.get_module(name)

    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{name}' not found"
        )

    return ModuleResponse(**module.to_dict())


@router.get("/{name}/dependents", response_model=ModuleListResponse)
def get_module_dependents(name: str, db: Session = Depends(get_db)):
    """
    Get modules that depend on this module.

    Args:
        name: Technical module name

    Returns:
        List of dependent modules
    """
    service = get_module_service(db)
    dependents = service.get_dependents(name)

    return ModuleListResponse(
        modules=[ModuleResponse(**m.to_dict()) for m in dependents],
        total=len(dependents)
    )


@router.post("/{name}/uninstall", response_model=dict)
def uninstall_module(name: str, db: Session = Depends(get_db)):
    """
    Uninstall a module.

    Args:
        name: Technical module name

    Returns:
        Success status
    """
    service = get_module_service(db)

    # Check for dependents
    dependents = service.get_dependents(name)
    if dependents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot uninstall module '{name}': "
                   f"other modules depend on it: {[d.name for d in dependents]}"
        )

    success = service.uninstall_module(name)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{name}' not found"
        )

    return {"success": True, "message": f"Module '{name}' uninstalled"}


@router.get("/reload-signals/pending", response_model=List[ReloadSignalResponse])
def get_pending_reload_signals(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get pending module reload signals for frontend synchronization.

    Args:
        limit: Maximum number of signals to return

    Returns:
        List of pending reload signals
    """
    service = get_module_service(db)
    signals = service.get_pending_reload_signals(limit)

    return [ReloadSignalResponse(**s.to_dict()) for s in signals]


@router.post("/reload-signals/acknowledge", response_model=dict)
def acknowledge_reload_signals(
    request: AcknowledgeRequest,
    db: Session = Depends(get_db)
):
    """
    Acknowledge processed reload signals.

    Args:
        request: Signal IDs to acknowledge

    Returns:
        Number of signals acknowledged
    """
    service = get_module_service(db)
    count = service.acknowledge_reload_signals(request.signal_ids)

    return {"acknowledged": count}
