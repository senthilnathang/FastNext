"""
Conversation API endpoints for threaded messaging between users.
"""

import json
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.models.conversation import Conversation, ConversationParticipant, ConversationMessage
from app.services.conversation import ConversationService

router = APIRouter(prefix="/conversations", tags=["conversations"])


# ============== Schemas ==============

class AttachmentSchema(BaseModel):
    filename: str
    url: str
    mime_type: Optional[str] = None
    size: Optional[int] = None


class UserInfoSchema(BaseModel):
    id: int
    full_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class ParticipantSchema(BaseModel):
    id: int
    user_id: int
    user: Optional[UserInfoSchema] = None
    is_active: bool = True
    is_muted: bool = False
    is_pinned: bool = False
    unread_count: int = 0
    last_read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageSchema(BaseModel):
    id: int
    conversation_id: int
    user_id: Optional[int] = None
    user: Optional[UserInfoSchema] = None
    parent_id: Optional[int] = None
    body: str
    body_html: Optional[str] = None
    attachments: Optional[List[AttachmentSchema]] = None
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    is_deleted: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_attachments(cls, message: ConversationMessage):
        """Create schema from ORM model with parsed attachments"""
        attachments = []
        if message.attachments:
            try:
                attachments = json.loads(message.attachments)
            except (json.JSONDecodeError, TypeError):
                attachments = []

        return cls(
            id=message.id,
            conversation_id=message.conversation_id,
            user_id=message.user_id,
            user=UserInfoSchema.from_orm(message.user) if message.user else None,
            parent_id=message.parent_id,
            body=message.body,
            body_html=message.body_html,
            attachments=attachments,
            is_edited=message.is_edited,
            edited_at=message.edited_at,
            is_deleted=message.is_deleted,
            created_at=message.created_at,
            updated_at=message.updated_at,
        )


class ConversationSchema(BaseModel):
    id: int
    subject: Optional[str] = None
    is_group: bool = False
    participants: List[ParticipantSchema] = []
    last_message_at: Optional[datetime] = None
    last_message_preview: Optional[str] = None
    last_message_user: Optional[UserInfoSchema] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationWithMessagesSchema(ConversationSchema):
    messages: List[MessageSchema] = []


class ConversationListResponse(BaseModel):
    items: List[ConversationSchema]
    total: int


class CreateConversationRequest(BaseModel):
    recipient_ids: List[int] = Field(..., min_items=1)
    subject: Optional[str] = None
    body: str = Field(..., min_length=1)
    body_html: Optional[str] = None
    attachments: Optional[List[AttachmentSchema]] = None


class SendMessageRequest(BaseModel):
    body: str = Field(..., min_length=1)
    body_html: Optional[str] = None
    parent_id: Optional[int] = None
    attachments: Optional[List[AttachmentSchema]] = None


class EditMessageRequest(BaseModel):
    body: str = Field(..., min_length=1)
    body_html: Optional[str] = None


# ============== Endpoints ==============

