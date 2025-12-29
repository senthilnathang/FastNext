"""Inbox service for unified inbox operations

Provides business logic for inbox management with filtering and stats.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.inbox import InboxItem, InboxItemType, InboxPriority


class InboxService:
    """Service for managing unified inbox."""

    def __init__(self, db: Session):
        self.db = db

    def get_unified_inbox(
        self,
        user_id: int,
        item_type: Optional[InboxItemType] = None,
        is_read: Optional[bool] = None,
        is_archived: bool = False,
        is_starred: Optional[bool] = None,
        priority: Optional[InboxPriority] = None,
        source_model: Optional[str] = None,
        source_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get unified inbox with filters.

        Returns list of inbox items with optional filtering.
        """
        query = self.db.query(InboxItem).filter(
            InboxItem.user_id == user_id,
            InboxItem.is_archived == is_archived,
        )

        # Apply filters
        if item_type:
            query = query.filter(InboxItem.item_type == item_type)

        if is_read is not None:
            query = query.filter(InboxItem.is_read == is_read)

        if is_starred is not None:
            query = query.filter(InboxItem.is_starred == is_starred)

        if priority:
            query = query.filter(InboxItem.priority == priority)

        if source_model:
            query = query.filter(InboxItem.source_model == source_model)

        if source_id:
            query = query.filter(InboxItem.source_id == source_id)

        # Order by starred first, then by created_at desc
        query = query.order_by(
            InboxItem.is_starred.desc(),
            InboxItem.created_at.desc(),
        )

        items = query.offset(offset).limit(limit).all()
        return [item.to_dict() for item in items]

    def search_inbox(
        self,
        user_id: int,
        query: str,
        item_type: Optional[InboxItemType] = None,
        is_read: Optional[bool] = None,
        is_archived: bool = False,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        label_ids: Optional[List[int]] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Search inbox with full-text search on title and preview.
        """
        db_query = self.db.query(InboxItem).filter(
            InboxItem.user_id == user_id,
            InboxItem.is_archived == is_archived,
        )

        # Full-text search on title and preview
        search_term = f"%{query}%"
        db_query = db_query.filter(
            or_(
                InboxItem.title.ilike(search_term),
                InboxItem.preview.ilike(search_term),
            )
        )

        # Apply filters
        if item_type:
            db_query = db_query.filter(InboxItem.item_type == item_type)

        if is_read is not None:
            db_query = db_query.filter(InboxItem.is_read == is_read)

        if date_from:
            db_query = db_query.filter(InboxItem.created_at >= date_from)

        if date_to:
            db_query = db_query.filter(InboxItem.created_at <= date_to)

        if label_ids:
            from app.models.label import InboxItemLabel
            db_query = db_query.join(InboxItemLabel).filter(
                InboxItemLabel.label_id.in_(label_ids)
            )

        # Order by relevance (starred first, then recent)
        db_query = db_query.order_by(
            InboxItem.is_starred.desc(),
            InboxItem.created_at.desc(),
        )

        items = db_query.offset(offset).limit(limit).all()
        return [item.to_dict() for item in items]

    def get_item(self, item_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Get a single inbox item with details."""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if not item:
            return None

        item_dict = item.to_dict()

        # Get referenced data
        ref_data = self.get_referenced_data(item)
        if ref_data:
            item_dict["reference_data"] = ref_data

        return item_dict

    def get_referenced_data(self, item: InboxItem) -> Optional[Dict[str, Any]]:
        """Fetch the actual referenced record for an inbox item."""
        if item.reference_type == "messages":
            from app.models.message import Message
            message = self.db.query(Message).filter(
                Message.id == item.reference_id
            ).first()
            return message.to_dict() if message else None

        elif item.reference_type == "notifications":
            from app.models.notification import Notification
            notification = self.db.query(Notification).filter(
                Notification.id == item.reference_id
            ).first()
            if notification:
                return {
                    "id": notification.id,
                    "title": notification.title,
                    "message": notification.message,
                    "type": str(notification.type) if notification.type else None,
                    "action_url": notification.action_url,
                }
            return None

        elif item.reference_type == "activity_logs":
            from app.models.activity_log import ActivityLog
            activity = self.db.query(ActivityLog).filter(
                ActivityLog.id == item.reference_id
            ).first()
            if activity:
                return {
                    "id": activity.id,
                    "action": activity.action,
                    "entity_type": activity.entity_type,
                    "entity_id": activity.entity_id,
                    "description": activity.description,
                }
            return None

        elif item.reference_type == "mentions":
            from app.models.mention import Mention
            mention = self.db.query(Mention).filter(
                Mention.id == item.reference_id
            ).first()
            if mention:
                return {
                    "id": mention.id,
                    "message_id": mention.message_id,
                    "mention_text": mention.mention_text,
                }
            return None

        return None

    def mark_read(self, item_id: int, user_id: int) -> bool:
        """Mark a single item as read."""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if not item:
            return False

        item.mark_as_read()
        self.db.commit()
        return True

    def mark_unread(self, item_id: int, user_id: int) -> bool:
        """Mark a single item as unread."""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if not item:
            return False

        item.mark_as_unread()
        self.db.commit()
        return True

    def archive(self, item_id: int, user_id: int) -> bool:
        """Archive a single item."""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if not item:
            return False

        item.archive()
        self.db.commit()
        return True

    def unarchive(self, item_id: int, user_id: int) -> bool:
        """Unarchive a single item."""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if not item:
            return False

        item.unarchive()
        self.db.commit()
        return True

    def star(self, item_id: int, user_id: int) -> bool:
        """Star a single item."""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if not item:
            return False

        item.star()
        self.db.commit()
        return True

    def unstar(self, item_id: int, user_id: int) -> bool:
        """Unstar a single item."""
        item = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).first()

        if not item:
            return False

        item.unstar()
        self.db.commit()
        return True

    def bulk_mark_read(
        self,
        user_id: int,
        item_ids: Optional[List[int]] = None,
        item_type: Optional[InboxItemType] = None,
    ) -> int:
        """
        Mark multiple items as read.

        Can specify item_ids directly or use item_type to mark all of that type.
        """
        if item_ids:
            count = self.db.query(InboxItem).filter(
                InboxItem.id.in_(item_ids),
                InboxItem.user_id == user_id,
                InboxItem.is_read == False,
            ).update({
                InboxItem.is_read: True,
                InboxItem.read_at: datetime.utcnow(),
            }, synchronize_session=False)
        else:
            count = InboxItem.mark_all_read(self.db, user_id, item_type)

        self.db.commit()
        return count

    def bulk_archive(
        self,
        user_id: int,
        item_ids: Optional[List[int]] = None,
        item_type: Optional[InboxItemType] = None,
    ) -> int:
        """
        Archive multiple items.

        Can specify item_ids directly or use item_type to archive all of that type.
        """
        if item_ids:
            count = self.db.query(InboxItem).filter(
                InboxItem.id.in_(item_ids),
                InboxItem.user_id == user_id,
                InboxItem.is_archived == False,
            ).update({
                InboxItem.is_archived: True,
                InboxItem.archived_at: datetime.utcnow(),
            }, synchronize_session=False)
        else:
            count = InboxItem.archive_all(self.db, user_id, item_type)

        self.db.commit()
        return count

    def get_stats(self, user_id: int) -> Dict[str, Any]:
        """Get inbox statistics for user."""
        # Get total counts
        total_count = self.db.query(InboxItem).filter(
            InboxItem.user_id == user_id,
            InboxItem.is_archived == False,
        ).count()

        unread_count = self.db.query(InboxItem).filter(
            InboxItem.user_id == user_id,
            InboxItem.is_archived == False,
            InboxItem.is_read == False,
        ).count()

        archived_count = self.db.query(InboxItem).filter(
            InboxItem.user_id == user_id,
            InboxItem.is_archived == True,
        ).count()

        starred_count = self.db.query(InboxItem).filter(
            InboxItem.user_id == user_id,
            InboxItem.is_starred == True,
        ).count()

        # Get counts by type
        unread_by_type = InboxItem.get_counts_by_type(self.db, user_id)

        return {
            "total_count": total_count,
            "unread_count": unread_count,
            "read_count": total_count - unread_count,
            "archived_count": archived_count,
            "starred_count": starred_count,
            "unread_by_type": unread_by_type,
        }

    def delete_item(self, item_id: int, user_id: int) -> bool:
        """Delete an inbox item."""
        result = self.db.query(InboxItem).filter(
            InboxItem.id == item_id,
            InboxItem.user_id == user_id,
        ).delete(synchronize_session=False)

        self.db.commit()
        return result > 0

    def create_from_notification(self, notification) -> InboxItem:
        """Create inbox item from notification."""
        return InboxItem.create_from_notification(self.db, notification)

    def create_from_message(
        self,
        user_id: int,
        message,
        actor_id: Optional[int] = None,
    ) -> InboxItem:
        """Create inbox item from message."""
        return InboxItem.create_from_message(
            self.db,
            user_id=user_id,
            message=message,
            actor_id=actor_id,
        )

    def create_from_mention(
        self,
        user_id: int,
        mention,
        message,
        actor_id: Optional[int] = None,
    ) -> InboxItem:
        """Create inbox item from mention."""
        return InboxItem.create_from_mention(
            self.db,
            user_id=user_id,
            mention=mention,
            message=message,
            actor_id=actor_id,
        )


def get_inbox_service(db: Session) -> InboxService:
    """Get an InboxService instance."""
    return InboxService(db)
