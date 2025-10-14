from typing import List, Optional, cast

from app.api.deps import get_current_user, get_db
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationList,
    NotificationResponse,
    NotificationUpdate,
)
from app.services.notification_service import (
    NotificationService,
    get_notification_service,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/", response_model=NotificationList)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    include_read: bool = Query(True),
):
    """Get user's notifications"""
    notifications = notification_service.get_user_notifications(
        user_id=cast(int, current_user.id),
        skip=skip,
        limit=limit,
        include_read=include_read,
    )

    return NotificationList(
        notifications=[
            NotificationResponse.model_validate(notification)
            for notification in notifications
        ],
        total=len(notifications),
    )


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Get count of unread notifications"""
    count = notification_service.get_unread_count(cast(int, current_user.id))
    return {"unread_count": count}


@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Mark a notification as read"""
    success = notification_service.mark_as_read(
        notification_id, cast(int, current_user.id)
    )
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "Notification marked as read"}


@router.put("/mark-all-read")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Mark all notifications as read"""
    count = notification_service.mark_all_as_read(cast(int, current_user.id))
    return {"message": f"Marked {count} notifications as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Delete a notification"""
    success = notification_service.delete_notification(
        notification_id, cast(int, current_user.id)
    )
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "Notification deleted"}


# Admin endpoints (for creating system notifications)
@router.post("/", response_model=NotificationResponse)
def create_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Create a notification (admin only)"""
    # TODO: Add admin permission check
    # For now, allow any authenticated user to create notifications

    created_notification = notification_service.create_notification(
        user_id=notification.user_id,
        title=notification.title,
        message=notification.message,
        notification_type=notification.type,
        channels=notification.channels,
        action_url=notification.action_url,
        data=notification.data,
    )

    return NotificationResponse.model_validate(created_notification)


@router.post("/system")
def create_system_notification(
    title: str,
    message: str,
    user_ids: List[int],
    notification_type: NotificationType = NotificationType.SYSTEM,
    channels: Optional[List[str]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Create system notifications for multiple users (admin only)"""
    # TODO: Add admin permission check

    notifications = notification_service.create_system_notification(
        user_ids=user_ids,
        title=title,
        message=message,
        notification_type=notification_type,
        channels=channels or ["in_app"],
    )

    return {"message": f"Created {len(notifications)} system notifications"}
