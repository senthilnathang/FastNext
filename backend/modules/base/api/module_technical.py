"""
Module Technical Info API Routes

Endpoints for viewing technical details about modules:
- Models and their fields
- Views (list, form) per model
- API routes
- Services
- Statistics
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..services.module_introspection_service import ModuleIntrospectionService

router = APIRouter(prefix="/modules", tags=["Module Technical Info"])


# -------------------------------------------------------------------------
# Response Models
# -------------------------------------------------------------------------


class FieldInfo(BaseModel):
    """Model field information."""
    name: str
    type: str
    nullable: Optional[bool] = None
    primary_key: Optional[bool] = None
    default: Optional[str] = None
    comment: Optional[str] = None


class RelationshipInfo(BaseModel):
    """Model relationship information."""
    name: str
    target: str
    type: str


class ModelInfo(BaseModel):
    """Model technical information."""
    name: str
    table_name: str
    module: Optional[str] = None
    file: Optional[str] = None
    fields: List[FieldInfo] = []
    relationships: List[RelationshipInfo] = []
    field_count: int = 0
    has_timestamps: bool = False
    error: Optional[str] = None


class ViewInfo(BaseModel):
    """View information."""
    name: str
    path: str
    full_path: Optional[str] = None
    type: Optional[str] = None


class ViewsInfo(BaseModel):
    """Views grouped by type."""
    list_views: List[ViewInfo] = []
    form_views: List[ViewInfo] = []
    other_views: List[ViewInfo] = []


class RouteInfo(BaseModel):
    """API route information."""
    path: Optional[str] = None
    methods: List[str] = []
    name: Optional[str] = None
    endpoint: Optional[str] = None
    file: Optional[str] = None
    type: Optional[str] = None


class ServiceInfo(BaseModel):
    """Service information."""
    name: str
    file: str
    methods: List[str] = []
    method_count: int = 0


class DataFileInfo(BaseModel):
    """Data file information."""
    name: str
    type: str
    size: int = 0
    category: Optional[str] = None


class StaticAssetsInfo(BaseModel):
    """Static assets information."""
    exists: bool = False
    components: List[Dict[str, str]] = []
    stores: List[Dict[str, str]] = []
    styles: List[Dict[str, str]] = []
    locales: List[Dict[str, str]] = []
    images: List[Dict[str, str]] = []


class ModuleStatistics(BaseModel):
    """Module statistics."""
    python_files: int = 0
    vue_files: int = 0
    total_lines: int = 0
    directories: int = 0


class ManifestSummary(BaseModel):
    """Manifest summary."""
    version: str
    depends: List[str] = []
    application: bool = False


class ModuleTechnicalInfo(BaseModel):
    """Complete technical information about a module."""
    name: str
    path: str
    manifest: ManifestSummary
    models: List[ModelInfo] = []
    views: ViewsInfo
    api_routes: List[RouteInfo] = []
    services: List[ServiceInfo] = []
    data_files: List[DataFileInfo] = []
    static_assets: StaticAssetsInfo
    statistics: ModuleStatistics
    error: Optional[str] = None


class ModelDetailInfo(BaseModel):
    """Detailed model information with associated views."""
    name: str
    table_name: str
    module: Optional[str] = None
    fields: List[FieldInfo] = []
    relationships: List[RelationshipInfo] = []
    field_count: int = 0
    has_timestamps: bool = False
    views: Optional[Dict[str, List[ViewInfo]]] = None
    error: Optional[str] = None


# -------------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------------


@router.get("/{module_name}/technical", response_model=ModuleTechnicalInfo)
def get_module_technical_info(
    module_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ModuleTechnicalInfo:
    """
    Get comprehensive technical information about a module.

    Returns details about:
    - Models and their fields
    - Views (list, form, other)
    - API routes
    - Services
    - Data files
    - Static assets
    - Code statistics
    """
    service = ModuleIntrospectionService(db)
    info = service.get_module_technical_info(module_name)

    if "error" in info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=info["error"],
        )

    return ModuleTechnicalInfo(**info)


@router.get("/{module_name}/models", response_model=List[ModelInfo])
def get_module_models(
    module_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[ModelInfo]:
    """
    Get information about all models defined in a module.

    Returns model names, table names, fields, and relationships.
    """
    service = ModuleIntrospectionService(db)
    info = service.get_module_technical_info(module_name)

    if "error" in info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=info["error"],
        )

    return [ModelInfo(**m) for m in info.get("models", [])]


@router.get("/{module_name}/models/{model_name}", response_model=ModelDetailInfo)
def get_model_details(
    module_name: str,
    model_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ModelDetailInfo:
    """
    Get detailed information about a specific model.

    Includes:
    - All fields with types, nullability, defaults
    - Relationships to other models
    - Associated views (list, form)
    """
    service = ModuleIntrospectionService(db)
    info = service.get_model_details(module_name, model_name)

    if "error" in info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=info["error"],
        )

    return ModelDetailInfo(**info)


@router.get("/{module_name}/views", response_model=ViewsInfo)
def get_module_views(
    module_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ViewsInfo:
    """
    Get information about views defined in a module.

    Views are categorized as:
    - list_views: List/index views
    - form_views: Form/edit/detail views
    - other_views: Other view types
    """
    service = ModuleIntrospectionService(db)
    info = service.get_module_technical_info(module_name)

    if "error" in info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=info["error"],
        )

    return ViewsInfo(**info.get("views", {}))


@router.get("/{module_name}/routes", response_model=List[RouteInfo])
def get_module_routes(
    module_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[RouteInfo]:
    """
    Get information about API routes defined in a module.

    Returns route paths, methods, and endpoint names.
    """
    service = ModuleIntrospectionService(db)
    info = service.get_module_technical_info(module_name)

    if "error" in info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=info["error"],
        )

    return [RouteInfo(**r) for r in info.get("api_routes", [])]


@router.get("/{module_name}/services", response_model=List[ServiceInfo])
def get_module_services(
    module_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[ServiceInfo]:
    """
    Get information about services defined in a module.

    Returns service classes and their public methods.
    """
    service = ModuleIntrospectionService(db)
    info = service.get_module_technical_info(module_name)

    if "error" in info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=info["error"],
        )

    return [ServiceInfo(**s) for s in info.get("services", [])]


@router.get("/{module_name}/statistics", response_model=ModuleStatistics)
def get_module_statistics(
    module_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ModuleStatistics:
    """
    Get code statistics for a module.

    Returns counts of Python files, Vue files, total lines, etc.
    """
    service = ModuleIntrospectionService(db)
    info = service.get_module_technical_info(module_name)

    if "error" in info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=info["error"],
        )

    return ModuleStatistics(**info.get("statistics", {}))


@router.get("/{module_name}/assets", response_model=StaticAssetsInfo)
def get_module_assets(
    module_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> StaticAssetsInfo:
    """
    Get information about static assets in a module.

    Returns components, stores, styles, locales, and images.
    """
    service = ModuleIntrospectionService(db)
    info = service.get_module_technical_info(module_name)

    if "error" in info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=info["error"],
        )

    return StaticAssetsInfo(**info.get("static_assets", {}))
