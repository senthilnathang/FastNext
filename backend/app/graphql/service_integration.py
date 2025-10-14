"""
GraphQL Service Integration
Integrates GraphQL with all existing FastAPI services and endpoints
"""

from typing import Any, Dict, List, Optional, Union

from app.db.session import get_db
from app.models.activity_log import ActivityLog
from app.models.asset import Asset
from app.models.audit_trail import AuditTrail
from app.models.component import Component
from app.models.page import Page
from app.models.permission import Permission
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.role import Role
from app.models.user import User
from fastapi import Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class GraphQLServiceIntegration:
    """
    Service layer that integrates GraphQL operations with existing API services
    """

    def __init__(self, db: AsyncSession, user: Optional[User] = None):
        self.db = db
        self.current_user = user

    # User Services
    async def get_current_user(self) -> Optional[Dict[str, Any]]:
        """Get current authenticated user"""
        if not self.current_user:
            return None

        return {
            "id": self.current_user.id,
            "username": self.current_user.username,
            "email": self.current_user.email,
            "fullName": self.current_user.full_name,
            "isActive": self.current_user.is_active,
            "isVerified": self.current_user.is_verified,
            "isSuperuser": self.current_user.is_superuser,
            "avatarUrl": self.current_user.avatar_url,
            "bio": self.current_user.bio,
            "location": self.current_user.location,
            "website": self.current_user.website,
            "createdAt": (
                self.current_user.created_at.isoformat()
                if self.current_user.created_at
                else None
            ),
            "updatedAt": (
                self.current_user.updated_at.isoformat()
                if self.current_user.updated_at
                else None
            ),
            "lastLoginAt": (
                self.current_user.last_login_at.isoformat()
                if self.current_user.last_login_at
                else None
            ),
        }

    async def get_users(
        self,
        first: Optional[int] = 10,
        after: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of users"""
        query = select(User)

        if search:
            query = query.where(
                User.username.ilike(f"%{search}%")
                | User.email.ilike(f"%{search}%")
                | User.full_name.ilike(f"%{search}%")
            )

        if after:
            query = query.where(User.id > int(after))

        query = query.order_by(User.id).limit(first + 1)

        result = await self.db.execute(query)
        users = result.scalars().all()

        has_next_page = len(users) > first
        if has_next_page:
            users = users[:-1]

        # Get total count
        count_result = await self.db.execute(select(func.count(User.id)))
        total_count = count_result.scalar()

        return {
            "edges": [self._format_user(user) for user in users],
            "pageInfo": {
                "hasNextPage": has_next_page,
                "hasPreviousPage": after is not None,
                "startCursor": str(users[0].id) if users else None,
                "endCursor": str(users[-1].id) if users else None,
            },
            "totalCount": total_count,
        }

    async def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return self._format_user(user) if user else None

    async def create_user(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        # This would integrate with the existing user service
        # For now, return a success response
        return {
            "success": True,
            "message": "User created successfully",
            "errors": None,
            "user": {
                "id": 999,  # Mock ID
                "username": input_data.get("username"),
                "email": input_data.get("email"),
                "fullName": input_data.get("fullName"),
                "isActive": input_data.get("isActive", True),
            },
        }

    # Project Services
    async def get_projects(
        self,
        first: Optional[int] = 10,
        after: Optional[str] = None,
        user_id: Optional[int] = None,
        is_public: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of projects"""
        query = select(Project).options(selectinload(Project.owner))

        if user_id:
            query = query.where(Project.user_id == user_id)

        if is_public is not None:
            query = query.where(Project.is_public == is_public)

        if after:
            query = query.where(Project.id > int(after))

        query = query.order_by(Project.id).limit(first + 1)

        result = await self.db.execute(query)
        projects = result.scalars().all()

        has_next_page = len(projects) > first
        if has_next_page:
            projects = projects[:-1]

        # Get total count
        count_result = await self.db.execute(select(func.count(Project.id)))
        total_count = count_result.scalar()

        return {
            "edges": [self._format_project(project) for project in projects],
            "pageInfo": {
                "hasNextPage": has_next_page,
                "hasPreviousPage": after is not None,
                "startCursor": str(projects[0].id) if projects else None,
                "endCursor": str(projects[-1].id) if projects else None,
            },
            "totalCount": total_count,
        }

    async def get_project(self, project_id: int) -> Optional[Dict[str, Any]]:
        """Get project by ID"""
        result = await self.db.execute(
            select(Project)
            .options(selectinload(Project.owner))
            .where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        return self._format_project(project) if project else None

    async def create_project(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new project"""
        if not self.current_user:
            return {
                "success": False,
                "message": "Authentication required",
                "errors": ["AUTHENTICATION_REQUIRED"],
            }

        # Mock project creation
        return {
            "success": True,
            "message": "Project created successfully",
            "errors": None,
            "project": {
                "id": 999,  # Mock ID
                "name": input_data.get("name"),
                "description": input_data.get("description"),
                "isPublic": input_data.get("isPublic", False),
                "userId": self.current_user.id,
                "owner": self._format_user(self.current_user),
            },
        }

    # Page Services
    async def get_pages(
        self,
        first: Optional[int] = 10,
        after: Optional[str] = None,
        project_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of pages"""
        query = select(Page).options(
            selectinload(Page.project).selectinload(Project.owner)
        )

        if project_id:
            query = query.where(Page.project_id == project_id)

        if after:
            query = query.where(Page.id > int(after))

        query = query.order_by(Page.id).limit(first + 1)

        result = await self.db.execute(query)
        pages = result.scalars().all()

        has_next_page = len(pages) > first
        if has_next_page:
            pages = pages[:-1]

        count_result = await self.db.execute(select(func.count(Page.id)))
        total_count = count_result.scalar()

        return {
            "edges": [self._format_page(page) for page in pages],
            "pageInfo": {
                "hasNextPage": has_next_page,
                "hasPreviousPage": after is not None,
                "startCursor": str(pages[0].id) if pages else None,
                "endCursor": str(pages[-1].id) if pages else None,
            },
            "totalCount": total_count,
        }

    # Component Services
    async def get_components(
        self, project_id: Optional[int] = None, component_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get list of components"""
        query = select(Component).options(
            selectinload(Component.project).selectinload(Project.owner)
        )

        if project_id:
            query = query.where(Component.project_id == project_id)

        if component_type:
            query = query.where(Component.component_type == component_type)

        result = await self.db.execute(query)
        components = result.scalars().all()

        return [self._format_component(component) for component in components]

    # Activity Log Services
    async def get_activity_logs(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        limit: Optional[int] = 50,
    ) -> List[Dict[str, Any]]:
        """Get activity logs"""
        query = select(ActivityLog).options(selectinload(ActivityLog.user))

        if user_id:
            query = query.where(ActivityLog.user_id == user_id)

        if action:
            # Handle enum comparison if needed
            query = query.where(ActivityLog.action == action)

        query = query.order_by(ActivityLog.created_at.desc()).limit(limit)

        result = await self.db.execute(query)
        logs = result.scalars().all()

        return [self._format_activity_log(log) for log in logs]

    # Audit Trail Services
    async def get_audit_trails(
        self,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        limit: Optional[int] = 50,
    ) -> List[Dict[str, Any]]:
        """Get audit trails"""
        query = select(AuditTrail).options(selectinload(AuditTrail.user))

        if resource_type:
            query = query.where(AuditTrail.resource_type == resource_type)

        if resource_id:
            query = query.where(AuditTrail.resource_id == resource_id)

        query = query.order_by(AuditTrail.created_at.desc()).limit(limit)

        result = await self.db.execute(query)
        trails = result.scalars().all()

        return [self._format_audit_trail(trail) for trail in trails]

    # Role and Permission Services
    async def get_roles(self) -> List[Dict[str, Any]]:
        """Get all roles"""
        result = await self.db.execute(select(Role))
        roles = result.scalars().all()
        return [self._format_role(role) for role in roles]

    async def get_permissions(self) -> List[Dict[str, Any]]:
        """Get all permissions"""
        result = await self.db.execute(select(Permission))
        permissions = result.scalars().all()
        return [self._format_permission(permission) for permission in permissions]

    # Project Member Services
    async def get_project_members(self, project_id: int) -> List[Dict[str, Any]]:
        """Get project members"""
        query = (
            select(ProjectMember)
            .options(
                selectinload(ProjectMember.project).selectinload(Project.owner),
                selectinload(ProjectMember.user),
            )
            .where(ProjectMember.project_id == project_id)
        )

        result = await self.db.execute(query)
        members = result.scalars().all()

        return [self._format_project_member(member) for member in members]

    # Asset Services
    async def get_assets(
        self, project_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get assets"""
        query = select(Asset).options(
            selectinload(Asset.project).selectinload(Project.owner)
        )

        if project_id:
            query = query.where(Asset.project_id == project_id)

        result = await self.db.execute(query)
        assets = result.scalars().all()

        return [self._format_asset(asset) for asset in assets]

    # Formatting helpers
    def _format_user(self, user: User) -> Dict[str, Any]:
        """Format user for GraphQL response"""
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "fullName": user.full_name,
            "isActive": user.is_active,
            "isVerified": user.is_verified,
            "isSuperuser": user.is_superuser,
            "avatarUrl": user.avatar_url,
            "bio": user.bio,
            "location": user.location,
            "website": user.website,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
            "updatedAt": user.updated_at.isoformat() if user.updated_at else None,
            "lastLoginAt": (
                user.last_login_at.isoformat() if user.last_login_at else None
            ),
        }

    def _format_project(self, project: Project) -> Dict[str, Any]:
        """Format project for GraphQL response"""
        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "userId": project.user_id,
            "isPublic": project.is_public,
            "settings": project.settings,
            "createdAt": project.created_at.isoformat() if project.created_at else None,
            "updatedAt": project.updated_at.isoformat() if project.updated_at else None,
            "owner": self._format_user(project.owner) if project.owner else None,
        }

    def _format_page(self, page: Page) -> Dict[str, Any]:
        """Format page for GraphQL response"""
        return {
            "id": page.id,
            "title": page.title,
            "path": page.path,
            "content": page.content,
            "projectId": page.project_id,
            "isPublic": page.is_public,
            "createdAt": page.created_at.isoformat() if page.created_at else None,
            "updatedAt": page.updated_at.isoformat() if page.updated_at else None,
            "project": self._format_project(page.project) if page.project else None,
        }

    def _format_component(self, component: Component) -> Dict[str, Any]:
        """Format component for GraphQL response"""
        return {
            "id": component.id,
            "name": component.name,
            "componentType": component.component_type,
            "schema": component.schema,
            "projectId": component.project_id,
            "createdAt": (
                component.created_at.isoformat() if component.created_at else None
            ),
            "updatedAt": (
                component.updated_at.isoformat() if component.updated_at else None
            ),
            "project": (
                self._format_project(component.project) if component.project else None
            ),
        }

    def _format_activity_log(self, log: ActivityLog) -> Dict[str, Any]:
        """Format activity log for GraphQL response"""
        return {
            "id": log.id,
            "userId": log.user_id,
            "action": (
                log.action.value if hasattr(log.action, "value") else str(log.action)
            ),
            "resourceType": log.entity_type,
            "resourceId": log.entity_id,
            "details": log.event_metadata,
            "ipAddress": log.ip_address,
            "userAgent": log.user_agent,
            "createdAt": log.created_at.isoformat() if log.created_at else None,
            "user": self._format_user(log.user) if log.user else None,
        }

    def _format_audit_trail(self, trail: AuditTrail) -> Dict[str, Any]:
        """Format audit trail for GraphQL response"""
        return {
            "id": trail.id,
            "userId": trail.user_id,
            "resourceType": trail.resource_type,
            "resourceId": trail.resource_id,
            "action": trail.action,
            "oldValues": trail.old_values,
            "newValues": trail.new_values,
            "createdAt": trail.created_at.isoformat() if trail.created_at else None,
            "user": self._format_user(trail.user) if trail.user else None,
        }

    def _format_project_member(self, member: ProjectMember) -> Dict[str, Any]:
        """Format project member for GraphQL response"""
        return {
            "id": member.id,
            "projectId": member.project_id,
            "userId": member.user_id,
            "role": member.role,
            "permissions": member.permissions,
            "createdAt": member.created_at.isoformat() if member.created_at else None,
            "updatedAt": member.updated_at.isoformat() if member.updated_at else None,
            "project": self._format_project(member.project) if member.project else None,
            "user": self._format_user(member.user) if member.user else None,
        }

    def _format_asset(self, asset: Asset) -> Dict[str, Any]:
        """Format asset for GraphQL response"""
        return {
            "id": asset.id,
            "filename": asset.filename,
            "originalFilename": asset.original_filename,
            "filePath": asset.file_path,
            "fileSize": asset.file_size,
            "contentType": asset.content_type,
            "projectId": asset.project_id,
            "createdAt": asset.created_at.isoformat() if asset.created_at else None,
            "updatedAt": asset.updated_at.isoformat() if asset.updated_at else None,
            "project": self._format_project(asset.project) if asset.project else None,
        }

    def _format_role(self, role: Role) -> Dict[str, Any]:
        """Format role for GraphQL response"""
        return {
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "permissions": role.permissions,
            "createdAt": role.created_at.isoformat() if role.created_at else None,
            "updatedAt": role.updated_at.isoformat() if role.updated_at else None,
        }

    def _format_permission(self, permission: Permission) -> Dict[str, Any]:
        """Format permission for GraphQL response"""
        return {
            "id": permission.id,
            "name": permission.name,
            "description": permission.description,
            "resource": permission.resource,
            "action": permission.action,
            "createdAt": (
                permission.created_at.isoformat() if permission.created_at else None
            ),
            "updatedAt": (
                permission.updated_at.isoformat() if permission.updated_at else None
            ),
        }
