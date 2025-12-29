"""Inbox endpoints for unified inbox functionality (Huly-inspired)"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_pagination, PaginationParams, get_current_active_user
from app.models import User, InboxItem, InboxItemType, InboxPriority
from pydantic import BaseModel
from app.schemas.inbox import (
    InboxItemResponse,
    InboxItemUpdate,
    InboxListResponse,
    InboxStats,
    InboxCountByType,
    BulkReadRequest,
    BulkArchiveRequest,
    BulkActionResponse,
    ActorInfo,
)
from app.services.inbox import InboxService
from app.models.message import Message


class SendMessageRequest(BaseModel):
    """Request to send a direct message"""
    recipient_id: int
    subject: Optional[str] = None
    body: str
    body_html: Optional[str] = None
    attachments: Optional[list] = None
    priority: Optional[str] = "normal"


class SendMessageResponse(BaseModel):
    """Response after sending a message"""
    message_id: int
    inbox_item_id: int
    recipient_id: int
    message: str


class DraftCreate(BaseModel):
    """Create a draft message"""
    recipient_ids: Optional[list] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    body_html: Optional[str] = None
    attachments: Optional[list] = None


class DraftResponse(BaseModel):
    """Draft message response"""
    id: int
    user_id: int
    recipient_ids: Optional[list] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    body_html: Optional[str] = None
    attachments: Optional[list] = None
    created_at: str
    updated_at: Optional[str] = None


class SentMessageResponse(BaseModel):
    """Sent message in list"""
    id: int
    recipient_id: int
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    subject: Optional[str] = None
    body: str
    body_html: Optional[str] = None
    created_at: str


class SentListResponse(BaseModel):
    """List of sent messages"""
    items: list
    total: int
    page: int
    page_size: int

router = APIRouter()


def _item_to_response(item: InboxItem, db: Session, include_details: bool = False) -> InboxItemResponse:
    """Convert InboxItem to response schema with optional details"""
    response = InboxItemResponse(
        id=item.id,
        user_id=item.user_id,
        item_type=item.item_type,
        reference_type=item.reference_type,
        reference_id=item.reference_id,
        source_model=item.source_model,
        source_id=item.source_id,
        title=item.title,
        preview=item.preview,
        priority=item.priority,
        is_read=item.is_read,
        is_archived=item.is_archived,
        is_starred=item.is_starred,
        actor_id=item.actor_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )

    # Add actor info if available
    if item.actor:
        response.actor = ActorInfo(
            id=item.actor.id,
            full_name=item.actor.full_name,
            avatar_url=item.actor.avatar_url,
        )

    # Include referenced data if requested
    if include_details:
        service = InboxService(db)
        details = service.get_referenced_data(item)
        if "message" in details:
            response.message = details["message"]
        if "notification" in details:
            response.notification = details["notification"]
        if "activity" in details:
            response.activity = details["activity"]

    return response


@router.get("/", response_model=InboxListResponse)
def list_inbox(
    item_type: Optional[InboxItemType] = None,
    is_read: Optional[bool] = None,
    is_archived: Optional[bool] = None,
    is_starred: Optional[bool] = None,
    priority: Optional[InboxPriority] = None,
    source_model: Optional[str] = None,
    source_id: Optional[int] = None,
    pagination: PaginationParams = Depends(get_pagination),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List inbox items for current user with filters.

    Filters:
    - item_type: message, notification, activity, mention
    - is_read: true/false
    - is_archived: true/false (default: false - excludes archived)
    - is_starred: true/false
    - priority: low, normal, high, urgent
    - source_model: Filter by source entity type (e.g., 'users', 'leave_requests')
    - source_id: Filter by source entity ID
    """
    service = InboxService(db)

    items, total = service.get_unified_inbox(
        user_id=current_user.id,
        item_type=item_type,
        is_read=is_read,
        is_archived=is_archived,
        is_starred=is_starred,
        priority=priority,
        source_model=source_model,
        source_id=source_id,
        skip=pagination.skip,
        limit=pagination.page_size,
    )

    # Get stats
    stats = service.get_stats(current_user.id)

    # Convert to response
    response_items = [_item_to_response(item, db) for item in items]

    return InboxListResponse(
        total=total,
        items=response_items,
        page=pagination.page,
        page_size=pagination.page_size,
        unread_count=stats["unread_count"],
        unread_by_type=InboxCountByType(**stats["unread_by_type"]),
    )


