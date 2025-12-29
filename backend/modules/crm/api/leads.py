"""
CRM Lead API Routes

API endpoints for CRM lead management.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..schemas.lead import (
    LeadCreate,
    LeadUpdate,
    LeadResponse,
    LeadList,
    LeadKanban,
    LeadStageMove,
    LeadConvert,
    LeadConvertResult,
    LeadMarkLost,
)
from ..services.lead_service import LeadService

router = APIRouter(prefix="/leads", tags=["CRM Leads"])


def get_lead_service(db: Session = Depends(get_db)) -> LeadService:
    """Get lead service instance."""
    return LeadService(db)


@router.get("/", response_model=LeadList)
def list_leads(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max items to return"),
    pipeline_id: Optional[int] = Query(None, description="Filter by pipeline"),
    stage_id: Optional[int] = Query(None, description="Filter by stage"),
    user_id: Optional[int] = Query(None, description="Filter by assigned user"),
    is_converted: Optional[bool] = Query(None, description="Filter by converted status"),
    is_lost: Optional[bool] = Query(None, description="Filter by lost status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    rating: Optional[str] = Query(None, description="Filter by rating"),
    search: Optional[str] = Query(None, description="Search in name, contact, email, company"),
    service: LeadService = Depends(get_lead_service),
    current_user: User = Depends(get_current_active_user),
) -> LeadList:
    """List all leads with pagination and filters."""
    items, total = service.get_all(
        skip=skip,
        limit=limit,
        company_id=current_user.current_company_id,
        pipeline_id=pipeline_id,
        stage_id=stage_id,
        user_id=user_id,
        is_converted=is_converted,
        is_lost=is_lost,
        priority=priority,
        rating=rating,
        search=search,
    )

    return LeadList(
        items=[LeadResponse.model_validate(item) for item in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/kanban", response_model=LeadKanban)
def get_leads_kanban(
    pipeline_id: int = Query(..., description="Pipeline ID"),
    user_id: Optional[int] = Query(None, description="Filter by assigned user"),
    service: LeadService = Depends(get_lead_service),
    current_user: User = Depends(get_current_active_user),
) -> LeadKanban:
    """Get leads in Kanban board format grouped by stage."""
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


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: int,
    service: LeadService = Depends(get_lead_service),
    current_user: User = Depends(get_current_active_user),
) -> LeadResponse:
    """Get a lead by ID."""
    lead = service.get_by_id(lead_id)

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with id {lead_id} not found",
        )

    return LeadResponse.model_validate(lead)


@router.post("/", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(
    data: LeadCreate,
    service: LeadService = Depends(get_lead_service),
    current_user: User = Depends(get_current_active_user),
) -> LeadResponse:
    """Create a new lead."""
    lead = service.create(
        data=data,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
    )

    return LeadResponse.model_validate(lead)


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int,
    data: LeadUpdate,
    service: LeadService = Depends(get_lead_service),
    current_user: User = Depends(get_current_active_user),
) -> LeadResponse:
    """Update a lead."""
    lead = service.update(lead_id, data, user_id=current_user.id)

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with id {lead_id} not found",
        )

    return LeadResponse.model_validate(lead)


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    service: LeadService = Depends(get_lead_service),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete a lead (soft delete)."""
    deleted = service.delete(lead_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with id {lead_id} not found",
        )


@router.post("/{lead_id}/move-stage", response_model=LeadResponse)
def move_lead_stage(
    lead_id: int,
    data: LeadStageMove,
    service: LeadService = Depends(get_lead_service),
    current_user: User = Depends(get_current_active_user),
) -> LeadResponse:
    """Move lead to a different stage."""
    lead = service.move_stage(lead_id, data.stage_id, user_id=current_user.id)

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with id {lead_id} not found or stage not found",
        )

    return LeadResponse.model_validate(lead)


@router.post("/{lead_id}/convert", response_model=LeadConvertResult)
def convert_lead(
    lead_id: int,
    data: LeadConvert,
    service: LeadService = Depends(get_lead_service),
    current_user: User = Depends(get_current_active_user),
) -> LeadConvertResult:
    """Convert lead to opportunity, contact, and/or account."""
    try:
        return service.convert(
            lead_id=lead_id,
            data=data,
            company_id=current_user.current_company_id,
            user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{lead_id}/mark-lost", response_model=LeadResponse)
def mark_lead_lost(
    lead_id: int,
    data: LeadMarkLost,
    service: LeadService = Depends(get_lead_service),
    current_user: User = Depends(get_current_active_user),
) -> LeadResponse:
    """Mark lead as lost."""
    lead = service.mark_lost(lead_id, data.reason, user_id=current_user.id)

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with id {lead_id} not found",
        )

    return LeadResponse.model_validate(lead)
