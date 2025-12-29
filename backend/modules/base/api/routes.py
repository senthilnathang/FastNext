"""
Module Management API Routes

Endpoints for managing FastVue modules (install, uninstall, upgrade, etc.)
"""

import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_superuser, get_db
from app.core.config import settings
from app.core.modules import (
    ModuleLoader,
    ModuleRegistry,
    ModuleNotFoundError,
    InvalidModuleError,
    MissingDependenciesError,
)
from app.core.modules.exceptions import ModuleValidationError
from app.models.user import User

from ..models.module import InstalledModule
from ..services.module_service import ModuleService

router = APIRouter(prefix="/modules", tags=["Modules"])


# -------------------------------------------------------------------------
# Response Models
# -------------------------------------------------------------------------

class ModuleResponse(BaseModel):
    """Module information response."""

    name: str
    display_name: str
    version: str
    summary: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    website: Optional[str] = None
    category: str = "Uncategorized"
    license: str = "MIT"
    application: bool = False
    state: str
    depends: List[str] = []
    installed_at: Optional[str] = None
    module_path: Optional[str] = None

    class Config:
        from_attributes = True


class ModuleListResponse(BaseModel):
    """List of modules response."""

    items: List[ModuleResponse]
    total: int


class ModuleFrontendConfig(BaseModel):
    """Frontend configuration for a module."""

    name: str
    displayName: str
    routes: Optional[str] = None
    stores: List[str] = []
    components: List[str] = []
    views: List[str] = []
    locales: List[str] = []
    menus: List[Dict[str, Any]] = []


class DependencyCheckResponse(BaseModel):
    """Dependency check result."""

    module: str
    missing_modules: List[str]
    missing_python: List[str]
    missing_binaries: List[str]
    can_install: bool


class ValidationIssueResponse(BaseModel):
    """A single validation issue."""

    category: str
    severity: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ValidationResponse(BaseModel):
    """Pre-installation validation result."""

    module_name: str
    valid: bool
    error_count: int
    warning_count: int
    errors: List[ValidationIssueResponse]
    warnings: List[ValidationIssueResponse]


# -------------------------------------------------------------------------
# Module Discovery & Listing
# -------------------------------------------------------------------------

@router.get("/", response_model=ModuleListResponse)
def list_modules(
    db: Session = Depends(get_db),
    installed_only: bool = Query(False, description="Only show installed modules"),
    category: Optional[str] = Query(None, description="Filter by category"),
    application_only: bool = Query(False, description="Only show application modules"),
) -> ModuleListResponse:
    """
    List all available and installed modules.

    Returns both discovered modules and their installation status.
    """
    service = ModuleService(db)
    modules = service.get_all_modules(
        installed_only=installed_only,
        category=category,
        application_only=application_only,
    )

    return ModuleListResponse(
        items=[ModuleResponse(**m.to_dict()) for m in modules],
        total=len(modules),
    )


@router.get("/installed", response_model=List[ModuleResponse])
def list_installed_modules(db: Session = Depends(get_db)) -> List[ModuleResponse]:
    """List only installed modules."""
    service = ModuleService(db)
    modules = service.get_installed_modules()
    return [ModuleResponse(**m.to_dict()) for m in modules]


@router.get("/discovered", response_model=List[str])
def list_discovered_modules() -> List[str]:
    """
    List all discovered module names from addon paths.

    This returns modules found on the filesystem, regardless of installation status.
    """
    registry = ModuleRegistry.get_registry()
    loader = ModuleLoader(settings.all_addon_paths, registry)
    return loader.discover_modules()


# -------------------------------------------------------------------------
# Reload Signals (MUST come before /{name} route)
# -------------------------------------------------------------------------

class ReloadSignalResponse(BaseModel):
    """Reload signal for frontend."""

    id: int
    module_name: str
    action: str
    created_at: str


class AcknowledgeRequest(BaseModel):
    """Request to acknowledge reload signals."""

    signal_ids: List[int]


