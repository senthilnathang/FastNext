from typing import Optional

import strawberry
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.graphql.context import GraphQLContext
from app.graphql.resolvers import (
    convert_component_to_graphql,
    convert_page_to_graphql,
    convert_project_to_graphql,
    convert_user_to_graphql,
)
from app.graphql.types import (
    ComponentInput,
    ComponentResponse,
    ComponentType,
    ComponentUpdateInput,
    MutationResponse,
    PageInput,
    PageResponse,
    PageType,
    PageUpdateInput,
    ProjectInput,
    ProjectMemberInput,
    ProjectResponse,
    ProjectType,
    ProjectUpdateInput,
    UserInput,
    UserResponse,
    UserType,
    UserUpdateInput,
)
from app.models.component import Component
from app.models.page import Page
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import selectinload

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_user(
        self, info: strawberry.Info[GraphQLContext], input: UserInput
    ) -> UserResponse:
        """Create a new user"""
        try:
            db = info.context.db

            # Check if user already exists
            existing_user = await db.execute(
                select(User).where(
                    (User.email == input.email) | (User.username == input.username)
                )
            )
            if existing_user.scalar_one_or_none():
                return UserResponse(
                    success=False,
                    message="User with this email or username already exists",
                    errors=["EMAIL_OR_USERNAME_EXISTS"],
                )

            # Hash password
            hashed_password = pwd_context.hash(input.password)

            # Create user
            user = User(
                email=input.email,
                username=input.username,
                full_name=input.full_name,
                hashed_password=hashed_password,
                is_active=input.is_active,
                avatar_url=input.avatar_url,
                bio=input.bio,
                location=input.location,
                website=input.website,
            )

            db.add(user)
            await db.commit()
            await db.refresh(user)

            return UserResponse(
                success=True,
                message="User created successfully",
                user=convert_user_to_graphql(user),
            )

        except Exception as e:
            await db.rollback()
            return UserResponse(
                success=False, message="Failed to create user", errors=[str(e)]
            )

    @strawberry.mutation
    async def update_user(
        self, info: strawberry.Info[GraphQLContext], id: int, input: UserUpdateInput
    ) -> UserResponse:
        """Update an existing user"""
        try:
            db = info.context.db

            # Get user
            result = await db.execute(select(User).where(User.id == id))
            user = result.scalar_one_or_none()

            if not user:
                return UserResponse(
                    success=False, message="User not found", errors=["USER_NOT_FOUND"]
                )

            # Update fields
            if input.full_name is not None:
                user.full_name = input.full_name
            if input.avatar_url is not None:
                user.avatar_url = input.avatar_url
            if input.bio is not None:
                user.bio = input.bio
            if input.location is not None:
                user.location = input.location
            if input.website is not None:
                user.website = input.website
            if input.is_active is not None:
                user.is_active = input.is_active

            await db.commit()
            await db.refresh(user)

            return UserResponse(
                success=True,
                message="User updated successfully",
                user=convert_user_to_graphql(user),
            )

        except Exception as e:
            await db.rollback()
            return UserResponse(
                success=False, message="Failed to update user", errors=[str(e)]
            )

    @strawberry.mutation
    async def delete_user(
        self, info: strawberry.Info[GraphQLContext], id: int
    ) -> MutationResponse:
        """Delete a user"""
        try:
            db = info.context.db

            # Get user
            result = await db.execute(select(User).where(User.id == id))
            user = result.scalar_one_or_none()

            if not user:
                return MutationResponse(
                    success=False, message="User not found", errors=["USER_NOT_FOUND"]
                )

            await db.delete(user)
            await db.commit()

            return MutationResponse(success=True, message="User deleted successfully")

        except Exception as e:
            await db.rollback()
            return MutationResponse(
                success=False, message="Failed to delete user", errors=[str(e)]
            )

    @strawberry.mutation
    async def create_project(
        self, info: strawberry.Info[GraphQLContext], input: ProjectInput
    ) -> ProjectResponse:
        """Create a new project"""
        try:
            db = info.context.db

            # Check if user is authenticated
            if not info.context.user:
                return ProjectResponse(
                    success=False,
                    message="Authentication required",
                    errors=["AUTHENTICATION_REQUIRED"],
                )

            # Create project
            project = Project(
                name=input.name,
                description=input.description,
                user_id=info.context.user.id,
                is_public=input.is_public,
                settings=input.settings or {},
            )

            db.add(project)
            await db.commit()
            await db.refresh(project)

            # Load the owner relationship
            result = await db.execute(
                select(Project)
                .options(selectinload(Project.owner))
                .where(Project.id == project.id)
            )
            project = result.scalar_one()

            return ProjectResponse(
                success=True,
                message="Project created successfully",
                project=convert_project_to_graphql(project),
            )

        except Exception as e:
            await db.rollback()
            return ProjectResponse(
                success=False, message="Failed to create project", errors=[str(e)]
            )

    @strawberry.mutation
    async def update_project(
        self, info: strawberry.Info[GraphQLContext], id: int, input: ProjectUpdateInput
    ) -> ProjectResponse:
        """Update an existing project"""
        try:
            db = info.context.db

            # Get project
            result = await db.execute(
                select(Project)
                .options(selectinload(Project.owner))
                .where(Project.id == id)
            )
            project = result.scalar_one_or_none()

            if not project:
                return ProjectResponse(
                    success=False,
                    message="Project not found",
                    errors=["PROJECT_NOT_FOUND"],
                )

            # Update fields
            if input.name is not None:
                project.name = input.name
            if input.description is not None:
                project.description = input.description
            if input.is_public is not None:
                project.is_public = input.is_public
            if input.settings is not None:
                project.settings = input.settings

            await db.commit()
            await db.refresh(project)

            return ProjectResponse(
                success=True,
                message="Project updated successfully",
                project=convert_project_to_graphql(project),
            )

        except Exception as e:
            await db.rollback()
            return ProjectResponse(
                success=False, message="Failed to update project", errors=[str(e)]
            )

    @strawberry.mutation
    async def delete_project(
        self, info: strawberry.Info[GraphQLContext], id: int
    ) -> MutationResponse:
        """Delete a project"""
        try:
            db = info.context.db

            # Get project
            result = await db.execute(select(Project).where(Project.id == id))
            project = result.scalar_one_or_none()

            if not project:
                return MutationResponse(
                    success=False,
                    message="Project not found",
                    errors=["PROJECT_NOT_FOUND"],
                )

            await db.delete(project)
            await db.commit()

            return MutationResponse(
                success=True, message="Project deleted successfully"
            )

        except Exception as e:
            await db.rollback()
            return MutationResponse(
                success=False, message="Failed to delete project", errors=[str(e)]
            )

    @strawberry.mutation
    async def create_page(
        self, info: strawberry.Info[GraphQLContext], input: PageInput
    ) -> PageResponse:
        """Create a new page"""
        try:
            db = info.context.db

            # Check if project exists
            result = await db.execute(
                select(Project).where(Project.id == input.project_id)
            )
            project = result.scalar_one_or_none()

            if not project:
                return PageResponse(
                    success=False,
                    message="Project not found",
                    errors=["PROJECT_NOT_FOUND"],
                )

            # Create page
            page = Page(
                title=input.title,
                path=input.path,
                content=input.content,
                project_id=input.project_id,
                is_public=input.is_public,
            )

            db.add(page)
            await db.commit()
            await db.refresh(page)

            # Load relationships
            result = await db.execute(
                select(Page)
                .options(selectinload(Page.project).selectinload(Project.owner))
                .where(Page.id == page.id)
            )
            page = result.scalar_one()

            return PageResponse(
                success=True,
                message="Page created successfully",
                page=convert_page_to_graphql(page),
            )

        except Exception as e:
            await db.rollback()
            return PageResponse(
                success=False, message="Failed to create page", errors=[str(e)]
            )

    @strawberry.mutation
    async def update_page(
        self, info: strawberry.Info[GraphQLContext], id: int, input: PageUpdateInput
    ) -> PageResponse:
        """Update an existing page"""
        try:
            db = info.context.db

            # Get page
            result = await db.execute(
                select(Page)
                .options(selectinload(Page.project).selectinload(Project.owner))
                .where(Page.id == id)
            )
            page = result.scalar_one_or_none()

            if not page:
                return PageResponse(
                    success=False, message="Page not found", errors=["PAGE_NOT_FOUND"]
                )

            # Update fields
            if input.title is not None:
                page.title = input.title
            if input.path is not None:
                page.path = input.path
            if input.content is not None:
                page.content = input.content
            if input.is_public is not None:
                page.is_public = input.is_public

            await db.commit()
            await db.refresh(page)

            return PageResponse(
                success=True,
                message="Page updated successfully",
                page=convert_page_to_graphql(page),
            )

        except Exception as e:
            await db.rollback()
            return PageResponse(
                success=False, message="Failed to update page", errors=[str(e)]
            )

    @strawberry.mutation
    async def delete_page(
        self, info: strawberry.Info[GraphQLContext], id: int
    ) -> MutationResponse:
        """Delete a page"""
        try:
            db = info.context.db

            # Get page
            result = await db.execute(select(Page).where(Page.id == id))
            page = result.scalar_one_or_none()

            if not page:
                return MutationResponse(
                    success=False, message="Page not found", errors=["PAGE_NOT_FOUND"]
                )

            await db.delete(page)
            await db.commit()

            return MutationResponse(success=True, message="Page deleted successfully")

        except Exception as e:
            await db.rollback()
            return MutationResponse(
                success=False, message="Failed to delete page", errors=[str(e)]
            )

    @strawberry.mutation
    async def create_component(
        self, info: strawberry.Info[GraphQLContext], input: ComponentInput
    ) -> ComponentResponse:
        """Create a new component"""
        try:
            db = info.context.db

            # Check if project exists
            result = await db.execute(
                select(Project).where(Project.id == input.project_id)
            )
            project = result.scalar_one_or_none()

            if not project:
                return ComponentResponse(
                    success=False,
                    message="Project not found",
                    errors=["PROJECT_NOT_FOUND"],
                )

            # Create component
            component = Component(
                name=input.name,
                component_type=input.component_type,
                schema=input.schema,
                project_id=input.project_id,
            )

            db.add(component)
            await db.commit()
            await db.refresh(component)

            # Load relationships
            result = await db.execute(
                select(Component)
                .options(selectinload(Component.project).selectinload(Project.owner))
                .where(Component.id == component.id)
            )
            component = result.scalar_one()

            return ComponentResponse(
                success=True,
                message="Component created successfully",
                component=convert_component_to_graphql(component),
            )

        except Exception as e:
            await db.rollback()
            return ComponentResponse(
                success=False, message="Failed to create component", errors=[str(e)]
            )

    @strawberry.mutation
    async def update_component(
        self,
        info: strawberry.Info[GraphQLContext],
        id: int,
        input: ComponentUpdateInput,
    ) -> ComponentResponse:
        """Update an existing component"""
        try:
            db = info.context.db

            # Get component
            result = await db.execute(
                select(Component)
                .options(selectinload(Component.project).selectinload(Project.owner))
                .where(Component.id == id)
            )
            component = result.scalar_one_or_none()

            if not component:
                return ComponentResponse(
                    success=False,
                    message="Component not found",
                    errors=["COMPONENT_NOT_FOUND"],
                )

            # Update fields
            if input.name is not None:
                component.name = input.name
            if input.component_type is not None:
                component.component_type = input.component_type
            if input.schema is not None:
                component.schema = input.schema

            await db.commit()
            await db.refresh(component)

            return ComponentResponse(
                success=True,
                message="Component updated successfully",
                component=convert_component_to_graphql(component),
            )

        except Exception as e:
            await db.rollback()
            return ComponentResponse(
                success=False, message="Failed to update component", errors=[str(e)]
            )

    @strawberry.mutation
    async def delete_component(
        self, info: strawberry.Info[GraphQLContext], id: int
    ) -> MutationResponse:
        """Delete a component"""
        try:
            db = info.context.db

            # Get component
            result = await db.execute(select(Component).where(Component.id == id))
            component = result.scalar_one_or_none()

            if not component:
                return MutationResponse(
                    success=False,
                    message="Component not found",
                    errors=["COMPONENT_NOT_FOUND"],
                )

            await db.delete(component)
            await db.commit()

            return MutationResponse(
                success=True, message="Component deleted successfully"
            )

        except Exception as e:
            await db.rollback()
            return MutationResponse(
                success=False, message="Failed to delete component", errors=[str(e)]
            )

    @strawberry.mutation
    async def add_project_member(
        self, info: strawberry.Info[GraphQLContext], input: ProjectMemberInput
    ) -> MutationResponse:
        """Add a member to a project"""
        try:
            db = info.context.db

            # Check if project exists
            project_result = await db.execute(
                select(Project).where(Project.id == input.project_id)
            )
            project = project_result.scalar_one_or_none()

            if not project:
                return MutationResponse(
                    success=False,
                    message="Project not found",
                    errors=["PROJECT_NOT_FOUND"],
                )

            # Check if user exists
            user_result = await db.execute(select(User).where(User.id == input.user_id))
            user = user_result.scalar_one_or_none()

            if not user:
                return MutationResponse(
                    success=False, message="User not found", errors=["USER_NOT_FOUND"]
                )

            # Check if member already exists
            existing_member = await db.execute(
                select(ProjectMember).where(
                    (ProjectMember.project_id == input.project_id)
                    & (ProjectMember.user_id == input.user_id)
                )
            )
            if existing_member.scalar_one_or_none():
                return MutationResponse(
                    success=False,
                    message="User is already a member of this project",
                    errors=["MEMBER_ALREADY_EXISTS"],
                )

            # Create project member
            member = ProjectMember(
                project_id=input.project_id,
                user_id=input.user_id,
                role=input.role,
                permissions=input.permissions,
            )

            db.add(member)
            await db.commit()

            return MutationResponse(
                success=True, message="Project member added successfully"
            )

        except Exception as e:
            await db.rollback()
            return MutationResponse(
                success=False, message="Failed to add project member", errors=[str(e)]
            )

    @strawberry.mutation
    async def remove_project_member(
        self, info: strawberry.Info[GraphQLContext], project_id: int, user_id: int
    ) -> MutationResponse:
        """Remove a member from a project"""
        try:
            db = info.context.db

            # Get project member
            result = await db.execute(
                select(ProjectMember).where(
                    (ProjectMember.project_id == project_id)
                    & (ProjectMember.user_id == user_id)
                )
            )
            member = result.scalar_one_or_none()

            if not member:
                return MutationResponse(
                    success=False,
                    message="Project member not found",
                    errors=["MEMBER_NOT_FOUND"],
                )

            await db.delete(member)
            await db.commit()

            return MutationResponse(
                success=True, message="Project member removed successfully"
            )

        except Exception as e:
            await db.rollback()
            return MutationResponse(
                success=False,
                message="Failed to remove project member",
                errors=[str(e)],
            )
