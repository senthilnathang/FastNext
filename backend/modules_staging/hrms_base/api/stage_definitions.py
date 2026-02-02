"""
Stage Definition API Routes

CRUD operations for stage definitions.
Queries the StageDefinition model directly (model_name is optional for listing).
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.settings import StageDefinition
from ..schemas.settings import (
    StageDefinitionCreate,
    StageDefinitionUpdate,
    StageDefinitionResponse,
)

router = APIRouter(prefix="/stage-definitions", tags=["Stage Definitions"])


@router.get("/", response_model=None)
@router.get("", response_model=None, include_in_schema=False)
def list_stage_definitions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    model_name: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List stage definitions with optional filtering by model_name and is_active."""
    query = db.query(StageDefinition).filter(
        StageDefinition.company_id == current_user.current_company_id,
        StageDefinition.is_deleted == False,
    )

    if model_name is not None:
        query = query.filter(StageDefinition.model_name == model_name)
    if is_active is not None:
        query = query.filter(StageDefinition.is_active == is_active)

    total = query.count()
    items = query.order_by(StageDefinition.sequence).offset(skip).limit(limit).all()

    return {
        "items": [StageDefinitionResponse.model_validate(item) for item in items],
        "total": total,
    }


@router.get("/{stage_id}", response_model=StageDefinitionResponse)
def get_stage_definition(
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a stage definition by ID."""
    stage = db.query(StageDefinition).filter(
        StageDefinition.id == stage_id,
        StageDefinition.company_id == current_user.current_company_id,
        StageDefinition.is_deleted == False,
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage definition not found")
    return stage


@router.post("/", response_model=StageDefinitionResponse, status_code=201)
@router.post("", response_model=StageDefinitionResponse, status_code=201, include_in_schema=False)
def create_stage_definition(
    data: StageDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new stage definition."""
    stage = StageDefinition(
        **data.model_dump(),
        company_id=current_user.current_company_id,
        created_by=current_user.id,
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage


@router.put("/{stage_id}", response_model=StageDefinitionResponse)
def update_stage_definition(
    stage_id: int,
    data: StageDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a stage definition."""
    stage = db.query(StageDefinition).filter(
        StageDefinition.id == stage_id,
        StageDefinition.company_id == current_user.current_company_id,
        StageDefinition.is_deleted == False,
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage definition not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(stage, field, value)

    stage.updated_by = current_user.id
    db.commit()
    db.refresh(stage)
    return stage


@router.delete("/{stage_id}", status_code=204)
def delete_stage_definition(
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a stage definition (soft delete)."""
    stage = db.query(StageDefinition).filter(
        StageDefinition.id == stage_id,
        StageDefinition.company_id == current_user.current_company_id,
        StageDefinition.is_deleted == False,
    ).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage definition not found")

    stage.is_deleted = True
    stage.deleted_at = datetime.utcnow()
    stage.deleted_by = current_user.id
    db.commit()
    return None
