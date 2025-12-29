"""Real-time event publishing service for WebSocket notifications"""

import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from app.core.websocket import manager

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """WebSocket event types"""

    # Inbox events
    INBOX_NEW = "inbox:new"
    INBOX_UPDATED = "inbox:updated"
    INBOX_DELETED = "inbox:deleted"
    INBOX_BULK_READ = "inbox:bulk_read"
    INBOX_BULK_ARCHIVE = "inbox:bulk_archive"

    # Message events
    MESSAGE_NEW = "message:new"
    MESSAGE_UPDATED = "message:updated"
    MESSAGE_DELETED = "message:deleted"
    MESSAGE_REACTION = "message:reaction"

    # Typing events
    TYPING_START = "typing:start"
    TYPING_STOP = "typing:stop"

    # Read receipt events
    READ_RECEIPT = "read:receipt"

    # Notification events
    NOTIFICATION_NEW = "notification:new"
    NOTIFICATION_UPDATED = "notification:updated"

    # Activity events
    ACTIVITY_NEW = "activity:new"

    # User presence events
    USER_ONLINE = "user:online"
    USER_OFFLINE = "user:offline"

    # Label events
    LABEL_CREATED = "label:created"
    LABEL_UPDATED = "label:updated"
    LABEL_DELETED = "label:deleted"


