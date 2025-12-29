"""Mention service for handling @mentions in messages

Provides mention parsing, user resolution, and notification integration.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.mention import Mention, MENTION_PATTERN
from app.models.message import Message


class MentionService:
    """Service for managing @mentions in messages."""

    def __init__(self, db: Session):
        self.db = db

    def resolve_username(self, username: str):
        """
        Resolve a username to a User object.

        Tries username first, then email prefix.
        """
        from app.models.user import User

        # Try exact username match
        user = self.db.query(User).filter(
            User.username == username
        ).first()

        if user:
            return user

        # Try email prefix (before @)
        user = self.db.query(User).filter(
            User.email.like(f"{username}@%")
        ).first()

        return user

    def parse_and_create_mentions(
        self,
        message_id: int,
        body: str,
    ) -> List[Mention]:
        """
        Parse body for @mentions and create mention records.

        Returns list of created Mention objects.
        """
        parsed = Mention.parse_mentions(body)
        mentions = []
        seen_users = set()

        for username, start, end in parsed:
            user = self.resolve_username(username)
            if user and user.id not in seen_users:
                mention = Mention.create(
                    db=self.db,
                    message_id=message_id,
                    user_id=user.id,
                    mention_text=f"@{username}",
                    start_position=start,
                    end_position=end,
                )
                mentions.append(mention)
                seen_users.add(user.id)

        return mentions

    def notify_mentioned_users(
        self,
        message: Message,
        mentions: List[Mention],
        author_id: int,
    ) -> None:
        """
        Create notifications for mentioned users.

        Skips the author if they mention themselves.
        """
        from app.models.notification import Notification, NotificationType
        import json

        for mention in mentions:
            # Skip author
            if mention.user_id == author_id:
                continue

            # Create notification
            title = "You were mentioned"
            if message.user:
                author_name = getattr(message.user, "full_name", None) or getattr(message.user, "username", "Someone")
                title = f"{author_name} mentioned you"

            body_preview = (message.body[:200] if message.body else "")

            notification = Notification(
                user_id=mention.user_id,
                title=title,
                message=body_preview,
                type=NotificationType.INFO,
                channels=json.dumps(["in_app"]),
                action_url=f"/{message.model_name}/{message.record_id}",
                data=json.dumps({
                    "type": "mention",
                    "message_id": message.id,
                    "model_name": message.model_name,
                    "record_id": message.record_id,
                    "author_id": author_id,
                }),
            )
            self.db.add(notification)

        self.db.flush()

    def process_message_mentions(
        self,
        message: Message,
        notify: bool = True,
    ) -> List[Mention]:
        """
        Main entry point for processing mentions in a message.

        Parses body, creates mention records, and optionally notifies users.
        """
        if not message.body:
            return []

        mentions = self.parse_and_create_mentions(
            message_id=message.id,
            body=message.body,
        )

        if notify and mentions and message.user_id:
            self.notify_mentioned_users(
                message=message,
                mentions=mentions,
                author_id=message.user_id,
            )

        self.db.commit()
        return mentions

    def get_mentions_for_user(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get mentions of a user with message details."""
        mentions = Mention.get_by_user(
            self.db,
            user_id=user_id,
            limit=limit,
            offset=offset,
        )

        result = []
        for mention in mentions:
            mention_dict = mention.to_dict()

            # Include message info
            if mention.message:
                mention_dict["message"] = mention.message.to_dict()

            result.append(mention_dict)

        return result

    def search_users_for_mention(
        self,
        query: str,
        limit: int = 10,
        exclude_user_ids: Optional[List[int]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search users for @mention autocomplete.

        Returns users matching the query by username, email, or name.
        """
        from app.models.user import User

        search_query = self.db.query(User).filter(
            User.is_active == True,
        )

        # Search in username, email, and name
        search_term = f"%{query}%"
        search_query = search_query.filter(
            (User.username.ilike(search_term)) |
            (User.email.ilike(search_term)) |
            (User.full_name.ilike(search_term))
        )

        # Exclude specific users
        if exclude_user_ids:
            search_query = search_query.filter(
                ~User.id.in_(exclude_user_ids)
            )

        users = search_query.limit(limit).all()

        return [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": getattr(user, "full_name", None),
                "avatar_url": getattr(user, "avatar_url", None),
            }
            for user in users
        ]

    def get_mention_count(self, user_id: int) -> int:
        """Get total mention count for a user."""
        return Mention.count_by_user(self.db, user_id)


def get_mention_service(db: Session) -> MentionService:
    """Get a MentionService instance."""
    return MentionService(db)
