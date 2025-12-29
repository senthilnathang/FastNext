"""
CRM Activity API Routes

API endpoints for CRM activity management.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..schemas.activity import (
    ActivityCreate,
    ActivityUpdate,
    ActivityResponse,
    ActivityList,
    ActivityComplete,
    ActivitySchedule,
)
from ..services.activity_service import ActivityService

router = APIRouter(prefix="/activities", tags=["CRM Activities"])


def get_activity_service(db: Session = Depends(get_db)) -> ActivityService:
    """Get activity service instance."""
    return ActivityService(db)


@router.get("/", response_model=ActivityList)
def list_activities(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max items to return"),
    res_model: Optional[str] = Query(None, description="Filter by related model"),
    res_id: Optional[int] = Query(None, description="Filter by related record ID"),
    user_id: Optional[int] = Query(None, description="Filter by creator"),
    assigned_to_id: Optional[int] = Query(None, description="Filter by assignee"),
    activity_type: Optional[str] = Query(None, description="Filter by type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    service: ActivityService = Depends(get_activity_service),
    current_user: User = Depends(get_current_active_user),
) -> ActivityList:
    """List all activities with pagination and filters."""
    items, total = service.get_all(
        skip=skip,
        limit=limit,
        company_id=current_user.current_company_id,
        res_model=res_model,
        res_id=res_id,
        user_id=user_id,
        assigned_to_id=assigned_to_id,
        activity_type=activity_type,
        status=status,
    )

    return ActivityList(
        items=[ActivityResponse.model_validate(item) for item in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/for-record", response_model=List[ActivityResponse])
def get_activities_for_record(
    res_model: str = Query(..., description="Related model (lead, opportunity, etc.)"),
    res_id: int = Query(..., description="Related record ID"),
    service: ActivityService = Depends(get_activity_service),
    current_user: User = Depends(get_current_active_user),
) -> List[ActivityResponse]:
    """Get all activities for a specific record."""
    activities = service.get_for_record(res_model, res_id)
    return [ActivityResponse.model_validate(a) for a in activities]


@router.get("/upcoming", response_model=List[ActivityResponse])
def get_upcoming_activities(
    days: int = Query(7, ge=1, le=30, description="Days to look ahead"),
    user_id: Optional[int] = Query(None, description="Filter by user"),
    service: ActivityService = Depends(get_activity_service),
    current_user: User = Depends(get_current_active_user),
) -> List[ActivityResponse]:
    """Get upcoming activities for the next N days."""
    activities = service.get_upcoming(
        company_id=current_user.current_company_id,
        user_id=user_id or current_user.id,
        days=days,
    )
    return [ActivityResponse.model_validate(a) for a in activities]


@router.get("/overdue", response_model=List[ActivityResponse])
def get_overdue_activities(
    user_id: Optional[int] = Query(None, description="Filter by user"),
    service: ActivityService = Depends(get_activity_service),
    current_user: User = Depends(get_current_active_user),
) -> List[ActivityResponse]:
    """Get overdue activities."""
    activities = service.get_overdue(
        company_id=current_user.current_company_id,
        user_id=user_id or current_user.id,
    )
    return [ActivityResponse.model_validate(a) for a in activities]


@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(
    activity_id: int,
    service: ActivityService = Depends(get_activity_service),
    current_user: User = Depends(get_current_active_user),
) -> ActivityResponse:
    """Get an activity by ID."""
    activity = service.get_by_id(activity_id)

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {activity_id} not found",
        )

    return ActivityResponse.model_validate(activity)


@router.post("/", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(
    data: ActivityCreate,
    service: ActivityService = Depends(get_activity_service),
    current_user: User = Depends(get_current_active_user),
) -> ActivityResponse:
    """Create a new activity."""
    activity = service.create(
        data=data,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
    )

    return ActivityResponse.model_validate(activity)


@router.put("/{activity_id}", response_model=ActivityResponse)
def update_activity(
    activity_id: int,
    data: ActivityUpdate,
    service: ActivityService = Depends(get_activity_service),
    current_user: User = Depends(get_current_active_user),
) -> ActivityResponse:
    """Update an activity."""
    activity = service.update(activity_id, data, user_id=current_user.id)

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {activity_id} not found",
        )

    return ActivityResponse.model_validate(activity)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: int,
    service: ActivityService = Depends(get_activity_service),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete an activity."""
    deleted = service.delete(activity_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {activity_id} not found",
        )


@router.post("/{activity_id}/complete", response_model=ActivityResponse)
def complete_activity(
    activity_id: int,
    data: ActivityComplete,
    service: ActivityService = Depends(get_activity_service),
    current_user: User = Depends(get_current_active_user),
) -> ActivityResponse:
    """Mark activity as completed."""
    activity = service.complete(
        activity_id=activity_id,
        user_id=current_user.id,
        outcome=data.outcome,
    )

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {activity_id} not found",
        )

    return ActivityResponse.model_validate(activity)


@router.post("/{activity_id}/cancel", response_model=ActivityResponse)
def cancel_activity(
    activity_id: int,
    service: ActivityService = Depends(get_activity_service),
    current_user: User = Depends(get_current_active_user),
) -> ActivityResponse:
    """Cancel an activity."""
    activity = service.cancel(activity_id, user_id=current_user.id)

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {activity_id} not found",
        )

    return ActivityResponse.model_validate(activity)
