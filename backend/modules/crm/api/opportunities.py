"""
CRM Opportunity API Routes

API endpoints for CRM opportunity management.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..schemas.opportunity import (
    OpportunityCreate,
    OpportunityUpdate,
    OpportunityResponse,
    OpportunityList,
    OpportunityKanban,
    OpportunityStageMove,
    OpportunityMarkWon,
    OpportunityMarkLost,
    OpportunityForecast,
)
from ..services.opportunity_service import OpportunityService

router = APIRouter(prefix="/opportunities", tags=["CRM Opportunities"])


def get_opportunity_service(db: Session = Depends(get_db)) -> OpportunityService:
    """Get opportunity service instance."""
    return OpportunityService(db)


@router.get("/", response_model=OpportunityList)
def list_opportunities(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max items to return"),
    pipeline_id: Optional[int] = Query(None, description="Filter by pipeline"),
    stage_id: Optional[int] = Query(None, description="Filter by stage"),
    user_id: Optional[int] = Query(None, description="Filter by assigned user"),
    account_id: Optional[int] = Query(None, description="Filter by account"),
    is_won: Optional[bool] = Query(None, description="Filter by won status"),
    is_lost: Optional[bool] = Query(None, description="Filter by lost status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    search: Optional[str] = Query(None, description="Search in name"),
    service: OpportunityService = Depends(get_opportunity_service),
    current_user: User = Depends(get_current_active_user),
) -> OpportunityList:
    """List all opportunities with pagination and filters."""
    items, total = service.get_all(
        skip=skip,
        limit=limit,
        company_id=current_user.current_company_id,
        pipeline_id=pipeline_id,
        stage_id=stage_id,
        user_id=user_id,
        account_id=account_id,
        is_won=is_won,
        is_lost=is_lost,
        priority=priority,
        search=search,
    )

    return OpportunityList(
        items=[OpportunityResponse.model_validate(item) for item in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/kanban", response_model=OpportunityKanban)
def get_opportunities_kanban(
    pipeline_id: int = Query(..., description="Pipeline ID"),
    user_id: Optional[int] = Query(None, description="Filter by assigned user"),
    service: OpportunityService = Depends(get_opportunity_service),
    current_user: User = Depends(get_current_active_user),
) -> OpportunityKanban:
    """Get opportunities in Kanban board format grouped by stage."""
    try:
        return service.get_kanban(
            pipeline_id=pipeline_id,
            company_id=current_user.current_company_id,
            user_id=user_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get("/forecast", response_model=List[OpportunityForecast])
def get_forecast(
    year: Optional[int] = Query(None, description="Forecast year"),
    user_id: Optional[int] = Query(None, description="Filter by user"),
    service: OpportunityService = Depends(get_opportunity_service),
    current_user: User = Depends(get_current_active_user),
) -> List[OpportunityForecast]:
    """Get revenue forecast by month."""
    return service.get_forecast(
        company_id=current_user.current_company_id,
        year=year,
        user_id=user_id,
    )


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
def get_opportunity(
    opportunity_id: int,
    service: OpportunityService = Depends(get_opportunity_service),
    current_user: User = Depends(get_current_active_user),
) -> OpportunityResponse:
    """Get an opportunity by ID."""
    opportunity = service.get_by_id(opportunity_id)

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity with id {opportunity_id} not found",
        )

    return OpportunityResponse.model_validate(opportunity)


@router.post("/", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
def create_opportunity(
    data: OpportunityCreate,
    service: OpportunityService = Depends(get_opportunity_service),
    current_user: User = Depends(get_current_active_user),
) -> OpportunityResponse:
    """Create a new opportunity."""
    opportunity = service.create(
        data=data,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
    )

    return OpportunityResponse.model_validate(opportunity)


@router.put("/{opportunity_id}", response_model=OpportunityResponse)
def update_opportunity(
    opportunity_id: int,
    data: OpportunityUpdate,
    service: OpportunityService = Depends(get_opportunity_service),
    current_user: User = Depends(get_current_active_user),
) -> OpportunityResponse:
    """Update an opportunity."""
    opportunity = service.update(opportunity_id, data, user_id=current_user.id)

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity with id {opportunity_id} not found",
        )

    return OpportunityResponse.model_validate(opportunity)


@router.delete("/{opportunity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_opportunity(
    opportunity_id: int,
    service: OpportunityService = Depends(get_opportunity_service),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete an opportunity (soft delete)."""
    deleted = service.delete(opportunity_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity with id {opportunity_id} not found",
        )


@router.post("/{opportunity_id}/move-stage", response_model=OpportunityResponse)
def move_opportunity_stage(
    opportunity_id: int,
    data: OpportunityStageMove,
    service: OpportunityService = Depends(get_opportunity_service),
    current_user: User = Depends(get_current_active_user),
) -> OpportunityResponse:
    """Move opportunity to a different stage."""
    opportunity = service.move_stage(opportunity_id, data.stage_id, user_id=current_user.id)

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity with id {opportunity_id} not found or stage not found",
        )

    return OpportunityResponse.model_validate(opportunity)


@router.post("/{opportunity_id}/won", response_model=OpportunityResponse)
def mark_opportunity_won(
    opportunity_id: int,
    service: OpportunityService = Depends(get_opportunity_service),
    current_user: User = Depends(get_current_active_user),
) -> OpportunityResponse:
    """Mark opportunity as won."""
    opportunity = service.mark_won(opportunity_id, user_id=current_user.id)

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity with id {opportunity_id} not found",
        )

    return OpportunityResponse.model_validate(opportunity)


@router.post("/{opportunity_id}/lost", response_model=OpportunityResponse)
def mark_opportunity_lost(
    opportunity_id: int,
    data: OpportunityMarkLost,
    service: OpportunityService = Depends(get_opportunity_service),
    current_user: User = Depends(get_current_active_user),
) -> OpportunityResponse:
    """Mark opportunity as lost."""
    opportunity = service.mark_lost(
        opportunity_id,
        reason=data.reason,
        competitor=data.competitor,
        user_id=current_user.id,
    )

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity with id {opportunity_id} not found",
        )

    return OpportunityResponse.model_validate(opportunity)
