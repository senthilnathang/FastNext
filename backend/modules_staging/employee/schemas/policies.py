"""
Policy Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PolicyAttachmentBase(BaseModel):
    """Base schema for policy attachment."""
    file_name: str = Field(..., max_length=255)
    file_path: str = Field(..., max_length=500)


class PolicyAttachmentResponse(PolicyAttachmentBase):
    """Schema for policy attachment response."""
    id: int

    class Config:
        from_attributes = True


class PolicyBase(BaseModel):
    """Base schema for policy."""
    title: str = Field(..., max_length=255)
    body: str  # HTML content
    is_visible_to_all: bool = True


class PolicyCreate(PolicyBase):
    """Schema for creating a policy."""
    specific_employee_ids: List[int] = []  # Only if is_visible_to_all is False


class PolicyUpdate(BaseModel):
    """Schema for updating a policy."""
    title: Optional[str] = Field(None, max_length=255)
    body: Optional[str] = None
    is_visible_to_all: Optional[bool] = None
    specific_employee_ids: Optional[List[int]] = None


class PolicyResponse(PolicyBase):
    """Schema for policy response."""
    id: int
    company_id: int
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    attachments: List[PolicyAttachmentResponse] = []
    specific_employees: List[int] = []  # List of employee IDs

    class Config:
        from_attributes = True


class PolicyListResponse(BaseModel):
    """Schema for paginated policy list."""
    results: List[PolicyResponse]
    count: int