@router.get("/", response_model=ConversationListResponse)
async def list_conversations(
    include_muted: bool = Query(False, description="Include muted conversations"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List all conversations for the current user.
    Sorted by last message time (most recent first).
    """
    service = ConversationService(db)
    conversations = service.get_user_conversations(
        user_id=current_user.id,
        include_muted=include_muted,
        limit=limit,
        offset=offset,
    )

    # Get total count
    from sqlalchemy import func
    total = db.query(func.count(ConversationParticipant.id)).filter(
        ConversationParticipant.user_id == current_user.id,
        ConversationParticipant.is_active == True,
    ).scalar()

    return ConversationListResponse(
        items=[ConversationSchema.model_validate(c) for c in conversations],
        total=total or 0,
    )


@router.get("/unread-count")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get total unread conversation count for current user"""
    service = ConversationService(db)
    count = service.get_unread_count(current_user.id)
    return {"unread_count": count}


@router.post("/", response_model=ConversationWithMessagesSchema, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    request: CreateConversationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Start a new conversation or continue existing one.
    If a conversation already exists with the same participants, the message
    will be added to that conversation.
    """
    service = ConversationService(db)

    # Check messaging permissions (if messaging config is enabled)
    from app.services.messaging_config import MessagingConfigService
    messaging_service = MessagingConfigService(db)

    for recipient_id in request.recipient_ids:
        if not messaging_service.can_message(current_user.id, recipient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You are not allowed to message user {recipient_id}",
            )

    # Start or continue conversation
    conversation, message = service.start_conversation(
        sender_id=current_user.id,
        recipient_ids=request.recipient_ids,
        body=request.body,
        subject=request.subject,
        body_html=request.body_html,
        attachments=[a.model_dump() for a in request.attachments] if request.attachments else None,
    )

    db.commit()

    # Reload with messages
    conversation = service.get_conversation_with_messages(
        conversation_id=conversation.id,
        user_id=current_user.id,
        message_limit=50,
    )

    return _conversation_to_schema(conversation)


@router.get("/{conversation_id}", response_model=ConversationWithMessagesSchema)
async def get_conversation(
    conversation_id: int,
    message_limit: int = Query(100, ge=1, le=500),
    before_message_id: Optional[int] = Query(None, description="Load messages before this ID (for pagination)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a conversation with its messages.
    Messages are returned in chronological order.
    Use before_message_id for pagination (loading older messages).
    """
    service = ConversationService(db)
    conversation = service.get_conversation_with_messages(
        conversation_id=conversation_id,
        user_id=current_user.id,
        message_limit=message_limit,
        before_message_id=before_message_id,
    )

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or you are not a participant",
        )

    return _conversation_to_schema(conversation)


@router.post("/{conversation_id}/messages", response_model=MessageSchema, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send a message in a conversation"""
    service = ConversationService(db)

    message = service.send_message(
        conversation_id=conversation_id,
        user_id=current_user.id,
        body=request.body,
        body_html=request.body_html,
        parent_id=request.parent_id,
        attachments=[a.model_dump() for a in request.attachments] if request.attachments else None,
    )

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or you are not a participant",
        )

    db.commit()

    # Reload message with user
    db.refresh(message)
    return MessageSchema.from_orm_with_attachments(message)


@router.post("/{conversation_id}/read")
async def mark_as_read(
    conversation_id: int,
    message_id: Optional[int] = Query(None, description="Mark as read up to this message"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mark a conversation as read"""
    service = ConversationService(db)
    success = service.mark_as_read(
        conversation_id=conversation_id,
        user_id=current_user.id,
        message_id=message_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or you are not a participant",
        )

    db.commit()
    return {"success": True}


@router.post("/{conversation_id}/mute")
async def mute_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mute notifications for a conversation"""
    service = ConversationService(db)
    success = service.mute_conversation(conversation_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    db.commit()
    return {"success": True, "muted": True}


@router.post("/{conversation_id}/unmute")
async def unmute_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Unmute notifications for a conversation"""
    service = ConversationService(db)
    success = service.unmute_conversation(conversation_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    db.commit()
    return {"success": True, "muted": False}


@router.post("/{conversation_id}/pin")
async def pin_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Pin a conversation to the top"""
    service = ConversationService(db)
    success = service.pin_conversation(conversation_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    db.commit()
    return {"success": True, "pinned": True}


@router.post("/{conversation_id}/unpin")
async def unpin_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Unpin a conversation"""
    service = ConversationService(db)
    success = service.unpin_conversation(conversation_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    db.commit()
    return {"success": True, "pinned": False}


@router.delete("/{conversation_id}/messages/{message_id}")
async def delete_message(
    conversation_id: int,
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a message (soft delete)"""
    service = ConversationService(db)

    # Verify message belongs to conversation
    message = db.query(ConversationMessage).filter(
        ConversationMessage.id == message_id,
        ConversationMessage.conversation_id == conversation_id,
    ).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    success = service.delete_message(message_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own messages",
        )

    db.commit()
    return {"success": True}


@router.patch("/{conversation_id}/messages/{message_id}", response_model=MessageSchema)
async def edit_message(
    conversation_id: int,
    message_id: int,
    request: EditMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Edit a message"""
    service = ConversationService(db)

    # Verify message belongs to conversation
    message = db.query(ConversationMessage).filter(
        ConversationMessage.id == message_id,
        ConversationMessage.conversation_id == conversation_id,
    ).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    updated_message = service.edit_message(
        message_id=message_id,
        user_id=current_user.id,
        new_body=request.body,
        new_body_html=request.body_html,
    )

    if not updated_message:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own messages",
        )

    db.commit()
    db.refresh(updated_message)
    return MessageSchema.from_orm_with_attachments(updated_message)


@router.get("/{conversation_id}/participant")
async def get_my_participant_info(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's participant info for a conversation"""
    service = ConversationService(db)
    participant = service.get_participant_info(conversation_id, current_user.id)

    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not a participant in this conversation",
        )

    return ParticipantSchema.model_validate(participant)


# Helper function
def _conversation_to_schema(conversation: Conversation) -> ConversationWithMessagesSchema:
    """Convert conversation ORM model to schema with messages"""
    messages = []
    for msg in conversation.messages:
        messages.append(MessageSchema.from_orm_with_attachments(msg))

    return ConversationWithMessagesSchema(
        id=conversation.id,
        subject=conversation.subject,
        is_group=conversation.is_group,
        participants=[ParticipantSchema.model_validate(p) for p in conversation.participants],
        last_message_at=conversation.last_message_at,
        last_message_preview=conversation.last_message_preview,
        last_message_user=UserInfoSchema.from_orm(conversation.last_message_user) if conversation.last_message_user else None,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=messages,
    )
