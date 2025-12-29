"""
Marketplace Module API Endpoints

Public and publisher endpoints for module management.
"""

from typing import Any, Dict, List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_superuser, get_db
from app.models.user import User

from ..services.module_service import ModuleService, get_module_service
from ..services.publisher_service import get_publisher_service
from ..models.publisher import Publisher


router = APIRouter(prefix="/modules", tags=["Marketplace Modules"])


# -------------------------------------------------------------------------
# Request/Response Models
# -------------------------------------------------------------------------


class CategoryResponse(BaseModel):
    """Category response."""
    id: int
    name: str
    slug: str
    description: Optional[str]
    icon: Optional[str]
    parent_id: Optional[int]
    module_count: int

    class Config:
        from_attributes = True


class PublisherInfo(BaseModel):
    """Publisher summary for module listings."""
    id: int
    display_name: str
    slug: str
    verified: bool
    logo_url: Optional[str]

    class Config:
        from_attributes = True


class ModuleVersionResponse(BaseModel):
    """Module version response."""
    id: int
    version: str
    status: str
    is_latest: bool
    is_prerelease: bool
    download_count: int
    changelog: Optional[str]
    min_fastvue_version: Optional[str]
    published_at: Optional[str]

    class Config:
        from_attributes = True


class ModuleListResponse(BaseModel):
    """Module list item response."""
    id: int
    technical_name: str
    display_name: str
    slug: str
    short_description: str
    license_type: str
    price: Optional[float]
    currency: str
    icon_url: Optional[str]
    download_count: int
    average_rating: Optional[float]
    rating_count: int
    publisher: PublisherInfo
    tags: List[str]

    class Config:
        from_attributes = True


class ModuleDetailResponse(BaseModel):
    """Detailed module response."""
    id: int
    technical_name: str
    display_name: str
    slug: str
    short_description: str
    description: Optional[str]
    description_html: Optional[str]
    license_type: str
    price: Optional[float]
    currency: str
    subscription_monthly_price: Optional[float]
    subscription_yearly_price: Optional[float]
    has_trial: bool
    trial_days: Optional[int]
    icon_url: Optional[str]
    banner_url: Optional[str]
    screenshots: List[Dict[str, Any]]
    video_url: Optional[str]
    tags: List[str]
    fastvue_versions: List[str]
    dependencies: List[str]
    download_count: int
    install_count: int
    view_count: int
    average_rating: Optional[float]
    rating_count: int
    rating_distribution: Dict[str, int]
    documentation_url: Optional[str]
    demo_url: Optional[str]
    support_url: Optional[str]
    publisher: PublisherInfo
    category: Optional[CategoryResponse]
    versions: List[ModuleVersionResponse]
    published_at: Optional[str]

    class Config:
        from_attributes = True


class ModuleCreateRequest(BaseModel):
    """Create module request."""
    technical_name: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z][a-z0-9_]*$")
    display_name: str = Field(..., min_length=2, max_length=200)
    short_description: str = Field(..., min_length=10, max_length=500)
    description: Optional[str] = None
    category_id: Optional[int] = None
    license_type: str = Field(default="free", pattern=r"^(free|paid|subscription|freemium)$")
    price: Optional[Decimal] = None
    tags: Optional[List[str]] = None
    fastvue_versions: Optional[List[str]] = None
    documentation_url: Optional[str] = None


class ModuleUpdateRequest(BaseModel):
    """Update module request."""
    display_name: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    license_type: Optional[str] = None
    price: Optional[Decimal] = None
    icon_url: Optional[str] = None
    banner_url: Optional[str] = None
    screenshots: Optional[List[Dict[str, Any]]] = None
    video_url: Optional[str] = None
    tags: Optional[List[str]] = None
    fastvue_versions: Optional[List[str]] = None
    dependencies: Optional[List[str]] = None
    documentation_url: Optional[str] = None
    demo_url: Optional[str] = None
    support_url: Optional[str] = None


class VersionCreateRequest(BaseModel):
    """Create version request."""
    version: str = Field(..., pattern=r"^\d+\.\d+\.\d+(-[a-z0-9]+)?$")
    changelog: Optional[str] = None
    min_fastvue_version: Optional[str] = None
    is_prerelease: bool = False


