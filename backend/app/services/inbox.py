"""Inbox service for unified inbox functionality"""

from typing import Dict, List, Optional, Tuple

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.inbox import InboxItem, InboxItemType, InboxPriority
from app.models.message import Message
from app.models.notification import Notification
from app.models.activity_log import ActivityLog
from app.services.base import BaseService


class InboxService(BaseService[InboxItem]):
    """
    Service for managing unified inbox items.

    Provides methods for:
    - Fetching unified inbox with filters
    - Marking items as read/unread
    - Archiving/unarchiving items
    - Starring/unstarring items
    - Bulk operations
    - Statistics
    """

    def __init__(self, db: Session):
        super().__init__(db, InboxItem, enable_audit=False)

    def get_unified_inbox(
        self,
        user_id: int,
        item_type: Optional[InboxItemType] = None,
        is_read: Optional[bool] = None,
        is_archived: Optional[bool] = None,
        is_starred: Optional[bool] = None,
        priority: Optional[InboxPriority] = None,
        source_model: Optional[str] = None,
        source_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[InboxItem], int]:
        """
        Get unified inbox items for a user with filters.

        Returns:
            Tuple of (items list, total count)
        """
        query = self.db.query(InboxItem).filter(InboxItem.user_id == user_id)

        # Apply filters
        if item_type is not None:
            query = query.filter(InboxItem.item_type == item_type)
        if is_read is not None:
            query = query.filter(InboxItem.is_read == is_read)
        if is_archived is not None:
            query = query.filter(InboxItem.is_archived == is_archived)
        else:
            # Default: exclude archived items
            query = query.filter(InboxItem.is_archived == False)
        if is_starred is not None:
            query = query.filter(InboxItem.is_starred == is_starred)
        if priority is not None:
            query = query.filter(InboxItem.priority == priority)
        if source_model is not None:
            query = query.filter(InboxItem.source_model == source_model)
        if source_id is not None:
            query = query.filter(InboxItem.source_id == source_id)

        # Get total count
        total = query.count()

        # Get items with actor relationship loaded
        items = (
            query
            .options(joinedload(InboxItem.actor))
            .order_by(InboxItem.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return items, total

    def search_inbox(
        self,
        user_id: int,
        query: str,
        item_type: Optional[InboxItemType] = None,
        is_read: Optional[bool] = None,
        is_archived: Optional[bool] = None,
        sender_id: Optional[int] = None,
        date_from = None,
        date_to = None,
        label_ids: Optional[List[int]] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[InboxItem], int]:
        """
        Search inbox items with full-text search.

        Uses PostgreSQL's ILIKE for pattern matching on title and preview.
        For production with large datasets, consider using PostgreSQL full-text search
        with tsvector and GIN indexes.

        Args:
            user_id: User ID to search inbox for
            query: Search query string
            item_type: Filter by item type
            is_read: Filter by read status
            is_archived: Filter by archived status (default: exclude archived)
            sender_id: Filter by sender/actor ID
            date_from: Filter items created after this date
            date_to: Filter items created before this date
            label_ids: Filter by label IDs

        Returns:
            Tuple of (matching items, total count)
        """
        from app.models.label import InboxItemLabel

        base_query = self.db.query(InboxItem).filter(InboxItem.user_id == user_id)

        # Apply text search on title and preview
        if query:
            search_pattern = f"%{query}%"
            base_query = base_query.filter(
                or_(
                    InboxItem.title.ilike(search_pattern),
                    InboxItem.preview.ilike(search_pattern),
                )
            )

        # Apply filters
        if item_type is not None:
            base_query = base_query.filter(InboxItem.item_type == item_type)
        if is_read is not None:
            base_query = base_query.filter(InboxItem.is_read == is_read)
        if is_archived is not None:
            base_query = base_query.filter(InboxItem.is_archived == is_archived)
        else:
            # Default: exclude archived items
            base_query = base_query.filter(InboxItem.is_archived == False)
        if sender_id is not None:
            base_query = base_query.filter(InboxItem.actor_id == sender_id)
        if date_from is not None:
            base_query = base_query.filter(InboxItem.created_at >= date_from)
        if date_to is not None:
            base_query = base_query.filter(InboxItem.created_at <= date_to)

        # Filter by labels (items that have at least one of the specified labels)
        if label_ids:
            base_query = base_query.filter(
                InboxItem.id.in_(
                    self.db.query(InboxItemLabel.inbox_item_id).filter(
                        InboxItemLabel.label_id.in_(label_ids)
                    )
                )
            )

        # Get total count
        total = base_query.count()

        # Get items with actor relationship loaded
        items = (
            base_query
            .options(joinedload(InboxItem.actor))
            .order_by(InboxItem.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return items, total

    def get_with_details(self, item_id: int, user_id: int) -> Optional[InboxItem]:
        """
        Get an inbox item with full details including referenced data.
        """
        item = (
            self.db.query(InboxItem)
            .options(joinedload(InboxItem.actor))
            .filter(
                InboxItem.id == item_id,
                InboxItem.user_id == user_id,
            )
            .first()
        )

        if not item:
            return None

        return item

    def get_referenced_data(self, item: InboxItem) -> dict:
        """
        Get the referenced message/notification/activity data.
        """
        data = {}

        if item.reference_type == "messages":
            message = self.db.query(Message).filter(Message.id == item.reference_id).first()
            if message:
                data["message"] = {
                    "id": message.id,
                    "body": message.body,
                    "message_type": message.message_type.value if hasattr(message.message_type, 'value') else message.message_type,
                    "is_pinned": message.is_pinned,
                    "created_at": message.created_at,
                }

        elif item.reference_type == "notifications":
            notification = self.db.query(Notification).filter(Notification.id == item.reference_id).first()
            if notification:
                data["notification"] = {
                    "id": notification.id,
                    "title": notification.title,
                    "description": notification.description,
                    "level": notification.level.value if hasattr(notification.level, 'value') else notification.level,
                    "link": notification.link,
                }

        elif item.reference_type == "activity_logs":
            activity = self.db.query(ActivityLog).filter(ActivityLog.id == item.reference_id).first()
            if activity:
                data["activity"] = {
                    "id": activity.id,
                    "action": activity.action,
                    "entity_type": activity.entity_type,
                    "entity_id": activity.entity_id,
                    "description": activity.description,
                }

        return data

    def mark_read(self, item_id: int, user_id: int) -> Optional[InboxItem]:
        """Mark an inbox item as read"""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if item:
            item.mark_as_read()
            self.db.flush()

        return item

    def mark_unread(self, item_id: int, user_id: int) -> Optional[InboxItem]:
        """Mark an inbox item as unread"""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if item:
            item.mark_as_unread()
            self.db.flush()

        return item

    def archive(self, item_id: int, user_id: int) -> Optional[InboxItem]:
        """Archive an inbox item"""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if item:
            item.archive()
            self.db.flush()

        return item

    def unarchive(self, item_id: int, user_id: int) -> Optional[InboxItem]:
        """Unarchive an inbox item"""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if item:
            item.unarchive()
            self.db.flush()

        return item

    def star(self, item_id: int, user_id: int) -> Optional[InboxItem]:
        """Star/bookmark an inbox item"""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if item:
            item.star()
            self.db.flush()

        return item

    def unstar(self, item_id: int, user_id: int) -> Optional[InboxItem]:
        """Remove star from an inbox item"""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if item:
            item.unstar()
            self.db.flush()

        return item

    def bulk_mark_read(
        self,
        user_id: int,
        item_ids: Optional[List[int]] = None,
        item_type: Optional[InboxItemType] = None,
    ) -> int:
        """
        Mark multiple inbox items as read.

        Args:
            user_id: The user's ID
            item_ids: Specific item IDs to mark (if None, applies to all matching)
            item_type: If provided, only mark items of this type

        Returns:
            Number of items updated
        """
        query = self.db.query(InboxItem).filter(
            InboxItem.user_id == user_id,
            InboxItem.is_read == False,
        )

        if item_ids:
            query = query.filter(InboxItem.id.in_(item_ids))
        if item_type:
            query = query.filter(InboxItem.item_type == item_type)

        count = query.update({"is_read": True}, synchronize_session=False)
        self.db.flush()
        return count

    def bulk_archive(
        self,
        user_id: int,
        item_ids: Optional[List[int]] = None,
        item_type: Optional[InboxItemType] = None,
    ) -> int:
        """
        Archive multiple inbox items.

        Args:
            user_id: The user's ID
            item_ids: Specific item IDs to archive (if None, applies to all matching)
            item_type: If provided, only archive items of this type

        Returns:
            Number of items updated
        """
        query = self.db.query(InboxItem).filter(
            InboxItem.user_id == user_id,
            InboxItem.is_archived == False,
        )

        if item_ids:
            query = query.filter(InboxItem.id.in_(item_ids))
        if item_type:
            query = query.filter(InboxItem.item_type == item_type)

        count = query.update({"is_archived": True}, synchronize_session=False)
        self.db.flush()
        return count

    def get_stats(self, user_id: int) -> Dict:
        """Get inbox statistics for a user"""
        base_query = self.db.query(InboxItem).filter(InboxItem.user_id == user_id)

        total_count = base_query.count()
        unread_count = base_query.filter(InboxItem.is_read == False, InboxItem.is_archived == False).count()
        read_count = base_query.filter(InboxItem.is_read == True, InboxItem.is_archived == False).count()
        archived_count = base_query.filter(InboxItem.is_archived == True).count()
        starred_count = base_query.filter(InboxItem.is_starred == True).count()

        # Get unread counts by type
        unread_by_type = InboxItem.get_counts_by_type(self.db, user_id)

        return {
            "total_count": total_count,
            "unread_count": unread_count,
            "read_count": read_count,
            "archived_count": archived_count,
            "starred_count": starred_count,
            "unread_by_type": {
                "message": unread_by_type.get("message", 0),
                "notification": unread_by_type.get("notification", 0),
                "activity": unread_by_type.get("activity", 0),
                "mention": unread_by_type.get("mention", 0),
            },
        }

    def delete_item(self, item_id: int, user_id: int) -> bool:
        """Delete an inbox item"""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if item:
            self.db.delete(item)
            self.db.flush()
            return True

        return False

    def create_from_notification(self, notification) -> InboxItem:
        """Create an inbox item from a notification"""
        return InboxItem.create_from_notification(self.db, notification)

    def create_from_message(self, user_id: int, message, actor_id: int = None) -> InboxItem:
        """Create an inbox item from a message"""
        return InboxItem.create_from_message(self.db, user_id, message, actor_id)

    def create_from_mention(self, user_id: int, message, actor_id: int) -> InboxItem:
        """Create an inbox item for a mention"""
        return InboxItem.create_from_mention(self.db, user_id, message, actor_id)
