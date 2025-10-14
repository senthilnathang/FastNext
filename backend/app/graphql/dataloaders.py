"""
GraphQL DataLoaders for optimized database queries
Prevents N+1 queries by batching database operations
"""

from collections import defaultdict
from typing import Any, Dict, List, Optional

from app.graphql.context import GraphQLContext
from app.models.asset import Asset
from app.models.component import Component
from app.models.page import Page
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from strawberry.dataloader import DataLoader


class UserDataLoader:
    """DataLoader for User objects"""

    @staticmethod
    async def load_users(
        keys: List[int], context: GraphQLContext
    ) -> List[Optional[User]]:
        """Batch load users by IDs"""
        if not keys:
            return []

        db = context.db
        result = await db.execute(select(User).where(User.id.in_(keys)))
        users = result.scalars().all()

        # Create a mapping of id -> user
        user_map = {user.id: user for user in users}

        # Return users in the same order as requested keys
        return [user_map.get(key) for key in keys]


class ProjectDataLoader:
    """DataLoader for Project objects"""

    @staticmethod
    async def load_projects(
        keys: List[int], context: GraphQLContext
    ) -> List[Optional[Project]]:
        """Batch load projects by IDs"""
        if not keys:
            return []

        db = context.db
        result = await db.execute(
            select(Project)
            .options(selectinload(Project.owner))
            .where(Project.id.in_(keys))
        )
        projects = result.scalars().all()

        # Create a mapping of id -> project
        project_map = {project.id: project for project in projects}

        # Return projects in the same order as requested keys
        return [project_map.get(key) for key in keys]

    @staticmethod
    async def load_projects_by_user(
        keys: List[int], context: GraphQLContext
    ) -> List[List[Project]]:
        """Batch load projects by user IDs"""
        if not keys:
            return []

        db = context.db
        result = await db.execute(
            select(Project)
            .options(selectinload(Project.owner))
            .where(Project.user_id.in_(keys))
        )
        projects = result.scalars().all()

        # Group projects by user_id
        projects_by_user = defaultdict(list)
        for project in projects:
            projects_by_user[project.user_id].append(project)

        # Return projects grouped by user in the same order as requested keys
        return [projects_by_user.get(key, []) for key in keys]


class PageDataLoader:
    """DataLoader for Page objects"""

    @staticmethod
    async def load_pages(
        keys: List[int], context: GraphQLContext
    ) -> List[Optional[Page]]:
        """Batch load pages by IDs"""
        if not keys:
            return []

        db = context.db
        result = await db.execute(
            select(Page)
            .options(selectinload(Page.project).selectinload(Project.owner))
            .where(Page.id.in_(keys))
        )
        pages = result.scalars().all()

        # Create a mapping of id -> page
        page_map = {page.id: page for page in pages}

        # Return pages in the same order as requested keys
        return [page_map.get(key) for key in keys]

    @staticmethod
    async def load_pages_by_project(
        keys: List[int], context: GraphQLContext
    ) -> List[List[Page]]:
        """Batch load pages by project IDs"""
        if not keys:
            return []

        db = context.db
        result = await db.execute(
            select(Page)
            .options(selectinload(Page.project).selectinload(Project.owner))
            .where(Page.project_id.in_(keys))
        )
        pages = result.scalars().all()

        # Group pages by project_id
        pages_by_project = defaultdict(list)
        for page in pages:
            pages_by_project[page.project_id].append(page)

        # Return pages grouped by project in the same order as requested keys
        return [pages_by_project.get(key, []) for key in keys]


class ComponentDataLoader:
    """DataLoader for Component objects"""

    @staticmethod
    async def load_components(
        keys: List[int], context: GraphQLContext
    ) -> List[Optional[Component]]:
        """Batch load components by IDs"""
        if not keys:
            return []

        db = context.db
        result = await db.execute(
            select(Component)
            .options(selectinload(Component.project).selectinload(Project.owner))
            .where(Component.id.in_(keys))
        )
        components = result.scalars().all()

        # Create a mapping of id -> component
        component_map = {component.id: component for component in components}

        # Return components in the same order as requested keys
        return [component_map.get(key) for key in keys]

    @staticmethod
    async def load_components_by_project(
        keys: List[int], context: GraphQLContext
    ) -> List[List[Component]]:
        """Batch load components by project IDs"""
        if not keys:
            return []

        db = context.db
        result = await db.execute(
            select(Component)
            .options(selectinload(Component.project).selectinload(Project.owner))
            .where(Component.project_id.in_(keys))
        )
        components = result.scalars().all()

        # Group components by project_id
        components_by_project = defaultdict(list)
        for component in components:
            components_by_project[component.project_id].append(component)

        # Return components grouped by project in the same order as requested keys
        return [components_by_project.get(key, []) for key in keys]


