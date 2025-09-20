from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.user_role import UserRole, RolePermission
from app.models.project_member import ProjectMember
from app.models.project import Project


class PermissionService:
    """Enhanced service for managing user permissions and role-based access control with generic CRUD operations"""
    
    @staticmethod
    def get_user_permissions(db: Session, user_id: int) -> List[Permission]:
        """Get all permissions for a user (from both global roles and project roles)"""
        permissions = []
        
        # Get permissions from global user roles
        global_roles = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.is_active == True
        ).all()
        
        for user_role in global_roles:
            role_permissions = db.query(RolePermission).filter(
                RolePermission.role_id == user_role.role_id
            ).all()
            
            for rp in role_permissions:
                if rp.permission not in permissions:
                    permissions.append(rp.permission)
        
        # Get permissions from project-specific roles
        project_memberships = db.query(ProjectMember).filter(
            ProjectMember.user_id == user_id,
            ProjectMember.is_active == True
        ).all()
        
        for membership in project_memberships:
            role_permissions = db.query(RolePermission).filter(
                RolePermission.role_id == membership.role_id
            ).all()
            
            for rp in role_permissions:
                if rp.permission not in permissions:
                    permissions.append(rp.permission)
        
        return permissions
    
    @staticmethod
    def check_permission(
        db: Session, 
        user_id: int, 
        action: str, 
        category: str, 
        resource_id: Optional[int] = None
    ) -> bool:
        """Check if user has specific permission"""
        # Superusers have all permissions
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.is_superuser:
            return True
        
        permissions = PermissionService.get_user_permissions(db, user_id)
        
        # Check for exact permission match
        for permission in permissions:
            if (permission.action == action and 
                permission.category == category):
                return True
            
            # Check for manage permission (implies all actions)
            if (permission.action == "manage" and 
                permission.category == category):
                return True
        
        return False
    
    @staticmethod
    def check_project_permission(
        db: Session, 
        user_id: int, 
        project_id: int, 
        action: str
    ) -> bool:
        """Check if user has permission for specific project"""
        # Check if user is project owner
        project = db.query(Project).filter(Project.id == project_id).first()
        if project and project.user_id == user_id:
            return True
        
        # Check project membership permissions
        membership = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.is_active == True
        ).first()
        
        if not membership:
            return False
        
        # Get role permissions
        role_permissions = db.query(RolePermission).filter(
            RolePermission.role_id == membership.role_id
        ).all()
        
        for rp in role_permissions:
            permission = rp.permission
            if (permission.action == action and 
                permission.category == "project"):
                return True
            
            if (permission.action == "manage" and 
                permission.category == "project"):
                return True
        
        return False
    
    @staticmethod
    def get_user_roles(db: Session, user_id: int) -> List[Role]:
        """Get all roles assigned to a user"""
        user_roles = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.is_active == True
        ).all()
        
        return [ur.role for ur in user_roles]
    
    @staticmethod
    def assign_role(
        db: Session, 
        user_id: int, 
        role_id: int, 
        assigned_by: int
    ) -> UserRole:
        """Assign a role to a user"""
        # Check if user already has this role
        existing = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id
        ).first()
        
        if existing:
            if not existing.is_active:
                existing.is_active = True
                db.commit()
                db.refresh(existing)
            return existing
        
        user_role = UserRole(
            user_id=user_id,
            role_id=role_id,
            assigned_by=assigned_by
        )
        db.add(user_role)
        db.commit()
        db.refresh(user_role)
        
        return user_role
    
    @staticmethod
    def remove_role(db: Session, user_id: int, role_id: int) -> bool:
        """Remove a role from a user"""
        user_role = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id
        ).first()
        
        if user_role:
            user_role.is_active = False
            db.commit()
            return True
        
        return False
    
    @staticmethod
    def add_project_member(
        db: Session,
        project_id: int,
        user_id: int,
        role_id: int,
        invited_by: int
    ) -> ProjectMember:
        """Add a member to a project with specific role"""
        # Check if user is already a member
        existing = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        ).first()
        
        if existing:
            if not existing.is_active:
                existing.is_active = True
                existing.role_id = role_id
                db.commit()
                db.refresh(existing)
            return existing
        
        member = ProjectMember(
            project_id=project_id,
            user_id=user_id,
            role_id=role_id,
            invited_by=invited_by
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        
        return member
    
    @staticmethod
    def check_resource_permission(
        db: Session,
        user_id: int,
        action: str,
        resource_type: str,
        resource_id: Optional[int] = None,
        project_id: Optional[int] = None
    ) -> bool:
        """Generic permission check for any resource type with optional project context"""
        # Superusers have all permissions
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.is_superuser:
            return True
        
        # For project-scoped resources, check project permissions first
        if project_id:
            if not PermissionService.check_project_permission(db, user_id, project_id, action):
                return False
        
        # Get user permissions
        permissions = PermissionService.get_user_permissions(db, user_id)
        
        # Check for specific resource permission
        for permission in permissions:
            # Check exact match
            if (permission.action == action and 
                permission.category == resource_type):
                return True
            
            # Check for manage permission (implies all actions)
            if (permission.action == "manage" and 
                permission.category == resource_type):
                return True
            
            # Check for system-wide permissions
            if (permission.action == action and 
                permission.category == "system"):
                return True
        
        return False
    
    @staticmethod
    def get_allowed_actions(
        db: Session,
        user_id: int,
        resource_type: str,
        project_id: Optional[int] = None
    ) -> List[str]:
        """Get list of allowed actions for a user on a specific resource type"""
        # Superusers have all permissions
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.is_superuser:
            return ["create", "read", "update", "delete", "manage"]
        
        permissions = PermissionService.get_user_permissions(db, user_id)
        allowed_actions = set()
        
        for permission in permissions:
            if permission.category == resource_type:
                if permission.action == "manage":
                    allowed_actions.update(["create", "read", "update", "delete", "manage"])
                else:
                    allowed_actions.add(permission.action)
        
        return list(allowed_actions)
    
    @staticmethod
    def create_generic_permissions(db: Session) -> None:
        """Create standard CRUD permissions for all resource types"""
        resource_types = [
            "user", "role", "permission", "project", "page", "component", 
            "asset", "activity_log", "audit_trail", "project_member", "system"
        ]
        
        actions = ["create", "read", "update", "delete", "manage"]
        
        for resource_type in resource_types:
            for action in actions:
                permission_name = f"{resource_type}:{action}"
                
                # Check if permission already exists
                existing = db.query(Permission).filter(
                    Permission.name == permission_name
                ).first()
                
                if not existing:
                    permission = Permission(
                        name=permission_name,
                        description=f"{action.title()} {resource_type} resources",
                        category=resource_type,
                        action=action,
                        is_system_permission=True
                    )
                    db.add(permission)
        
        db.commit()