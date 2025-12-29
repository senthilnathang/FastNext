"""Conversations API endpoints

REST API for user-to-user conversations with participant management.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.conversation_service import get_conversation_service


router = APIRouter(prefix="/conversations", tags=["conversations"])


# =============================================================================
# SCHEMAS
# =============================================================================

class ConversationCreate(BaseModel):
    """Schema for creating/continuing a conversation."""
    participant_ids: List[int] = Field(..., min_items=1)
    subject: Optional[str] = Field(None, max_length=500)
    body: Optional[str] = None
    body_html: Optional[str] = None


class MessageCreate(BaseModel):
    """Schema for sending a message in a conversation."""
    body: str
    body_html: Optional[str] = None
    parent_id: Optional[int] = None


class MessageUpdate(BaseModel):
    """Schema for editing a message."""
    body: str
    body_html: Optional[str] = None


class ConversationResponse(BaseModel):
    """Schema for conversation response."""
    id: int
    subject: Optional[str]
    is_group: bool
    last_message_at: Optional[str]
    last_message_preview: Optional[str]
    last_message_user_id: Optional[int]
    created_by: Optional[int]
    created_at: Optional[str]
    participant_ids: List[int]
    unread_count: Optional[int] = None
    is_muted: Optional[bool] = None
    is_pinned: Optional[bool] = None
    messages: Optional[List[dict]] = None
    participants_info: Optional[List[dict]] = None
    participant: Optional[dict] = None

    class Config:
        from_attributes = True


class ParticipantResponse(BaseModel):
    """Schema for participant info."""
    id: int
    conversation_id: int
    user_id: int
    is_active: bool
    is_muted: bool
    is_pinned: bool
    last_read_at: Optional[str]
    last_read_message_id: Optional[int]
    unread_count: int
    joined_at: Optional[str]

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    """Schema for conversation message response."""
    id: int
    conversation_id: int
    user_id: Optional[int]
    parent_id: Optional[int]
    body: Optional[str]
    body_html: Optional[str]
    attachments: List[dict]
    is_edited: bool
    edited_at: Optional[str]
    is_deleted: bool
    created_at: Optional[str]
    updated_at: Optional[str]
    user: Optional[dict] = None

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    """Schema for unread count response."""
    unread_count: int


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_current_user_id(db: Session) -> Optional[int]:
    """Get current user ID from request context."""
    # This would typically come from authentication
    # For now, return None - implement based on your auth system
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


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/", response_model=List[ConversationResponse])
def list_conversations(
    include_muted: bool = True,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    Get user's conversations.

    Returns conversations sorted by pinned first, then by last message time.
    """
    user_id = require_auth(db)

    service = get_conversation_service(db)
    conversations = service.get_user_conversations(
        user_id=user_id,
        include_muted=include_muted,
        limit=limit,
        offset=offset,
    )

    return [ConversationResponse(**c) for c in conversations]


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
):
    """Get total unread message count for user."""
    user_id = require_auth(db)

    service = get_conversation_service(db)
    count = service.get_unread_count(user_id)

    return UnreadCountResponse(unread_count=count)


