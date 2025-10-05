import strawberry
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.graphql.types import (
    UserType, ProjectType, PageType, ComponentType, ActivityLogType,
    AuditTrailType, ProjectMemberType, AssetType, RoleType, PermissionType,
    UserConnection, ProjectConnection, PageConnection, PageInfo
)
from app.graphql.context import GraphQLContext
from app.models.user import User
from app.models.project import Project
from app.models.page import Page
from app.models.component import Component
from app.models.activity_log import ActivityLog
from app.models.audit_trail import AuditTrail
from app.models.project_member import ProjectMember
from app.models.asset import Asset
from app.models.role import Role
from app.models.permission import Permission


def convert_user_to_graphql(user: User) -> UserType:
    """Convert SQLAlchemy User model to GraphQL UserType"""
    return UserType(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_superuser=user.is_superuser,
        avatar_url=user.avatar_url,
        bio=user.bio,
        location=user.location,
        website=user.website,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login_at=user.last_login_at,
    )


def convert_project_to_graphql(project: Project) -> ProjectType:
    """Convert SQLAlchemy Project model to GraphQL ProjectType"""
    return ProjectType(
        id=project.id,
        name=project.name,
        description=project.description,
        user_id=project.user_id,
        is_public=project.is_public,
        settings=project.settings,
        created_at=project.created_at,
        updated_at=project.updated_at,
        owner=convert_user_to_graphql(project.owner) if project.owner else None,
    )


def convert_page_to_graphql(page: Page) -> PageType:
    """Convert SQLAlchemy Page model to GraphQL PageType"""
    return PageType(
        id=page.id,
        title=page.title,
        path=page.path,
        content=page.content,
        project_id=page.project_id,
        is_public=page.is_public,
        created_at=page.created_at,
        updated_at=page.updated_at,
        project=convert_project_to_graphql(page.project) if page.project else None,
    )


def convert_component_to_graphql(component: Component) -> ComponentType:
    """Convert SQLAlchemy Component model to GraphQL ComponentType"""
    return ComponentType(
        id=component.id,
        name=component.name,
        component_type=component.component_type,
        schema=component.schema,
        project_id=component.project_id,
        created_at=component.created_at,
        updated_at=component.updated_at,
        project=convert_project_to_graphql(component.project) if component.project else None,
    )


def convert_activity_log_to_graphql(log: ActivityLog) -> ActivityLogType:
    """Convert SQLAlchemy ActivityLog model to GraphQL ActivityLogType"""
    return ActivityLogType(
        id=log.id,
        user_id=log.user_id,
        action=log.action.value if log.action else None,
        resource_type=log.entity_type,
        resource_id=log.entity_id,
        details=log.event_metadata,
        ip_address=log.ip_address,
        user_agent=log.user_agent,
        created_at=log.created_at,
        user=convert_user_to_graphql(log.user) if log.user else None,
    )


def convert_audit_trail_to_graphql(audit: AuditTrail) -> AuditTrailType:
    """Convert SQLAlchemy AuditTrail model to GraphQL AuditTrailType"""
    return AuditTrailType(
        id=audit.id,
        user_id=audit.user_id,
        resource_type=audit.resource_type,
        resource_id=audit.resource_id,
        action=audit.action,
        old_values=audit.old_values,
        new_values=audit.new_values,
        created_at=audit.created_at,
        user=convert_user_to_graphql(audit.user) if audit.user else None,
    )


def convert_project_member_to_graphql(member: ProjectMember) -> ProjectMemberType:
    """Convert SQLAlchemy ProjectMember model to GraphQL ProjectMemberType"""
    return ProjectMemberType(
        id=member.id,
        project_id=member.project_id,
        user_id=member.user_id,
        role=member.role,
        permissions=member.permissions,
        created_at=member.created_at,
        updated_at=member.updated_at,
        project=convert_project_to_graphql(member.project) if member.project else None,
        user=convert_user_to_graphql(member.user) if member.user else None,
    )


def convert_asset_to_graphql(asset: Asset) -> AssetType:
    """Convert SQLAlchemy Asset model to GraphQL AssetType"""
    return AssetType(
        id=asset.id,
        filename=asset.filename,
        original_filename=asset.original_filename,
        file_path=asset.file_path,
        file_size=asset.file_size,
        content_type=asset.content_type,
        project_id=asset.project_id,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
        project=convert_project_to_graphql(asset.project) if asset.project else None,
    )


