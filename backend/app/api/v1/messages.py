"""Messages API endpoints for mail thread functionality"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models import User
from app.models.message import Message, MessageType, MessageLevel
from app.models.read_receipt import MessageReadReceipt
from app.services.realtime import realtime, EventType

router = APIRouter()


# HTML sanitization - basic allowlist of safe tags
ALLOWED_TAGS = {
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
    'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'span', 'div',
}
ALLOWED_ATTRS = {'a': ['href', 'target', 'rel'], 'span': ['class'], 'div': ['class']}


def sanitize_html(html: str) -> str:
    """
    Basic HTML sanitization.
    For production, use bleach library: pip install bleach
    """
    if not html:
        return html

    import re

    # Remove script tags and their content
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # Remove style tags and their content
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # Remove on* event handlers
    html = re.sub(r'\s+on\w+\s*=\s*["\'][^"\']*["\']', '', html, flags=re.IGNORECASE)
    html = re.sub(r'\s+on\w+\s*=\s*\S+', '', html, flags=re.IGNORECASE)

    # Remove javascript: URLs
    html = re.sub(r'href\s*=\s*["\']javascript:[^"\']*["\']', 'href="#"', html, flags=re.IGNORECASE)

    return html


# Schemas
class MessageCreate(BaseModel):
    """Create message schema"""
    model_name: str
    record_id: int
    body: str
    body_html: Optional[str] = None
    subject: Optional[str] = None
    parent_id: Optional[int] = None
    message_type: str = "comment"
    is_internal: bool = False


class MessageUpdate(BaseModel):
    """Update message schema"""
    body: Optional[str] = None
    body_html: Optional[str] = None
    subject: Optional[str] = None
    is_pinned: Optional[bool] = None


class UserInfo(BaseModel):
    """User info for message responses"""
    id: int
    full_name: str
    avatar_url: Optional[str] = None


class MentionInfo(BaseModel):
    """Mention info for message responses"""
    user_id: int
    mention_text: Optional[str] = None
    user: Optional[UserInfo] = None


class MessageResponse(BaseModel):
    """Message response schema"""
    id: int
    model_name: str
    record_id: int
    user_id: Optional[int] = None
    parent_id: Optional[int] = None
    subject: Optional[str] = None
    body: str
    body_html: Optional[str] = None
    message_type: str
    level: str
    is_internal: bool
    is_pinned: bool
    is_archived: bool = False
    attachments: List[dict] = []
    extra_data: dict = {}
    created_at: str
    updated_at: Optional[str] = None
    user: Optional[UserInfo] = None
    mentions: List[MentionInfo] = []
    replies: List["MessageResponse"] = []
    # Thread metadata
    reply_count: int = 0
    is_thread_root: bool = True

    class Config:
        from_attributes = True


class MessageThreadResponse(BaseModel):
    """Full thread response with nested replies and participants"""
    root_message: MessageResponse
    total_replies: int
    participants: List[UserInfo]
    depth: int = 0  # Maximum nesting depth


# Endpoints
@router.get("/", response_model=List[MessageResponse])
def list_messages(
    model_name: str,
    record_id: int,
    include_internal: bool = True,
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List messages for a model record"""
    messages = Message.get_thread(
        db=db,
        model_name=model_name,
        record_id=record_id,
        include_internal=include_internal,
        limit=limit,
    )

    result = []
    for msg in messages:
        msg_dict = _message_to_dict(msg, db)
        result.append(MessageResponse(**msg_dict))

    return result


@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a new message"""
    from app.services.mention import MentionService

    # Sanitize HTML if provided
    body_html = sanitize_html(data.body_html) if data.body_html else None

    message = Message.create(
        db=db,
        model_name=data.model_name,
        record_id=data.record_id,
        user_id=current_user.id,
        body=data.body,
        body_html=body_html,
        subject=data.subject,
        parent_id=data.parent_id,
        message_type=data.message_type,
        is_internal=data.is_internal,
    )
    db.flush()

    # Process @mentions in the message body (sync version for non-async endpoint)
    mention_service = MentionService(db)
    mention_service.process_message_mentions_sync(
        message=message,
        author_id=current_user.id,
        company_id=current_user.current_company_id,
    )

    db.commit()

    msg_dict = _message_to_dict(message, db)
    return MessageResponse(**msg_dict)


@router.get("/{message_id}", response_model=MessageResponse)
def get_message(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific message"""
    message = db.query(Message).filter(Message.id == message_id).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    msg_dict = _message_to_dict(message, db)
    return MessageResponse(**msg_dict)


@router.patch("/{message_id}", response_model=MessageResponse)
def update_message(
    message_id: int,
    data: MessageUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update a message"""
    message = db.query(Message).filter(Message.id == message_id).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Only author or superuser can update
    if message.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update this message",
        )

    # Apply updates
    if data.body is not None:
        message.body = data.body
    if data.body_html is not None:
        message.body_html = sanitize_html(data.body_html)
    if data.subject is not None:
        message.subject = data.subject
    if data.is_pinned is not None:
        message.is_pinned = data.is_pinned

    db.commit()
    db.refresh(message)

    msg_dict = _message_to_dict(message, db)
    return MessageResponse(**msg_dict)


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a message"""
    message = db.query(Message).filter(Message.id == message_id).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Only author or superuser can delete
    if message.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete this message",
        )

    db.delete(message)
    db.commit()


