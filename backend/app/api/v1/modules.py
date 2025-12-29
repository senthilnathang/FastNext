"""
Module Management API Routes (Core)

Core API endpoints for managing FastVue modules.
These are always available regardless of module system state.
"""

import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# Security constants
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB max upload

from app.api.deps import get_current_superuser, get_db
from app.core.config import settings
from app.core.modules import (
    ModuleLoader,
    ModuleRegistry,
    ModuleNotFoundError,
    InvalidModuleError,
    MissingDependenciesError,
)
from app.models.user import User

router = APIRouter(prefix="/modules", tags=["Modules"])


# -------------------------------------------------------------------------
# Response Models
# -------------------------------------------------------------------------

class ModuleResponse(BaseModel):
    """Module information response."""

    id: Optional[int] = None
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


class InstallResult(BaseModel):
    """Module installation result."""

    success: bool
    module: Optional[ModuleResponse] = None
    message: Optional[str] = None


class UninstallResult(BaseModel):
    """Module uninstallation result."""

    success: bool
    message: Optional[str] = None


# -------------------------------------------------------------------------
# Helper: Get or create ModuleService
# -------------------------------------------------------------------------

def get_module_service(db: Session):
    """Get ModuleService instance, handling import gracefully."""
    try:
        from modules.base.services.module_service import ModuleService
        return ModuleService(db)
    except ImportError:
        return None


def get_installed_module_model():
    """Get InstalledModule model, handling import gracefully."""
    try:
        from modules.base.models.module import InstalledModule
        return InstalledModule
    except ImportError:
        return None


# -------------------------------------------------------------------------
# Module Discovery & Listing
# -------------------------------------------------------------------------

@router.get("/", response_model=List[ModuleResponse])
def list_modules(
    db: Session = Depends(get_db),
    installed_only: bool = Query(False, description="Only show installed modules"),
    category: Optional[str] = Query(None, description="Filter by category"),
    application_only: bool = Query(False, description="Only show application modules"),
) -> List[ModuleResponse]:
    """
    List all available and installed modules.
    """
    service = get_module_service(db)

    if service:
        modules = service.get_all_modules(
            installed_only=installed_only,
            category=category,
            application_only=application_only,
        )
        return [ModuleResponse(**m.to_dict()) for m in modules]

    # Fallback: just discover modules from filesystem
    registry = ModuleRegistry.get_registry()
    loader = ModuleLoader(settings.all_addon_paths, registry)
    discovered = loader.discover_modules()

    result = []
    for name in discovered:
        try:
            module_path = loader.get_module_path(name)
            if module_path:
                manifest = loader.load_manifest(module_path)

                # Apply filters
                if category and manifest.get("category") != category:
                    continue
                if application_only and not manifest.get("application", False):
                    continue

                result.append(ModuleResponse(
                    name=name,
                    display_name=manifest.get("name", name),
                    version=manifest.get("version", "1.0.0"),
                    summary=manifest.get("summary"),
                    description=manifest.get("description"),
                    author=manifest.get("author"),
                    website=manifest.get("website"),
                    category=manifest.get("category", "Uncategorized"),
                    license=manifest.get("license", "MIT"),
                    application=manifest.get("application", False),
                    state="uninstalled",
                    depends=manifest.get("depends", []),
                    module_path=str(module_path),
                ))
        except Exception:
            pass

    if installed_only:
        return []

    return result


@router.get("/installed", response_model=List[ModuleResponse])
def list_installed_modules(db: Session = Depends(get_db)) -> List[ModuleResponse]:
    """List only installed modules."""
    service = get_module_service(db)

    if service:
        modules = service.get_installed_modules()
        return [ModuleResponse(**m.to_dict()) for m in modules]

    return []


@router.get("/discovered", response_model=List[str])
def list_discovered_modules() -> List[str]:
    """List all discovered module names from addon paths."""
    registry = ModuleRegistry.get_registry()
    loader = ModuleLoader(settings.all_addon_paths, registry)
    return loader.discover_modules()


@router.get("/installed/frontend-config", response_model=List[ModuleFrontendConfig])
def get_frontend_configs(db: Session = Depends(get_db)) -> List[ModuleFrontendConfig]:
    """Get frontend configuration for all installed modules."""
    service = get_module_service(db)

    if service:
        configs = service.get_frontend_configs()
        return [ModuleFrontendConfig(**c) for c in configs]

    return []


