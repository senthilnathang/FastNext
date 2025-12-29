"""Message reaction model for emoji reactions

Provides Slack/Huly-style emoji reactions on messages.
"""

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
from sqlalchemy.sql import func

from app.db.base import Base


class MessageReaction(Base):
    """
    Emoji reaction on a message.

    Each user can have one reaction per emoji per message.
    """
    __tablename__ = "message_reactions"

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

    # Emoji character or shortcode
    emoji = Column(String(50), nullable=False)

    # Relationships
    message = relationship(
        "Message",
        backref="reactions",
        lazy="select",
    )

    user = relationship(
        "User",
        lazy="select",
    )

    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", "emoji", name="uq_reaction_message_user_emoji"),
        Index("idx_reaction_message", "message_id"),
        Index("idx_reaction_message_emoji", "message_id", "emoji"),
        Index("idx_reaction_user", "user_id"),
    )

    @classmethod
    def create(
        cls,
        db: Session,
        message_id: int,
        user_id: int,
        emoji: str,
    ) -> "MessageReaction":
        """Create a reaction"""
        reaction = cls(
            message_id=message_id,
            user_id=user_id,
            emoji=emoji,
        )
        db.add(reaction)
        db.flush()
        return reaction

    @classmethod
    def get_by_message(cls, db: Session, message_id: int) -> List["MessageReaction"]:
        """Get all reactions for a message"""
        return db.query(cls).filter(
            cls.message_id == message_id
        ).all()

    @classmethod
    def get_reaction_summary(
        cls,
        db: Session,
        message_id: int,
        current_user_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get aggregated reaction summary for a message.

        Returns list of {emoji, count, users, user_reacted} dicts.
        """
        reactions = cls.get_by_message(db, message_id)

        # Group by emoji
        emoji_groups: Dict[str, List[MessageReaction]] = {}
        for reaction in reactions:
            if reaction.emoji not in emoji_groups:
                emoji_groups[reaction.emoji] = []
            emoji_groups[reaction.emoji].append(reaction)

        # Build summary
        summary = []
        for emoji, group in emoji_groups.items():
            user_ids = [r.user_id for r in group]
            users = []
            for r in group:
                if r.user:
                    users.append({
                        "id": r.user.id,
                        "username": getattr(r.user, "username", None),
                        "full_name": getattr(r.user, "full_name", None),
                    })

            summary.append({
                "emoji": emoji,
                "count": len(group),
                "user_ids": user_ids,
                "users": users,
                "user_reacted": current_user_id in user_ids if current_user_id else False,
            })

        return summary

    @classmethod
    def find(
        cls,
        db: Session,
        message_id: int,
        user_id: int,
        emoji: str,
    ) -> Optional["MessageReaction"]:
        """Find a specific reaction"""
        return db.query(cls).filter(
            cls.message_id == message_id,
            cls.user_id == user_id,
            cls.emoji == emoji,
        ).first()

    @classmethod
    def toggle(
        cls,
        db: Session,
        message_id: int,
        user_id: int,
        emoji: str,
    ) -> Tuple[Optional["MessageReaction"], str]:
        """
        Toggle a reaction (add if not exists, remove if exists).

        Returns (reaction, action) where action is 'added' or 'removed'.
        """
        existing = cls.find(db, message_id, user_id, emoji)

        if existing:
            db.delete(existing)
            db.flush()
            return None, "removed"
        else:
            reaction = cls.create(db, message_id, user_id, emoji)
            return reaction, "added"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = {
            "id": self.id,
            "message_id": self.message_id,
            "user_id": self.user_id,
            "emoji": self.emoji,
        }

        if self.user:
            data["user"] = {
                "id": self.user.id,
                "username": getattr(self.user, "username", None),
                "full_name": getattr(self.user, "full_name", None),
            }

        return data