class RealtimeService:
    """Service for publishing real-time events to connected WebSocket clients"""

    def __init__(self):
        self.manager = manager

    async def publish(
        self,
        event_type: EventType,
        data: Dict[str, Any],
        user_ids: Optional[List[int]] = None,
        exclude_user_ids: Optional[List[int]] = None,
    ) -> Dict[str, int]:
        """Publish an event to WebSocket clients

        Args:
            event_type: The type of event
            data: Event data payload
            user_ids: Specific users to send to (None = all connected users)
            exclude_user_ids: Users to exclude from broadcast

        Returns:
            Dict mapping user_id to number of successful sends
        """
        message = {
            "type": event_type.value,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        exclude_set = set(exclude_user_ids or [])

        if user_ids:
            # Send to specific users
            target_users = [uid for uid in user_ids if uid not in exclude_set]
            return await self.manager.broadcast_to_users(target_users, message)
        else:
            # Broadcast to all connected users
            results = {}
            for user_id in self.manager.get_connected_user_ids():
                if user_id not in exclude_set:
                    results[user_id] = await self.manager.broadcast_to_user(user_id, message)
            return results

    async def publish_to_user(
        self,
        user_id: int,
        event_type: EventType,
        data: Dict[str, Any],
    ) -> int:
        """Publish an event to a specific user

        Returns the number of successful sends (user may have multiple connections)
        """
        message = {
            "type": event_type.value,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return await self.manager.broadcast_to_user(user_id, message)

    # Inbox event helpers

    async def notify_inbox_new(
        self,
        user_id: int,
        inbox_item_id: int,
        item_type: str,
        title: str,
        preview: Optional[str] = None,
        sender_id: Optional[int] = None,
        sender_name: Optional[str] = None,
    ) -> int:
        """Notify user of a new inbox item"""
        return await self.publish_to_user(
            user_id,
            EventType.INBOX_NEW,
            {
                "inbox_item_id": inbox_item_id,
                "item_type": item_type,
                "title": title,
                "preview": preview,
                "sender_id": sender_id,
                "sender_name": sender_name,
            },
        )

    async def notify_inbox_updated(
        self,
        user_id: int,
        inbox_item_id: int,
        changes: Dict[str, Any],
    ) -> int:
        """Notify user of inbox item update"""
        return await self.publish_to_user(
            user_id,
            EventType.INBOX_UPDATED,
            {
                "inbox_item_id": inbox_item_id,
                "changes": changes,
            },
        )

    async def notify_inbox_deleted(
        self,
        user_id: int,
        inbox_item_id: int,
    ) -> int:
        """Notify user of inbox item deletion"""
        return await self.publish_to_user(
            user_id,
            EventType.INBOX_DELETED,
            {"inbox_item_id": inbox_item_id},
        )

    # Message event helpers

    async def notify_message_new(
        self,
        recipient_id: int,
        message_id: int,
        sender_id: int,
        sender_name: str,
        subject: Optional[str],
        preview: str,
    ) -> int:
        """Notify recipient of a new message"""
        return await self.publish_to_user(
            recipient_id,
            EventType.MESSAGE_NEW,
            {
                "message_id": message_id,
                "sender_id": sender_id,
                "sender_name": sender_name,
                "subject": subject,
                "preview": preview[:100] if preview else None,
            },
        )

    async def notify_message_reaction(
        self,
        message_author_id: int,
        message_id: int,
        reactor_id: int,
        reactor_name: str,
        emoji: str,
        action: str,  # "added" or "removed"
    ) -> int:
        """Notify message author of a reaction"""
        return await self.publish_to_user(
            message_author_id,
            EventType.MESSAGE_REACTION,
            {
                "message_id": message_id,
                "reactor_id": reactor_id,
                "reactor_name": reactor_name,
                "emoji": emoji,
                "action": action,
            },
        )

    # Typing indicator helpers

    async def notify_typing_start(
        self,
        recipient_id: int,
        sender_id: int,
        sender_name: str,
        context: Optional[str] = None,  # e.g., "compose" or "reply:123"
    ) -> int:
        """Notify recipient that someone started typing"""
        return await self.publish_to_user(
            recipient_id,
            EventType.TYPING_START,
            {
                "sender_id": sender_id,
                "sender_name": sender_name,
                "context": context,
            },
        )

    async def notify_typing_stop(
        self,
        recipient_id: int,
        sender_id: int,
    ) -> int:
        """Notify recipient that someone stopped typing"""
        return await self.publish_to_user(
            recipient_id,
            EventType.TYPING_STOP,
            {"sender_id": sender_id},
        )

    # Read receipt helpers

    async def notify_read_receipt(
        self,
        sender_id: int,
        message_id: int,
        reader_id: int,
        reader_name: str,
    ) -> int:
        """Notify message sender that their message was read"""
        return await self.publish_to_user(
            sender_id,
            EventType.READ_RECEIPT,
            {
                "message_id": message_id,
                "reader_id": reader_id,
                "reader_name": reader_name,
                "read_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    # User presence helpers

    async def notify_user_online(
        self,
        user_id: int,
        user_name: str,
        notify_user_ids: Optional[List[int]] = None,
    ) -> Dict[str, int]:
        """Broadcast that a user came online"""
        return await self.publish(
            EventType.USER_ONLINE,
            {"user_id": user_id, "user_name": user_name},
            user_ids=notify_user_ids,
            exclude_user_ids=[user_id],
        )

    async def notify_user_offline(
        self,
        user_id: int,
        notify_user_ids: Optional[List[int]] = None,
    ) -> Dict[str, int]:
        """Broadcast that a user went offline"""
        return await self.publish(
            EventType.USER_OFFLINE,
            {"user_id": user_id},
            user_ids=notify_user_ids,
            exclude_user_ids=[user_id],
        )

    # Label event helpers

    async def notify_label_created(
        self,
        user_id: int,
        label_id: int,
        label_name: str,
        color: str,
    ) -> int:
        """Notify user of new label creation"""
        return await self.publish_to_user(
            user_id,
            EventType.LABEL_CREATED,
            {
                "label_id": label_id,
                "name": label_name,
                "color": color,
            },
        )

    async def notify_label_updated(
        self,
        user_id: int,
        label_id: int,
        changes: Dict[str, Any],
    ) -> int:
        """Notify user of label update"""
        return await self.publish_to_user(
            user_id,
            EventType.LABEL_UPDATED,
            {
                "label_id": label_id,
                "changes": changes,
            },
        )

    async def notify_label_deleted(
        self,
        user_id: int,
        label_id: int,
    ) -> int:
        """Notify user of label deletion"""
        return await self.publish_to_user(
            user_id,
            EventType.LABEL_DELETED,
            {"label_id": label_id},
        )

    # Utility methods

    def is_user_online(self, user_id: int) -> bool:
        """Check if a user is currently connected"""
        return self.manager.is_user_online(user_id)

    def get_online_users(self) -> List[int]:
        """Get list of currently online user IDs"""
        return list(self.manager.get_connected_user_ids())

    def get_stats(self) -> dict:
        """Get WebSocket connection statistics"""
        return self.manager.get_stats()


# Global realtime service instance
realtime = RealtimeService()
