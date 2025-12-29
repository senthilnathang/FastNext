"""Messages API endpoints

REST API for message threads with read receipts and HTML sanitization.
"""

import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.message import Message, MessageLevel, MessageType
from app.models.read_receipt import MessageReadReceipt
from app.models.reaction import MessageReaction
from app.services.mention_service import get_mention_service


router = APIRouter(prefix="/messages", tags=["messages"])


# =============================================================================
# SCHEMAS
# =============================================================================

class MessageCreate(BaseModel):
    """Schema for creating a message."""
    model_name: str = Field(..., max_length=128)
    record_id: int
    body: str
    body_html: Optional[str] = None
    subject: Optional[str] = Field(None, max_length=500)
    message_type: Optional[str] = "comment"
    level: Optional[str] = "info"
    parent_id: Optional[int] = None
    is_internal: bool = False


class MessageUpdate(BaseModel):
    """Schema for updating a message."""
    body: Optional[str] = None
    body_html: Optional[str] = None
    subject: Optional[str] = Field(None, max_length=500)
    is_pinned: Optional[bool] = None


class MessageResponse(BaseModel):
    """Schema for message response."""
    id: int
    model_name: str
    record_id: int
    user_id: Optional[int]
    parent_id: Optional[int]
    subject: Optional[str]
    body: Optional[str]
    body_html: Optional[str]
    message_type: Optional[str]
    level: Optional[str]
    attachments: List[dict]
    is_internal: bool
    is_pinned: bool
    is_archived: bool
    is_edited: bool
    is_deleted: bool
    edited_at: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]
    reply_count: int
    user: Optional[dict] = None
    replies: Optional[List["MessageResponse"]] = None

    class Config:
        from_attributes = True


class BulkReadRequest(BaseModel):
    """Schema for bulk read request."""
    message_ids: List[int]


class ReadReceiptResponse(BaseModel):
    """Schema for read receipt response."""
    message_id: int
    user_id: int
    read_at: Optional[str]
    user: Optional[dict] = None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def sanitize_html(html: str) -> str:
    """
    Basic HTML sanitization to prevent XSS.

    Removes script tags, event handlers, and javascript URLs.
    """
    if not html:
        return html

    # Remove script tags
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.IGNORECASE | re.DOTALL)

    # Remove style tags
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.IGNORECASE | re.DOTALL)

    # Remove event handlers
    html = re.sub(r'\s+on\w+\s*=\s*["\'][^"\']*["\']', "", html, flags=re.IGNORECASE)

    # Remove javascript: URLs
    html = re.sub(r'javascript:', "", html, flags=re.IGNORECASE)

    return html


def get_current_user_id(db: Session) -> Optional[int]:
    """Get current user ID from request context."""
    # This would typically come from authentication
    # For now, return None - implement based on your auth system
    return None


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/", response_model=List[MessageResponse])
def list_messages(
    model_name: str,
    record_id: int,
    include_internal: bool = True,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    Get all messages for a record.

    Args:
        model_name: The model/entity type
        record_id: The record ID
        include_internal: Include internal messages
        limit: Max messages to return
        offset: Pagination offset
    """
    messages = Message.get_thread(
        db=db,
        model_name=model_name,
        record_id=record_id,
        include_internal=include_internal,
        limit=limit,
        offset=offset,
    )

    return [MessageResponse(**m.to_dict()) for m in messages]


@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new message.

    Sanitizes HTML and processes @mentions.
    """
    user_id = get_current_user_id(db)

    # Sanitize HTML if provided
    body_html = sanitize_html(data.body_html) if data.body_html else None

    # Map message type
    message_type = MessageType.COMMENT
    try:
        message_type = MessageType(data.message_type)
    except ValueError:
        pass

    # Map level
    level = MessageLevel.INFO
    try:
        level = MessageLevel(data.level)
    except ValueError:
        pass

    message = Message.create(
        db=db,
        model_name=data.model_name,
        record_id=data.record_id,
        user_id=user_id,
        body=data.body,
        body_html=body_html,
        subject=data.subject,
        message_type=message_type,
        level=level,
        parent_id=data.parent_id,
        is_internal=data.is_internal,
    )

    # Process mentions
    if data.body:
        mention_service = get_mention_service(db)
        mention_service.process_message_mentions(message, notify=True)

    db.commit()

    return MessageResponse(**message.to_dict())


@router.get("/{message_id}", response_model=MessageResponse)
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
):
    """Get a single message by ID."""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.is_deleted == False,
    ).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    return MessageResponse(**message.to_dict())


