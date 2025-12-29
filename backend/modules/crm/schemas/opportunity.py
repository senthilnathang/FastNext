"""
Opportunity Schemas

Pydantic schemas for CRM opportunity validation and serialization.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from ..models.opportunity import OpportunityType, OpportunityPriority


class OpportunityBase(BaseModel):
    """Base schema for opportunities."""

    name: str = Field(..., min_length=1, max_length=200, description="Deal name")
    account_id: Optional[int] = Field(None, description="Related account ID")
    contact_id: Optional[int] = Field(None, description="Primary contact ID")
    amount: Decimal = Field(Decimal(0), ge=0, description="Deal value")
    currency: str = Field("USD", max_length=3, description="Currency code")
    probability: int = Field(10, ge=0, le=100, description="Win probability")
    opportunity_type: OpportunityType = Field(OpportunityType.NEW_BUSINESS, description="Deal type")
    priority: OpportunityPriority = Field(OpportunityPriority.MEDIUM, description="Priority level")
    date_deadline: Optional[date] = Field(None, description="Expected close date")
    next_action: Optional[str] = Field(None, max_length=255, description="Next action")
    next_action_date: Optional[date] = Field(None, description="Next action date")
    description: Optional[str] = Field(None, description="Description")
    internal_notes: Optional[str] = Field(None, description="Internal notes")
    source: Optional[str] = Field(None, max_length=100, description="Lead source")
    medium: Optional[str] = Field(None, max_length=100, description="Marketing medium")
    custom_fields: Dict[str, Any] = Field(default_factory=dict, description="Custom fields")


class OpportunityCreate(OpportunityBase):
    """Schema for creating an opportunity."""

    pipeline_id: Optional[int] = Field(None, description="Pipeline ID")
    stage_id: Optional[int] = Field(None, description="Initial stage ID")
    user_id: Optional[int] = Field(None, description="Assigned user ID")
    lead_id: Optional[int] = Field(None, description="Source lead ID")
    tag_ids: List[int] = Field(default_factory=list, description="Tag IDs")


class OpportunityUpdate(BaseModel):
    """Schema for updating an opportunity."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    account_id: Optional[int] = None
    contact_id: Optional[int] = None
    pipeline_id: Optional[int] = None
    stage_id: Optional[int] = None
    amount: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    probability: Optional[int] = Field(None, ge=0, le=100)
    opportunity_type: Optional[OpportunityType] = None
    priority: Optional[OpportunityPriority] = None
    user_id: Optional[int] = None
    date_deadline: Optional[date] = None
    next_action: Optional[str] = Field(None, max_length=255)
    next_action_date: Optional[date] = None
    description: Optional[str] = None
    internal_notes: Optional[str] = None
    source: Optional[str] = Field(None, max_length=100)
    medium: Optional[str] = Field(None, max_length=100)
    custom_fields: Optional[Dict[str, Any]] = None
    tag_ids: Optional[List[int]] = None


class TagInfo(BaseModel):
    """Tag info within opportunity response."""

    id: int
    name: str
    color: Optional[str] = None

    class Config:
        from_attributes = True


class StageInfo(BaseModel):
    """Stage info within opportunity response."""

    id: int
    name: str
    probability: int
    color: Optional[str] = None

    class Config:
        from_attributes = True


class UserInfo(BaseModel):
    """User info within opportunity response."""

    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class AccountInfo(BaseModel):
    """Account info within opportunity response."""

    id: int
    name: str

    class Config:
        from_attributes = True


class ContactInfo(BaseModel):
    """Contact info within opportunity response."""

    id: int
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class OpportunityResponse(OpportunityBase):
    """Schema for opportunity response."""

    id: int
    company_id: Optional[int] = None
    pipeline_id: Optional[int] = None
    stage_id: Optional[int] = None
    user_id: Optional[int] = None
    lead_id: Optional[int] = None
    expected_revenue: Decimal = Decimal(0)
    is_won: bool = False
    is_lost: bool = False
    lost_reason: Optional[str] = None
    competitor: Optional[str] = None
    date_closed: Optional[date] = None
    activity_count: int = 0
    date_last_activity: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    stage: Optional[StageInfo] = None
    user: Optional[UserInfo] = None
    account: Optional[AccountInfo] = None
    contact: Optional[ContactInfo] = None
    tags: List[TagInfo] = []

    class Config:
        from_attributes = True


class OpportunityList(BaseModel):
    """Schema for list of opportunities."""

    items: List[OpportunityResponse]
    total: int
    page: int = 1
    page_size: int = 20


class OpportunityKanbanColumn(BaseModel):
    """Kanban column for opportunities."""

    stage_id: int
    stage_name: str
    stage_color: Optional[str] = None
    sequence: int
    count: int
    total_amount: Decimal = Decimal(0)
    weighted_amount: Decimal = Decimal(0)
    opportunities: List[OpportunityResponse]


class OpportunityKanban(BaseModel):
    """Kanban board response for opportunities."""

    columns: List[OpportunityKanbanColumn]
    pipeline_id: int
    pipeline_name: str


class OpportunityStageMove(BaseModel):
    """Schema for moving opportunity to different stage."""

    stage_id: int = Field(..., description="Target stage ID")


class OpportunityMarkWon(BaseModel):
    """Schema for marking opportunity as won."""

    pass


class OpportunityMarkLost(BaseModel):
    """Schema for marking opportunity as lost."""

    reason: Optional[str] = Field(None, max_length=255, description="Lost reason")
    competitor: Optional[str] = Field(None, max_length=200, description="Competitor who won")


class OpportunityForecast(BaseModel):
    """Revenue forecast data."""

    period: str
    expected_revenue: Decimal
    weighted_revenue: Decimal
    opportunity_count: int
    won_count: int
    won_revenue: Decimal
