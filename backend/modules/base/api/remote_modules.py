"""
Remote Module API Routes

Endpoints for managing distributed module sources and synchronization.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_superuser, get_db
from app.models.user import User

from ..services.remote_module_service import (
    RemoteModuleService,
    RemoteSourceType,
    ModuleSyncStatus,
)


router = APIRouter(prefix="/remote-modules", tags=["Remote Modules"])


# -------------------------------------------------------------------------
# Request/Response Models
# -------------------------------------------------------------------------


class RemoteSourceCreate(BaseModel):
    """Create remote source request."""

    name: str = Field(..., min_length=1, max_length=100)
    source_type: str = Field(..., description="nfs, s3, git, registry")
    config: Dict[str, Any] = Field(default_factory=dict)
    priority: int = Field(default=10, ge=1, le=100)

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "name": "corporate_addons",
                    "source_type": "s3",
                    "config": {
                        "bucket": "company-modules",
                        "prefix": "addons/",
                        "endpoint": "https://s3.company.com",
                        "access_key": "...",
                        "secret_key": "..."
                    },
                    "priority": 10
                },
                {
                    "name": "github_modules",
                    "source_type": "git",
                    "config": {
                        "repo_url": "https://github.com/company/modules.git",
                        "branch": "main"
                    },
                    "priority": 20
                },
                {
                    "name": "nfs_addons",
                    "source_type": "nfs",
                    "config": {
                        "mount_path": "/mnt/shared/modules"
                    },
                    "priority": 5
                }
            ]
        }


class RemoteSourceResponse(BaseModel):
    """Remote source response."""

    name: str
    type: str
    priority: int
    config: Dict[str, Any]


class RemoteModuleInfo(BaseModel):
    """Remote module information."""

    name: str
    version: str
    source: str
    source_type: str
    path: str
    manifest: Dict[str, Any]


class SyncResult(BaseModel):
    """Module sync result."""

    status: str
    message: Optional[str] = None
    error: Optional[str] = None
    version: Optional[str] = None
    path: Optional[str] = None


class SyncStatusResponse(BaseModel):
    """Sync status response."""

    module: str
    status: str
    local_version: Optional[str] = None
    remote_version: Optional[str] = None
    message: Optional[str] = None


# -------------------------------------------------------------------------
# Helper
# -------------------------------------------------------------------------


# In-memory storage for remote sources (should be persisted in production)
_remote_sources_storage: Dict[str, Dict[str, Any]] = {}


def get_remote_service(db: Session = Depends(get_db)) -> RemoteModuleService:
    """Get remote module service with configured sources."""
    service = RemoteModuleService(db)

    # Load configured sources
    for name, source in _remote_sources_storage.items():
        service.add_remote_source(
            name=name,
            source_type=source["type"],
            config=source["config"],
            priority=source["priority"],
        )

    return service


# -------------------------------------------------------------------------
# Remote Source Management
# -------------------------------------------------------------------------


@router.get("/sources", response_model=List[RemoteSourceResponse])
def list_remote_sources(
    current_user: User = Depends(get_current_active_user),
) -> List[RemoteSourceResponse]:
    """List all configured remote module sources."""
    return [
        RemoteSourceResponse(
            name=name,
            type=source["type"],
            priority=source["priority"],
            config={k: "***" if "key" in k.lower() or "secret" in k.lower() or "password" in k.lower() else v
                   for k, v in source["config"].items()},
        )
        for name, source in _remote_sources_storage.items()
    ]


@router.post("/sources", response_model=RemoteSourceResponse, status_code=status.HTTP_201_CREATED)
def add_remote_source(
    data: RemoteSourceCreate,
    current_user: User = Depends(get_current_superuser),
) -> RemoteSourceResponse:
    """
    Add a remote module source.

    Requires superuser permissions.

    Supported source types:
    - **nfs**: Network File System mount
    - **s3**: S3-compatible object storage
    - **git**: Git repository
    - **registry**: HTTP module registry API
    """
    if data.name in _remote_sources_storage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source '{data.name}' already exists"
        )

    valid_types = [t.value for t in RemoteSourceType]
    if data.source_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid source type. Must be one of: {valid_types}"
        )

    _remote_sources_storage[data.name] = {
        "type": data.source_type,
        "config": data.config,
        "priority": data.priority,
    }

    return RemoteSourceResponse(
        name=data.name,
        type=data.source_type,
        priority=data.priority,
        config={k: "***" if "key" in k.lower() or "secret" in k.lower() else v
               for k, v in data.config.items()},
    )


@router.delete("/sources/{name}", status_code=status.HTTP_204_NO_CONTENT)
def remove_remote_source(
    name: str,
    current_user: User = Depends(get_current_superuser),
) -> None:
    """Remove a remote module source. Requires superuser permissions."""
    if name not in _remote_sources_storage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source '{name}' not found"
        )

    del _remote_sources_storage[name]


# -------------------------------------------------------------------------
# Module Discovery
# -------------------------------------------------------------------------


@router.get("/discover", response_model=List[RemoteModuleInfo])
def discover_remote_modules(
    source: Optional[str] = Query(None, description="Filter by source name"),
    service: RemoteModuleService = Depends(get_remote_service),
    current_user: User = Depends(get_current_active_user),
) -> List[RemoteModuleInfo]:
    """
    Discover modules from remote sources.

    Returns list of available modules with version and source information.
    """
    try:
        modules = service.discover_remote_modules(source_name=source)
        return [
            RemoteModuleInfo(
                name=name,
                version=info.get("version", "0.0.0"),
                source=info.get("source", "unknown"),
                source_type=info.get("source_type", "unknown"),
                path=info.get("path", ""),
                manifest=info.get("manifest", {}),
            )
            for name, info in modules.items()
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Discovery failed: {str(e)}"
        )


# -------------------------------------------------------------------------
# Module Synchronization
# -------------------------------------------------------------------------


@router.post("/sync/{module_name}", response_model=SyncResult)
def sync_module(
    module_name: str,
    source: Optional[str] = Query(None, description="Specific source to use"),
    force: bool = Query(False, description="Force re-sync even if up-to-date"),
    service: RemoteModuleService = Depends(get_remote_service),
    current_user: User = Depends(get_current_superuser),
) -> SyncResult:
    """
    Sync a specific module from remote source.

    Downloads the module to local cache for use by the module loader.
    Requires superuser permissions.
    """
    result = service.sync_module(
        module_name=module_name,
        source_name=source,
        force=force,
    )

    return SyncResult(**result)


@router.post("/sync-all", response_model=Dict[str, SyncResult])
def sync_all_modules(
    force: bool = Query(False, description="Force re-sync all"),
    service: RemoteModuleService = Depends(get_remote_service),
    current_user: User = Depends(get_current_superuser),
) -> Dict[str, SyncResult]:
    """
    Sync all remote modules.

    Downloads all discovered modules to local cache.
    Requires superuser permissions.
    """
    results = service.sync_all_modules(force=force)
    return {name: SyncResult(**result) for name, result in results.items()}


@router.get("/status/{module_name}", response_model=SyncStatusResponse)
def get_sync_status(
    module_name: str,
    service: RemoteModuleService = Depends(get_remote_service),
    current_user: User = Depends(get_current_active_user),
) -> SyncStatusResponse:
    """Get sync status for a module."""
    status_info = service.get_sync_status(module_name)
    return SyncStatusResponse(
        module=module_name,
        **status_info,
    )


@router.get("/status", response_model=List[SyncStatusResponse])
def get_all_sync_status(
    service: RemoteModuleService = Depends(get_remote_service),
    current_user: User = Depends(get_current_active_user),
) -> List[SyncStatusResponse]:
    """Get sync status for all remote modules."""
    modules = service.discover_remote_modules()
    results = []

    for module_name in modules:
        status_info = service.get_sync_status(module_name)
        results.append(SyncStatusResponse(
            module=module_name,
            **status_info,
        ))

    return results


# -------------------------------------------------------------------------
# Source Types Info
# -------------------------------------------------------------------------


@router.get("/source-types", response_model=List[Dict[str, Any]])
def list_source_types(
    current_user: User = Depends(get_current_active_user),
) -> List[Dict[str, Any]]:
    """Get information about supported remote source types."""
    return [
        {
            "type": "nfs",
            "name": "Network File System",
            "description": "Network mounted file system (NFS, SMB/CIFS)",
            "required_config": ["mount_path"],
            "optional_config": ["server"],
        },
        {
            "type": "s3",
            "name": "S3 Object Storage",
            "description": "S3-compatible object storage (AWS S3, MinIO, etc.)",
            "required_config": ["bucket"],
            "optional_config": ["prefix", "endpoint", "access_key", "secret_key", "region"],
        },
        {
            "type": "git",
            "name": "Git Repository",
            "description": "Git repository containing modules",
            "required_config": ["repo_url"],
            "optional_config": ["branch", "ssh_key_path"],
        },
        {
            "type": "registry",
            "name": "Module Registry",
            "description": "HTTP API module registry",
            "required_config": ["url"],
            "optional_config": ["api_key"],
        },
    ]
