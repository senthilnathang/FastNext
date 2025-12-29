"""
Workflow API Routes

Endpoints for managing workflow definitions, transitions, and state tracking.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_superuser, get_db
from app.models.user import User

from ..models.workflow import (
    WorkflowDefinition,
    WorkflowTransition,
    WorkflowState,
    WorkflowActivity,
)
from ..services.workflow_service import WorkflowService


router = APIRouter(prefix="/workflows", tags=["Workflows"])


# -------------------------------------------------------------------------
# Response Models
# -------------------------------------------------------------------------


class StateDefinition(BaseModel):
    """State definition in workflow."""

    code: str
    name: str
    sequence: int = 10
    is_start: bool = False
    is_end: bool = False
    color: Optional[str] = None


class WorkflowResponse(BaseModel):
    """Workflow definition response."""

    id: int
    name: str
    code: str
    description: Optional[str] = None
    module_name: Optional[str] = None
    model_name: str
    state_field: str = "state"
    states: List[Dict[str, Any]] = []
    default_state: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_workflow(cls, wf: WorkflowDefinition) -> "WorkflowResponse":
        return cls(
            id=wf.id,
            name=wf.name,
            code=wf.code,
            description=wf.description,
            module_name=wf.module_name,
            model_name=wf.model_name,
            state_field=wf.state_field,
            states=wf.states or [],
            default_state=wf.default_state,
            is_active=wf.is_active,
            created_at=wf.created_at.isoformat() if wf.created_at else None,
            updated_at=wf.updated_at.isoformat() if wf.updated_at else None,
        )


class TransitionResponse(BaseModel):
    """Transition response."""

    id: int
    workflow_id: int
    name: str
    code: str
    from_state: str
    to_state: str
    condition_domain: List = []
    condition_code: Optional[str] = None
    required_groups: List[str] = []
    action_id: Optional[int] = None
    python_code: Optional[str] = None
    button_name: Optional[str] = None
    button_class: str = "btn-primary"
    icon: Optional[str] = None
    confirm_message: Optional[str] = None
    sequence: int = 10
    is_active: bool = True
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_transition(cls, t: WorkflowTransition) -> "TransitionResponse":
        return cls(
            id=t.id,
            workflow_id=t.workflow_id,
            name=t.name,
            code=t.code,
            from_state=t.from_state,
            to_state=t.to_state,
            condition_domain=t.condition_domain or [],
            condition_code=t.condition_code,
            required_groups=t.required_groups or [],
            action_id=t.action_id,
            python_code=t.python_code,
            button_name=t.button_name,
            button_class=t.button_class,
            icon=t.icon,
            confirm_message=t.confirm_message,
            sequence=t.sequence,
            is_active=t.is_active,
            created_at=t.created_at.isoformat() if t.created_at else None,
        )


class WorkflowStateResponse(BaseModel):
    """Workflow state response."""

    id: int
    workflow_id: int
    model_name: str
    res_id: int
    current_state: str
    previous_state: Optional[str] = None
    history_count: int = 0
    last_changed_by: Optional[int] = None
    last_changed_at: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_state(cls, s: WorkflowState) -> "WorkflowStateResponse":
        return cls(
            id=s.id,
            workflow_id=s.workflow_id,
            model_name=s.model_name,
            res_id=s.res_id,
            current_state=s.current_state,
            previous_state=s.previous_state,
            history_count=len(s.history or []),
            last_changed_by=s.last_changed_by,
            last_changed_at=s.last_changed_at.isoformat() if s.last_changed_at else None,
            created_at=s.created_at.isoformat() if s.created_at else None,
        )


class ActivityResponse(BaseModel):
    """Activity log response."""

    id: int
    workflow_id: Optional[int] = None
    transition_id: Optional[int] = None
    model_name: str
    res_id: int
    from_state: str
    to_state: str
    transition_code: Optional[str] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    note: Optional[str] = None
    is_automatic: bool = False
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_activity(cls, a: WorkflowActivity) -> "ActivityResponse":
        return cls(
            id=a.id,
            workflow_id=a.workflow_id,
            transition_id=a.transition_id,
            model_name=a.model_name,
            res_id=a.res_id,
            from_state=a.from_state,
            to_state=a.to_state,
            transition_code=a.transition_code,
            user_id=a.user_id,
            user_name=a.user_name,
            note=a.note,
            is_automatic=a.is_automatic,
            created_at=a.created_at.isoformat() if a.created_at else None,
        )


# -------------------------------------------------------------------------
# Request Models
# -------------------------------------------------------------------------


class WorkflowCreate(BaseModel):
    """Create workflow request."""

    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=100)
    model_name: str = Field(..., min_length=1, max_length=100)
    states: List[StateDefinition] = Field(..., min_length=1)
    state_field: str = "state"
    default_state: Optional[str] = None
    module_name: Optional[str] = None
    description: Optional[str] = None


class WorkflowUpdate(BaseModel):
    """Update workflow request."""

    name: Optional[str] = None
    description: Optional[str] = None
    states: Optional[List[StateDefinition]] = None
    default_state: Optional[str] = None
    is_active: Optional[bool] = None


class TransitionCreate(BaseModel):
    """Create transition request."""

    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=100)
    from_state: str
    to_state: str
    condition_domain: Optional[List] = None
    condition_code: Optional[str] = None
    required_groups: Optional[List[str]] = None
    action_id: Optional[int] = None
    python_code: Optional[str] = None
    button_name: Optional[str] = None
    button_class: str = "btn-primary"
    icon: Optional[str] = None
    confirm_message: Optional[str] = None
    sequence: int = 10


class TransitionUpdate(BaseModel):
    """Update transition request."""

    name: Optional[str] = None
    condition_domain: Optional[List] = None
    condition_code: Optional[str] = None
    required_groups: Optional[List[str]] = None
    button_name: Optional[str] = None
    button_class: Optional[str] = None
    icon: Optional[str] = None
    confirm_message: Optional[str] = None
    sequence: Optional[int] = None
    is_active: Optional[bool] = None


class ExecuteTransitionRequest(BaseModel):
    """Execute transition request."""

    transition_id: int
    model_name: str
    res_id: int
    note: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class AvailableTransition(BaseModel):
    """Available transition for a record."""

    id: int
    code: str
    name: str
    from_state: str
    to_state: str
    button_name: Optional[str] = None
    button_class: str = "btn-primary"
    icon: Optional[str] = None
    confirm_message: Optional[str] = None


class VisualizationData(BaseModel):
    """Workflow visualization data."""

    workflow_code: str
    workflow_name: str
    model_name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


# -------------------------------------------------------------------------
# Workflow Definition Endpoints
# -------------------------------------------------------------------------


@router.get("/", response_model=List[WorkflowResponse])
def list_workflows(
    module_name: Optional[str] = Query(None, description="Filter by module"),
    model_name: Optional[str] = Query(None, description="Filter by model"),
    active_only: bool = Query(True, description="Only active workflows"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[WorkflowResponse]:
    """List all workflow definitions."""
    service = WorkflowService(db)
    workflows = service.get_workflows(
        module_name=module_name,
        model_name=model_name,
        active_only=active_only,
    )
    return [WorkflowResponse.from_workflow(wf) for wf in workflows]


@router.get("/{code}", response_model=WorkflowResponse)
def get_workflow(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> WorkflowResponse:
    """Get a workflow by code."""
    service = WorkflowService(db)
    workflow = service.get_workflow(code)

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{code}' not found"
        )

    return WorkflowResponse.from_workflow(workflow)


@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
def create_workflow(
    data: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> WorkflowResponse:
    """Create a new workflow. Requires superuser permissions."""
    service = WorkflowService(db)

    # Check if already exists
    existing = service.get_workflow(data.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Workflow '{data.code}' already exists"
        )

    try:
        workflow = service.create_workflow(
            name=data.name,
            code=data.code,
            model_name=data.model_name,
            states=[s.model_dump() for s in data.states],
            state_field=data.state_field,
            default_state=data.default_state,
            module_name=data.module_name,
            description=data.description,
        )
        db.commit()
        return WorkflowResponse.from_workflow(workflow)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{code}", response_model=WorkflowResponse)
def update_workflow(
    code: str,
    data: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> WorkflowResponse:
    """Update a workflow. Requires superuser permissions."""
    service = WorkflowService(db)

    update_data = data.model_dump(exclude_unset=True)
    if "states" in update_data:
        update_data["states"] = [s.model_dump() if hasattr(s, 'model_dump') else s for s in update_data["states"]]

    try:
        workflow = service.update_workflow(code, **update_data)
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow '{code}' not found"
            )
        db.commit()
        return WorkflowResponse.from_workflow(workflow)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> None:
    """Delete a workflow. Requires superuser permissions."""
    service = WorkflowService(db)

    if not service.delete_workflow(code):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{code}' not found"
        )

    db.commit()


# -------------------------------------------------------------------------
# Transition Endpoints
# -------------------------------------------------------------------------


@router.get("/{code}/transitions", response_model=List[TransitionResponse])
def list_transitions(
    code: str,
    from_state: Optional[str] = Query(None, description="Filter by source state"),
    active_only: bool = Query(True, description="Only active transitions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[TransitionResponse]:
    """List transitions for a workflow."""
    service = WorkflowService(db)

    workflow = service.get_workflow(code)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{code}' not found"
        )

    transitions = service.get_transitions(
        workflow_id=workflow.id,
        from_state=from_state,
        active_only=active_only,
    )

    return [TransitionResponse.from_transition(t) for t in transitions]


@router.post("/{code}/transitions", response_model=TransitionResponse, status_code=status.HTTP_201_CREATED)
def create_transition(
    code: str,
    data: TransitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> TransitionResponse:
    """Create a new transition. Requires superuser permissions."""
    service = WorkflowService(db)

    workflow = service.get_workflow(code)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{code}' not found"
        )

    try:
        transition = service.create_transition(
            workflow_id=workflow.id,
            name=data.name,
            code=data.code,
            from_state=data.from_state,
            to_state=data.to_state,
            condition_domain=data.condition_domain,
            condition_code=data.condition_code,
            required_groups=data.required_groups,
            action_id=data.action_id,
            python_code=data.python_code,
            button_name=data.button_name,
            button_class=data.button_class,
            icon=data.icon,
            confirm_message=data.confirm_message,
            sequence=data.sequence,
        )
        db.commit()
        return TransitionResponse.from_transition(transition)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/transitions/{transition_id}", response_model=TransitionResponse)
def update_transition(
    transition_id: int,
    data: TransitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> TransitionResponse:
    """Update a transition. Requires superuser permissions."""
    service = WorkflowService(db)

    update_data = data.model_dump(exclude_unset=True)
    transition = service.update_transition(transition_id, **update_data)

    if not transition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transition {transition_id} not found"
        )

    db.commit()
    return TransitionResponse.from_transition(transition)


@router.delete("/transitions/{transition_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transition(
    transition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> None:
    """Delete a transition. Requires superuser permissions."""
    service = WorkflowService(db)

    if not service.delete_transition(transition_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transition {transition_id} not found"
        )

    db.commit()


# -------------------------------------------------------------------------
# State Endpoints
# -------------------------------------------------------------------------


@router.get("/state/{model_name}/{res_id}", response_model=Dict[str, Any])
def get_record_state(
    model_name: str,
    res_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """Get workflow state for a record."""
    service = WorkflowService(db)
    state_info = service.get_state_info(model_name, res_id)

    if not state_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No workflow state found for {model_name}:{res_id}"
        )

    return state_info


@router.get("/state/{model_name}/{res_id}/available", response_model=List[AvailableTransition])
def get_available_transitions(
    model_name: str,
    res_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[AvailableTransition]:
    """Get available transitions for a record."""
    service = WorkflowService(db)

    # Get user groups (simplified - you may want to expand this)
    user_groups = []
    if current_user.is_superuser:
        user_groups = ["admin", "superuser"]

    transitions = service.get_available_transitions(
        model_name=model_name,
        res_id=res_id,
        user_id=current_user.id,
        user_groups=user_groups,
    )

    return [AvailableTransition(**t) for t in transitions]


@router.get("/state/{model_name}/{res_id}/history", response_model=List[Dict[str, Any]])
def get_workflow_history(
    model_name: str,
    res_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[Dict[str, Any]]:
    """Get state change history for a record."""
    service = WorkflowService(db)
    return service.get_workflow_history(model_name, res_id)


# -------------------------------------------------------------------------
# Transition Execution
# -------------------------------------------------------------------------


@router.post("/execute", response_model=Dict[str, Any])
def execute_transition(
    data: ExecuteTransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """Execute a workflow transition."""
    service = WorkflowService(db)

    result = service.execute_transition(
        transition_id=data.transition_id,
        model_name=data.model_name,
        res_id=data.res_id,
        user_id=current_user.id,
        user_name=getattr(current_user, 'full_name', None) or current_user.email,
        note=data.note,
        context=data.context,
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Transition failed")
        )

    db.commit()
    return result


# -------------------------------------------------------------------------
# Visualization
# -------------------------------------------------------------------------


@router.get("/{code}/visualization", response_model=VisualizationData)
def get_visualization(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> VisualizationData:
    """Get workflow visualization data for diagram rendering."""
    service = WorkflowService(db)
    data = service.get_visualization_data(code)

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{code}' not found"
        )

    return VisualizationData(**data)


# -------------------------------------------------------------------------
# Activity Logs
# -------------------------------------------------------------------------


@router.get("/activities/", response_model=List[ActivityResponse])
def list_activities(
    model_name: Optional[str] = Query(None, description="Filter by model"),
    res_id: Optional[int] = Query(None, description="Filter by record ID"),
    workflow_id: Optional[int] = Query(None, description="Filter by workflow"),
    user_id: Optional[int] = Query(None, description="Filter by user"),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[ActivityResponse]:
    """List workflow activities."""
    service = WorkflowService(db)
    activities = service.get_activities(
        model_name=model_name,
        res_id=res_id,
        workflow_id=workflow_id,
        user_id=user_id,
        limit=limit,
    )
    return [ActivityResponse.from_activity(a) for a in activities]


# -------------------------------------------------------------------------
# Batch Operations
# -------------------------------------------------------------------------


@router.get("/{code}/records/{state}", response_model=List[Dict[str, Any]])
def get_records_in_state(
    code: str,
    state: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[Dict[str, Any]]:
    """Get all records in a specific workflow state."""
    service = WorkflowService(db)
    return service.get_records_in_state(code, state)


# -------------------------------------------------------------------------
# Model Workflow
# -------------------------------------------------------------------------


@router.get("/model/{model_name}", response_model=Optional[WorkflowResponse])
def get_model_workflow(
    model_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Optional[WorkflowResponse]:
    """Get the active workflow for a model."""
    service = WorkflowService(db)
    workflow = service.get_workflow_for_model(model_name)

    if workflow:
        return WorkflowResponse.from_workflow(workflow)
    return None
