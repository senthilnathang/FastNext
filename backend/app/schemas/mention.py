"""Mention schemas for @mentions in messages"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class UserInfo(BaseModel):
    """User info for mention display"""
    id: int
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class MentionCreate(BaseModel):
    """Schema for creating mentions (internal use)"""
    message_id: int
    user_id: int
    mention_text: Optional[str] = None
    start_position: Optional[int] = None
    end_position: Optional[int] = None


class MentionResponse(BaseModel):
    """Single mention response"""
    id: int
    message_id: int
    user_id: int
    mention_text: Optional[str] = None
    start_position: Optional[int] = None
    end_position: Optional[int] = None
    created_at: datetime
    user: Optional[UserInfo] = None

    model_config = {"from_attributes": True}


class MentionInMessage(BaseModel):
    """Mention info included in message response"""
    user_id: int
    user: Optional[UserInfo] = None
    mention_text: Optional[str] = None


class ParsedMention(BaseModel):
    """Parsed mention from message body (before user resolution)"""
    username: str
    start_position: int
    end_position: int


class MentionSuggestion(BaseModel):
    """User suggestion for @mention autocomplete"""
    id: int
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class MentionListResponse(BaseModel):
    """List of mentions with pagination"""
    items: List[MentionResponse]
    total: int
    has_more: bool