@router.get("/installed/menus")
def get_module_menus(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Get all menu items from installed modules."""
    service = get_module_service(db)

    if service:
        return service.get_all_menus()

    return []


# -------------------------------------------------------------------------
# Reload Signals (for frontend synchronization)
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
    try:
        from modules.base.models.module import ModuleReloadSignal
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
    except ImportError:
        return []


@router.post("/reload-signals/acknowledge")
def acknowledge_reload_signals(
    request: AcknowledgeRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Acknowledge that reload signals have been processed.

    Frontend should call this after reloading module assets.
    """
    try:
        from modules.base.models.module import ModuleReloadSignal
        count = ModuleReloadSignal.acknowledge_signals(db, request.signal_ids)
        return {"acknowledged": count}
    except ImportError:
        return {"acknowledged": 0}


@router.get("/reload-status")
def get_reload_status(
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get current reload status.

    Returns whether there are pending module changes that require reload.
    """
    try:
        from modules.base.models.module import ModuleReloadSignal
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
    except ImportError:
        return {
            "requires_reload": False,
            "pending_count": 0,
            "pending_modules": [],
            "pending_actions": {},
        }


@router.get("/{name}", response_model=ModuleResponse)
def get_module(
    name: str,
    db: Session = Depends(get_db),
) -> ModuleResponse:
    """Get detailed information about a specific module."""
    service = get_module_service(db)

    if service:
        module = service.get_module(name)
        if module:
            return ModuleResponse(**module.to_dict())

    # Try filesystem
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
        return ModuleResponse(
            name=name,
            display_name=manifest.get("name", name),
            version=manifest.get("version", "1.0.0"),
            summary=manifest.get("summary"),
            description=manifest.get("description"),
            author=manifest.get("author"),
            website=manifest.get("website"),
            category=manifest.get("category", "Uncategorized"),
            license=manifest.get("license", "MIT"),
            application=manifest.get("application", False),
            state="uninstalled",
            depends=manifest.get("depends", []),
            module_path=str(module_path),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# -------------------------------------------------------------------------
# Module Installation
# -------------------------------------------------------------------------

@router.post("/install/{name}", response_model=InstallResult)
def install_module(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> InstallResult:
    """Install a module."""
    service = get_module_service(db)

    if not service:
        return InstallResult(
            success=False,
            message="Module service not available. Database migration may be required.",
        )

    try:
        module = service.install_module(name)
        return InstallResult(
            success=True,
            module=ModuleResponse(**module.to_dict()),
            message=f"Module '{name}' installed successfully",
        )
    except ModuleNotFoundError:
        return InstallResult(
            success=False,
            message=f"Module '{name}' not found in any addon path",
        )
    except MissingDependenciesError as e:
        return InstallResult(
            success=False,
            message=f"Missing dependencies: {', '.join(e.missing_dependencies)}",
        )
    except Exception as e:
        return InstallResult(
            success=False,
            message=f"Installation failed: {str(e)}",
        )


@router.post("/uninstall/{name}", response_model=UninstallResult)
def uninstall_module(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> UninstallResult:
    """Uninstall a module."""
    if name == "base":
        return UninstallResult(
            success=False,
            message="Cannot uninstall the base module",
        )

    service = get_module_service(db)

    if not service:
        return UninstallResult(
            success=False,
            message="Module service not available",
        )

    # Check for dependents
    dependents = service.get_dependents(name)
    if dependents:
        return UninstallResult(
            success=False,
            message=f"Cannot uninstall: modules depend on '{name}': {', '.join(dependents)}",
        )

    try:
        # Use cascade=True to handle foreign key dependencies
        result = service.uninstall_module(name, cascade=True)
        if result.get("success"):
            return UninstallResult(
                success=True,
                message=f"Module '{name}' uninstalled",
            )
        else:
            return UninstallResult(
                success=False,
                message=result.get("error", "Unknown error"),
            )
    except Exception as e:
        return UninstallResult(
            success=False,
            message=f"Uninstallation failed: {str(e)}",
        )


@router.post("/upgrade/{name}", response_model=InstallResult)
def upgrade_module(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> InstallResult:
    """Upgrade a module to the latest version."""
    service = get_module_service(db)

    if not service:
        return InstallResult(
            success=False,
            message="Module service not available",
        )

    try:
        module = service.upgrade_module(name)
        return InstallResult(
            success=True,
            module=ModuleResponse(**module.to_dict()),
            message=f"Module '{name}' upgraded successfully",
        )
    except ModuleNotFoundError:
        return InstallResult(
            success=False,
            message=f"Module '{name}' not found",
        )
    except Exception as e:
        return InstallResult(
            success=False,
            message=f"Upgrade failed: {str(e)}",
        )


# -------------------------------------------------------------------------
# Module Upload
# -------------------------------------------------------------------------

@router.post("/upload", response_model=InstallResult)
async def upload_module(
    file: UploadFile = File(..., description="Module ZIP file"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
    install: bool = Query(True, description="Install after upload"),
) -> InstallResult:
    """Upload and optionally install a module from a ZIP file."""
    # Validate filename
    if not file.filename or not file.filename.endswith('.zip'):
        return InstallResult(
            success=False,
            message="File must be a ZIP archive",
        )

    # Validate filename is safe (no path traversal)
    if '/' in file.filename or '\\' in file.filename or '..' in file.filename:
        return InstallResult(
            success=False,
            message="Invalid filename",
        )

    # Validate content type
    if file.content_type and file.content_type not in ['application/zip', 'application/x-zip-compressed', 'application/octet-stream']:
        return InstallResult(
            success=False,
            message="Invalid file type. Expected ZIP archive.",
        )

    temp_dir = Path(tempfile.mkdtemp())
    temp_path = temp_dir / file.filename

    try:
        # Read with size limit
        content = await file.read()

        if len(content) > MAX_UPLOAD_SIZE:
            return InstallResult(
                success=False,
                message=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)}MB",
            )

        with open(temp_path, "wb") as f:
            f.write(content)

        registry = ModuleRegistry.get_registry()
        loader = ModuleLoader(settings.all_addon_paths, registry)

        if not loader.validate_zip_structure(temp_path):
            return InstallResult(
                success=False,
                message="Invalid module ZIP structure",
            )

        # Install to first addon path
        target_dir = settings.all_addon_paths[0]
        target_dir.mkdir(parents=True, exist_ok=True)

        module_name = loader.install_from_zip(temp_path, target_dir)

        if install:
            service = get_module_service(db)
            if service:
                module = service.install_module(module_name)
                return InstallResult(
                    success=True,
                    module=ModuleResponse(**module.to_dict()),
                    message=f"Module '{module_name}' uploaded and installed",
                )

        # Just return info about the uploaded module
        module_path = target_dir / module_name
        manifest_dict = loader.load_manifest(module_path)

        return InstallResult(
            success=True,
            module=ModuleResponse(
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
            ),
            message=f"Module '{module_name}' uploaded",
        )

    except Exception as e:
        return InstallResult(
            success=False,
            message=f"Upload failed: {str(e)}",
        )
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