@router.get("/{message_id}/replies", response_model=List[MessageResponse])
def get_message_replies(
    message_id: int,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get replies to a message"""
    replies = Message.get_replies(db, message_id, limit)

    result = []
    for reply in replies:
        msg_dict = _message_to_dict(reply, db)
        result.append(MessageResponse(**msg_dict))

    return result


@router.get("/pinned/{model_name}/{record_id}", response_model=List[MessageResponse])
def get_pinned_messages(
    model_name: str,
    record_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get pinned messages for a record"""
    messages = Message.get_pinned(db, model_name, record_id)

    result = []
    for msg in messages:
        msg_dict = _message_to_dict(msg, db)
        result.append(MessageResponse(**msg_dict))

    return result


@router.get("/{message_id}/thread", response_model=MessageThreadResponse)
def get_message_thread(
    message_id: int,
    max_depth: int = Query(5, ge=1, le=10),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get full thread starting from a message with nested replies"""
    message = db.query(Message).filter(Message.id == message_id).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Get thread root if this isn't already the root
    root = message.get_thread_root(db) if not message.is_thread_root else message

    # Convert to dict with nested replies
    root_dict = _message_to_dict(root, db, include_replies=True, max_depth=max_depth)

    # Calculate thread depth
    depth = _get_thread_depth(root, db)

    # Collect participants
    participants = {}
    _collect_participants(root, db, participants)

    # Count total replies
    total_replies = root.get_all_replies_count(db)

    return MessageThreadResponse(
        root_message=MessageResponse(**root_dict),
        total_replies=total_replies,
        participants=[UserInfo(**p) for p in participants.values()],
        depth=depth,
    )


@router.get("/threaded/{model_name}/{record_id}", response_model=List[MessageResponse])
def get_threaded_messages(
    model_name: str,
    record_id: int,
    include_internal: bool = True,
    max_depth: int = Query(3, ge=1, le=10),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get messages for a record organized as threads (only root messages with nested replies)"""
    # Get only root messages (no parent)
    query = db.query(Message).filter(
        Message.model_name == model_name,
        Message.record_id == record_id,
        Message.parent_id.is_(None),
    )
    if not include_internal:
        query = query.filter(Message.is_internal == False)

    messages = query.order_by(Message.created_at.asc()).limit(limit).all()

    result = []
    for msg in messages:
        msg_dict = _message_to_dict(msg, db, include_replies=True, max_depth=max_depth)
        result.append(MessageResponse(**msg_dict))

    return result


def _message_to_dict(message: Message, db: Session, include_replies: bool = False, max_depth: int = 2) -> dict:
    """Convert message to dictionary

    Args:
        message: The message to convert
        db: Database session
        include_replies: Whether to recursively include replies
        max_depth: Maximum depth for nested replies (prevents infinite recursion)
    """
    import json

    msg_dict = {
        "id": message.id,
        "model_name": message.model_name,
        "record_id": message.record_id,
        "user_id": message.user_id,
        "parent_id": message.parent_id,
        "subject": message.subject,
        "body": message.body,
        "body_html": message.body_html,
        "message_type": message.message_type.value if message.message_type else "comment",
        "level": message.level.value if message.level else "info",
        "is_internal": message.is_internal,
        "is_pinned": message.is_pinned,
        "is_archived": message.is_archived if hasattr(message, 'is_archived') else False,
        "attachments": json.loads(message.attachments) if message.attachments else [],
        "extra_data": json.loads(message.extra_data) if message.extra_data else {},
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "updated_at": message.updated_at.isoformat() if message.updated_at else None,
        "user": None,
        "mentions": [],
        "replies": [],
        "reply_count": message.reply_count,
        "is_thread_root": message.is_thread_root,
    }

    # Add user info
    if message.user:
        msg_dict["user"] = {
            "id": message.user.id,
            "full_name": message.user.full_name,
            "avatar_url": message.user.avatar_url,
        }

    # Add mentions
    if hasattr(message, 'mentions') and message.mentions:
        for mention in message.mentions:
            mention_info = {
                "user_id": mention.user_id,
                "mention_text": mention.mention_text,
                "user": None,
            }
            if mention.user:
                mention_info["user"] = {
                    "id": mention.user.id,
                    "full_name": mention.user.full_name,
                    "avatar_url": mention.user.avatar_url,
                }
            msg_dict["mentions"].append(mention_info)

    # Add nested replies if requested
    if include_replies and max_depth > 0 and hasattr(message, 'replies') and message.replies:
        for reply in message.replies:
            reply_dict = _message_to_dict(
                reply, db,
                include_replies=True,
                max_depth=max_depth - 1
            )
            msg_dict["replies"].append(reply_dict)

    return msg_dict


def _get_thread_depth(message: Message, db: Session, current_depth: int = 0) -> int:
    """Calculate the maximum depth of a thread"""
    if not hasattr(message, 'replies') or not message.replies:
        return current_depth

    max_child_depth = current_depth
    for reply in message.replies:
        child_depth = _get_thread_depth(reply, db, current_depth + 1)
        max_child_depth = max(max_child_depth, child_depth)

    return max_child_depth


def _collect_participants(message: Message, db: Session, participants: dict) -> None:
    """Collect all unique participants in a thread"""
    if message.user_id and message.user_id not in participants:
        if message.user:
            participants[message.user_id] = {
                "id": message.user.id,
                "full_name": message.user.full_name,
                "avatar_url": message.user.avatar_url,
            }

    if hasattr(message, 'replies') and message.replies:
        for reply in message.replies:
            _collect_participants(reply, db, participants)


# ============================================================================
# READ RECEIPTS
# ============================================================================

class ReadReceiptResponse(BaseModel):
    """Read receipt response"""
    message_id: int
    user_id: int
    read_at: str
    user: Optional[UserInfo] = None


class ReadReceiptListResponse(BaseModel):
    """List of read receipts with counts"""
    message_id: int
    read_count: int
    receipts: List[ReadReceiptResponse]


class BulkReadRequest(BaseModel):
    """Bulk read request"""
    message_ids: List[int]


class BulkReadResponse(BaseModel):
    """Bulk read response"""
    read_count: int
    message_ids: List[int]


@router.post("/{message_id}/read", response_model=ReadReceiptResponse)
async def mark_message_as_read(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Mark a message as read by the current user.

    Creates a read receipt and notifies the message author via WebSocket.
    """
    # Check message exists
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Create or get existing read receipt
    receipt = MessageReadReceipt.mark_as_read(db, message_id, current_user.id)
    db.commit()

    # Notify message author via WebSocket (if it's not their own message)
    if message.user_id and message.user_id != current_user.id:
        await realtime.notify_read_receipt(
            sender_id=message.user_id,
            message_id=message_id,
            reader_id=current_user.id,
            reader_name=current_user.full_name or f"User {current_user.id}",
        )

    return ReadReceiptResponse(
        message_id=receipt.message_id,
        user_id=receipt.user_id,
        read_at=receipt.read_at.isoformat() if receipt.read_at else None,
        user=UserInfo(
            id=current_user.id,
            full_name=current_user.full_name,
            avatar_url=current_user.avatar_url,
        ),
    )


@router.get("/{message_id}/read-receipts", response_model=ReadReceiptListResponse)
def get_message_read_receipts(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get all read receipts for a message.

    Shows who has read the message and when.
    """
    # Check message exists
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Get all receipts
    receipts = MessageReadReceipt.get_readers(db, message_id)

    receipt_list = []
    for receipt in receipts:
        user_info = None
        if receipt.user:
            user_info = UserInfo(
                id=receipt.user.id,
                full_name=receipt.user.full_name,
                avatar_url=receipt.user.avatar_url,
            )

        receipt_list.append(ReadReceiptResponse(
            message_id=receipt.message_id,
            user_id=receipt.user_id,
            read_at=receipt.read_at.isoformat() if receipt.read_at else None,
            user=user_info,
        ))

    return ReadReceiptListResponse(
        message_id=message_id,
        read_count=len(receipt_list),
        receipts=receipt_list,
    )


@router.get("/{message_id}/read-status")
def get_message_read_status(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Quick check if the message has been read by anyone.

    Returns read count and whether current user has read it.
    """
    # Check message exists
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    read_count = MessageReadReceipt.get_read_count(db, message_id)
    current_user_read = MessageReadReceipt.has_read(db, message_id, current_user.id)

    return {
        "message_id": message_id,
        "read_count": read_count,
        "current_user_read": current_user_read,
        "is_own_message": message.user_id == current_user.id,
    }


@router.post("/bulk-read", response_model=BulkReadResponse)
async def bulk_mark_messages_as_read(
    data: BulkReadRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Mark multiple messages as read at once.

    Useful for marking all messages in a thread as read.
    """
    if not data.message_ids:
        return BulkReadResponse(read_count=0, message_ids=[])

    # Verify messages exist
    messages = db.query(Message).filter(
        Message.id.in_(data.message_ids)
    ).all()

    if not messages:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No valid messages found",
        )

    valid_ids = [m.id for m in messages]
    message_authors = {m.id: m.user_id for m in messages}

    # Mark as read
    receipts = MessageReadReceipt.bulk_mark_as_read(db, valid_ids, current_user.id)
    db.commit()

    # Notify authors via WebSocket
    for message_id in valid_ids:
        author_id = message_authors.get(message_id)
        if author_id and author_id != current_user.id:
            await realtime.notify_read_receipt(
                sender_id=author_id,
                message_id=message_id,
                reader_id=current_user.id,
                reader_name=current_user.full_name or f"User {current_user.id}",
            )

    return BulkReadResponse(
        read_count=len(receipts),
        message_ids=valid_ids,
    )
