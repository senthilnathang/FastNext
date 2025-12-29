"""Mention model for @mentions in messages"""

import re
from typing import List, Optional, Tuple, TYPE_CHECKING

from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship, Session

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.message import Message


class Mention(BaseModel):
    """
    Tracks @mentions in messages.

    When a user mentions another user in a message using @username syntax,
    a Mention record is created linking the message to the mentioned user.
    This triggers notifications to mentioned users.
    """

    __tablename__ = "mentions"

    # Foreign keys
    message_id = Column(
        Integer,
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="The user who was mentioned",
    )

    # Where the mention appears in the message body
    start_position = Column(Integer, nullable=True)
    end_position = Column(Integer, nullable=True)

    # Original mention text (e.g., "@john.doe")
    mention_text = Column(String(100), nullable=True)

    # Relationships
    message = relationship(
        "Message",
        back_populates="mentions",
        lazy="select",
    )
    user = relationship(
        "User",
        back_populates="mentions",
        lazy="select",
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint(
            "message_id", "user_id",
            name="uq_mention_message_user"
        ),
        Index("ix_mentions_user_created", "user_id", "created_at"),
    )

    # Pattern for parsing @mentions in message body
    # Matches @username where username can contain letters, numbers, dots, underscores
    MENTION_PATTERN = re.compile(r'@([a-zA-Z0-9._]+)')

    @classmethod
    def parse_mentions(cls, body: str) -> List[Tuple[str, int, int]]:
        """
        Parse @mentions from message body.

        Returns list of tuples: (username, start_position, end_position)
        """
        if not body:
            return []

        mentions = []
        for match in cls.MENTION_PATTERN.finditer(body):
            username = match.group(1)
            start = match.start()
            end = match.end()
            mentions.append((username, start, end))

        return mentions

    @classmethod
    def create(
        cls,
        db: Session,
        message_id: int,
        user_id: int,
        mention_text: Optional[str] = None,
        start_position: Optional[int] = None,
        end_position: Optional[int] = None,
    ) -> "Mention":
        """Create a new mention record"""
        mention = cls(
            message_id=message_id,
            user_id=user_id,
            mention_text=mention_text,
            start_position=start_position,
            end_position=end_position,
        )
        db.add(mention)
        return mention

    @classmethod
    def create_from_body(
        cls,
        db: Session,
        message_id: int,
        body: str,
        resolve_user_func,
    ) -> List["Mention"]:
        """
        Parse mentions from body and create records.

        Args:
            db: Database session
            message_id: ID of the message
            body: Message body text
            resolve_user_func: Function that takes username and returns user_id or None

        Returns:
            List of created Mention objects
        """
        parsed = cls.parse_mentions(body)
        created = []
        seen_users = set()

        for username, start, end in parsed:
            user_id = resolve_user_func(username)
            if user_id and user_id not in seen_users:
                seen_users.add(user_id)
                mention = cls.create(
                    db=db,
                    message_id=message_id,
                    user_id=user_id,
                    mention_text=f"@{username}",
                    start_position=start,
                    end_position=end,
                )
                created.append(mention)

        return created

    @classmethod
    def get_by_message(cls, db: Session, message_id: int) -> List["Mention"]:
        """Get all mentions for a message"""
        return (
            db.query(cls)
            .filter(cls.message_id == message_id)
            .order_by(cls.start_position)
            .all()
        )

    @classmethod
    def get_by_user(
        cls,
        db: Session,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> List["Mention"]:
        """Get all mentions of a user"""
        return (
            db.query(cls)
            .filter(cls.user_id == user_id)
            .order_by(cls.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    @classmethod
    def count_by_user(cls, db: Session, user_id: int) -> int:
        """Count mentions of a user"""
        return (
            db.query(cls)
            .filter(cls.user_id == user_id)
            .count()
        )

    @classmethod
    def get_unread_mentions(
        cls,
        db: Session,
        user_id: int,
        limit: int = 50,
    ) -> List["Mention"]:
        """
        Get unread mentions for a user.
        A mention is considered unread if the associated inbox item is unread.
        """
        from app.models.inbox import InboxItem, InboxItemType

        return (
            db.query(cls)
            .join(
                InboxItem,
                (InboxItem.reference_type == "mentions") &
                (InboxItem.reference_id == cls.id) &
                (InboxItem.user_id == user_id)
            )
            .filter(
                cls.user_id == user_id,
                InboxItem.is_read == False,
            )
            .order_by(cls.created_at.desc())
            .limit(limit)
            .all()
        )

    def __repr__(self) -> str:
        return f"<Mention(id={self.id}, message_id={self.message_id}, user_id={self.user_id})>"