@router.get("/reload-signals", response_model=List[ReloadSignalResponse])
def get_reload_signals(
    db: Session = Depends(get_db),
    limit: int = Query(50, description="Maximum signals to return"),
) -> List[ReloadSignalResponse]:
    """
    Get pending module reload signals.

    Frontend should poll this endpoint to detect when modules have been
    installed, uninstalled, or upgraded and reload accordingly.
    """
    from ..models.module import ModuleReloadSignal

    signals = ModuleReloadSignal.get_pending_signals(db, limit)
    return [
        ReloadSignalResponse(
            id=s.id,
            module_name=s.module_name,
            action=s.action,
            created_at=s.created_at.isoformat() if s.created_at else "",
        )
        for s in signals
    ]


@router.post("/reload-signals/acknowledge")
def acknowledge_reload_signals(
    request: AcknowledgeRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Acknowledge that reload signals have been processed.

    Frontend should call this after reloading module assets.
    """
    from ..models.module import ModuleReloadSignal

    count = ModuleReloadSignal.acknowledge_signals(db, request.signal_ids)
    return {"acknowledged": count}


@router.get("/reload-status")
def get_reload_status(
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get current reload status.

    Returns whether there are pending module changes that require reload.
    """
    from ..models.module import ModuleReloadSignal

    signals = ModuleReloadSignal.get_pending_signals(db, limit=100)

    pending_modules = set()
    pending_actions = {}

    for signal in signals:
        pending_modules.add(signal.module_name)
        if signal.module_name not in pending_actions:
            pending_actions[signal.module_name] = []
        pending_actions[signal.module_name].append(signal.action)

    return {
        "requires_reload": len(signals) > 0,
        "pending_count": len(signals),
        "pending_modules": list(pending_modules),
        "pending_actions": pending_actions,
    }


@router.post("/restart")
def trigger_application_restart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
    graceful: bool = Query(True, description="Graceful restart"),
) -> Dict[str, Any]:
    """
    Trigger application restart to reload all modules.

    This is typically needed after installing/uninstalling modules.
    In production, this should be handled by process manager (systemd, supervisor).
    """
    import os
    import signal

    # Create a restart signal for tracking
    from ..models.module import ModuleReloadSignal
    restart_signal = ModuleReloadSignal(
        module_name="_system",
        action="restart",
    )
    db.add(restart_signal)
    db.commit()

    if graceful:
        # For Uvicorn/Gunicorn, send SIGHUP for graceful reload
        # This works when running under a process manager
        try:
            os.kill(os.getpid(), signal.SIGHUP)
            return {
                "status": "restart_initiated",
                "message": "Graceful restart signal sent. Server will reload.",
            }
        except Exception as e:
            return {
                "status": "restart_pending",
                "message": f"Restart signal failed: {e}. Manual restart may be required.",
            }
    else:
        return {
            "status": "restart_required",
            "message": "Please restart the application server to apply changes.",
        }


# -------------------------------------------------------------------------
# Module Details (parameterized routes - must come after specific routes)
# -------------------------------------------------------------------------

@router.get("/{name}", response_model=ModuleResponse)
def get_module(
    name: str,
    db: Session = Depends(get_db),
) -> ModuleResponse:
    """Get detailed information about a specific module."""
    service = ModuleService(db)
    module = service.get_module(name)

    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{name}' not found",
        )

    return ModuleResponse(**module.to_dict())


