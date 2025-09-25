from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.services.permission_service import PermissionService
from app.db.session import get_db
from app.models.user import User
from app.models.workflow import WorkflowInstance, WorkflowTemplate
from app.schemas.workflow import (
    WorkflowInstance as WorkflowInstanceSchema, 
    WorkflowInstanceCreate, 
    WorkflowInstanceUpdate,
    WorkflowAction
)
from app.schemas.common import ListResponse
from app.services.workflow_engine import get_workflow_engine, WorkflowExecutionError

router = APIRouter()


@router.get("", response_model=ListResponse[WorkflowInstanceSchema])
@router.get("/", response_model=ListResponse[WorkflowInstanceSchema])
def read_workflow_instances(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    entity_type: str = None,
    status: str = None,
    workflow_type_id: int = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get workflow instances"""
    try:
        query = db.query(WorkflowInstance)
        
        # Filter by entity type
        if entity_type:
            query = query.filter(WorkflowInstance.entity_type == entity_type)
        
        # Filter by status
        if status:
            query = query.filter(WorkflowInstance.status == status)
        
        # Filter by workflow type
        if workflow_type_id:
            query = query.filter(WorkflowInstance.workflow_type_id == workflow_type_id)
        
        # Filter by user access (only instances user created or is assigned to)
        if not PermissionService.check_permission(db, current_user.id, "read", "all_workflow_instances"):
            query = query.filter(
                (WorkflowInstance.created_by == current_user.id) |
                (WorkflowInstance.assigned_to == current_user.id)
            )
        
        total = query.count()
        instances = query.offset(skip).limit(limit).all()
        
        return ListResponse.paginate(
            items=instances,
            total=total,
            skip=skip,
            limit=limit
        )
    except Exception as e:
        print(f"Error fetching workflow instances: {e}")
        return ListResponse.paginate(items=[], total=0, skip=skip, limit=limit)


@router.post("", response_model=WorkflowInstanceSchema)
@router.post("/", response_model=WorkflowInstanceSchema)
async def create_workflow_instance(
    *,
    db: Session = Depends(get_db),
    instance_in: WorkflowInstanceCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Start a new workflow instance"""
    
    # Check if user has permission to create workflow instances
    if not PermissionService.check_permission(db, current_user.id, "create", "workflow_instance"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create workflow instances"
        )
    
    # Verify template exists and is active
    template = db.query(WorkflowTemplate).filter(
        WorkflowTemplate.id == instance_in.template_id
    ).first()
    if not template or not template.is_active:
        raise HTTPException(status_code=404, detail="Active workflow template not found")
    
    try:
        engine = get_workflow_engine(db)
        instance = await engine.start_workflow(
            template_id=instance_in.template_id,
            entity_id=instance_in.entity_id,
            entity_type=instance_in.entity_type,
            initial_data=instance_in.data,
            created_by=current_user.id,
            title=instance_in.title
        )
        return instance
        
    except WorkflowExecutionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{instance_id}", response_model=WorkflowInstanceSchema)
def read_workflow_instance(
    *,
    db: Session = Depends(get_db),
    instance_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get workflow instance by ID"""
    
    instance = db.query(WorkflowInstance).filter(WorkflowInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Workflow instance not found")
    
    # Check access permissions
    if not PermissionService.check_permission(db, current_user.id, "read", "all_workflow_instances"):
        if instance.created_by != current_user.id and instance.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this workflow instance"
            )
    
    return instance


@router.post("/{instance_id}/actions")
async def execute_workflow_action(
    *,
    db: Session = Depends(get_db),
    instance_id: int,
    action_data: WorkflowAction,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Execute an action on a workflow instance"""
    
    instance = db.query(WorkflowInstance).filter(WorkflowInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Workflow instance not found")
    
    # Check if user can execute actions on this instance
    if not PermissionService.check_permission(db, current_user.id, "update", "workflow_instance"):
        if instance.created_by != current_user.id and instance.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to execute actions on this workflow instance"
            )
    
    try:
        engine = get_workflow_engine(db)
        result = await engine.execute_action(
            instance_id=instance_id,
            action=action_data.action,
            user_id=current_user.id,
            comment=action_data.comment,
            data=action_data.metadata
        )
        
        # Refresh instance to get updated state
        db.refresh(instance)
        
        return {
            "result": result.value,
            "instance": instance,
            "message": f"Action '{action_data.action}' executed successfully"
        }
        
    except WorkflowExecutionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{instance_id}", response_model=WorkflowInstanceSchema)
def update_workflow_instance(
    *,
    db: Session = Depends(get_db),
    instance_id: int,
    instance_in: WorkflowInstanceUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update workflow instance (administrative)"""
    
    # Check if user has permission to update workflow instances
    if not PermissionService.check_permission(db, current_user.id, "update", "workflow_instance"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update workflow instances"
        )
    
    instance = db.query(WorkflowInstance).filter(WorkflowInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Workflow instance not found")
    
    instance_data = instance_in.dict(exclude_unset=True)
    for field, value in instance_data.items():
        setattr(instance, field, value)
    
    db.add(instance)
    db.commit()
    db.refresh(instance)
    return instance


@router.post("/process-pending")
async def process_pending_workflows(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Process all pending workflows (admin only)"""
    
    if not PermissionService.check_permission(db, current_user.id, "admin", "workflow_processing"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to process workflows"
        )
    
    engine = get_workflow_engine(db)
    
    # Add to background tasks for async processing
    background_tasks.add_task(engine.process_pending_workflows)
    
    return {"message": "Workflow processing started in background"}


@router.get("/{instance_id}/history")
def get_workflow_history(
    *,
    db: Session = Depends(get_db),
    instance_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get workflow instance history"""
    
    instance = db.query(WorkflowInstance).filter(WorkflowInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Workflow instance not found")
    
    # Check access permissions
    if not PermissionService.check_permission(db, current_user.id, "read", "all_workflow_instances"):
        if instance.created_by != current_user.id and instance.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this workflow instance"
            )
    
    return instance.history


@router.get("/{instance_id}/available-actions")
def get_available_actions(
    *,
    db: Session = Depends(get_db),
    instance_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get available actions for current workflow state"""
    
    instance = db.query(WorkflowInstance).filter(WorkflowInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Workflow instance not found")
    
    # Check access permissions
    if not PermissionService.check_permission(db, current_user.id, "read", "all_workflow_instances"):
        if instance.created_by != current_user.id and instance.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this workflow instance"
            )
    
    template = instance.template
    available_actions = []
    
    # Find available actions from current state
    for edge in template.edges:
        source_node = None
        for node in template.nodes:
            if (node.get("id") == edge.get("source") and 
                node.get("data", {}).get("stateId") == instance.current_state_id):
                source_node = node
                break
        
        if source_node:
            action_data = edge.get("data", {})
            available_actions.append({
                "action": action_data.get("action"),
                "label": action_data.get("label"),
                "requires_approval": action_data.get("requiresApproval", False),
                "allowed_roles": action_data.get("allowedRoles", [])
            })
    
    return {"available_actions": available_actions}