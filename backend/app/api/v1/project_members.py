from typing import Any, List

from app.auth.deps import get_current_active_user
from app.db.session import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.project_member import ProjectMember as ProjectMemberSchema
from app.schemas.project_member import (
    ProjectMemberCreate,
    ProjectMemberInvite,
    ProjectMemberUpdate,
    ProjectMemberWithDetails,
)
from app.services.permission_service import PermissionService
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.get(
    "/project/{project_id}/members", response_model=List[ProjectMemberWithDetails]
)
def read_project_members(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get project members"""
    # Check if user has access to project
    if not PermissionService.check_project_permission(
        db, current_user.id, project_id, "read"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Project access denied"
        )

    members = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.is_active == True)
        .all()
    )

    # Add user and role details
    member_details = []
    for member in members:
        member_dict = member.__dict__.copy()
        member_dict["user_email"] = member.user.email if member.user else None
        member_dict["user_username"] = member.user.username if member.user else None
        member_dict["role_name"] = member.role.name if member.role else None
        member_details.append(member_dict)

    return member_details


@router.post("/project/{project_id}/members", response_model=ProjectMemberSchema)
def add_project_member(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    member_in: ProjectMemberCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Add member to project"""
    # Check if user can manage project
    if not PermissionService.check_project_permission(
        db, current_user.id, project_id, "manage"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project management access required",
        )

    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify user exists
    user = db.query(User).filter(User.id == member_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    member = PermissionService.add_project_member(
        db, project_id, member_in.user_id, member_in.role_id, current_user.id
    )

    return member


@router.post("/project/{project_id}/invite", response_model=dict)
def invite_project_member(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    invite_in: ProjectMemberInvite,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Invite user to project by email"""
    # Check if user can manage project
    if not PermissionService.check_project_permission(
        db, current_user.id, project_id, "manage"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project management access required",
        )

    # Find user by email
    user = db.query(User).filter(User.email == invite_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found")

    member = PermissionService.add_project_member(
        db, project_id, user.id, invite_in.role_id, current_user.id
    )

    return {"message": "User invited to project successfully", "member_id": member.id}


@router.put("/members/{member_id}", response_model=ProjectMemberSchema)
def update_project_member(
    *,
    db: Session = Depends(get_db),
    member_id: int,
    member_in: ProjectMemberUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update project member"""
    member = db.query(ProjectMember).filter(ProjectMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found")

    # Check if user can manage project
    if not PermissionService.check_project_permission(
        db, current_user.id, member.project_id, "manage"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project management access required",
        )

    member_data = member_in.dict(exclude_unset=True)
    for field, value in member_data.items():
        setattr(member, field, value)

    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/members/{member_id}")
def remove_project_member(
    *,
    db: Session = Depends(get_db),
    member_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Remove member from project"""
    member = db.query(ProjectMember).filter(ProjectMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found")

    # Check if user can manage project
    if not PermissionService.check_project_permission(
        db, current_user.id, member.project_id, "manage"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project management access required",
        )

    member.is_active = False
    db.add(member)
    db.commit()

    return {"message": "Member removed from project successfully"}


@router.get("/user/projects", response_model=List[dict])
def get_user_projects(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get projects where user is a member or owner"""
    # Get owned projects
    owned_projects = db.query(Project).filter(Project.user_id == current_user.id).all()

    # Get projects where user is a member
    memberships = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.user_id == current_user.id, ProjectMember.is_active == True
        )
        .all()
    )

    projects = []

    # Add owned projects
    for project in owned_projects:
        projects.append(
            {"project": project, "role": "owner", "permissions": ["manage"]}
        )

    # Add member projects
    for membership in memberships:
        if membership.project not in [p["project"] for p in projects]:
            projects.append(
                {
                    "project": membership.project,
                    "role": membership.role.name if membership.role else "member",
                    "permissions": [],  # TODO: Get actual permissions from role
                }
            )

    return projects
