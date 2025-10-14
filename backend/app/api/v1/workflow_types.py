import logging
from typing import Any, List

from app.auth.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.workflow import WorkflowType
from app.schemas.common import ListResponse
from app.schemas.workflow import WorkflowType as WorkflowTypeSchema
from app.schemas.workflow import WorkflowTypeCreate, WorkflowTypeUpdate
from app.services.permission_service import PermissionService
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=ListResponse[WorkflowTypeSchema])
@router.get("/", response_model=ListResponse[WorkflowTypeSchema])
def read_workflow_types(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get workflow types"""
    try:
        query = db.query(WorkflowType).filter(WorkflowType.is_active == True)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (WorkflowType.name.ilike(search_term))
                | (WorkflowType.description.ilike(search_term))
            )

        total = query.count()
        workflow_types = query.offset(skip).limit(limit).all()

        return ListResponse.paginate(
            items=workflow_types, total=total, skip=skip, limit=limit
        )
    except Exception as e:
        logger.error(f"Error fetching workflow types: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching workflow types",
        )


@router.post("", response_model=WorkflowTypeSchema)
@router.post("/", response_model=WorkflowTypeSchema)
def create_workflow_type(
    *,
    db: Session = Depends(get_db),
    workflow_type_in: WorkflowTypeCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create workflow type"""
    # Check if user has permission to create workflow types
    if not PermissionService.check_permission(
        db, current_user.id, "create", "workflow_type"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create workflow types",
        )

    # Check if workflow type name already exists
    existing_type = (
        db.query(WorkflowType)
        .filter(WorkflowType.name == workflow_type_in.name)
        .first()
    )
    if existing_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workflow type with this name already exists",
        )

    workflow_type = WorkflowType(**workflow_type_in.dict(), created_by=current_user.id)
    db.add(workflow_type)
    db.commit()
    db.refresh(workflow_type)
    return workflow_type


@router.get("/{workflow_type_id}", response_model=WorkflowTypeSchema)
def read_workflow_type(
    *,
    db: Session = Depends(get_db),
    workflow_type_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get workflow type by ID"""
    workflow_type = (
        db.query(WorkflowType).filter(WorkflowType.id == workflow_type_id).first()
    )
    if not workflow_type:
        raise HTTPException(status_code=404, detail="Workflow type not found")
    return workflow_type


@router.put("/{workflow_type_id}", response_model=WorkflowTypeSchema)
def update_workflow_type(
    *,
    db: Session = Depends(get_db),
    workflow_type_id: int,
    workflow_type_in: WorkflowTypeUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update workflow type"""
    # Check if user has permission to update workflow types
    if not PermissionService.check_permission(
        db, current_user.id, "update", "workflow_type"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update workflow types",
        )

    workflow_type = (
        db.query(WorkflowType).filter(WorkflowType.id == workflow_type_id).first()
    )
    if not workflow_type:
        raise HTTPException(status_code=404, detail="Workflow type not found")

    workflow_type_data = workflow_type_in.dict(exclude_unset=True)
    for field, value in workflow_type_data.items():
        setattr(workflow_type, field, value)

    db.add(workflow_type)
    db.commit()
    db.refresh(workflow_type)
    return workflow_type


@router.delete("/{workflow_type_id}")
def delete_workflow_type(
    *,
    db: Session = Depends(get_db),
    workflow_type_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Delete workflow type (soft delete by setting is_active=False)"""
    # Check if user has permission to delete workflow types
    if not PermissionService.check_permission(
        db, current_user.id, "delete", "workflow_type"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete workflow types",
        )

    workflow_type = (
        db.query(WorkflowType).filter(WorkflowType.id == workflow_type_id).first()
    )
    if not workflow_type:
        raise HTTPException(status_code=404, detail="Workflow type not found")

    # Soft delete
    workflow_type.is_active = False
    db.add(workflow_type)
    db.commit()

    return {"message": "Workflow type deleted successfully"}
