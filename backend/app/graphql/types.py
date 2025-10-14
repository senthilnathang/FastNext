from datetime import datetime
from typing import List, Optional

import strawberry
from strawberry.scalars import JSON


@strawberry.type
class UserType:
    id: int
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool
    is_superuser: bool
    avatar_url: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    website: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    last_login_at: Optional[datetime]


@strawberry.type
class ProjectType:
    id: int
    name: str
    description: Optional[str]
    user_id: int
    is_public: bool
    settings: JSON
    created_at: datetime
    updated_at: Optional[datetime]
    owner: Optional[UserType]


@strawberry.type
class PageType:
    id: int
    title: str
    path: str
    content: Optional[JSON]
    project_id: int
    is_public: bool
    created_at: datetime
    updated_at: Optional[datetime]
    project: Optional[ProjectType]


@strawberry.type
class ComponentType:
    id: int
    name: str
    component_type: str
    schema: Optional[JSON]
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    project: Optional[ProjectType]


@strawberry.type
class RoleType:
    id: int
    name: str
    description: Optional[str]
    permissions: Optional[List[str]]
    created_at: datetime
    updated_at: Optional[datetime]


@strawberry.type
class PermissionType:
    id: int
    name: str
    description: Optional[str]
    resource: Optional[str]
    action: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


@strawberry.type
class ActivityLogType:
    id: int
    user_id: Optional[int]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[JSON]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    user: Optional[UserType]


@strawberry.type
class AuditTrailType:
    id: int
    user_id: Optional[int]
    resource_type: str
    resource_id: str
    action: str
    old_values: Optional[JSON]
    new_values: Optional[JSON]
    created_at: datetime
    user: Optional[UserType]


@strawberry.type
class ProjectMemberType:
    id: int
    project_id: int
    user_id: int
    role: str
    permissions: Optional[JSON]
    created_at: datetime
    updated_at: Optional[datetime]
    project: Optional[ProjectType]
    user: Optional[UserType]


@strawberry.type
class AssetType:
    id: int
    filename: str
    original_filename: str
    file_path: str
    file_size: Optional[int]
    content_type: Optional[str]
    project_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    project: Optional[ProjectType]


# Input types for mutations
@strawberry.input
class UserInput:
    email: str
    username: str
    full_name: Optional[str] = None
    password: str
    is_active: Optional[bool] = True
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None


@strawberry.input
class UserUpdateInput:
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None


@strawberry.input
class ProjectInput:
    name: str
    description: Optional[str] = None
    is_public: Optional[bool] = False
    settings: Optional[JSON] = None


@strawberry.input
class ProjectUpdateInput:
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    settings: Optional[JSON] = None


@strawberry.input
class PageInput:
    title: str
    path: str
    content: Optional[JSON] = None
    project_id: int
    is_public: Optional[bool] = False


@strawberry.input
class PageUpdateInput:
    title: Optional[str] = None
    path: Optional[str] = None
    content: Optional[JSON] = None
    is_public: Optional[bool] = None


@strawberry.input
class ComponentInput:
    name: str
    component_type: str
    schema: Optional[JSON] = None
    project_id: int


@strawberry.input
class ComponentUpdateInput:
    name: Optional[str] = None
    component_type: Optional[str] = None
    schema: Optional[JSON] = None


@strawberry.input
class ProjectMemberInput:
    project_id: int
    user_id: int
    role: str
    permissions: Optional[JSON] = None


# Response types
@strawberry.type
class MutationResponse:
    success: bool
    message: str
    errors: Optional[List[str]] = None


@strawberry.type
class UserResponse(MutationResponse):
    user: Optional[UserType] = None


@strawberry.type
class ProjectResponse(MutationResponse):
    project: Optional[ProjectType] = None


@strawberry.type
class PageResponse(MutationResponse):
    page: Optional[PageType] = None


@strawberry.type
class ComponentResponse(MutationResponse):
    component: Optional[ComponentType] = None


# Pagination types
@strawberry.type
class PageInfo:
    has_next_page: bool
    has_previous_page: bool
    start_cursor: Optional[str]
    end_cursor: Optional[str]


@strawberry.type
class UserConnection:
    edges: List[UserType]
    page_info: PageInfo
    total_count: int


@strawberry.type
class ProjectConnection:
    edges: List[ProjectType]
    page_info: PageInfo
    total_count: int


@strawberry.type
class PageConnection:
    edges: List[PageType]
    page_info: PageInfo
    total_count: int
