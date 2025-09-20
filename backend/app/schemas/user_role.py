from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from .role import Role
from .user import User


class UserRoleBase(BaseModel):
    user_id: int
    role_id: int
    is_active: bool = True


class UserRoleCreate(UserRoleBase):
    pass


class UserRoleUpdate(BaseModel):
    is_active: Optional[bool] = None
    role_id: Optional[int] = None


class UserRole(UserRoleBase):
    id: int
    assigned_at: datetime
    assigned_by: Optional[int] = None

    class Config:
        from_attributes = True


class UserWithRoles(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    is_active: bool
    roles: List[Role] = []

    class Config:
        from_attributes = True