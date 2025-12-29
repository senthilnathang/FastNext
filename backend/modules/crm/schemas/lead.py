"""
Lead Schemas

Pydantic schemas for CRM lead validation and serialization.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, EmailStr

from ..models.lead import LeadPriority, LeadRating, LeadSource


class LeadBase(BaseModel):
    """Base schema for leads."""

    name: str = Field(..., min_length=1, max_length=200, description="Lead title")
    contact_name: Optional[str] = Field(None, max_length=100, description="Contact person name")
    email: Optional[EmailStr] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")
    mobile: Optional[str] = Field(None, max_length=50, description="Mobile number")
    job_title: Optional[str] = Field(None, max_length=100, description="Job title")
    company_name: Optional[str] = Field(None, max_length=200, description="Company name")
    website: Optional[str] = Field(None, max_length=255, description="Website URL")
    industry: Optional[str] = Field(None, max_length=100, description="Industry")
    employees: Optional[int] = Field(None, ge=0, description="Number of employees")
    priority: LeadPriority = Field(LeadPriority.MEDIUM, description="Lead priority")
    rating: LeadRating = Field(LeadRating.WARM, description="Lead temperature")
    source: LeadSource = Field(LeadSource.WEBSITE, description="Lead source")
    expected_revenue: Optional[Decimal] = Field(None, ge=0, description="Expected revenue")
    probability: int = Field(10, ge=0, le=100, description="Win probability")
    date_deadline: Optional[date] = Field(None, description="Expected close date")
    description: Optional[str] = Field(None, description="Description")
    internal_notes: Optional[str] = Field(None, description="Internal notes")
    street: Optional[str] = Field(None, max_length=255)
    street2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    zip_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    linkedin: Optional[str] = Field(None, max_length=255)
    twitter: Optional[str] = Field(None, max_length=255)
    facebook: Optional[str] = Field(None, max_length=255)
    custom_fields: Dict[str, Any] = Field(default_factory=dict, description="Custom fields")


class LeadCreate(LeadBase):
    """Schema for creating a lead."""

    pipeline_id: Optional[int] = Field(None, description="Pipeline ID")
    stage_id: Optional[int] = Field(None, description="Initial stage ID")
    user_id: Optional[int] = Field(None, description="Assigned user ID")
    tag_ids: List[int] = Field(default_factory=list, description="Tag IDs")


class LeadUpdate(BaseModel):
    """Schema for updating a lead."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    mobile: Optional[str] = Field(None, max_length=50)
    job_title: Optional[str] = Field(None, max_length=100)
    company_name: Optional[str] = Field(None, max_length=200)
    website: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    employees: Optional[int] = Field(None, ge=0)
    pipeline_id: Optional[int] = None
    stage_id: Optional[int] = None
    priority: Optional[LeadPriority] = None
    rating: Optional[LeadRating] = None
    source: Optional[LeadSource] = None
    user_id: Optional[int] = None
    expected_revenue: Optional[Decimal] = Field(None, ge=0)
    probability: Optional[int] = Field(None, ge=0, le=100)
    date_deadline: Optional[date] = None
    description: Optional[str] = None
    internal_notes: Optional[str] = None
    street: Optional[str] = Field(None, max_length=255)
    street2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    zip_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    linkedin: Optional[str] = Field(None, max_length=255)
    twitter: Optional[str] = Field(None, max_length=255)
    facebook: Optional[str] = Field(None, max_length=255)
    custom_fields: Optional[Dict[str, Any]] = None
    tag_ids: Optional[List[int]] = None


class TagInfo(BaseModel):
    """Tag info within lead response."""

    id: int
    name: str
    color: Optional[str] = None

    class Config:
        from_attributes = True


class StageInfo(BaseModel):
    """Stage info within lead response."""

    id: int
    name: str
    probability: int
    color: Optional[str] = None

    class Config:
        from_attributes = True


class UserInfo(BaseModel):
    """User info within lead response."""

    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class LeadResponse(LeadBase):
    """Schema for lead response."""

    id: int
    company_id: Optional[int] = None
    pipeline_id: Optional[int] = None
    stage_id: Optional[int] = None
    user_id: Optional[int] = None
    is_converted: bool = False
    is_lost: bool = False
    lost_reason: Optional[str] = None
    activity_count: int = 0
    date_last_activity: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    stage: Optional[StageInfo] = None
    user: Optional[UserInfo] = None
    tags: List[TagInfo] = []

    class Config:
        from_attributes = True


class LeadList(BaseModel):
    """Schema for list of leads."""

    items: List[LeadResponse]
    total: int
    page: int = 1
    page_size: int = 20


class LeadKanbanColumn(BaseModel):
    """Kanban column for leads."""

    stage_id: int
    stage_name: str
    stage_color: Optional[str] = None
    sequence: int
    count: int
    total_revenue: Decimal = Decimal(0)
    leads: List[LeadResponse]


class LeadKanban(BaseModel):
    """Kanban board response for leads."""

    columns: List[LeadKanbanColumn]
    pipeline_id: int
    pipeline_name: str


class LeadStageMove(BaseModel):
    """Schema for moving lead to different stage."""

    stage_id: int = Field(..., description="Target stage ID")


class LeadConvert(BaseModel):
    """Schema for converting lead to opportunity."""

    create_opportunity: bool = Field(True, description="Create opportunity")
    create_contact: bool = Field(True, description="Create contact")
    create_account: bool = Field(True, description="Create account")
    opportunity_name: Optional[str] = Field(None, description="Opportunity name (default: lead name)")


class LeadConvertResult(BaseModel):
    """Result of lead conversion."""

    lead_id: int
    opportunity_id: Optional[int] = None
    contact_id: Optional[int] = None
    account_id: Optional[int] = None
    message: str


class LeadMarkLost(BaseModel):
    """Schema for marking lead as lost."""

    reason: Optional[str] = Field(None, max_length=255, description="Lost reason")
