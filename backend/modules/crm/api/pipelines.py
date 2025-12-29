"""
CRM Pipeline API Routes

API endpoints for CRM pipeline management.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..schemas.pipeline import (
    PipelineCreate,
    PipelineUpdate,
    PipelineResponse,
    PipelineList,
)
from ..services.pipeline_service import PipelineService

router = APIRouter(prefix="/pipelines", tags=["CRM Pipelines"])


def get_pipeline_service(db: Session = Depends(get_db)) -> PipelineService:
    """Get pipeline service instance."""
    return PipelineService(db)


@router.get("/", response_model=PipelineList)
def list_pipelines(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max items to return"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    service: PipelineService = Depends(get_pipeline_service),
    current_user: User = Depends(get_current_active_user),
) -> PipelineList:
    """List all pipelines with pagination."""
    items, total = service.get_all(
        skip=skip,
        limit=limit,
        is_active=is_active,
        company_id=current_user.current_company_id,
    )

    return PipelineList(
        items=[PipelineResponse.model_validate(item) for item in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/{pipeline_id}", response_model=PipelineResponse)
def get_pipeline(
    pipeline_id: int,
    service: PipelineService = Depends(get_pipeline_service),
    current_user: User = Depends(get_current_active_user),
) -> PipelineResponse:
    """Get a pipeline by ID."""
    pipeline = service.get_by_id(pipeline_id)

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline with id {pipeline_id} not found",
        )

    return PipelineResponse.model_validate(pipeline)


@router.post("/", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
def create_pipeline(
    data: PipelineCreate,
    with_default_stages: bool = Query(True, description="Create with default stages"),
    service: PipelineService = Depends(get_pipeline_service),
    current_user: User = Depends(get_current_active_user),
) -> PipelineResponse:
    """Create a new pipeline."""
    if with_default_stages:
        pipeline = service.create_with_default_stages(
            data=data,
            company_id=current_user.current_company_id,
            user_id=current_user.id,
        )
    else:
        pipeline = service.create(
            data=data,
            company_id=current_user.current_company_id,
            user_id=current_user.id,
        )

    return PipelineResponse.model_validate(pipeline)


@router.put("/{pipeline_id}", response_model=PipelineResponse)
def update_pipeline(
    pipeline_id: int,
    data: PipelineUpdate,
    service: PipelineService = Depends(get_pipeline_service),
    current_user: User = Depends(get_current_active_user),
) -> PipelineResponse:
    """Update a pipeline."""
    pipeline = service.update(
        pipeline_id,
        data,
        company_id=current_user.current_company_id
    )

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline with id {pipeline_id} not found",
        )

    return PipelineResponse.model_validate(pipeline)


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pipeline(
    pipeline_id: int,
    service: PipelineService = Depends(get_pipeline_service),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete a pipeline."""
    deleted = service.delete(pipeline_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline with id {pipeline_id} not found",
        )
