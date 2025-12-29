"""Reaction endpoints for emoji reactions on messages"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models import User, Message, MessageReaction
from app.schemas.reaction import (
    ReactionCreate,
    ReactionResponse,
    ReactionSummary,
    ReactionSummaryItem,
    ToggleReactionResponse,
    UserInfo,
)

router = APIRouter()


def _get_message_or_404(db: Session, message_id: int) -> Message:
    """Get message or raise 404"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )
    return message


def _reaction_to_response(reaction: MessageReaction) -> ReactionResponse:
    """Convert reaction to response schema"""
    response = ReactionResponse(
        id=reaction.id,
        message_id=reaction.message_id,
        user_id=reaction.user_id,
        emoji=reaction.emoji,
        created_at=reaction.created_at,
    )
    if reaction.user:
        response.user = UserInfo(
            id=reaction.user.id,
            full_name=reaction.user.full_name,
        )
    return response


@router.post("/{message_id}/reactions", response_model=ToggleReactionResponse)
def toggle_reaction(
    message_id: int,
    reaction_in: ReactionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Toggle a reaction on a message.

    If the user has already reacted with this emoji, removes it.
    If not, adds the reaction.
    """
    message = _get_message_or_404(db, message_id)

    reaction, action = MessageReaction.toggle(
        db=db,
        message_id=message_id,
        user_id=current_user.id,
        emoji=reaction_in.emoji,
    )

    db.commit()

    response = ToggleReactionResponse(
        action=action,
        emoji=reaction_in.emoji,
    )

    if reaction:
        response.reaction = _reaction_to_response(reaction)

    return response


@router.get("/{message_id}/reactions", response_model=ReactionSummary)
def get_reactions(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get all reactions for a message with summary"""
    message = _get_message_or_404(db, message_id)

    reactions = MessageReaction.get_by_message(db, message_id)

    # Group by emoji
    emoji_groups = {}
    for reaction in reactions:
        if reaction.emoji not in emoji_groups:
            emoji_groups[reaction.emoji] = {
                "emoji": reaction.emoji,
                "count": 0,
                "users": [],
                "user_reacted": False,
            }
        emoji_groups[reaction.emoji]["count"] += 1
        emoji_groups[reaction.emoji]["users"].append(
            UserInfo(
                id=reaction.user_id,
                full_name=reaction.user.full_name if reaction.user else None,
            )
        )
        if reaction.user_id == current_user.id:
            emoji_groups[reaction.emoji]["user_reacted"] = True

    summary_items = [
        ReactionSummaryItem(**data) for data in emoji_groups.values()
    ]

    # Sort by count descending
    summary_items.sort(key=lambda x: x.count, reverse=True)

    return ReactionSummary(
        message_id=message_id,
        reactions=summary_items,
        total_count=len(reactions),
    )


@router.delete("/{message_id}/reactions/{emoji}")
def remove_reaction(
    message_id: int,
    emoji: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Remove a specific reaction from a message"""
    message = _get_message_or_404(db, message_id)

    reaction = MessageReaction.find(
        db=db,
        message_id=message_id,
        user_id=current_user.id,
        emoji=emoji,
    )

    if not reaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reaction not found",
        )

    db.delete(reaction)
    db.commit()

    return {"message": "Reaction removed"}


@router.post("/{message_id}/reactions/{emoji}", response_model=ReactionResponse)
def add_reaction(
    message_id: int,
    emoji: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Add a reaction to a message.

    If the user has already reacted with this emoji, returns the existing reaction.
    """
    message = _get_message_or_404(db, message_id)

    # Check if already exists
    existing = MessageReaction.find(
        db=db,
        message_id=message_id,
        user_id=current_user.id,
        emoji=emoji,
    )

    if existing:
        return _reaction_to_response(existing)

    # Create new reaction
    reaction = MessageReaction.create(
        db=db,
        message_id=message_id,
        user_id=current_user.id,
        emoji=emoji,
    )
    db.commit()

    return _reaction_to_response(reaction)
