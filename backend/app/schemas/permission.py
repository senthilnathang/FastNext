from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class PermissionCategory(str, Enum):
    PROJECT = "project"
    PAGE = "page"
    COMPONENT = "component"
    USER = "user"
    SYSTEM = "system"


class PermissionAction(str, Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    MANAGE = "manage"
    PUBLISH = "publish"
    DEPLOY = "deploy"


class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: PermissionCategory
    action: PermissionAction
    resource: Optional[str] = None


class PermissionCreate(PermissionBase):
    pass


class PermissionUpdate(PermissionBase):
    name: Optional[str] = None
    category: Optional[PermissionCategory] = None
    action: Optional[PermissionAction] = None


class PermissionInDBBase(PermissionBase):
    id: Optional[int] = None
    is_system_permission: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Permission(PermissionInDBBase):
    pass


# Role Permission Assignment
class RolePermissionBase(BaseModel):
    role_id: int
    permission_id: int


class RolePermissionCreate(RolePermissionBase):
    pass


class RolePermissionInDBBase(RolePermissionBase):
    id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RolePermission(RolePermissionInDBBase):
    permission: Optional[Permission] = None