@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_or_continue_conversation(
    data: ConversationCreate,
    db: Session = Depends(get_db),
):
    """
    Create or continue a conversation.

    If a 1-on-1 conversation exists with the same participants, returns that.
    Otherwise creates a new conversation.

    If body is provided, also sends an initial message.
    """
    user_id = require_auth(db)

    service = get_conversation_service(db)

    # Find or create conversation
    conversation, created = service.find_or_create_conversation(
        user_id=user_id,
        participant_ids=data.participant_ids,
        subject=data.subject,
    )

    # Send initial message if provided
    if data.body:
        service.send_message(
            conversation_id=conversation.id,
            user_id=user_id,
            body=data.body,
            body_html=data.body_html,
        )

    # Get full conversation details
    conv_dict = service.get_conversation_with_messages(
        conversation_id=conversation.id,
        user_id=user_id,
    )

    return ConversationResponse(**conv_dict)


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: int,
    message_limit: int = 50,
    message_offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    Get a conversation with messages.

    Validates user is a participant.
    """
    user_id = require_auth(db)

    service = get_conversation_service(db)
    conv_dict = service.get_conversation_with_messages(
        conversation_id=conversation_id,
        user_id=user_id,
        message_limit=message_limit,
        message_offset=message_offset,
    )

    if not conv_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return ConversationResponse(**conv_dict)


@router.get("/{conversation_id}/participant", response_model=ParticipantResponse)
def get_participant_info(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """Get current user's participant info."""
    user_id = require_auth(db)

    service = get_conversation_service(db)
    participant = service.get_participant_info(
        conversation_id=conversation_id,
        user_id=user_id,
    )

    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not a participant in this conversation",
        )

    return ParticipantResponse(**participant)


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
):
    """Send a message in a conversation."""
    user_id = require_auth(db)

    service = get_conversation_service(db)
    message = service.send_message(
        conversation_id=conversation_id,
        user_id=user_id,
        body=data.body,
        body_html=data.body_html,
        parent_id=data.parent_id,
    )

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or not a participant",
        )

    return MessageResponse(**message.to_dict())


@router.delete("/{conversation_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    conversation_id: int,
    message_id: int,
    db: Session = Depends(get_db),
):
    """
    Soft delete a message.

    Only the author can delete their messages.
    """
    user_id = require_auth(db)

    service = get_conversation_service(db)
    success = service.delete_message(
        conversation_id=conversation_id,
        message_id=message_id,
        user_id=user_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or not authorized",
        )


@router.patch("/{conversation_id}/messages/{message_id}", response_model=MessageResponse)
def edit_message(
    conversation_id: int,
    message_id: int,
    data: MessageUpdate,
    db: Session = Depends(get_db),
):
    """
    Edit a message.

    Only the author can edit their messages.
    """
    user_id = require_auth(db)

    service = get_conversation_service(db)
    message = service.edit_message(
        conversation_id=conversation_id,
        message_id=message_id,
        user_id=user_id,
        body=data.body,
        body_html=data.body_html,
    )

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or not authorized",
        )

    return MessageResponse(**message.to_dict())


@router.post("/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_as_read(
    conversation_id: int,
    message_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Mark conversation as read."""
    user_id = require_auth(db)

    service = get_conversation_service(db)
    success = service.mark_as_read(
        conversation_id=conversation_id,
        user_id=user_id,
        message_id=message_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not a participant in this conversation",
        )


@router.post("/{conversation_id}/mute", status_code=status.HTTP_204_NO_CONTENT)
def mute_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """Mute notifications for a conversation."""
    user_id = require_auth(db)

    service = get_conversation_service(db)
    success = service.mute_conversation(conversation_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not a participant in this conversation",
        )


@router.post("/{conversation_id}/unmute", status_code=status.HTTP_204_NO_CONTENT)
def unmute_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """Unmute notifications for a conversation."""
    user_id = require_auth(db)

    service = get_conversation_service(db)
    success = service.unmute_conversation(conversation_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not a participant in this conversation",
        )


@router.post("/{conversation_id}/pin", status_code=status.HTTP_204_NO_CONTENT)
def pin_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """Pin a conversation."""
    user_id = require_auth(db)

    service = get_conversation_service(db)
    success = service.pin_conversation(conversation_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not a participant in this conversation",
        )


@router.post("/{conversation_id}/unpin", status_code=status.HTTP_204_NO_CONTENT)
def unpin_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """Unpin a conversation."""
    user_id = require_auth(db)

    service = get_conversation_service(db)
    success = service.unpin_conversation(conversation_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not a participant in this conversation",
        )


@router.post("/{conversation_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """
    Leave a group conversation.

    Only works for group conversations (3+ participants).
    """
    user_id = require_auth(db)

    service = get_conversation_service(db)
    success = service.leave_conversation(conversation_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot leave this conversation (not a group or not a participant)",
        )
