from typing import List, Optional, cast

from app.api.deps import get_db
from app.auth.deps import get_current_user
from app.auth.permissions import require_admin
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationList,
    NotificationResponse,
    NotificationUpdate,
)
from app.services.notification_service import NotificationService
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

router = APIRouter()


@router.get("/", response_model=NotificationList)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    include_read: bool = Query(True),
) -> NotificationList:
    """Get user's notifications"""
    notification_service = NotificationService(db)
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
):
    """Get count of unread notifications"""
    notification_service = NotificationService(db)
    count = notification_service.get_unread_count(cast(int, current_user.id))
    return {"unread_count": count}


@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read"""
    notification_service = NotificationService(db)
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
):
    """Mark all notifications as read"""
    notification_service = NotificationService(db)
    count = notification_service.mark_all_as_read(cast(int, current_user.id))
    return {"message": f"Marked {count} notifications as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification"""
    notification_service = NotificationService(db)
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
    current_user: User = Depends(require_admin),
):
    """Create a notification (admin only)"""

    notification_service = NotificationService(db)
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
    current_user: User = Depends(require_admin),
):
    """Create system notifications for multiple users (admin only)"""

    notification_service = NotificationService(db)
    notifications = notification_service.create_system_notification(
        user_ids=user_ids,
        title=title,
        message=message,
        notification_type=notification_type,
        channels=channels or ["in_app"],
    )

    return {"message": f"Created {len(notifications)} system notifications"}


# Push Notification Endpoints
class PushSubscriptionData(BaseModel):
    endpoint: str
    keys: dict

class NotificationPreferences(BaseModel):
    email_on_login: bool = True
    email_on_password_change: bool = True
    email_on_security_change: bool = True
    email_on_suspicious_activity: bool = True

@router.post("/subscribe")
async def subscribe_push_notifications(
    subscription: PushSubscriptionData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subscribe to push notifications"""
    try:
        # Store subscription in user preferences or separate table
        # For now, we'll just acknowledge the subscription
        # In production, you'd want to store this in a database table

        return {"message": "Successfully subscribed to push notifications"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to subscribe: {str(e)}")

@router.post("/unsubscribe")
async def unsubscribe_push_notifications(
    subscription: PushSubscriptionData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unsubscribe from push notifications"""
    try:
        # Remove subscription from storage
        return {"message": "Successfully unsubscribed from push notifications"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unsubscribe: {str(e)}")

@router.get("/preferences")
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user notification preferences"""
    return {
        "email_on_login": current_user.email_on_login,
        "email_on_password_change": current_user.email_on_password_change,
        "email_on_security_change": current_user.email_on_security_change,
        "email_on_suspicious_activity": current_user.email_on_suspicious_activity,
    }

@router.put("/preferences")
async def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user notification preferences"""
    try:
        current_user.email_on_login = preferences.email_on_login
        current_user.email_on_password_change = preferences.email_on_password_change
        current_user.email_on_security_change = preferences.email_on_security_change
        current_user.email_on_suspicious_activity = preferences.email_on_suspicious_activity

        db.commit()
        db.refresh(current_user)

        return {"message": "Notification preferences updated successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")

@router.post("/test")
async def send_test_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a test notification to the current user"""
    try:
        notification_service = NotificationService(db)

        notification = notification_service.create_notification(
            user_id=cast(int, current_user.id),
            title="Test Notification",
            message="This is a test notification to verify your notification settings are working correctly.",
            notification_type=NotificationType.INFO,
            channels=["in_app", "email"],
            action_url="/settings"
        )

        return {"message": "Test notification sent successfully", "notification_id": notification.id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test notification: {str(e)}")
