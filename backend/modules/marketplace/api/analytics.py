"""
Marketplace Analytics API

Analytics and tracking endpoints.
"""

from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.models.user import User
from ..services.analytics_service import AnalyticsService, get_analytics_service
from ..models.publisher import Publisher

router = APIRouter()


# =============================================================================
# Schemas
# =============================================================================

class TrackDownloadRequest(BaseModel):
    module_id: int
    version_id: Optional[int] = None
    license_id: Optional[int] = None
    download_type: str = "manual"
    source: Optional[str] = None
    fastvue_version: Optional[str] = None
    python_version: Optional[str] = None


class TrackViewRequest(BaseModel):
    module_id: int
    page_type: str = "detail"


class UpdateViewEngagementRequest(BaseModel):
    time_on_page: Optional[int] = None
    scroll_depth: Optional[int] = None
    clicked_install: Optional[bool] = None
    clicked_buy: Optional[bool] = None
    added_to_cart: Optional[bool] = None


class TrackSearchRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None
    result_count: Optional[int] = None
    result_module_ids: Optional[List[int]] = None


class TrackSearchClickRequest(BaseModel):
    module_id: int
    position: int


class LogEventRequest(BaseModel):
    event_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    event_metadata: Optional[Dict[str, Any]] = None


# =============================================================================
# Helper Functions
# =============================================================================

def get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def get_user_agent(request: Request) -> Optional[str]:
    """Extract user agent from request."""
    return request.headers.get("User-Agent")


def get_referrer(request: Request) -> Optional[str]:
    """Extract referrer from request."""
    return request.headers.get("Referer")


# =============================================================================
# Tracking Endpoints (Public)
# =============================================================================

@router.post("/track/download")
async def track_download(
    data: TrackDownloadRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Track a module download."""
    service = get_analytics_service(db)

    download = service.track_download(
        module_id=data.module_id,
        version_id=data.version_id,
        user_id=current_user.id if current_user else None,
        license_id=data.license_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        referrer=get_referrer(request),
        download_type=data.download_type,
        source=data.source,
        fastvue_version=data.fastvue_version,
        python_version=data.python_version,
    )

    return {"id": download.id, "message": "Download tracked"}


@router.post("/track/view")
async def track_view(
    data: TrackViewRequest,
    request: Request,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Track a module page view."""
    service = get_analytics_service(db)

    view = service.track_view(
        module_id=data.module_id,
        user_id=current_user.id if current_user else None,
        session_id=session_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        referrer=get_referrer(request),
        page_type=data.page_type,
    )

    return {"id": view.id, "message": "View tracked"}


@router.post("/track/view/{view_id}/engagement")
async def track_view_engagement(
    view_id: int,
    data: UpdateViewEngagementRequest,
    db: Session = Depends(get_db),
):
    """Update engagement metrics for a view."""
    service = get_analytics_service(db)

    service.update_view_engagement(
        view_id=view_id,
        time_on_page=data.time_on_page,
        scroll_depth=data.scroll_depth,
        clicked_install=data.clicked_install,
        clicked_buy=data.clicked_buy,
        added_to_cart=data.added_to_cart,
    )

    return {"message": "Engagement updated"}


@router.post("/track/search")
async def track_search(
    data: TrackSearchRequest,
    request: Request,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Track a search query."""
    service = get_analytics_service(db)

    search = service.track_search(
        query=data.query,
        user_id=current_user.id if current_user else None,
        session_id=session_id,
        filters=data.filters,
        result_count=data.result_count,
        result_module_ids=data.result_module_ids,
        ip_address=get_client_ip(request),
    )

    return {"id": search.id, "message": "Search tracked"}


@router.post("/track/search/{search_id}/click")
async def track_search_click(
    search_id: int,
    data: TrackSearchClickRequest,
    db: Session = Depends(get_db),
):
    """Track a click on a search result."""
    service = get_analytics_service(db)

    service.track_search_click(
        search_id=search_id,
        module_id=data.module_id,
        position=data.position,
    )

    return {"message": "Click tracked"}


# =============================================================================
# Module Analytics (Public)
# =============================================================================

@router.get("/modules/{module_id}/download-stats")
async def get_download_stats(
    module_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Get download statistics for a module."""
    service = get_analytics_service(db)
    return service.get_download_stats(module_id, start_date, end_date)


@router.get("/modules/{module_id}/view-stats")
async def get_view_stats(
    module_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Get view statistics for a module."""
    service = get_analytics_service(db)
    return service.get_view_stats(module_id, start_date, end_date)


# =============================================================================
# Search Analytics (Admin)
# =============================================================================

@router.get("/search/popular")
async def get_popular_searches(
    limit: int = Query(20, ge=1, le=100),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get most popular search queries."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    service = get_analytics_service(db)
    return service.get_popular_searches(limit=limit, days=days)


@router.get("/search/zero-results")
async def get_zero_result_searches(
    limit: int = Query(20, ge=1, le=100),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get searches with zero results."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    service = get_analytics_service(db)
    return service.get_zero_result_searches(limit=limit, days=days)


# =============================================================================
# Publisher Analytics
# =============================================================================

@router.get("/publisher/analytics")
async def get_publisher_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get analytics for current user's publisher account."""
    # Get publisher for current user
    publisher = db.query(Publisher).filter(
        Publisher.user_id == current_user.id,
    ).first()

    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher account not found")

    service = get_analytics_service(db)
    return service.get_publisher_analytics(publisher.id, start_date, end_date)


@router.get("/publisher/{publisher_id}/analytics")
async def get_specific_publisher_analytics(
    publisher_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get analytics for a specific publisher (admin or publisher owner)."""
    publisher = db.query(Publisher).get(publisher_id)

    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")

    # Check authorization
    if publisher.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")

    service = get_analytics_service(db)
    return service.get_publisher_analytics(publisher_id, start_date, end_date)


# =============================================================================
# Aggregation Tasks (Admin)
# =============================================================================

@router.post("/aggregate/daily-module-stats")
async def aggregate_daily_module_stats(
    stat_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate daily stats for all modules."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    service = get_analytics_service(db)
    service.aggregate_daily_module_stats(stat_date)

    return {"message": f"Daily module stats aggregated for {stat_date or 'yesterday'}"}


@router.post("/aggregate/daily-platform-stats")
async def aggregate_daily_platform_stats(
    stat_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate daily platform-wide stats."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    service = get_analytics_service(db)
    service.aggregate_daily_platform_stats(stat_date)

    return {"message": f"Daily platform stats aggregated for {stat_date or 'yesterday'}"}


# =============================================================================
# Event Logging (Internal)
# =============================================================================

@router.post("/events")
async def log_event(
    data: LogEventRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Log a marketplace event."""
    service = get_analytics_service(db)

    event = service.log_event(
        event_type=data.event_type,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        user_id=current_user.id if current_user else None,
        ip_address=get_client_ip(request),
        data=data.data,
        event_metadata=data.event_metadata,
    )

    return {"id": event.id, "message": "Event logged"}


@router.get("/events")
async def get_events(
    event_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Query event logs."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    service = get_analytics_service(db)
    events, total = service.get_event_log(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
    )

    return {
        "items": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "user_id": e.user_id,
                "data": e.data,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }
