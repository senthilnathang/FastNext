"""Notification endpoints"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.deps import get_db, get_pagination, PaginationParams, get_current_active_user
from app.models import User, Notification, NotificationLevel
from app.schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
    NotificationList,
    BulkReadRequest,
    BulkReadResponse,
    BulkDeleteRequest,
    BulkDeleteResponse,
    SendNotificationRequest,
    SendNotificationResponse,
    NotificationStats,
    ActorInfo,
)

router = APIRouter()


@router.get("/", response_model=NotificationList)
def list_notifications(
    filter_type: str = "all",  # all, unread, read
    pagination: PaginationParams = Depends(get_pagination),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List notifications for current user.

    filter_type can be:
    - all: All notifications
    - unread: Only unread notifications
    - read: Only read notifications
    """
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if filter_type == "unread":
        query = query.filter(Notification.is_read == False)
    elif filter_type == "read":
        query = query.filter(Notification.is_read == True)

    # Get unread count
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()

    total = query.count()
    notifications = (
        query.order_by(desc(Notification.created_at))
        .offset(pagination.skip)
        .limit(pagination.page_size)
        .all()
    )

    items = []
    for n in notifications:
        item = NotificationResponse.model_validate(n)
        if n.actor:
            item.actor = ActorInfo(
                id=n.actor.id,
                full_name=n.actor.full_name,
                avatar_url=n.actor.avatar_url,
            )
        items.append(item)

    return NotificationList(
        total=total,
        items=items,
        page=pagination.page,
        page_size=pagination.page_size,
        unread_count=unread_count,
    )


@router.get("/stats", response_model=NotificationStats)
def get_notification_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get notification statistics for current user"""
    all_count = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).count()

    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()

    return NotificationStats(
        all_count=all_count,
        unread_count=unread_count,
        read_count=all_count - unread_count,
    )


@router.get("/{notification_id}", response_model=NotificationResponse)
def get_notification(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    response = NotificationResponse.model_validate(notification)
    if notification.actor:
        response.actor = ActorInfo(
            id=notification.actor.id,
            full_name=notification.actor.full_name,
            avatar_url=notification.actor.avatar_url,
        )

    return response


@router.put("/{notification_id}", response_model=NotificationResponse)
def update_notification(
    notification_id: int,
    notification_in: NotificationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update notification (mark as read/unread)"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    if notification_in.is_read is not None:
        notification.is_read = notification_in.is_read

    db.commit()
    db.refresh(notification)

    response = NotificationResponse.model_validate(notification)
    if notification.actor:
        response.actor = ActorInfo(
            id=notification.actor.id,
            full_name=notification.actor.full_name,
            avatar_url=notification.actor.avatar_url,
        )

    return response


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted successfully"}


@router.post("/bulk-read", response_model=BulkReadResponse)
def bulk_mark_as_read(
    request: BulkReadRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Mark notifications as read.
    If notification_ids is empty, marks all unread notifications as read.
    """
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    )

    if request.notification_ids:
        query = query.filter(Notification.id.in_(request.notification_ids))

    updated_count = query.update({"is_read": True}, synchronize_session=False)
    db.commit()

    return BulkReadResponse(
        message="Notifications marked as read",
        updated_count=updated_count,
    )


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
def bulk_delete(
    request: BulkDeleteRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete multiple notifications"""
    deleted_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.id.in_(request.notification_ids),
    ).delete(synchronize_session=False)

    db.commit()

    return BulkDeleteResponse(
        message="Notifications deleted",
        deleted_count=deleted_count,
    )


@router.post("/send", response_model=SendNotificationResponse)
def send_notification(
    request: SendNotificationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Send notifications to specified users.
    Requires appropriate permissions.
    """
    # Verify all user IDs exist
    users = db.query(User).filter(
        User.id.in_(request.user_ids),
        User.is_active == True,
    ).all()

    if not users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid recipients found",
        )

    # Create notifications
    notifications = []
    for user in users:
        notification = Notification(
            user_id=user.id,
            title=request.title,
            description=request.description,
            level=request.level,
            link=request.link,
            data=request.data,
            actor_id=current_user.id,
        )
        notifications.append(notification)

    db.add_all(notifications)
    db.commit()

    return SendNotificationResponse(
        message="Notifications sent successfully",
        recipient_count=len(notifications),
    )
