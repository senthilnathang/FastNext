"""Reactions API endpoints

REST API for emoji reactions on messages.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.message import Message
from app.models.reaction import MessageReaction


router = APIRouter(prefix="/messages", tags=["reactions"])


# =============================================================================
# SCHEMAS
# =============================================================================

class ReactionCreate(BaseModel):
    """Schema for creating/toggling a reaction."""
    emoji: str = Field(..., min_length=1, max_length=50)


class ReactionResponse(BaseModel):
    """Schema for reaction response."""
    id: int
    message_id: int
    user_id: int
    emoji: str
    user: Optional[dict] = None

    class Config:
        from_attributes = True


class ReactionSummaryItem(BaseModel):
    """Schema for reaction summary item."""
    emoji: str
    count: int
    user_ids: List[int]
    users: List[dict]
    user_reacted: bool


class ReactionSummary(BaseModel):
    """Schema for message reaction summary."""
    message_id: int
    reactions: List[ReactionSummaryItem]


class ToggleReactionResponse(BaseModel):
    """Schema for toggle reaction response."""
    action: str  # "added" or "removed"
    emoji: str
    reaction: Optional[ReactionResponse] = None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_current_user_id(db: Session) -> Optional[int]:
    """Get current user ID from request context."""
    return None


def require_auth(db: Session) -> int:
    """Require authentication and return user ID."""
    user_id = get_current_user_id(db)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user_id


def get_message_or_404(db: Session, message_id: int) -> Message:
    """Get message or raise 404."""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.is_deleted == False,
    ).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    return message


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/{message_id}/reactions", response_model=ToggleReactionResponse)
def toggle_reaction(
    message_id: int,
    data: ReactionCreate,
    db: Session = Depends(get_db),
):
    """
    Toggle a reaction on a message.

    If the reaction exists, removes it. Otherwise adds it.
    """
    user_id = require_auth(db)
    message = get_message_or_404(db, message_id)

    reaction, action = MessageReaction.toggle(
        db=db,
        message_id=message_id,
        user_id=user_id,
        emoji=data.emoji,
    )

    db.commit()

    return ToggleReactionResponse(
        action=action,
        emoji=data.emoji,
        reaction=ReactionResponse(**reaction.to_dict()) if reaction else None,
    )


@router.get("/{message_id}/reactions", response_model=ReactionSummary)
def get_reactions(
    message_id: int,
    db: Session = Depends(get_db),
):
    """
    Get reactions for a message with summary.

    Returns reactions grouped by emoji with count and users.
    """
    user_id = get_current_user_id(db)
    message = get_message_or_404(db, message_id)

    summary = MessageReaction.get_reaction_summary(
        db=db,
        message_id=message_id,
        current_user_id=user_id,
    )

    return ReactionSummary(
        message_id=message_id,
        reactions=[ReactionSummaryItem(**item) for item in summary],
    )


@router.post("/{message_id}/reactions/{emoji}", response_model=ReactionResponse, status_code=status.HTTP_201_CREATED)
def add_reaction(
    message_id: int,
    emoji: str,
    db: Session = Depends(get_db),
):
    """
    Add a reaction to a message.

    Idempotent - returns existing reaction if already exists.
    """
    user_id = require_auth(db)
    message = get_message_or_404(db, message_id)

    # Check if already exists
    existing = MessageReaction.find(db, message_id, user_id, emoji)
    if existing:
        return ReactionResponse(**existing.to_dict())

    reaction = MessageReaction.create(
        db=db,
        message_id=message_id,
        user_id=user_id,
        emoji=emoji,
    )

    db.commit()

    return ReactionResponse(**reaction.to_dict())


@router.delete("/{message_id}/reactions/{emoji}", status_code=status.HTTP_204_NO_CONTENT)
def remove_reaction(
    message_id: int,
    emoji: str,
    db: Session = Depends(get_db),
):
    """Remove a specific reaction from a message."""
    user_id = require_auth(db)
    message = get_message_or_404(db, message_id)

    reaction = MessageReaction.find(db, message_id, user_id, emoji)
    if reaction:
        db.delete(reaction)
        db.commit()
