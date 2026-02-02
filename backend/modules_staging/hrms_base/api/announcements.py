"""
Announcement API Routes

CRUD operations for announcements.
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.announcement_service import AnnouncementService
from ..schemas.settings import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
    AnnouncementList,
)

router = APIRouter(prefix="/announcements", tags=["Announcements"])


def get_service(db: Session = Depends(get_db)) -> AnnouncementService:
    return AnnouncementService(db)


@router.get("/", response_model=AnnouncementList)
def list_announcements(
    is_published: Optional[bool] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: AnnouncementService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List announcements with filtering and pagination."""
    announcements, total = service.list(
        company_id=current_user.current_company_id,
        skip=skip,
        limit=limit,
        is_published=is_published,
        is_active=is_active,
    )
    return AnnouncementList(items=announcements, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/for-me", response_model=AnnouncementList)
def list_my_announcements(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: AnnouncementService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List announcements visible to current user."""
    # Get user's department and roles (simplified - would need proper implementation)
    department_id = getattr(current_user, 'department_id', None)
    role_ids = []  # Would get from user's roles

    announcements, total = service.list_for_user(
        user_id=current_user.id,
        company_id=current_user.current_company_id,
        department_id=department_id,
        role_ids=role_ids,
        skip=skip,
        limit=limit,
    )
    return AnnouncementList(items=announcements, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/{announcement_id}", response_model=AnnouncementResponse)
def get_announcement(
    announcement_id: int,
    service: AnnouncementService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get an announcement by ID."""
    announcement = service.get(announcement_id, current_user.current_company_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    # Mark as viewed
    service.mark_as_viewed(announcement_id, current_user.id, current_user.current_company_id)

    return announcement


@router.post("/", response_model=AnnouncementResponse, status_code=201)
def create_announcement(
    data: AnnouncementCreate,
    service: AnnouncementService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new announcement."""
    return service.create(
        data=data,
        author_id=current_user.id,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
    )


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(
    announcement_id: int,
    data: AnnouncementUpdate,
    service: AnnouncementService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update an announcement."""
    announcement = service.update(announcement_id, data, current_user.current_company_id, current_user.id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return announcement


@router.delete("/{announcement_id}", status_code=204)
def delete_announcement(
    announcement_id: int,
    service: AnnouncementService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete an announcement."""
    if not service.delete(announcement_id, current_user.current_company_id, current_user.id):
        raise HTTPException(status_code=404, detail="Announcement not found")
    return None


@router.post("/{announcement_id}/acknowledge")
def acknowledge_announcement(
    announcement_id: int,
    service: AnnouncementService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Acknowledge an announcement."""
    view = service.acknowledge(announcement_id, current_user.id, current_user.current_company_id)
    if not view:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Acknowledged successfully"}


@router.get("/{announcement_id}/stats")
def get_announcement_stats(
    announcement_id: int,
    service: AnnouncementService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get view and acknowledgment statistics for an announcement."""
    announcement = service.get(announcement_id, current_user.current_company_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    return service.get_view_stats(announcement_id, current_user.current_company_id)