@router.patch("/{message_id}", response_model=MessageResponse)
def update_message(
    message_id: int,
    data: MessageUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a message.

    Only the author can update their message.
    """
    user_id = get_current_user_id(db)

    message = db.query(Message).filter(
        Message.id == message_id,
        Message.is_deleted == False,
    ).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Check ownership (skip if no auth)
    if user_id and message.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this message",
        )

    # Update fields
    if data.body is not None or data.body_html is not None:
        body_html = sanitize_html(data.body_html) if data.body_html else None
        message.edit(data.body, body_html)

    if data.subject is not None:
        message.subject = data.subject

    if data.is_pinned is not None:
        if data.is_pinned:
            message.pin()
        else:
            message.unpin()

    db.commit()

    return MessageResponse(**message.to_dict())


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete a message (soft delete).

    Only the author can delete their message.
    """
    user_id = get_current_user_id(db)

    message = db.query(Message).filter(
        Message.id == message_id,
        Message.is_deleted == False,
    ).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Check ownership (skip if no auth)
    if user_id and message.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this message",
        )

    message.soft_delete()
    db.commit()


@router.get("/{message_id}/replies", response_model=List[MessageResponse])
def get_replies(
    message_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Get direct replies to a message."""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.is_deleted == False,
    ).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    replies = message.get_replies(db, limit=limit)
    return [MessageResponse(**r.to_dict()) for r in replies]


@router.get("/pinned/{model_name}/{record_id}", response_model=List[MessageResponse])
def get_pinned_messages(
    model_name: str,
    record_id: int,
    db: Session = Depends(get_db),
):
    """Get pinned messages for a record."""
    messages = Message.get_pinned(db, model_name, record_id)
    return [MessageResponse(**m.to_dict()) for m in messages]


@router.get("/threaded/{model_name}/{record_id}", response_model=List[MessageResponse])
def get_threaded_messages(
    model_name: str,
    record_id: int,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    Get root messages with nested replies for a record.

    Returns only root-level messages, each with their replies included.
    """
    root_messages = Message.get_root_messages(
        db=db,
        model_name=model_name,
        record_id=record_id,
        limit=limit,
        offset=offset,
    )

    return [
        MessageResponse(**m.to_dict(include_replies=True, db=db))
        for m in root_messages
    ]


# =============================================================================
# READ RECEIPTS
# =============================================================================

@router.post("/{message_id}/read", response_model=ReadReceiptResponse)
def mark_as_read(
    message_id: int,
    db: Session = Depends(get_db),
):
    """Mark a message as read."""
    user_id = get_current_user_id(db)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    message = db.query(Message).filter(
        Message.id == message_id,
        Message.is_deleted == False,
    ).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    receipt = MessageReadReceipt.mark_as_read(db, message_id, user_id)
    db.commit()

    return ReadReceiptResponse(**receipt.to_dict())


@router.get("/{message_id}/read-receipts", response_model=List[ReadReceiptResponse])
def get_read_receipts(
    message_id: int,
    db: Session = Depends(get_db),
):
    """Get all read receipts for a message."""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.is_deleted == False,
    ).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    receipts = MessageReadReceipt.get_readers(db, message_id)
    return [ReadReceiptResponse(**r.to_dict()) for r in receipts]


@router.get("/{message_id}/read-status")
def get_read_status(
    message_id: int,
    db: Session = Depends(get_db),
):
    """Quick check if current user has read a message."""
    user_id = get_current_user_id(db)

    if not user_id:
        return {"has_read": False, "read_count": 0}

    has_read = MessageReadReceipt.has_read(db, message_id, user_id)
    read_count = MessageReadReceipt.get_read_count(db, message_id)

    return {
        "has_read": has_read,
        "read_count": read_count,
    }


@router.post("/bulk-read", response_model=List[ReadReceiptResponse])
def bulk_mark_as_read(
    data: BulkReadRequest,
    db: Session = Depends(get_db),
):
    """Mark multiple messages as read."""
    user_id = get_current_user_id(db)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    receipts = MessageReadReceipt.bulk_mark_as_read(db, data.message_ids, user_id)
    db.commit()

    return [ReadReceiptResponse(**r.to_dict()) for r in receipts]
