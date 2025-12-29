"""Mention service for @mentions in messages"""

from typing import Callable, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.mention import Mention
from app.models.user import User
from app.models.message import Message
from app.models.notification import Notification, NotificationLevel
from app.models.inbox import InboxItem, InboxItemType, InboxPriority
from app.services.base import BaseService


class MentionService(BaseService[Mention]):
    """Service for managing @mentions in messages"""

    def __init__(self, db: Session, enable_audit: bool = False):
        super().__init__(db=db, model=Mention, enable_audit=enable_audit)

    def parse_and_create_mentions(
        self,
        message_id: int,
        body: str,
        author_id: int,
        company_id: Optional[int] = None,
    ) -> List[Mention]:
        """
        Parse mentions from message body and create records.

        Args:
            message_id: ID of the message
            body: Message body text
            author_id: ID of the message author (to exclude from notifications)
            company_id: Optional company ID for scoping user search

        Returns:
            List of created Mention objects
        """
        # Parse mentions from body
        parsed = Mention.parse_mentions(body)
        if not parsed:
            return []

        # Resolve usernames to user IDs
        created = []
        seen_users = set()

        for username, start, end in parsed:
            user = self._resolve_username(username, company_id)
            if user and user.id != author_id and user.id not in seen_users:
                seen_users.add(user.id)
                mention = Mention.create(
                    db=self.db,
                    message_id=message_id,
                    user_id=user.id,
                    mention_text=f"@{username}",
                    start_position=start,
                    end_position=end,
                )
                created.append(mention)

        return created

    def _resolve_username(
        self,
        username: str,
        company_id: Optional[int] = None,
    ) -> Optional[User]:
        """
        Resolve a username to a User object.

        Searches by username or email prefix.
        """
        # Try exact username match first
        user = (
            self.db.query(User)
            .filter(User.username == username, User.is_active == True)
            .first()
        )
        if user:
            return user

        # Try email prefix match (e.g., @john matches john@example.com)
        user = (
            self.db.query(User)
            .filter(User.email.ilike(f"{username}@%"), User.is_active == True)
            .first()
        )
        return user

    async def notify_mentioned_users(
        self,
        message: Message,
        mentions: List[Mention],
        author_id: int,
    ) -> List[Notification]:
        """
        Create notifications for all mentioned users.

        Args:
            message: The message containing mentions
            mentions: List of Mention objects
            author_id: ID of the message author

        Returns:
            List of created Notification objects
        """
        notifications = []

        # Get author info for notification message
        author = self.db.query(User).filter(User.id == author_id).first()
        author_name = author.full_name or author.username if author else "Someone"

        for mention in mentions:
            if mention.user_id == author_id:
                continue

            # Create notification
            notification = Notification.create(
                db=self.db,
                user_id=mention.user_id,
                title="You were mentioned",
                description=f"{author_name} mentioned you in a message: {message.body[:100]}...",
                level=NotificationLevel.INFO,
                link=f"/{message.model_name}/{message.record_id}",
                data={
                    "message_id": message.id,
                    "mention_id": mention.id,
                    "model_name": message.model_name,
                    "record_id": message.record_id,
                    "author_id": author_id,
                },
            )
            notifications.append(notification)

            # Create inbox item for the mention
            self._create_inbox_item(message, mention, author_name)

            # Send push and email notifications
            await self._send_mention_notifications(
                mentioned_user_id=mention.user_id,
                author_name=author_name,
                message=message,
            )

        return notifications

    async def _send_mention_notifications(
        self,
        mentioned_user_id: int,
        author_name: str,
        message: Message,
    ) -> None:
        """Send push and email notifications for a mention"""
        import logging
        logger = logging.getLogger(__name__)

        try:
            from app.services.push import push_service
            from app.services.email import email_service

            # Push notification
            await push_service.notify_mention(
                db=self.db,
                mentioned_user_id=mentioned_user_id,
                mentioner_name=author_name,
                context=message.body[:100] if message.body else "",
                message_id=message.id,
            )

            # Email notification
            await email_service.send_mention_email(
                db=self.db,
                mentioned_user_id=mentioned_user_id,
                mentioner_name=author_name,
                context=message.body[:200] if message.body else "",
                message_id=message.id,
            )
        except Exception as e:
            logger.warning(f"Failed to send mention notifications: {e}")

    def _create_inbox_item(
        self,
        message: Message,
        mention: Mention,
        author_name: str,
    ) -> InboxItem:
        """Create an inbox item for a mention"""
        from app.services.inbox import InboxService

        inbox_service = InboxService(self.db)
        return inbox_service.create_item(
            user_id=mention.user_id,
            item_type=InboxItemType.MENTION,
            reference_type="mentions",
            reference_id=mention.id,
            source_model=message.model_name,
            source_id=message.record_id,
            title=f"Mentioned by {author_name}",
            preview=message.body[:200] if message.body else None,
            actor_id=message.user_id,
            priority=InboxPriority.HIGH,
        )

    def get_mentions_for_user(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False,
    ) -> Tuple[List[Mention], int]:
        """
        Get mentions for a user with pagination.

        Returns:
            Tuple of (mentions list, total count)
        """
        query = (
            self.db.query(Mention)
            .filter(Mention.user_id == user_id)
            .order_by(Mention.created_at.desc())
        )

        total = query.count()
        mentions = query.offset(offset).limit(limit).all()

        return mentions, total

    def search_users_for_mention(
        self,
        query: str,
        company_id: Optional[int] = None,
        exclude_user_id: Optional[int] = None,
        limit: int = 10,
    ) -> List[User]:
        """
        Search users for @mention autocomplete.

        Args:
            query: Search query (partial username or name)
            company_id: Optional company ID for scoping
            exclude_user_id: Optional user ID to exclude (current user)
            limit: Maximum number of results

        Returns:
            List of matching User objects
        """
        search = f"%{query}%"

        user_query = (
            self.db.query(User)
            .filter(
                User.is_active == True,
                (User.username.ilike(search)) |
                (User.full_name.ilike(search)) |
                (User.email.ilike(search))
            )
        )

        if exclude_user_id:
            user_query = user_query.filter(User.id != exclude_user_id)

        # Order by relevance: exact username match first, then starts with, then contains
        return (
            user_query
            .order_by(
                # Exact match first
                (User.username == query).desc(),
                # Starts with match second
                User.username.ilike(f"{query}%").desc(),
                # Then alphabetically
                User.username,
            )
            .limit(limit)
            .all()
        )

    async def process_message_mentions(
        self,
        message: Message,
        author_id: int,
        company_id: Optional[int] = None,
    ) -> List[Mention]:
        """
        Process a message: parse mentions, create records, and notify users.

        This is the main entry point for handling mentions on a new message.

        Args:
            message: The message to process
            author_id: ID of the message author
            company_id: Optional company ID for scoping

        Returns:
            List of created Mention objects
        """
        # Parse and create mentions
        mentions = self.parse_and_create_mentions(
            message_id=message.id,
            body=message.body,
            author_id=author_id,
            company_id=company_id,
        )

        # Create notifications for mentioned users
        if mentions:
            await self.notify_mentioned_users(
                message=message,
                mentions=mentions,
                author_id=author_id,
            )

        return mentions

    def process_message_mentions_sync(
        self,
        message: Message,
        author_id: int,
        company_id: Optional[int] = None,
    ) -> List[Mention]:
        """
        Synchronous version of process_message_mentions.
        Only creates in-app notifications (no push/email).
        """
        # Parse and create mentions
        mentions = self.parse_and_create_mentions(
            message_id=message.id,
            body=message.body,
            author_id=author_id,
            company_id=company_id,
        )

        # Create in-app notifications for mentioned users (sync version)
        if mentions:
            self._notify_mentioned_users_sync(
                message=message,
                mentions=mentions,
                author_id=author_id,
            )

        return mentions

    def _notify_mentioned_users_sync(
        self,
        message: Message,
        mentions: List[Mention],
        author_id: int,
    ) -> List[Notification]:
        """Synchronous version for backward compatibility (no push/email)"""
        notifications = []

        author = self.db.query(User).filter(User.id == author_id).first()
        author_name = author.full_name or author.username if author else "Someone"

        for mention in mentions:
            if mention.user_id == author_id:
                continue

            notification = Notification.create(
                db=self.db,
                user_id=mention.user_id,
                title="You were mentioned",
                description=f"{author_name} mentioned you in a message: {message.body[:100]}...",
                level=NotificationLevel.INFO,
                link=f"/{message.model_name}/{message.record_id}",
                data={
                    "message_id": message.id,
                    "mention_id": mention.id,
                    "model_name": message.model_name,
                    "record_id": message.record_id,
                    "author_id": author_id,
                },
            )
            notifications.append(notification)
            self._create_inbox_item(message, mention, author_name)

        return notifications
