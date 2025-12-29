"""Text Template schemas"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class TextTemplateCreate(BaseModel):
    """Schema for creating a text template"""
    name: str = Field(..., min_length=1, max_length=100)
    shortcut: str = Field(..., min_length=1, max_length=50)
    content: str = Field(..., min_length=1)
    category: str = Field(default="general", max_length=50)
    is_system: bool = False


class TextTemplateUpdate(BaseModel):
    """Schema for updating a text template"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    shortcut: Optional[str] = Field(None, min_length=1, max_length=50)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class TextTemplateResponse(BaseModel):
    """Single text template response"""
    id: int
    name: str
    shortcut: str
    content: str
    category: Optional[str] = None
    is_system: bool
    is_active: bool
    use_count: int
    user_id: Optional[int] = None
    company_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TextTemplateListResponse(BaseModel):
    """List of text templates"""
    items: List[TextTemplateResponse]
    total: int


class TemplateExpandRequest(BaseModel):
    """Request to expand a template shortcut"""
    shortcut: str


class TemplateExpandResponse(BaseModel):
    """Response with expanded template content"""
    found: bool
    shortcut: str
    content: Optional[str] = None
    template: Optional[TextTemplateResponse] = None