@router.get("/search", response_model=InboxListResponse)
def search_inbox(
    q: str,
    item_type: Optional[InboxItemType] = None,
    is_read: Optional[bool] = None,
    is_archived: Optional[bool] = None,
    sender_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    label_ids: Optional[str] = None,
    pagination: PaginationParams = Depends(get_pagination),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Search inbox items with full-text search.

    Parameters:
    - q: Search query (searches in title and preview)
    - item_type: Filter by type (message, notification, activity, mention)
    - is_read: Filter by read status
    - is_archived: Filter by archive status (default excludes archived)
    - sender_id: Filter by sender/actor ID
    - date_from: Filter items created after this date (ISO format)
    - date_to: Filter items created before this date (ISO format)
    - label_ids: Comma-separated label IDs to filter by
    """
    from datetime import datetime

    service = InboxService(db)

    # Parse date filters
    date_from_parsed = None
    date_to_parsed = None
    if date_from:
        try:
            date_from_parsed = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        except ValueError:
            pass
    if date_to:
        try:
            date_to_parsed = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
        except ValueError:
            pass

    # Parse label IDs
    label_id_list = None
    if label_ids:
        try:
            label_id_list = [int(lid.strip()) for lid in label_ids.split(",") if lid.strip()]
        except ValueError:
            pass

    items, total = service.search_inbox(
        user_id=current_user.id,
        query=q,
        item_type=item_type,
        is_read=is_read,
        is_archived=is_archived,
        sender_id=sender_id,
        date_from=date_from_parsed,
        date_to=date_to_parsed,
        label_ids=label_id_list,
        skip=pagination.skip,
        limit=pagination.page_size,
    )

    # Get stats
    stats = service.get_stats(current_user.id)

    # Convert to response
    response_items = [_item_to_response(item, db) for item in items]

    return InboxListResponse(
        total=total,
        items=response_items,
        page=pagination.page,
        page_size=pagination.page_size,
        unread_count=stats["unread_count"],
        unread_by_type=InboxCountByType(**stats["unread_by_type"]),
    )


@router.get("/stats", response_model=InboxStats)
def get_inbox_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get inbox statistics for current user"""
    service = InboxService(db)
    stats = service.get_stats(current_user.id)

    return InboxStats(
        total_count=stats["total_count"],
        unread_count=stats["unread_count"],
        read_count=stats["read_count"],
        archived_count=stats["archived_count"],
        starred_count=stats["starred_count"],
        unread_by_type=InboxCountByType(**stats["unread_by_type"]),
    )


# Draft storage (using a simple in-memory store for now)
# For production, create a proper Draft model
_drafts_store: dict = {}  # Temporary in-memory store: {user_id: [drafts]}


@router.get("/sent", response_model=SentListResponse)
def get_sent_messages(
    pagination: PaginationParams = Depends(get_pagination),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get messages sent by current user.

    Returns messages where current user is the author and
    the message was sent to another user's inbox.
    """
    # Query messages sent by current user to other users
    query = db.query(Message).filter(
        Message.user_id == current_user.id,
        Message.model_name == "users",  # Direct messages to users
        Message.record_id != current_user.id,  # Not to self
    ).order_by(Message.created_at.desc())

    total = query.count()
    messages = query.offset(pagination.skip).limit(pagination.page_size).all()

    items = []
    for msg in messages:
        # Get recipient info
        recipient = db.query(User).filter(User.id == msg.record_id).first()
        items.append(SentMessageResponse(
            id=msg.id,
            recipient_id=msg.record_id,
            recipient_name=recipient.full_name if recipient else None,
            recipient_email=recipient.email if recipient else None,
            subject=msg.subject,
            body=msg.body,
            body_html=msg.body_html,
            created_at=msg.created_at.isoformat() if msg.created_at else None,
        ))

    return SentListResponse(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/drafts", response_model=list)
def get_drafts(
    current_user: User = Depends(get_current_active_user),
):
    """Get all drafts for current user"""
    user_drafts = _drafts_store.get(current_user.id, [])
    return user_drafts


@router.post("/drafts", response_model=DraftResponse, status_code=status.HTTP_201_CREATED)
def create_draft(
    draft: DraftCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Save a new draft"""
    from datetime import datetime

    if current_user.id not in _drafts_store:
        _drafts_store[current_user.id] = []

    # Generate a simple ID
    draft_id = len(_drafts_store[current_user.id]) + 1
    now = datetime.now().isoformat()

    draft_data = {
        "id": draft_id,
        "user_id": current_user.id,
        "recipient_ids": draft.recipient_ids,
        "subject": draft.subject,
        "body": draft.body,
        "body_html": draft.body_html,
        "attachments": draft.attachments,
        "created_at": now,
        "updated_at": now,
    }

    _drafts_store[current_user.id].append(draft_data)

    return DraftResponse(**draft_data)


@router.put("/drafts/{draft_id}", response_model=DraftResponse)
def update_draft(
    draft_id: int,
    draft: DraftCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing draft"""
    from datetime import datetime

    user_drafts = _drafts_store.get(current_user.id, [])

    for i, d in enumerate(user_drafts):
        if d["id"] == draft_id:
            user_drafts[i].update({
                "recipient_ids": draft.recipient_ids,
                "subject": draft.subject,
                "body": draft.body,
                "body_html": draft.body_html,
                "attachments": draft.attachments,
                "updated_at": datetime.now().isoformat(),
            })
            return DraftResponse(**user_drafts[i])

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Draft not found",
    )


@router.delete("/drafts/{draft_id}")
def delete_draft(
    draft_id: int,
    current_user: User = Depends(get_current_active_user),
):
    """Delete a draft"""
    user_drafts = _drafts_store.get(current_user.id, [])

    for i, d in enumerate(user_drafts):
        if d["id"] == draft_id:
            user_drafts.pop(i)
            return {"message": "Draft deleted"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Draft not found",
    )


@router.get("/{item_id}", response_model=InboxItemResponse)
def get_inbox_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific inbox item with full details"""
    service = InboxService(db)
    item = service.get_with_details(item_id, current_user.id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    return _item_to_response(item, db, include_details=True)


@router.patch("/{item_id}", response_model=InboxItemResponse)
def update_inbox_item(
    item_id: int,
    item_in: InboxItemUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Update inbox item status.

    Can update:
    - is_read: Mark as read/unread
    - is_archived: Archive/unarchive
    - is_starred: Star/unstar
    - priority: Change priority level
    """
    service = InboxService(db)
    item = service.get_with_details(item_id, current_user.id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    # Apply updates
    if item_in.is_read is not None:
        if item_in.is_read:
            item.mark_as_read()
        else:
            item.mark_as_unread()

    if item_in.is_archived is not None:
        if item_in.is_archived:
            item.archive()
        else:
            item.unarchive()

    if item_in.is_starred is not None:
        if item_in.is_starred:
            item.star()
        else:
            item.unstar()

    if item_in.priority is not None:
        item.priority = item_in.priority

    db.commit()
    db.refresh(item)

    return _item_to_response(item, db)


@router.delete("/{item_id}")
def delete_inbox_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete an inbox item"""
    service = InboxService(db)
    success = service.delete_item(item_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    db.commit()
    return {"message": "Inbox item deleted successfully"}


@router.post("/bulk-read", response_model=BulkActionResponse)
def bulk_mark_as_read(
    request: BulkReadRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Mark inbox items as read.

    - If item_ids is provided, marks those specific items
    - If item_type is provided, marks all unread items of that type
    - If both are empty, marks all unread items as read
    """
    service = InboxService(db)
    count = service.bulk_mark_read(
        user_id=current_user.id,
        item_ids=request.item_ids if request.item_ids else None,
        item_type=request.item_type,
    )
    db.commit()

    return BulkActionResponse(
        message="Items marked as read",
        updated_count=count,
    )


@router.post("/bulk-archive", response_model=BulkActionResponse)
def bulk_archive(
    request: BulkArchiveRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Archive inbox items.

    - If item_ids is provided, archives those specific items
    - If item_type is provided, archives all items of that type
    - If both are empty, archives all items
    """
    service = InboxService(db)
    count = service.bulk_archive(
        user_id=current_user.id,
        item_ids=request.item_ids if request.item_ids else None,
        item_type=request.item_type,
    )
    db.commit()

    return BulkActionResponse(
        message="Items archived",
        updated_count=count,
    )


@router.post("/{item_id}/read", response_model=InboxItemResponse)
def mark_as_read(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Mark a specific inbox item as read"""
    service = InboxService(db)
    item = service.mark_read(item_id, current_user.id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    db.commit()
    return _item_to_response(item, db)


@router.post("/{item_id}/unread", response_model=InboxItemResponse)
def mark_as_unread(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Mark a specific inbox item as unread"""
    service = InboxService(db)
    item = service.mark_unread(item_id, current_user.id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    db.commit()
    return _item_to_response(item, db)


@router.post("/{item_id}/archive", response_model=InboxItemResponse)
def archive_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Archive a specific inbox item"""
    service = InboxService(db)
    item = service.archive(item_id, current_user.id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    db.commit()
    return _item_to_response(item, db)


@router.post("/{item_id}/unarchive", response_model=InboxItemResponse)
def unarchive_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Unarchive a specific inbox item"""
    service = InboxService(db)
    item = service.unarchive(item_id, current_user.id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    db.commit()
    return _item_to_response(item, db)


@router.post("/{item_id}/star", response_model=InboxItemResponse)
def star_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Star/bookmark a specific inbox item"""
    service = InboxService(db)
    item = service.star(item_id, current_user.id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    db.commit()
    return _item_to_response(item, db)


@router.post("/{item_id}/unstar", response_model=InboxItemResponse)
def unstar_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Remove star from a specific inbox item"""
    service = InboxService(db)
    item = service.unstar(item_id, current_user.id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inbox item not found",
        )

    db.commit()
    return _item_to_response(item, db)


@router.post("/send", response_model=SendMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_direct_message(
    request: SendMessageRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Send a direct message to another user.

    This creates:
    1. A message record in the messages table
    2. An inbox item for the recipient

    The sender can see sent messages in their activity.
    The recipient sees the message in their inbox.
    """
    import json

    # Verify recipient exists
    recipient = db.query(User).filter(User.id == request.recipient_id).first()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient user not found",
        )

    # Can't send message to yourself
    if recipient.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send message to yourself",
        )

    # Create the message
    message = Message.create(
        db=db,
        model_name="users",
        record_id=request.recipient_id,
        user_id=current_user.id,
        body=request.body,
        body_html=request.body_html,
        subject=request.subject,
        message_type="comment",
        is_internal=False,
    )

    # Store attachments if provided
    if request.attachments:
        message.attachments = json.dumps(request.attachments)

    db.flush()

    # Create inbox item for recipient
    priority_map = {
        "low": InboxPriority.LOW,
        "normal": InboxPriority.NORMAL,
        "high": InboxPriority.HIGH,
        "urgent": InboxPriority.URGENT,
    }

    inbox_item = InboxItem(
        user_id=recipient.id,
        item_type=InboxItemType.MESSAGE,
        reference_type="messages",
        reference_id=message.id,
        source_model="users",
        source_id=current_user.id,
        title=request.subject or f"Message from {current_user.full_name}",
        preview=request.body[:200] if len(request.body) > 200 else request.body,
        priority=priority_map.get(request.priority, InboxPriority.NORMAL),
        actor_id=current_user.id,
        is_read=False,
        is_archived=False,
        is_starred=False,
    )
    db.add(inbox_item)
    db.flush()  # Get inbox_item.id

    # Also create a notification for the recipient (for header bell)
    from app.models import Notification, NotificationLevel
    notification = Notification(
        user_id=recipient.id,
        title=f"New message from {current_user.full_name or current_user.email}",
        description=request.body[:200] if len(request.body) > 200 else request.body,
        level=NotificationLevel.INFO,
        link=f"/inbox?item_id={inbox_item.id}",
        data={"message_id": message.id, "sender_id": current_user.id, "inbox_item_id": inbox_item.id},
        actor_id=current_user.id,
        is_read=False,
    )
    db.add(notification)

    db.commit()

    # Send push and email notifications asynchronously
    try:
        from app.services.push import push_service
        from app.services.email import email_service

        # Push notification
        await push_service.notify_new_message(
            db=db,
            recipient_id=recipient.id,
            sender_name=current_user.full_name or current_user.email,
            subject=request.subject,
            preview=request.body[:100],
            message_id=message.id,
        )

        # Email notification (respects user preferences)
        await email_service.send_new_message_email(
            db=db,
            recipient_id=recipient.id,
            sender_name=current_user.full_name or current_user.email,
            sender_email=current_user.email,
            subject=request.subject,
            preview=request.body[:200],
            message_id=message.id,
        )
    except Exception as e:
        # Don't fail the request if notifications fail
        import logging
        logging.getLogger(__name__).warning(f"Failed to send notifications: {e}")

    return SendMessageResponse(
        message_id=message.id,
        inbox_item_id=inbox_item.id,
        recipient_id=recipient.id,
        message="Message sent successfully",
    )