class ProjectMemberDataLoader:
    """DataLoader for ProjectMember objects"""

    @staticmethod
    async def load_members_by_project(
        keys: List[int], context: GraphQLContext
    ) -> List[List[ProjectMember]]:
        """Batch load project members by project IDs"""
        if not keys:
            return []

        db = context.db
        result = await db.execute(
            select(ProjectMember)
            .options(
                selectinload(ProjectMember.user),
                selectinload(ProjectMember.project).selectinload(Project.owner),
            )
            .where(ProjectMember.project_id.in_(keys))
        )
        members = result.scalars().all()

        # Group members by project_id
        members_by_project = defaultdict(list)
        for member in members:
            members_by_project[member.project_id].append(member)

        # Return members grouped by project in the same order as requested keys
        return [members_by_project.get(key, []) for key in keys]

    @staticmethod
    async def load_members_by_user(
        keys: List[int], context: GraphQLContext
    ) -> List[List[ProjectMember]]:
        """Batch load project memberships by user IDs"""
        if not keys:
            return []

        db = context.db
        result = await db.execute(
            select(ProjectMember)
            .options(
                selectinload(ProjectMember.user),
                selectinload(ProjectMember.project).selectinload(Project.owner),
            )
            .where(ProjectMember.user_id.in_(keys))
        )
        members = result.scalars().all()

        # Group members by user_id
        members_by_user = defaultdict(list)
        for member in members:
            members_by_user[member.user_id].append(member)

        # Return members grouped by user in the same order as requested keys
        return [members_by_user.get(key, []) for key in keys]


class AssetDataLoader:
    """DataLoader for Asset objects"""

    @staticmethod
    async def load_assets_by_project(
        keys: List[int], context: GraphQLContext
    ) -> List[List[Asset]]:
        """Batch load assets by project IDs"""
        if not keys:
            return []

        db = context.db
        result = await db.execute(
            select(Asset)
            .options(selectinload(Asset.project).selectinload(Project.owner))
            .where(Asset.project_id.in_(keys))
        )
        assets = result.scalars().all()

        # Group assets by project_id
        assets_by_project = defaultdict(list)
        for asset in assets:
            if asset.project_id:  # Handle nullable project_id
                assets_by_project[asset.project_id].append(asset)

        # Return assets grouped by project in the same order as requested keys
        return [assets_by_project.get(key, []) for key in keys]


def create_dataloaders(context: GraphQLContext) -> Dict[str, DataLoader]:
    """
    Create all DataLoaders for a GraphQL request

    Args:
        context: GraphQL context containing database session

    Returns:
        Dict of DataLoader instances
    """
    return {
        "user_loader": DataLoader(
            load_fn=lambda keys: UserDataLoader.load_users(keys, context)
        ),
        "project_loader": DataLoader(
            load_fn=lambda keys: ProjectDataLoader.load_projects(keys, context)
        ),
        "projects_by_user_loader": DataLoader(
            load_fn=lambda keys: ProjectDataLoader.load_projects_by_user(keys, context)
        ),
        "page_loader": DataLoader(
            load_fn=lambda keys: PageDataLoader.load_pages(keys, context)
        ),
        "pages_by_project_loader": DataLoader(
            load_fn=lambda keys: PageDataLoader.load_pages_by_project(keys, context)
        ),
        "component_loader": DataLoader(
            load_fn=lambda keys: ComponentDataLoader.load_components(keys, context)
        ),
        "components_by_project_loader": DataLoader(
            load_fn=lambda keys: ComponentDataLoader.load_components_by_project(
                keys, context
            )
        ),
        "members_by_project_loader": DataLoader(
            load_fn=lambda keys: ProjectMemberDataLoader.load_members_by_project(
                keys, context
            )
        ),
        "members_by_user_loader": DataLoader(
            load_fn=lambda keys: ProjectMemberDataLoader.load_members_by_user(
                keys, context
            )
        ),
        "assets_by_project_loader": DataLoader(
            load_fn=lambda keys: AssetDataLoader.load_assets_by_project(keys, context)
        ),
    }


# Example usage in resolvers:
# Instead of:
#   result = await db.execute(select(User).where(User.id == user_id))
#   user = result.scalar_one_or_none()
#
# Use:
#   user = await info.context.dataloaders['user_loader'].load(user_id)
#
# This will batch multiple user lookups in the same request into a single query
