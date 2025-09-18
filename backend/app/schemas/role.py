from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: Optional[bool] = True


class RoleCreate(RoleBase):
    pass


class RoleUpdate(RoleBase):
    name: Optional[str] = None


class RoleInDBBase(RoleBase):
    id: Optional[int] = None
    is_system_role: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Role(RoleInDBBase):
    pass


class RoleWithPermissions(Role):
    permissions: List[Dict[str, Any]] = []


# User Role Assignment
class UserRoleBase(BaseModel):
    user_id: int
    role_id: int
    is_active: Optional[bool] = True


class UserRoleCreate(UserRoleBase):
    pass


class UserRoleUpdate(BaseModel):
    is_active: Optional[bool] = None


class UserRoleInDBBase(UserRoleBase):
    id: Optional[int] = None
    assigned_at: Optional[datetime] = None
    assigned_by: Optional[int] = None

    class Config:
        from_attributes = True


class UserRole(UserRoleInDBBase):
    role: Optional[Role] = None


# Forward references will be resolved when permission schema is imported