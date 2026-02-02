"""
Approval Workflow API Routes

CRUD operations for approval workflows, levels, and delegations.
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.approval import ApprovalActionType
from ..services.approval_service import ApprovalService
from ..schemas.approval import (
    ApprovalWorkflowCreate,
    ApprovalWorkflowUpdate,
    ApprovalWorkflowResponse,
    ApprovalWorkflowList,
    ApprovalLevelCreate,
    ApprovalLevelResponse,
    ApprovalRuleCreate,
    ApprovalRuleResponse,
    ApprovalDelegationCreate,
    ApprovalDelegationResponse,
    ApprovalRequestResponse,
    ApprovalActionCreate,
    ApprovalActionResponse,
)

router = APIRouter(prefix="/approval-workflows", tags=["Approval Workflows"])


def get_service(db: Session = Depends(get_db)) -> ApprovalService:
    return ApprovalService(db)


# Workflow Routes
@router.get("/", response_model=ApprovalWorkflowList)
def list_workflows(
    model_name: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: ApprovalService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List approval workflows."""
    workflows, total = service.list_workflows(
        company_id=current_user.current_company_id,
        model_name=model_name,
        skip=skip,
        limit=limit,
    )
    return ApprovalWorkflowList(items=workflows, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/{workflow_id}", response_model=ApprovalWorkflowResponse)
def get_workflow(
    workflow_id: int,
    service: ApprovalService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get an approval workflow by ID."""
    workflow = service.get_workflow(workflow_id, current_user.current_company_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.post("/", response_model=ApprovalWorkflowResponse, status_code=201)
def create_workflow(
    data: ApprovalWorkflowCreate,
    service: ApprovalService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new approval workflow."""
    return service.create_workflow(data, current_user.current_company_id, current_user.id)


@router.put("/{workflow_id}", response_model=ApprovalWorkflowResponse)
def update_workflow(
    workflow_id: int,
    data: ApprovalWorkflowUpdate,
    service: ApprovalService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update an approval workflow."""
    workflow = service.update_workflow(workflow_id, data, current_user.current_company_id, current_user.id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.delete("/{workflow_id}", status_code=204)
def delete_workflow(
    workflow_id: int,
    service: ApprovalService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete an approval workflow."""
    if not service.delete_workflow(workflow_id, current_user.current_company_id, current_user.id):
        raise HTTPException(status_code=404, detail="Workflow not found")
    return None


# Level Routes
@router.post("/{workflow_id}/levels", response_model=ApprovalLevelResponse, status_code=201)
def add_level(
    workflow_id: int,
    data: ApprovalLevelCreate,
    service: ApprovalService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Add a level to a workflow."""
    # Verify workflow exists
    workflow = service.get_workflow(workflow_id, current_user.current_company_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Override workflow_id from path
    data_dict = data.model_dump()
    data_dict["workflow_id"] = workflow_id
    level_data = ApprovalLevelCreate(**data_dict)

    return service.add_level(level_data, current_user.current_company_id, current_user.id)


@router.delete("/levels/{level_id}", status_code=204)
def remove_level(
    level_id: int,
    service: ApprovalService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Remove a level from a workflow."""
    if not service.remove_level(level_id, current_user.current_company_id):
        raise HTTPException(status_code=404, detail="Level not found")
    return None


# Delegation Routes
@router.get("/delegations/", response_model=List[ApprovalDelegationResponse])
def list_delegations(
    service: ApprovalService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List current user's delegations."""
    # This would need a proper method in service
    return []


@router.post("/delegations/", response_model=ApprovalDelegationResponse, status_code=201)
def create_delegation(
    data: ApprovalDelegationCreate,
    service: ApprovalService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new approval delegation."""
    return service.create_delegation(
        data=data,
        delegator_id=current_user.id,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
    )


# Request Routes
@router.get("/requests/pending", response_model=List[ApprovalRequestResponse])
def get_pending_requests(
    model_name: Optional[str] = None,
    service: ApprovalService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get pending approval requests for current user."""
    return service.get_pending_requests(
        approver_id=current_user.id,
        company_id=current_user.current_company_id,
        model_name=model_name,
    )


@router.post("/requests/{request_id}/action", response_model=ApprovalActionResponse)
def take_action(
    request_id: int,
    data: ApprovalActionCreate,
    service: ApprovalService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Take an action (approve/reject) on an approval request."""
    action = service.take_action(
        request_id=request_id,
        action_type=data.action_type,
        user_id=current_user.id,
        company_id=current_user.current_company_id,
        comment=data.comment,
    )
    if not action:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    return action