@router.get("/{name}/dependencies", response_model=DependencyCheckResponse)
def check_module_dependencies(name: str) -> DependencyCheckResponse:
    """
    Check dependencies for a module.

    Returns missing module and external dependencies.
    """
    registry = ModuleRegistry.get_registry()
    loader = ModuleLoader(settings.all_addon_paths, registry)

    # Discover modules first
    loader.discover_modules()

    module_path = loader.get_module_path(name)
    if not module_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{name}' not found",
        )

    try:
        manifest_dict = loader.load_manifest(module_path)
        manifest = loader.validate_manifest(manifest_dict)
    except (InvalidModuleError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Check module dependencies
    missing_modules = loader.check_dependencies(manifest)

    # Check external dependencies
    external_missing = loader.check_external_dependencies(manifest)

    can_install = (
        len(missing_modules) == 0
        and len(external_missing["python"]) == 0
        and len(external_missing["bin"]) == 0
    )

    return DependencyCheckResponse(
        module=name,
        missing_modules=missing_modules,
        missing_python=external_missing["python"],
        missing_binaries=external_missing["bin"],
        can_install=can_install,
    )


# -------------------------------------------------------------------------
# Module Validation
# -------------------------------------------------------------------------

@router.post("/validate/{name}", response_model=ValidationResponse)
def validate_module(
    name: str,
    db: Session = Depends(get_db),
) -> ValidationResponse:
    """
    Validate a module before installation.

    Runs comprehensive pre-installation checks:
    - Frontend assets (routes, stores, components, views, locales)
    - Schema compatibility (table conflicts, FK references, reserved keywords)
    - Route conflicts (API paths, menu paths)
    - Dependencies (modules, Python packages, system binaries)

    Returns validation result with errors (blocking) and warnings (non-blocking).
    """
    service = ModuleService(db)

    try:
        result = service.validate_module(name)
        return ValidationResponse(**result.to_dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}",
        )


@router.get("/{name}/compatibility", response_model=ValidationResponse)
def check_module_compatibility(
    name: str,
    db: Session = Depends(get_db),
) -> ValidationResponse:
    """
    Check system compatibility for a module.

    Alias for the validate endpoint - checks if module can be safely installed
    in the current system configuration.
    """
    service = ModuleService(db)

    try:
        result = service.validate_module(name)
        return ValidationResponse(**result.to_dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Compatibility check failed: {str(e)}",
        )


# -------------------------------------------------------------------------
# Module Installation
# -------------------------------------------------------------------------

@router.post("/install/{name}", response_model=ModuleResponse)
def install_module(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
    skip_validation: bool = Query(
        False,
        description="Skip pre-installation validation (not recommended)",
    ),
) -> ModuleResponse:
    """
    Install a module.

    Module must be discovered (present in addon paths) before installation.
    Pre-installation validation checks frontend assets, schema compatibility,
    and route conflicts. Dependencies will be checked and must be satisfied.
    """
    service = ModuleService(db)

    try:
        module = service.install_module(name, skip_validation=skip_validation)
        return ModuleResponse(**module.to_dict())
    except ModuleNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{name}' not found in any addon path",
        )
    except MissingDependenciesError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing dependencies: {', '.join(e.missing_dependencies)}",
        )
    except ModuleValidationError as e:
        # Convert validation errors to a structured response
        error_messages = [
            getattr(err, 'message', str(err)) for err in e.validation_errors[:5]
        ]
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": f"Module validation failed: {e.message}",
                "errors": error_messages,
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Installation failed: {str(e)}",
        )


class UninstallResponse(BaseModel):
    """Module uninstall result."""

    success: bool
    module: str
    tables_dropped: List[str] = []
    backup_file: Optional[str] = None
    warnings: List[str] = []
    requires_restart: bool = False
    error: Optional[str] = None


@router.post("/uninstall/{name}", response_model=UninstallResponse)
def uninstall_module(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
    drop_tables: bool = Query(True, description="Drop database tables"),
    cascade: bool = Query(False, description="Cascade uninstall to dependent modules"),
    backup: bool = Query(True, description="Backup data before dropping tables"),
    keep_data: bool = Query(False, description="Keep tables but uninstall module"),
) -> UninstallResponse:
    """
    Uninstall a module with full cleanup.

    Follows Odoo's lifecycle pattern:
    1. Check dependencies (cascade uninstalls dependents if enabled)
    2. Run uninstall hook if defined
    3. Drop database tables (with backup by default)
    4. Clean up migration history
    5. Signal frontend to reload

    Cannot uninstall the 'base' module.
    """
    service = ModuleService(db)

    try:
        result = service.uninstall_module(
            name,
            drop_tables=drop_tables,
            cascade=cascade,
            backup=backup,
            keep_data=keep_data,
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Uninstallation failed"),
            )

        return UninstallResponse(**result)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Uninstallation failed: {str(e)}",
        )


