from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
import json
from datetime import datetime

from app.models.notification import Notification, NotificationType, NotificationChannel
from app.models.user import User
from app.core.config import settings


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create_notification(
        self,
        user_id: int,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.INFO,
        channels: List[str] = None,
        action_url: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """Create a new notification"""
        if channels is None:
            channels = ["in_app"]

        channels_str = json.dumps(channels)
        data_str = json.dumps(data) if data else None

        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            channels=channels_str,
            action_url=action_url,
            data=data_str
        )

        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        return notification

    def get_user_notifications(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        include_read: bool = True
    ) -> List[Notification]:
        """Get notifications for a user"""
        query = self.db.query(Notification).filter(Notification.user_id == user_id)

        if not include_read:
            query = query.filter(Notification.is_read == False)

        return query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

    def get_unread_count(self, user_id: int) -> int:
        """Get count of unread notifications for a user"""
        return self.db.query(Notification).filter(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        ).count()

    def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read"""
        notification = self.db.query(Notification).filter(
            and_(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )
        ).first()

        if notification:
            notification.is_read = True
            notification.updated_at = datetime.utcnow()
            self.db.commit()
            return True

        return False

    def mark_all_as_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        count = self.db.query(Notification).filter(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        ).update({"is_read": True, "updated_at": datetime.utcnow()})

        self.db.commit()
        return count

    def delete_notification(self, notification_id: int, user_id: int) -> bool:
        """Delete a notification"""
        result = self.db.query(Notification).filter(
            and_(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )
        ).delete()

        self.db.commit()
        return result > 0

    def send_email_notification(self, notification: Notification) -> bool:
        """Send email notification (placeholder for email service integration)"""
        # TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        # For now, just mark as sent
        notification.is_sent = True
        notification.sent_at = datetime.utcnow()
        self.db.commit()
        return True

    def send_push_notification(self, notification: Notification) -> bool:
        """Send push notification (placeholder for push service integration)"""
        # TODO: Integrate with push notification service
        # For now, just mark as sent
        notification.is_sent = True
        notification.sent_at = datetime.utcnow()
        self.db.commit()
        return True

    def process_pending_notifications(self):
        """Process notifications that need to be sent via email/push"""
        # Get notifications that haven't been sent yet
        pending_notifications = self.db.query(Notification).filter(
            Notification.is_sent == False
        ).all()

        for notification in pending_notifications:
            channels = json.loads(notification.channels)

            if "email" in channels:
                self.send_email_notification(notification)

            if "push" in channels:
                self.send_push_notification(notification)

    def create_system_notification(
        self,
        user_ids: List[int],
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.SYSTEM,
        channels: List[str] = None
    ) -> List[Notification]:
        """Create system notifications for multiple users"""
        notifications = []
        for user_id in user_ids:
            notification = self.create_notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                channels=channels
            )
            notifications.append(notification)

        return notifications


# Dependency for getting notification service
def get_notification_service(db: Session) -> NotificationService:
    return NotificationService(db)