class SearchResponse(BaseModel):
    """Search results response."""
    modules: List[ModuleListResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------------


def get_publisher_for_user(db: Session, user_id: int) -> Publisher:
    """Get publisher for current user or raise 403."""
    publisher_service = get_publisher_service(db)
    publisher = publisher_service.get_publisher_by_user(user_id)
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not registered as a publisher"
        )
    if not publisher.can_publish:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Publisher account is {publisher.status}"
        )
    return publisher


def module_to_list_response(module) -> ModuleListResponse:
    """Convert module to list response."""
    return ModuleListResponse(
        id=module.id,
        technical_name=module.technical_name,
        display_name=module.display_name,
        slug=module.slug,
        short_description=module.short_description,
        license_type=module.license_type,
        price=float(module.price) if module.price else None,
        currency=module.currency,
        icon_url=module.icon_url,
        download_count=module.download_count,
        average_rating=float(module.average_rating) if module.average_rating else None,
        rating_count=module.rating_count,
        publisher=PublisherInfo(
            id=module.publisher.id,
            display_name=module.publisher.display_name,
            slug=module.publisher.slug,
            verified=module.publisher.verified,
            logo_url=module.publisher.logo_url,
        ),
        tags=module.tags or [],
    )


# -------------------------------------------------------------------------
# Public Endpoints
# -------------------------------------------------------------------------


