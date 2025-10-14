"""
RLS-Enhanced Projects API

Example implementation showing how to integrate Row Level Security
with existing project endpoints.
"""

from typing import Any, List

from app.auth.deps import get_current_active_user
from app.db.session import get_db
from app.middleware.rls_middleware import (
    get_rls_service,
    require_rls_access,
    rls_audit_action,
    rls_filter_query,
)
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.row_level_security import RLSAction, RLSEntityType
from app.models.user import User
from app.schemas.common import ListResponse
from app.schemas.project import Project as ProjectSchema
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.rls_service import RLSService
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Query, Session

router = APIRouter()


@router.get("", response_model=ListResponse[ProjectSchema], tags=["Projects RLS"])
@router.get("/", response_model=ListResponse[ProjectSchema], tags=["Projects RLS"])
@rls_filter_query(RLSEntityType.PROJECT, RLSAction.SELECT)
async def read_projects_rls(
    *,
    db: Session = Depends(get_db),
    request: Request,
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get projects with RLS filtering applied

    This endpoint demonstrates how RLS automatically filters
    results based on user permissions and context.
    """
    try:
        # Get RLS service from request context
        rls_service = get_rls_service(request)

        # Build base query
        query = db.query(Project)

        # Apply RLS filtering
        if rls_service:
            context = getattr(request.state, "rls_context", None)
            session_id = context.session_id if context else None

            query = rls_service.apply_rls_filter(
                query=query,
                user_id=current_user.id,
                entity_type=RLSEntityType.PROJECT,
                action=RLSAction.SELECT,
                session_id=session_id,
            )
        else:
            # Fallback to basic filtering if RLS not available
            query = query.filter(
                or_(
                    Project.user_id == current_user.id,  # Owned projects
                    Project.is_public == True,  # Public projects
                    Project.id.in_(  # Member projects
                        db.query(ProjectMember.project_id).filter(
                            ProjectMember.user_id == current_user.id,
                            ProjectMember.is_active == True,
                        )
                    ),
                )
            )

        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Project.name.ilike(search_term),
                    Project.description.ilike(search_term),
                )
            )

        # Get total count
        total = query.count()

        # Get paginated projects
        projects = query.offset(skip).limit(limit).all()

        return ListResponse.paginate(
            items=projects, total=total, skip=skip, limit=limit
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve projects: {str(e)}",
        )


@router.post("", response_model=ProjectSchema, tags=["Projects RLS"])
@router.post("/", response_model=ProjectSchema, tags=["Projects RLS"])
@require_rls_access(RLSEntityType.PROJECT, RLSAction.INSERT)
@rls_audit_action(RLSEntityType.PROJECT, RLSAction.INSERT, "Create new project")
async def create_project_rls(
    *,
    db: Session = Depends(get_db),
    request: Request,
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create project with RLS access control

    Demonstrates RLS enforcement on create operations.
    """
    try:
        # Create project
        project = Project(
            name=project_in.name,
            description=project_in.description,
            user_id=current_user.id,
            is_public=project_in.is_public,
            settings=project_in.settings or {},
        )

        db.add(project)
        db.commit()
        db.refresh(project)

        # Auto-create RLS policies for the new project
        rls_service = get_rls_service(request)
        if rls_service:
            await _create_project_rls_policies(rls_service, project, current_user.id)

        return project

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create project: {str(e)}",
        )


@router.get("/{project_id}", response_model=ProjectSchema, tags=["Projects RLS"])
@require_rls_access(
    RLSEntityType.PROJECT, RLSAction.SELECT, entity_id_param="project_id"
)
@rls_audit_action(RLSEntityType.PROJECT, RLSAction.SELECT, "View project details")
async def read_project_rls(
    *,
    db: Session = Depends(get_db),
    request: Request,
    project_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get project by ID with RLS access control

    Access is automatically checked against RLS policies.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    return project


@router.put("/{project_id}", response_model=ProjectSchema, tags=["Projects RLS"])
@require_rls_access(
    RLSEntityType.PROJECT, RLSAction.UPDATE, entity_id_param="project_id"
)
@rls_audit_action(RLSEntityType.PROJECT, RLSAction.UPDATE, "Update project")
async def update_project_rls(
    *,
    db: Session = Depends(get_db),
    request: Request,
    project_id: int,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update project with RLS access control
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    try:
        # Update project fields
        update_data = project_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)

        db.commit()
        db.refresh(project)

        return project

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update project: {str(e)}",
        )


