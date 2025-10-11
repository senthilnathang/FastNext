from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.auth.deps import get_current_active_user
from app.services.permission_service import PermissionService
from app.db.session import get_db
from app.models.user import User
from app.models.workflow import WorkflowState
from app.schemas.workflow import WorkflowState as WorkflowStateSchema, WorkflowStateCreate, WorkflowStateUpdate
from app.schemas.common import ListResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=ListResponse[WorkflowStateSchema])
@router.get("/", response_model=ListResponse[WorkflowStateSchema])
def read_workflow_states(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get workflow states"""
    try:
        query = db.query(WorkflowState)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (WorkflowState.name.ilike(search_term)) |
                (WorkflowState.label.ilike(search_term))
            )
        
        total = query.count()
        workflow_states = query.offset(skip).limit(limit).all()
        
        return ListResponse.paginate(
            items=workflow_states,
            total=total,
            skip=skip,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error fetching workflow states: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching workflow states"
        )


@router.post("", response_model=WorkflowStateSchema)
@router.post("/", response_model=WorkflowStateSchema)
def create_workflow_state(
    *,
    db: Session = Depends(get_db),
    workflow_state_in: WorkflowStateCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create workflow state"""
    # Check if user has permission to create workflow states
    if not PermissionService.check_permission(db, current_user.id, "create", "workflow_state"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create workflow states"
        )
    
    # Check if workflow state name already exists
    existing_state = db.query(WorkflowState).filter(WorkflowState.name == workflow_state_in.name).first()
    if existing_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workflow state with this name already exists"
        )
    
    workflow_state = WorkflowState(**workflow_state_in.dict())
    db.add(workflow_state)
    db.commit()
    db.refresh(workflow_state)
    return workflow_state


@router.get("/{workflow_state_id}", response_model=WorkflowStateSchema)
def read_workflow_state(
    *,
    db: Session = Depends(get_db),
    workflow_state_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get workflow state by ID"""
    workflow_state = db.query(WorkflowState).filter(WorkflowState.id == workflow_state_id).first()
    if not workflow_state:
        raise HTTPException(status_code=404, detail="Workflow state not found")
    return workflow_state


@router.put("/{workflow_state_id}", response_model=WorkflowStateSchema)
def update_workflow_state(
    *,
    db: Session = Depends(get_db),
    workflow_state_id: int,
    workflow_state_in: WorkflowStateUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update workflow state"""
    # Check if user has permission to update workflow states
    if not PermissionService.check_permission(db, current_user.id, "update", "workflow_state"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update workflow states"
        )
    
    workflow_state = db.query(WorkflowState).filter(WorkflowState.id == workflow_state_id).first()
    if not workflow_state:
        raise HTTPException(status_code=404, detail="Workflow state not found")
    
    workflow_state_data = workflow_state_in.dict(exclude_unset=True)
    for field, value in workflow_state_data.items():
        setattr(workflow_state, field, value)
    
    db.add(workflow_state)
    db.commit()
    db.refresh(workflow_state)
    return workflow_state


@router.delete("/{workflow_state_id}")
def delete_workflow_state(
    *,
    db: Session = Depends(get_db),
    workflow_state_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Delete workflow state"""
    # Check if user has permission to delete workflow states
    if not PermissionService.check_permission(db, current_user.id, "delete", "workflow_state"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete workflow states"
        )
    
    workflow_state = db.query(WorkflowState).filter(WorkflowState.id == workflow_state_id).first()
    if not workflow_state:
        raise HTTPException(status_code=404, detail="Workflow state not found")
    
    db.delete(workflow_state)
    db.commit()
    
    return {"message": "Workflow state deleted successfully"}