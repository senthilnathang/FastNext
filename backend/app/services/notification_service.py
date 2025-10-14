import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.models.notification import Notification, NotificationChannel, NotificationType
from app.models.user import User
from sqlalchemy import and_, desc
from sqlalchemy.orm import Session
import emails
from emails.template import JinjaTemplate


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
        data: Optional[Dict[str, Any]] = None,
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
            data=data_str,
        )

        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        return notification

    def get_user_notifications(
        self, user_id: int, skip: int = 0, limit: int = 50, include_read: bool = True
    ) -> List[Notification]:
        """Get notifications for a user"""
        query = self.db.query(Notification).filter(Notification.user_id == user_id)

        if not include_read:
            query = query.filter(Notification.is_read == False)

        return (
            query.order_by(desc(Notification.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_unread_count(self, user_id: int) -> int:
        """Get count of unread notifications for a user"""
        return (
            self.db.query(Notification)
            .filter(
                and_(Notification.user_id == user_id, Notification.is_read == False)
            )
            .count()
        )

    def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read"""
        notification = (
            self.db.query(Notification)
            .filter(
                and_(
                    Notification.id == notification_id, Notification.user_id == user_id
                )
            )
            .first()
        )

        if notification:
            notification.is_read = True
            notification.updated_at = datetime.utcnow()
            self.db.commit()
            return True

        return False

    def mark_all_as_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        count = (
            self.db.query(Notification)
            .filter(
                and_(Notification.user_id == user_id, Notification.is_read == False)
            )
            .update({"is_read": True, "updated_at": datetime.utcnow()})
        )

        self.db.commit()
        return count

    def delete_notification(self, notification_id: int, user_id: int) -> bool:
        """Delete a notification"""
        result = (
            self.db.query(Notification)
            .filter(
                and_(
                    Notification.id == notification_id, Notification.user_id == user_id
                )
            )
            .delete()
        )

        self.db.commit()
        return result > 0

    def send_email_notification(self, notification: Notification) -> bool:
        """Send email notification using emails library"""
        try:
            # Get user email
            user = self.db.query(User).filter(User.id == notification.user_id).first()
            if not user or not user.email:
                return False

            # Create email message
            message = emails.Message(
                subject=notification.title,
                html=self._render_email_template(notification),
                mail_from=(settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL)
            )

            # SMTP configuration
            smtp_config = {
                'host': settings.SMTP_HOST,
                'port': settings.SMTP_PORT,
                'tls': settings.SMTP_TLS,
                'ssl': settings.SMTP_SSL,
                'user': settings.SMTP_USER,
                'password': settings.SMTP_PASSWORD
            }

            # Send email
            response = message.send(to=user.email, smtp=smtp_config)

            if response.status_code == 250:  # SMTP success
                notification.is_sent = True
                notification.sent_at = datetime.utcnow()
                self.db.commit()
                return True

            return False

        except Exception as e:
            # Log error but don't fail - notification will be retried
            print(f"Email sending failed: {e}")
            return False

    def _render_email_template(self, notification: Notification) -> str:
        """Render email HTML template"""
        template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
                .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 20px; }
                .title { color: #333; font-size: 24px; margin: 0; }
                .message { color: #666; font-size: 16px; line-height: 1.6; margin: 20px 0; }
                .action-button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 class="title">{{ notification.title }}</h1>
                </div>
                <div class="message">
                    {{ notification.message }}
                </div>
                {% if notification.action_url %}
                <a href="{{ notification.action_url }}" class="action-button">Take Action</a>
                {% endif %}
                <div class="footer">
                    <p>This notification was sent by FastNext Framework.</p>
                    <p>You can manage your notification preferences in your account settings.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return JinjaTemplate(template).render(notification=notification)

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
        pending_notifications = (
            self.db.query(Notification).filter(Notification.is_sent == False).all()
        )

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
        channels: List[str] = None,
    ) -> List[Notification]:
        """Create system notifications for multiple users"""
        notifications = []
        for user_id in user_ids:
            notification = self.create_notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                channels=channels,
            )
            notifications.append(notification)

        return notifications


# Dependency for getting notification service
def get_notification_service(db: Session) -> NotificationService:
    return NotificationService(db)
