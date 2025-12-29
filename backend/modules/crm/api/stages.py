"""
CRM Stage API Routes

API endpoints for CRM stage management.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..schemas.stage import (
    StageCreate,
    StageUpdate,
    StageResponse,
    StageList,
    StageReorder,
)
from ..services.stage_service import StageService

router = APIRouter(prefix="/stages", tags=["CRM Stages"])


def get_stage_service(db: Session = Depends(get_db)) -> StageService:
    """Get stage service instance."""
    return StageService(db)


@router.get("/", response_model=StageList)
def list_stages(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=200, description="Max items to return"),
    pipeline_id: Optional[int] = Query(None, description="Filter by pipeline"),
    service: StageService = Depends(get_stage_service),
    current_user: User = Depends(get_current_active_user),
) -> StageList:
    """List all stages with pagination."""
    items, total = service.get_all(
        skip=skip,
        limit=limit,
        pipeline_id=pipeline_id,
        company_id=current_user.current_company_id,
    )

    return StageList(
        items=[StageResponse.model_validate(item) for item in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/by-pipeline/{pipeline_id}", response_model=List[StageResponse])
def get_stages_by_pipeline(
    pipeline_id: int,
    service: StageService = Depends(get_stage_service),
    current_user: User = Depends(get_current_active_user),
) -> List[StageResponse]:
    """Get all stages for a pipeline, ordered by sequence."""
    stages = service.get_by_pipeline(pipeline_id)
    return [StageResponse.model_validate(s) for s in stages]


@router.get("/{stage_id}", response_model=StageResponse)
def get_stage(
    stage_id: int,
    service: StageService = Depends(get_stage_service),
    current_user: User = Depends(get_current_active_user),
) -> StageResponse:
    """Get a stage by ID."""
    stage = service.get_by_id(stage_id)

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stage with id {stage_id} not found",
        )

    return StageResponse.model_validate(stage)


@router.post("/", response_model=StageResponse, status_code=status.HTTP_201_CREATED)
def create_stage(
    data: StageCreate,
    service: StageService = Depends(get_stage_service),
    current_user: User = Depends(get_current_active_user),
) -> StageResponse:
    """Create a new stage."""
    stage = service.create(
        data=data,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
    )

    return StageResponse.model_validate(stage)


@router.put("/{stage_id}", response_model=StageResponse)
def update_stage(
    stage_id: int,
    data: StageUpdate,
    service: StageService = Depends(get_stage_service),
    current_user: User = Depends(get_current_active_user),
) -> StageResponse:
    """Update a stage."""
    stage = service.update(stage_id, data)

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stage with id {stage_id} not found",
        )

    return StageResponse.model_validate(stage)


@router.delete("/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stage(
    stage_id: int,
    service: StageService = Depends(get_stage_service),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete a stage."""
    deleted = service.delete(stage_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stage with id {stage_id} not found",
        )


@router.post("/reorder", response_model=List[StageResponse])
def reorder_stages(
    data: StageReorder,
    pipeline_id: int = Query(..., description="Pipeline ID"),
    service: StageService = Depends(get_stage_service),
    current_user: User = Depends(get_current_active_user),
) -> List[StageResponse]:
    """Reorder stages in a pipeline."""
    stages = service.reorder(pipeline_id, data.stage_ids)
    return [StageResponse.model_validate(s) for s in stages]