@router.post("/upgrade/{name}", response_model=ModuleResponse)
def upgrade_module(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> ModuleResponse:
    """
    Upgrade a module to the latest version.

    Re-loads the module from disk and applies any migrations.
    """
    service = ModuleService(db)

    try:
        module = service.upgrade_module(name)
        return ModuleResponse(**module.to_dict())
    except ModuleNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{name}' not found",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upgrade failed: {str(e)}",
        )


# -------------------------------------------------------------------------
# Module Upload
# -------------------------------------------------------------------------

@router.post("/upload", response_model=ModuleResponse)
async def upload_module(
    file: UploadFile = File(..., description="Module ZIP file"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
    install: bool = Query(True, description="Install after upload"),
    skip_validation: bool = Query(
        False,
        description="Skip pre-installation validation (not recommended)",
    ),
) -> ModuleResponse:
    """
    Upload and optionally install a module from a ZIP file.

    The ZIP must contain:
    - A single top-level directory (module name)
    - __manifest__.py in that directory
    - __init__.py in that directory

    Pre-installation validation is performed before installing.
    """
    if not file.filename or not file.filename.endswith('.zip'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a ZIP archive",
        )

    # Save uploaded file to temp location
    temp_dir = Path(tempfile.mkdtemp())
    temp_path = temp_dir / file.filename

    try:
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Validate and extract
        registry = ModuleRegistry.get_registry()
        loader = ModuleLoader(settings.all_addon_paths, registry)

        if not loader.validate_zip_structure(temp_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid module ZIP structure",
            )

        # Install to first addon path
        target_dir = settings.all_addon_paths[0]
        target_dir.mkdir(parents=True, exist_ok=True)

        module_name = loader.install_from_zip(temp_path, target_dir)

        # Optionally install the module
        if install:
            service = ModuleService(db)
            try:
                module = service.install_module(
                    module_name,
                    skip_validation=skip_validation,
                )
                return ModuleResponse(**module.to_dict())
            except ModuleValidationError as e:
                error_messages = [
                    getattr(err, 'message', str(err))
                    for err in e.validation_errors[:5]
                ]
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "message": f"Module validation failed: {e.message}",
                        "errors": error_messages,
                    },
                )

        # Just return info about the uploaded module
        module_path = target_dir / module_name
        manifest_dict = loader.load_manifest(module_path)

        return ModuleResponse(
            name=module_name,
            display_name=manifest_dict.get("name", module_name),
            version=manifest_dict.get("version", "1.0.0"),
            summary=manifest_dict.get("summary"),
            description=manifest_dict.get("description"),
            author=manifest_dict.get("author"),
            category=manifest_dict.get("category", "Uncategorized"),
            license=manifest_dict.get("license", "MIT"),
            application=manifest_dict.get("application", False),
            state="uninstalled",
            depends=manifest_dict.get("depends", []),
            module_path=str(module_path),
        )

    finally:
        # Cleanup temp files
        shutil.rmtree(temp_dir, ignore_errors=True)


# -------------------------------------------------------------------------
# Frontend Configuration
# -------------------------------------------------------------------------

@router.get("/installed/frontend-config", response_model=List[ModuleFrontendConfig])
def get_frontend_configs(db: Session = Depends(get_db)) -> List[ModuleFrontendConfig]:
    """
    Get frontend configuration for all installed modules.

    Used by the frontend module loader to dynamically load routes, stores, etc.
    """
    service = ModuleService(db)
    configs = service.get_frontend_configs()
    return [ModuleFrontendConfig(**c) for c in configs]


@router.get("/{name}/manifest.json")
def get_module_manifest(name: str) -> Dict[str, Any]:
    """
    Get the full manifest for a module as JSON.

    Useful for frontend to understand module capabilities.
    """
    registry = ModuleRegistry.get_registry()
    loader = ModuleLoader(settings.all_addon_paths, registry)
    loader.discover_modules()

    module_path = loader.get_module_path(name)
    if not module_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{name}' not found",
        )

    try:
        manifest = loader.load_manifest(module_path)
        return manifest
    except InvalidModuleError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/installed/menus")
def get_module_menus(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get all menu items from installed modules.

    Used by the frontend to build the navigation menu.
    """
    service = ModuleService(db)
    return service.get_all_menus()