@router.delete("/{project_id}", tags=["Projects RLS"])
@require_rls_access(
    RLSEntityType.PROJECT, RLSAction.DELETE, entity_id_param="project_id"
)
@rls_audit_action(RLSEntityType.PROJECT, RLSAction.DELETE, "Delete project")
async def delete_project_rls(
    *,
    db: Session = Depends(get_db),
    request: Request,
    project_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete project with RLS access control
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    try:
        # Delete project
        db.delete(project)
        db.commit()

        return {"message": "Project deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete project: {str(e)}",
        )


# RLS-specific endpoints


@router.get("/{project_id}/rls-status", tags=["Projects RLS"])
@require_rls_access(
    RLSEntityType.PROJECT, RLSAction.SELECT, entity_id_param="project_id"
)
async def get_project_rls_status(
    *,
    db: Session = Depends(get_db),
    request: Request,
    project_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get RLS status and policies for a project
    """
    rls_service = get_rls_service(request)
    if not rls_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RLS service not available",
        )

    # Get applicable policies
    policies = rls_service.get_applicable_policies(
        entity_type=RLSEntityType.PROJECT, action=RLSAction.ALL, user_id=current_user.id
    )

    # Check user's access levels
    access_checks = {}
    for action in [RLSAction.SELECT, RLSAction.UPDATE, RLSAction.DELETE]:
        context = getattr(request.state, "rls_context", None)
        session_id = context.session_id if context else None

        access_granted, denial_reason = rls_service.check_access(
            user_id=current_user.id,
            entity_type=RLSEntityType.PROJECT,
            action=action,
            entity_id=project_id,
            session_id=session_id,
            request=request,
        )

        access_checks[action.value] = {
            "granted": access_granted,
            "reason": denial_reason,
        }

    return {
        "project_id": project_id,
        "rls_enabled": True,
        "applicable_policies": [
            {
                "id": policy.id,
                "name": policy.name,
                "policy_type": policy.policy_type.value,
                "action": policy.action.value,
            }
            for policy in policies
        ],
        "access_levels": access_checks,
        "user_context": {
            "user_id": current_user.id,
            "session_id": getattr(request.state, "rls_context", {}).get("session_id"),
            "roles": getattr(request.state, "rls_context", {}).get("roles", []),
            "permissions": getattr(request.state, "rls_context", {}).get(
                "permissions", []
            ),
        },
    }


@router.post("/{project_id}/rls-test", tags=["Projects RLS"])
@require_rls_access(
    RLSEntityType.PROJECT, RLSAction.SELECT, entity_id_param="project_id"
)
async def test_project_rls_access(
    *,
    db: Session = Depends(get_db),
    request: Request,
    project_id: int,
    action: RLSAction,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Test RLS access for a specific action on a project
    """
    rls_service = get_rls_service(request)
    if not rls_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RLS service not available",
        )

    context = getattr(request.state, "rls_context", None)
    session_id = context.session_id if context else None

    access_granted, denial_reason = rls_service.check_access(
        user_id=current_user.id,
        entity_type=RLSEntityType.PROJECT,
        action=action,
        entity_id=project_id,
        session_id=session_id,
        request=request,
    )

    return {
        "project_id": project_id,
        "action": action.value,
        "access_granted": access_granted,
        "denial_reason": denial_reason,
        "tested_at": func.now(),
    }


# Helper functions


async def _create_project_rls_policies(
    rls_service: RLSService, project: Project, created_by: int
):
    """
    Create default RLS policies for a new project
    """
    try:
        # Owner full access policy
        rls_service.create_policy(
            name=f"Project {project.id} Owner Access",
            entity_type=RLSEntityType.PROJECT,
            table_name="projects",
            policy_type="OWNER_ONLY",
            action=RLSAction.ALL,
            created_by=created_by,
            description=f"Full access for project {project.name} owner",
            condition_column="user_id",
            priority=100,
        )

        # Public read access policy (if project is public)
        if project.is_public:
            rls_service.create_policy(
                name=f"Project {project.id} Public Read",
                entity_type=RLSEntityType.PROJECT,
                table_name="projects",
                policy_type="PUBLIC",
                action=RLSAction.SELECT,
                created_by=created_by,
                description=f"Public read access for project {project.name}",
                priority=50,
            )

        # Member access policy
        rls_service.create_policy(
            name=f"Project {project.id} Member Access",
            entity_type=RLSEntityType.PROJECT,
            table_name="projects",
            policy_type="PROJECT_MEMBER",
            action=RLSAction.SELECT,
            created_by=created_by,
            description=f"Member access for project {project.name}",
            priority=75,
        )

    except Exception as e:
        # Log error but don't fail project creation
        from app.core.logging import get_logger

        logger = get_logger(__name__)
        logger.error(f"Failed to create RLS policies for project {project.id}: {e}")


# Bulk operations with RLS


@router.post("/bulk-delete", tags=["Projects RLS"])
async def bulk_delete_projects_rls(
    *,
    db: Session = Depends(get_db),
    request: Request,
    project_ids: List[int],
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Bulk delete projects with RLS access control

    Each project is individually checked for delete access.
    """
    rls_service = get_rls_service(request)
    context = getattr(request.state, "rls_context", None)
    session_id = context.session_id if context else None

    results = {"deleted": [], "failed": [], "access_denied": []}

    for project_id in project_ids:
        try:
            # Check delete access
            if rls_service:
                access_granted, denial_reason = rls_service.check_access(
                    user_id=current_user.id,
                    entity_type=RLSEntityType.PROJECT,
                    action=RLSAction.DELETE,
                    entity_id=project_id,
                    session_id=session_id,
                    request=request,
                )

                if not access_granted:
                    results["access_denied"].append(
                        {"project_id": project_id, "reason": denial_reason}
                    )
                    continue

            # Get and delete project
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                db.delete(project)
                db.commit()
                results["deleted"].append(project_id)
            else:
                results["failed"].append(
                    {"project_id": project_id, "reason": "Project not found"}
                )

        except Exception as e:
            db.rollback()
            results["failed"].append({"project_id": project_id, "reason": str(e)})

    return {
        "summary": {
            "total_requested": len(project_ids),
            "deleted_count": len(results["deleted"]),
            "failed_count": len(results["failed"]),
            "access_denied_count": len(results["access_denied"]),
        },
        "results": results,
    }
