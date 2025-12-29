"""Mention model for @mention tracking in messages

Tracks @mentions with user resolution and notification integration.
"""

import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import (
    Column,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, Session

from app.db.base import Base


# Pattern for parsing @mentions
MENTION_PATTERN = re.compile(r"@([a-zA-Z0-9._]+)")


class Mention(Base):
    """
    Tracks @mentions in messages.

    Links a message to a mentioned user with position tracking.
    """
    __tablename__ = "mentions"

    id = Column(Integer, primary_key=True, index=True)

    message_id = Column(
        Integer,
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Track position in message text
    start_position = Column(Integer, nullable=True)
    end_position = Column(Integer, nullable=True)

    # The actual mention text (e.g., "@john.doe")
    mention_text = Column(String(128), nullable=True)

    # Relationships
    message = relationship(
        "Message",
        backref="mentions",
        lazy="select",
    )

    user = relationship(
        "User",
        lazy="select",
    )

    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_mention_message_user"),
        Index("idx_mention_message", "message_id"),
        Index("idx_mention_user", "user_id"),
    )

    @staticmethod
    def parse_mentions(body: str) -> List[Tuple[str, int, int]]:
        """
        Parse @mentions from text.

        Returns list of (username, start_pos, end_pos) tuples.
        """
        if not body:
            return []

        mentions = []
        for match in MENTION_PATTERN.finditer(body):
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
        """Create a mention record"""
        mention = cls(
            message_id=message_id,
            user_id=user_id,
            mention_text=mention_text,
            start_position=start_position,
            end_position=end_position,
        )
        db.add(mention)
        db.flush()
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
        Parse body for mentions and create records.

        Args:
            db: Database session
            message_id: ID of the message
            body: Message body text
            resolve_user_func: Function(username) -> User or None

        Returns:
            List of created Mention objects
        """
        parsed = cls.parse_mentions(body)
        mentions = []
        seen_users = set()

        for username, start, end in parsed:
            user = resolve_user_func(username)
            if user and user.id not in seen_users:
                mention = cls.create(
                    db=db,
                    message_id=message_id,
                    user_id=user.id,
                    mention_text=f"@{username}",
                    start_position=start,
                    end_position=end,
                )
                mentions.append(mention)
                seen_users.add(user.id)

        return mentions

    @classmethod
    def get_by_message(cls, db: Session, message_id: int) -> List["Mention"]:
        """Get all mentions in a message"""
        return db.query(cls).filter(
            cls.message_id == message_id
        ).all()

    @classmethod
    def get_by_user(
        cls,
        db: Session,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> List["Mention"]:
        """Get mentions of a user (paginated)"""
        return db.query(cls).filter(
            cls.user_id == user_id
        ).order_by(cls.id.desc()).offset(offset).limit(limit).all()

    @classmethod
    def count_by_user(cls, db: Session, user_id: int) -> int:
        """Count total mentions of a user"""
        return db.query(cls).filter(cls.user_id == user_id).count()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = {
            "id": self.id,
            "message_id": self.message_id,
            "user_id": self.user_id,
            "mention_text": self.mention_text,
            "start_position": self.start_position,
            "end_position": self.end_position,
        }

        if self.user:
            data["user"] = {
                "id": self.user.id,
                "username": getattr(self.user, "username", None),
                "full_name": getattr(self.user, "full_name", None),
            }

        return data
