"""Reaction schemas for emoji reactions on messages"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class UserInfo(BaseModel):
    """User info for reaction display"""
    id: int
    full_name: Optional[str] = None

    model_config = {"from_attributes": True}


class ReactionCreate(BaseModel):
    """Schema for creating a reaction"""
    emoji: str = Field(..., min_length=1, max_length=50)


class ReactionResponse(BaseModel):
    """Single reaction response"""
    id: int
    message_id: int
    user_id: int
    emoji: str
    created_at: datetime
    user: Optional[UserInfo] = None

    model_config = {"from_attributes": True}


class ReactionSummaryItem(BaseModel):
    """Summary of reactions for a single emoji"""
    emoji: str
    count: int
    users: List[UserInfo]
    user_reacted: bool = False  # Whether current user reacted with this emoji


class ReactionSummary(BaseModel):
    """Full reaction summary for a message"""
    message_id: int
    reactions: List[ReactionSummaryItem]
    total_count: int


class ToggleReactionResponse(BaseModel):
    """Response for toggle reaction endpoint"""
    action: str  # 'added' or 'removed'
    emoji: str
    reaction: Optional[ReactionResponse] = None