def convert_role_to_graphql(role: Role) -> RoleType:
    """Convert SQLAlchemy Role model to GraphQL RoleType"""
    return RoleType(
        id=role.id,
        name=role.name,
        description=role.description,
        permissions=role.permissions,
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


def convert_permission_to_graphql(permission: Permission) -> PermissionType:
    """Convert SQLAlchemy Permission model to GraphQL PermissionType"""
    return PermissionType(
        id=permission.id,
        name=permission.name,
        description=permission.description,
        resource=permission.resource,
        action=permission.action,
        created_at=permission.created_at,
        updated_at=permission.updated_at,
    )


@strawberry.type
class Query:
    @strawberry.field
    async def me(self, info: strawberry.Info[GraphQLContext]) -> Optional[UserType]:
        """Get current authenticated user"""
        if not info.context.user:
            return None
        return convert_user_to_graphql(info.context.user)

    @strawberry.field
    async def users(
        self, 
        info: strawberry.Info[GraphQLContext],
        first: Optional[int] = 10,
        after: Optional[str] = None,
        search: Optional[str] = None
    ) -> UserConnection:
        """Get paginated list of users"""
        db = info.context.db
        
        query = select(User)
        
        if search:
            query = query.where(
                User.username.ilike(f"%{search}%") |
                User.email.ilike(f"%{search}%") |
                User.full_name.ilike(f"%{search}%")
            )
        
        if after:
            query = query.where(User.id > int(after))
        
        query = query.order_by(User.id).limit(first + 1)
        
        result = await db.execute(query)
        users = result.scalars().all()
        
        has_next_page = len(users) > first
        if has_next_page:
            users = users[:-1]
        
        total_count_result = await db.execute(select(func.count(User.id)))
        total_count = total_count_result.scalar()
        
        return UserConnection(
            edges=[convert_user_to_graphql(user) for user in users],
            page_info=PageInfo(
                has_next_page=has_next_page,
                has_previous_page=after is not None,
                start_cursor=str(users[0].id) if users else None,
                end_cursor=str(users[-1].id) if users else None,
            ),
            total_count=total_count,
        )

    @strawberry.field
    async def user(self, info: strawberry.Info[GraphQLContext], id: int) -> Optional[UserType]:
        """Get user by ID"""
        db = info.context.db
        result = await db.execute(select(User).where(User.id == id))
        user = result.scalar_one_or_none()
        return convert_user_to_graphql(user) if user else None

    @strawberry.field
    async def projects(
        self, 
        info: strawberry.Info[GraphQLContext],
        first: Optional[int] = 10,
        after: Optional[str] = None,
        user_id: Optional[int] = None,
        is_public: Optional[bool] = None
    ) -> ProjectConnection:
        """Get paginated list of projects"""
        db = info.context.db
        
        query = select(Project).options(selectinload(Project.owner))
        
        if user_id:
            query = query.where(Project.user_id == user_id)
        
        if is_public is not None:
            query = query.where(Project.is_public == is_public)
        
        if after:
            query = query.where(Project.id > int(after))
        
        query = query.order_by(Project.id).limit(first + 1)
        
        result = await db.execute(query)
        projects = result.scalars().all()
        
        has_next_page = len(projects) > first
        if has_next_page:
            projects = projects[:-1]
        
        total_count_result = await db.execute(select(func.count(Project.id)))
        total_count = total_count_result.scalar()
        
        return ProjectConnection(
            edges=[convert_project_to_graphql(project) for project in projects],
            page_info=PageInfo(
                has_next_page=has_next_page,
                has_previous_page=after is not None,
                start_cursor=str(projects[0].id) if projects else None,
                end_cursor=str(projects[-1].id) if projects else None,
            ),
            total_count=total_count,
        )

    @strawberry.field
    async def project(self, info: strawberry.Info[GraphQLContext], id: int) -> Optional[ProjectType]:
        """Get project by ID"""
        db = info.context.db
        result = await db.execute(
            select(Project).options(selectinload(Project.owner)).where(Project.id == id)
        )
        project = result.scalar_one_or_none()
        return convert_project_to_graphql(project) if project else None

    @strawberry.field
    async def pages(
        self, 
        info: strawberry.Info[GraphQLContext],
        first: Optional[int] = 10,
        after: Optional[str] = None,
        project_id: Optional[int] = None
    ) -> PageConnection:
        """Get paginated list of pages"""
        db = info.context.db
        
        query = select(Page).options(selectinload(Page.project).selectinload(Project.owner))
        
        if project_id:
            query = query.where(Page.project_id == project_id)
        
        if after:
            query = query.where(Page.id > int(after))
        
        query = query.order_by(Page.id).limit(first + 1)
        
        result = await db.execute(query)
        pages = result.scalars().all()
        
        has_next_page = len(pages) > first
        if has_next_page:
            pages = pages[:-1]
        
        total_count_result = await db.execute(select(func.count(Page.id)))
        total_count = total_count_result.scalar()
        
        return PageConnection(
            edges=[convert_page_to_graphql(page) for page in pages],
            page_info=PageInfo(
                has_next_page=has_next_page,
                has_previous_page=after is not None,
                start_cursor=str(pages[0].id) if pages else None,
                end_cursor=str(pages[-1].id) if pages else None,
            ),
            total_count=total_count,
        )

    @strawberry.field
    async def page(self, info: strawberry.Info[GraphQLContext], id: int) -> Optional[PageType]:
        """Get page by ID"""
        db = info.context.db
        result = await db.execute(
            select(Page).options(
                selectinload(Page.project).selectinload(Project.owner)
            ).where(Page.id == id)
        )
        page = result.scalar_one_or_none()
        return convert_page_to_graphql(page) if page else None

    @strawberry.field
    async def components(
        self, 
        info: strawberry.Info[GraphQLContext],
        project_id: Optional[int] = None,
        component_type: Optional[str] = None
    ) -> List[ComponentType]:
        """Get list of components"""
        db = info.context.db
        
        query = select(Component).options(
            selectinload(Component.project).selectinload(Project.owner)
        )
        
        if project_id:
            query = query.where(Component.project_id == project_id)
        
        if component_type:
            query = query.where(Component.component_type == component_type)
        
        result = await db.execute(query)
        components = result.scalars().all()
        
        return [convert_component_to_graphql(component) for component in components]

    @strawberry.field
    async def component(self, info: strawberry.Info[GraphQLContext], id: int) -> Optional[ComponentType]:
        """Get component by ID"""
        db = info.context.db
        result = await db.execute(
            select(Component).options(
                selectinload(Component.project).selectinload(Project.owner)
            ).where(Component.id == id)
        )
        component = result.scalar_one_or_none()
        return convert_component_to_graphql(component) if component else None

    @strawberry.field
    async def activity_logs(
        self, 
        info: strawberry.Info[GraphQLContext],
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        limit: Optional[int] = 50
    ) -> List[ActivityLogType]:
        """Get activity logs"""
        db = info.context.db
        
        query = select(ActivityLog).options(selectinload(ActivityLog.user))
        
        if user_id:
            query = query.where(ActivityLog.user_id == user_id)
        
        if action:
            # Handle enum comparison
            from app.models.activity_log import ActivityAction
            try:
                action_enum = ActivityAction(action)
                query = query.where(ActivityLog.action == action_enum)
            except ValueError:
                # If action is not a valid enum value, return empty result
                return []
        
        query = query.order_by(ActivityLog.created_at.desc()).limit(limit)
        
        result = await db.execute(query)
        logs = result.scalars().all()
        
        return [convert_activity_log_to_graphql(log) for log in logs]

    @strawberry.field
    async def audit_trails(
        self, 
        info: strawberry.Info[GraphQLContext],
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        limit: Optional[int] = 50
    ) -> List[AuditTrailType]:
        """Get audit trails"""
        db = info.context.db
        
        query = select(AuditTrail).options(selectinload(AuditTrail.user))
        
        if resource_type:
            query = query.where(AuditTrail.resource_type == resource_type)
        
        if resource_id:
            query = query.where(AuditTrail.resource_id == resource_id)
        
        query = query.order_by(AuditTrail.created_at.desc()).limit(limit)
        
        result = await db.execute(query)
        trails = result.scalars().all()
        
        return [convert_audit_trail_to_graphql(trail) for trail in trails]

    @strawberry.field
    async def project_members(
        self, 
        info: strawberry.Info[GraphQLContext],
        project_id: int
    ) -> List[ProjectMemberType]:
        """Get project members"""
        db = info.context.db
        
        query = select(ProjectMember).options(
            selectinload(ProjectMember.project).selectinload(Project.owner),
            selectinload(ProjectMember.user)
        ).where(ProjectMember.project_id == project_id)
        
        result = await db.execute(query)
        members = result.scalars().all()
        
        return [convert_project_member_to_graphql(member) for member in members]

    @strawberry.field
    async def assets(
        self, 
        info: strawberry.Info[GraphQLContext],
        project_id: Optional[int] = None
    ) -> List[AssetType]:
        """Get assets"""
        db = info.context.db
        
        query = select(Asset).options(
            selectinload(Asset.project).selectinload(Project.owner)
        )
        
        if project_id:
            query = query.where(Asset.project_id == project_id)
        
        result = await db.execute(query)
        assets = result.scalars().all()
        
        return [convert_asset_to_graphql(asset) for asset in assets]

    @strawberry.field
    async def roles(self, info: strawberry.Info[GraphQLContext]) -> List[RoleType]:
        """Get all roles"""
        db = info.context.db
        result = await db.execute(select(Role))
        roles = result.scalars().all()
        return [convert_role_to_graphql(role) for role in roles]

    @strawberry.field
    async def permissions(self, info: strawberry.Info[GraphQLContext]) -> List[PermissionType]:
        """Get all permissions"""
        db = info.context.db
        result = await db.execute(select(Permission))
        permissions = result.scalars().all()
        return [convert_permission_to_graphql(permission) for permission in permissions]