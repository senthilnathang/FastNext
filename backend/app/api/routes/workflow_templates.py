from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.services.permission_service import PermissionService
from app.db.session import get_db
from app.models.user import User
from app.models.workflow import WorkflowTemplate, WorkflowType, WorkflowState
from app.schemas.workflow import WorkflowTemplate as WorkflowTemplateSchema, WorkflowTemplateCreate, WorkflowTemplateUpdate
from app.schemas.common import ListResponse

router = APIRouter()


@router.get("", response_model=ListResponse[WorkflowTemplateSchema])
@router.get("/", response_model=ListResponse[WorkflowTemplateSchema])
def read_workflow_templates(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    workflow_type_id: int = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get workflow templates"""
    try:
        query = db.query(WorkflowTemplate).filter(WorkflowTemplate.is_active == True)
        
        if workflow_type_id:
            query = query.filter(WorkflowTemplate.workflow_type_id == workflow_type_id)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (WorkflowTemplate.name.ilike(search_term)) |
                (WorkflowTemplate.description.ilike(search_term))
            )
        
        total = query.count()
        templates = query.offset(skip).limit(limit).all()
        
        return ListResponse.paginate(
            items=templates,
            total=total,
            skip=skip,
            limit=limit
        )
    except Exception as e:
        print(f"Error fetching workflow templates: {e}")
        return ListResponse.paginate(items=[], total=0, skip=skip, limit=limit)


@router.post("", response_model=WorkflowTemplateSchema)
@router.post("/", response_model=WorkflowTemplateSchema)
def create_workflow_template(
    *,
    db: Session = Depends(get_db),
    template_in: WorkflowTemplateCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create workflow template"""
    # Check if user has permission to create workflow templates
    if not PermissionService.check_permission(db, current_user.id, "create", "workflow_template"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create workflow templates"
        )
    
    # Verify workflow type exists
    workflow_type = db.query(WorkflowType).filter(WorkflowType.id == template_in.workflow_type_id).first()
    if not workflow_type:
        raise HTTPException(status_code=404, detail="Workflow type not found")
    
    # Verify default state exists if provided
    if template_in.default_state_id:
        default_state = db.query(WorkflowState).filter(WorkflowState.id == template_in.default_state_id).first()
        if not default_state:
            raise HTTPException(status_code=404, detail="Default state not found")
    
    template = WorkflowTemplate(
        **template_in.dict(),
        created_by=current_user.id
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get("/{template_id}", response_model=WorkflowTemplateSchema)
def read_workflow_template(
    *,
    db: Session = Depends(get_db),
    template_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get workflow template by ID"""
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Workflow template not found")
    return template


@router.put("/{template_id}", response_model=WorkflowTemplateSchema)
def update_workflow_template(
    *,
    db: Session = Depends(get_db),
    template_id: int,
    template_in: WorkflowTemplateUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update workflow template"""
    # Check if user has permission to update workflow templates
    if not PermissionService.check_permission(db, current_user.id, "update", "workflow_template"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update workflow templates"
        )
    
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Workflow template not found")
    
    # Verify default state exists if being updated
    if template_in.default_state_id:
        default_state = db.query(WorkflowState).filter(WorkflowState.id == template_in.default_state_id).first()
        if not default_state:
            raise HTTPException(status_code=404, detail="Default state not found")
    
    template_data = template_in.dict(exclude_unset=True)
    for field, value in template_data.items():
        setattr(template, field, value)
    
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}")
def delete_workflow_template(
    *,
    db: Session = Depends(get_db),
    template_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Delete workflow template (soft delete)"""
    # Check if user has permission to delete workflow templates
    if not PermissionService.check_permission(db, current_user.id, "delete", "workflow_template"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete workflow templates"
        )
    
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Workflow template not found")
    
    # Soft delete
    template.is_active = False
    db.add(template)
    db.commit()
    
    return {"message": "Workflow template deleted successfully"}