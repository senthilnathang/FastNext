"""
Push notification service for Web Push notifications.

Uses the pywebpush library to send push notifications
to subscribed browsers/devices.
"""

import json
import logging
from typing import Dict, List, Optional, Any

from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)


class PushService:
    """
    Service for sending Web Push notifications.

    Requires VAPID keys to be configured in settings:
    - VAPID_PUBLIC_KEY
    - VAPID_PRIVATE_KEY
    - VAPID_CLAIMS_EMAIL
    """

    def __init__(self):
        vapid_claims_email = getattr(settings, 'VAPID_CLAIMS_EMAIL', 'mailto:admin@fastnext.com')
        self.vapid_claims = {
            "sub": vapid_claims_email,
        }
        self._pywebpush = None

    @property
    def is_configured(self) -> bool:
        """Check if push notifications are properly configured"""
        push_enabled = getattr(settings, 'PUSH_ENABLED', False)
        vapid_public = getattr(settings, 'VAPID_PUBLIC_KEY', None)
        vapid_private = getattr(settings, 'VAPID_PRIVATE_KEY', None)
        return bool(
            push_enabled
            and vapid_public
            and vapid_private
        )

    @property
    def public_key(self) -> Optional[str]:
        """Get the VAPID public key for client subscription"""
        return getattr(settings, 'VAPID_PUBLIC_KEY', None)

    def _get_pywebpush(self):
        """Lazy load pywebpush module"""
        if self._pywebpush is None:
            try:
                import pywebpush
                self._pywebpush = pywebpush
            except ImportError:
                logger.warning("pywebpush not installed. Push notifications disabled.")
                return None
        return self._pywebpush

    async def send_notification(
        self,
        subscription_info: Dict,
        title: str,
        body: str,
        icon: Optional[str] = None,
        url: Optional[str] = None,
        tag: Optional[str] = None,
        data: Optional[Dict] = None,
    ) -> bool:
        """
        Send a push notification to a specific subscription.

        Args:
            subscription_info: Push subscription info dict with endpoint, keys
            title: Notification title
            body: Notification body text
            icon: URL to icon image
            url: URL to open when notification is clicked
            tag: Tag for notification (for grouping/replacing)
            data: Additional data to send with notification

        Returns:
            True if sent successfully, False otherwise
        """
        if not self.is_configured:
            logger.warning("Push notifications not configured")
            return False

        pywebpush = self._get_pywebpush()
        if not pywebpush:
            return False

        # Build notification payload
        payload = {
            "notification": {
                "title": title,
                "body": body,
                "icon": icon or "/icons/notification-icon.png",
                "badge": "/icons/badge-icon.png",
                "vibrate": [100, 50, 100],
                "requireInteraction": False,
            },
            "data": {
                "url": url or "/",
                **(data or {}),
            },
        }

        if tag:
            payload["notification"]["tag"] = tag

        vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', '')

        try:
            pywebpush.webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=vapid_private_key,
                vapid_claims=self.vapid_claims,
            )

            logger.info("Push notification sent successfully")
            return True

        except pywebpush.WebPushException as e:
            logger.error(f"Push notification failed: {e}")
            return False

        except Exception as e:
            logger.error(f"Unexpected error sending push: {e}")
            return False

    async def send_to_user(
        self,
        db: Session,
        user_id: int,
        title: str,
        body: str,
        notification_type: str = "message",
        icon: Optional[str] = None,
        url: Optional[str] = None,
        tag: Optional[str] = None,
        data: Optional[Dict] = None,
    ) -> int:
        """
        Send push notification to all of a user's subscriptions.

        Respects user's notification preferences.

        Args:
            db: Database session
            user_id: User to notify
            title: Notification title
            body: Notification body
            notification_type: Type for preference checking
            icon: Icon URL
            url: Click URL
            tag: Notification tag
            data: Additional data

        Returns:
            Number of successful sends
        """
        if not self.is_configured:
            return 0

        # Try to get user's push subscriptions
        try:
            from app.models.push_subscription import PushSubscription
            subscriptions = (
                db.query(PushSubscription)
                .filter(
                    PushSubscription.user_id == user_id,
                    PushSubscription.is_active == True,
                )
                .all()
            )
        except ImportError:
            logger.warning("PushSubscription model not available")
            return 0

        if not subscriptions:
            logger.debug(f"No active push subscriptions for user {user_id}")
            return 0

        success_count = 0
        for sub in subscriptions:
            subscription_info = sub.to_push_info() if hasattr(sub, 'to_push_info') else {
                "endpoint": sub.endpoint,
                "keys": {
                    "p256dh": sub.p256dh,
                    "auth": sub.auth,
                }
            }

            if await self.send_notification(
                subscription_info=subscription_info,
                title=title,
                body=body,
                icon=icon,
                url=url,
                tag=tag,
                data=data,
            ):
                success_count += 1

        return success_count

    async def send_to_users(
        self,
        db: Session,
        user_ids: List[int],
        title: str,
        body: str,
        notification_type: str = "message",
        icon: Optional[str] = None,
        url: Optional[str] = None,
        tag: Optional[str] = None,
        data: Optional[Dict] = None,
    ) -> Dict[int, int]:
        """
        Send push notification to multiple users.

        Returns:
            Dict mapping user_id to success count
        """
        results = {}
        for user_id in user_ids:
            results[user_id] = await self.send_to_user(
                db=db,
                user_id=user_id,
                title=title,
                body=body,
                notification_type=notification_type,
                icon=icon,
                url=url,
                tag=tag,
                data=data,
            )
        return results

    async def notify_new_message(
        self,
        db: Session,
        recipient_id: int,
        sender_name: str,
        subject: Optional[str],
        preview: str,
        message_id: int,
    ) -> int:
        """Send push notification for new message"""
        title = f"New message from {sender_name}"
        body = subject or preview[:100]

        return await self.send_to_user(
            db=db,
            user_id=recipient_id,
            title=title,
            body=body,
            notification_type="message",
            url=f"/inbox?message={message_id}",
            tag=f"message-{message_id}",
            data={"message_id": message_id, "sender": sender_name},
        )

    async def notify_mention(
        self,
        db: Session,
        mentioned_user_id: int,
        mentioner_name: str,
        context: str,
        message_id: int,
    ) -> int:
        """Send push notification for @mention"""
        return await self.send_to_user(
            db=db,
            user_id=mentioned_user_id,
            title=f"{mentioner_name} mentioned you",
            body=context[:100],
            notification_type="mention",
            url=f"/inbox?message={message_id}",
            tag=f"mention-{message_id}",
            data={"message_id": message_id, "mentioner": mentioner_name},
        )

    async def notify_reply(
        self,
        db: Session,
        original_author_id: int,
        replier_name: str,
        preview: str,
        message_id: int,
    ) -> int:
        """Send push notification for reply"""
        return await self.send_to_user(
            db=db,
            user_id=original_author_id,
            title=f"{replier_name} replied to your message",
            body=preview[:100],
            notification_type="reply",
            url=f"/inbox?message={message_id}",
            tag=f"reply-{message_id}",
            data={"message_id": message_id, "replier": replier_name},
        )


# Global push service instance
push_service = PushService()
