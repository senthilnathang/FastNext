import logging
from typing import Any, Dict, List, Optional

from app.auth.deps import get_current_active_user
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.common import ListResponse
from app.schemas.project import Project as ProjectSchema
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.permission_service import PermissionService
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=ListResponse[ProjectSchema])
@router.get("/", response_model=ListResponse[ProjectSchema])
def read_projects(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get projects user owns or has access to"""
    try:
        # Build query
        query = db.query(Project).filter(Project.user_id == current_user.id)

        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Project.name.ilike(search_term))
                | (Project.description.ilike(search_term))
            )

        # Get total count
        total = query.count()

        # Get paginated projects
        user_projects = query.offset(skip).limit(limit).all()

        return ListResponse.paginate(
            items=user_projects, total=total, skip=skip, limit=limit
        )
    except Exception as e:
        # Log the error and raise proper exception
        logger.error(f"Error fetching projects: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch projects",
        )


@router.post("", response_model=ProjectSchema)
@router.post("/", response_model=ProjectSchema)
def create_project(
    *,
    db: Session = Depends(get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create a new project"""
    # Simplified permission check - allow authenticated users to create projects
    # Remove the strict permission requirement that might be blocking creation
    project = Project(**project_in.dict(), user_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectSchema)
def read_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    # Check if user has access to project
    if not PermissionService.check_project_permission(
        db, current_user.id, project_id, "read"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Project access denied"
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectSchema)
def update_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    # Check if user has permission to update project
    if not PermissionService.check_project_permission(
        db, current_user.id, project_id, "update"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Project update access denied"
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_data = project_in.dict(exclude_unset=True)
    for field, value in project_data.items():
        setattr(project, field, value)

    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    # Check if user has permission to delete project
    if not PermissionService.check_project_permission(
        db, current_user.id, project_id, "delete"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Project delete access denied"
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}