@router.get("/", response_model=SearchResponse)
def list_modules(
    query: Optional[str] = Query(None, description="Search query"),
    category: Optional[int] = Query(None, description="Category ID"),
    license_type: Optional[str] = Query(None, description="License type filter"),
    publisher: Optional[int] = Query(None, description="Publisher ID filter"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    min_rating: Optional[float] = Query(None, ge=1, le=5),
    sort_by: str = Query("relevance", description="Sort: relevance, downloads, rating, newest, name"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    List and search marketplace modules.

    Public endpoint - no authentication required.
    """
    service = get_module_service(db)

    tag_list = tags.split(",") if tags else None

    modules, total = service.search_modules(
        query=query,
        category_id=category,
        license_type=license_type,
        publisher_id=publisher,
        tags=tag_list,
        min_rating=min_rating,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )

    return SearchResponse(
        modules=[module_to_list_response(m) for m in modules],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/featured", response_model=List[ModuleListResponse])
def get_featured_modules(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get featured modules."""
    service = get_module_service(db)
    modules = service.get_featured_modules(limit=limit)
    return [module_to_list_response(m) for m in modules]


@router.get("/trending", response_model=List[ModuleListResponse])
def get_trending_modules(
    period: str = Query("week", description="Trending period: day, week, month"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get trending modules."""
    service = get_module_service(db)
    modules = service.get_trending_modules(period=period, limit=limit)
    return [module_to_list_response(m) for m in modules]


@router.get("/new", response_model=List[ModuleListResponse])
def get_new_modules(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get recently published modules."""
    service = get_module_service(db)
    modules = service.get_new_modules(limit=limit)
    return [module_to_list_response(m) for m in modules]


@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(
    parent_id: Optional[int] = Query(None, description="Parent category ID"),
    db: Session = Depends(get_db),
):
    """Get module categories."""
    service = get_module_service(db)
    return service.get_categories(parent_id=parent_id)


@router.get("/{slug}", response_model=ModuleDetailResponse)
def get_module(
    slug: str,
    db: Session = Depends(get_db),
):
    """Get module details by slug."""
    service = get_module_service(db)
    module = service.get_module_by_slug(slug)

    if not module or module.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )

    # Increment view count
    service.increment_view_count(module.id)

    return ModuleDetailResponse(
        id=module.id,
        technical_name=module.technical_name,
        display_name=module.display_name,
        slug=module.slug,
        short_description=module.short_description,
        description=module.description,
        description_html=module.description_html,
        license_type=module.license_type,
        price=float(module.price) if module.price else None,
        currency=module.currency,
        subscription_monthly_price=float(module.subscription_monthly_price) if module.subscription_monthly_price else None,
        subscription_yearly_price=float(module.subscription_yearly_price) if module.subscription_yearly_price else None,
        has_trial=module.has_trial,
        trial_days=module.trial_days,
        icon_url=module.icon_url,
        banner_url=module.banner_url,
        screenshots=module.screenshots or [],
        video_url=module.video_url,
        tags=module.tags or [],
        fastvue_versions=module.fastvue_versions or [],
        dependencies=module.dependencies or [],
        download_count=module.download_count,
        install_count=module.install_count,
        view_count=module.view_count,
        average_rating=float(module.average_rating) if module.average_rating else None,
        rating_count=module.rating_count,
        rating_distribution=module.rating_distribution or {},
        documentation_url=module.documentation_url,
        demo_url=module.demo_url,
        support_url=module.support_url,
        publisher=PublisherInfo(
            id=module.publisher.id,
            display_name=module.publisher.display_name,
            slug=module.publisher.slug,
            verified=module.publisher.verified,
            logo_url=module.publisher.logo_url,
        ),
        category=CategoryResponse(
            id=module.category.id,
            name=module.category.name,
            slug=module.category.slug,
            description=module.category.description,
            icon=module.category.icon,
            parent_id=module.category.parent_id,
            module_count=module.category.module_count,
        ) if module.category else None,
        versions=[
            ModuleVersionResponse(
                id=v.id,
                version=v.version,
                status=v.status,
                is_latest=v.is_latest,
                is_prerelease=v.is_prerelease,
                download_count=v.download_count,
                changelog=v.changelog,
                min_fastvue_version=v.min_fastvue_version,
                published_at=v.published_at.isoformat() if v.published_at else None,
            )
            for v in module.versions if v.status == "published"
        ],
        published_at=module.published_at.isoformat() if module.published_at else None,
    )


@router.get("/{slug}/versions", response_model=List[ModuleVersionResponse])
def get_module_versions(
    slug: str,
    include_prerelease: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Get all published versions of a module."""
    service = get_module_service(db)
    module = service.get_module_by_slug(slug)

    if not module or module.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )

    versions = [
        v for v in module.versions
        if v.status == "published" and (include_prerelease or not v.is_prerelease)
    ]

    return [
        ModuleVersionResponse(
            id=v.id,
            version=v.version,
            status=v.status,
            is_latest=v.is_latest,
            is_prerelease=v.is_prerelease,
            download_count=v.download_count,
            changelog=v.changelog,
            min_fastvue_version=v.min_fastvue_version,
            published_at=v.published_at.isoformat() if v.published_at else None,
        )
        for v in versions
    ]


# -------------------------------------------------------------------------
# Publisher Endpoints (Authenticated)
# -------------------------------------------------------------------------


@router.post("/", response_model=ModuleDetailResponse, status_code=status.HTTP_201_CREATED)
def create_module(
    data: ModuleCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new module listing."""
    publisher = get_publisher_for_user(db, current_user.id)
    service = get_module_service(db)

    try:
        module = service.create_module(
            publisher_id=publisher.id,
            **data.model_dump(exclude_none=True),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return get_module(module.slug, db)


@router.put("/{module_id}", response_model=ModuleDetailResponse)
def update_module(
    module_id: int,
    data: ModuleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update module details."""
    publisher = get_publisher_for_user(db, current_user.id)
    service = get_module_service(db)

    module = service.update_module(
        module_id=module_id,
        publisher_id=publisher.id,
        **data.model_dump(exclude_none=True),
    )

    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found or not owned by you"
        )

    return get_module(module.slug, db)


@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete (archive) a module."""
    publisher = get_publisher_for_user(db, current_user.id)
    service = get_module_service(db)

    if not service.delete_module(module_id, publisher.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found or not owned by you"
        )


@router.post("/{module_id}/submit", response_model=ModuleDetailResponse)
def submit_for_review(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Submit module for review."""
    publisher = get_publisher_for_user(db, current_user.id)
    service = get_module_service(db)

    try:
        module = service.submit_for_review(module_id, publisher.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return get_module(module.slug, db)


@router.post("/{module_id}/publish", response_model=ModuleDetailResponse)
def publish_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Publish a free module (auto-approve)."""
    publisher = get_publisher_for_user(db, current_user.id)
    service = get_module_service(db)

    try:
        module = service.publish_module(module_id, publisher.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return get_module(module.slug, db)


# -------------------------------------------------------------------------
# Admin Endpoints
# -------------------------------------------------------------------------


@router.post("/{module_id}/approve", response_model=ModuleDetailResponse)
def approve_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Approve a pending module (admin only)."""
    service = get_module_service(db)

    try:
        module = service.approve_module(module_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return get_module(module.slug, db)


@router.post("/{module_id}/reject")
def reject_module(
    module_id: int,
    reason: str = Query(..., min_length=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Reject a pending module (admin only)."""
    service = get_module_service(db)

    try:
        service.reject_module(module_id, current_user.id, reason)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"status": "rejected", "reason": reason}
