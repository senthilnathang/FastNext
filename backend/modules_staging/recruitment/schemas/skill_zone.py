"""
Skill Zone Schemas

Pydantic schemas for skill zone and talent pool models:
SkillZone, SkillZoneCandidate, CandidateRating.
"""

from datetime import date, datetime
from typing import Optional, List

from pydantic import BaseModel, Field


# =============================================================================
# Skill Zone Schemas
# =============================================================================

class SkillZoneBase(BaseModel):
    """Base schema for skill zones."""
    title: str = Field(..., min_length=1, max_length=50, description="Skill zone title")
    description: str = Field(..., min_length=1, max_length=255, description="Description")


class SkillZoneCreate(SkillZoneBase):
    """Schema for creating a skill zone."""
    pass


class SkillZoneUpdate(BaseModel):
    """Schema for updating a skill zone."""
    title: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None


class SkillZoneResponse(SkillZoneBase):
    """Schema for skill zone response."""
    id: int
    is_active: bool = True
    candidate_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SkillZoneList(BaseModel):
    """Paginated list of skill zones."""
    items: List[SkillZoneResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Skill Zone Candidate Schemas
# =============================================================================

class SkillZoneCandidateBase(BaseModel):
    """Base schema for skill zone candidates."""
    reason: str = Field(..., min_length=1, max_length=200, description="Reason for adding to skill zone")
    added_on: Optional[date] = Field(None, description="Date added to skill zone")


class SkillZoneCandidateCreate(SkillZoneCandidateBase):
    """Schema for creating a skill zone candidate."""
    skill_zone_id: Optional[int] = Field(None, description="Skill zone ID")
    candidate_id: Optional[int] = Field(None, description="Candidate ID")


class SkillZoneCandidateUpdate(BaseModel):
    """Schema for updating a skill zone candidate."""
    skill_zone_id: Optional[int] = None
    candidate_id: Optional[int] = None
    reason: Optional[str] = Field(None, min_length=1, max_length=200)
    added_on: Optional[date] = None
    is_active: Optional[bool] = None


class SkillZoneCandidateResponse(SkillZoneCandidateBase):
    """Schema for skill zone candidate response."""
    id: int
    skill_zone_id: Optional[int] = None
    candidate_id: Optional[int] = None
    is_active: bool = True
    # Computed/joined fields
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    skill_zone_title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SkillZoneCandidateList(BaseModel):
    """Paginated list of skill zone candidates."""
    items: List[SkillZoneCandidateResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Candidate Rating Schemas
# =============================================================================

class CandidateRatingBase(BaseModel):
    """Base schema for candidate ratings."""
    rating: int = Field(..., ge=0, le=5, description="Rating from 0 to 5")


class CandidateRatingCreate(CandidateRatingBase):
    """Schema for creating a candidate rating."""
    employee_id: int = Field(..., description="Employee ID who is rating")
    candidate_id: int = Field(..., description="Candidate ID being rated")


class CandidateRatingUpdate(BaseModel):
    """Schema for updating a candidate rating."""
    rating: Optional[int] = Field(None, ge=0, le=5)


class CandidateRatingResponse(CandidateRatingBase):
    """Schema for candidate rating response."""
    id: int
    employee_id: int
    candidate_id: int
    # Computed/joined fields
    employee_name: Optional[str] = None
    candidate_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CandidateRatingList(BaseModel):
    """Paginated list of candidate ratings."""
    items: List[CandidateRatingResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Bulk Operations Schemas
# =============================================================================

class BulkAddToSkillZone(BaseModel):
    """Schema for bulk adding candidates to a skill zone."""
    skill_zone_id: int = Field(..., description="Skill zone ID")
    candidate_ids: List[int] = Field(..., description="List of candidate IDs")
    reason: str = Field(..., min_length=1, max_length=200, description="Reason for adding")


class BulkRemoveFromSkillZone(BaseModel):
    """Schema for bulk removing candidates from a skill zone."""
    skill_zone_id: int = Field(..., description="Skill zone ID")
    candidate_ids: List[int] = Field(..., description="List of candidate IDs to remove")


class SkillZoneWithCandidates(SkillZoneResponse):
    """Skill zone with nested candidates."""
    candidates: List[SkillZoneCandidateResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True
