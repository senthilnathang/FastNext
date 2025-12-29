"""Label schemas for inbox label management"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class LabelBase(BaseModel):
    """Base label schema"""

    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    sort_order: int = Field(default=0, ge=0)


class LabelCreate(LabelBase):
    """Schema for creating a label"""

    pass


class LabelUpdate(BaseModel):
    """Schema for updating a label"""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    sort_order: Optional[int] = Field(None, ge=0)


class LabelResponse(LabelBase):
    """Label response schema"""

    id: int
    user_id: int
    is_system: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LabelListResponse(BaseModel):
    """List of labels response"""

    items: List[LabelResponse]
    total: int


class LabelSummary(BaseModel):
    """Minimal label info for inbox item responses"""

    id: int
    name: str
    color: str
    icon: Optional[str] = None

    model_config = {"from_attributes": True}


class AddLabelsRequest(BaseModel):
    """Schema for adding labels to an inbox item"""

    label_ids: List[int] = Field(..., min_length=1)


class RemoveLabelsRequest(BaseModel):
    """Schema for removing labels from an inbox item"""

    label_ids: List[int] = Field(..., min_length=1)


class BulkLabelRequest(BaseModel):
    """Schema for bulk label operations"""

    inbox_item_ids: List[int] = Field(..., min_length=1)
    add_label_ids: List[int] = Field(default_factory=list)
    remove_label_ids: List[int] = Field(default_factory=list)

    @field_validator("add_label_ids", "remove_label_ids")
    @classmethod
    def validate_label_ids(cls, v):
        return v if v else []
