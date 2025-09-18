from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class InviteStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class ProjectMemberBase(BaseModel):
    project_id: int
    user_id: int
    role_id: int
    invite_status: Optional[InviteStatus] = InviteStatus.ACCEPTED
    is_active: Optional[bool] = True


class ProjectMemberCreate(ProjectMemberBase):
    pass


class ProjectMemberInvite(BaseModel):
    project_id: int
    email: str
    role_id: int


class ProjectMemberUpdate(BaseModel):
    role_id: Optional[int] = None
    invite_status: Optional[InviteStatus] = None
    is_active: Optional[bool] = None


class ProjectMemberInDBBase(ProjectMemberBase):
    id: Optional[int] = None
    invited_by: Optional[int] = None
    invited_at: Optional[datetime] = None
    joined_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectMember(ProjectMemberInDBBase):
    user: Optional[Dict[str, Any]] = None
    role: Optional[Dict[str, Any]] = None


class ProjectMemberWithDetails(ProjectMember):
    user_email: Optional[str] = None
    user_username: Optional[str] = None
    role_name: Optional[str] = None