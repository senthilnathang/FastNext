"""Message Reaction model for emoji reactions"""

from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint, Index
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class MessageReaction(BaseModel):
    """
    Model for emoji reactions on messages.

    Allows users to react to messages with emojis (like Slack/Huly).
    Each user can only add one reaction per emoji per message.

    Attributes:
        message_id: The message being reacted to
        user_id: The user who reacted
        emoji: The emoji used (Unicode character or shortcode)
    """

    __tablename__ = "message_reactions"

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
    )

    # Emoji (Unicode character like '👍' or shortcode like ':thumbsup:')
    emoji = Column(String(50), nullable=False)

    # Relationships
    message = relationship(
        "Message",
        back_populates="reactions",
        lazy="select",
    )
    user = relationship(
        "User",
        lazy="select",
    )

    # Constraints
    __table_args__ = (
        # User can only react once with the same emoji on a message
        UniqueConstraint("message_id", "user_id", "emoji", name="uq_reaction_message_user_emoji"),
        # Index for fetching reactions by message
        Index("ix_reactions_message_emoji", "message_id", "emoji"),
    )

    def __repr__(self):
        return f"<MessageReaction(id={self.id}, message={self.message_id}, user={self.user_id}, emoji='{self.emoji}')>"

    @classmethod
    def create(
        cls,
        db,
        message_id: int,
        user_id: int,
        emoji: str,
    ) -> "MessageReaction":
        """Create a new reaction"""
        reaction = cls(
            message_id=message_id,
            user_id=user_id,
            emoji=emoji,
        )
        db.add(reaction)
        db.flush()
        return reaction

    @classmethod
    def get_by_message(cls, db, message_id: int) -> list:
        """Get all reactions for a message"""
        return db.query(cls).filter(cls.message_id == message_id).all()

    @classmethod
    def get_reaction_summary(cls, db, message_id: int) -> dict:
        """
        Get aggregated reaction counts for a message.

        Returns:
            Dict mapping emoji to {count, users}
        """
        from sqlalchemy import func

        reactions = db.query(cls).filter(cls.message_id == message_id).all()

        summary = {}
        for reaction in reactions:
            if reaction.emoji not in summary:
                summary[reaction.emoji] = {
                    "emoji": reaction.emoji,
                    "count": 0,
                    "users": [],
                }
            summary[reaction.emoji]["count"] += 1
            summary[reaction.emoji]["users"].append({
                "id": reaction.user_id,
                "full_name": reaction.user.full_name if reaction.user else None,
            })

        return summary

    @classmethod
    def find(cls, db, message_id: int, user_id: int, emoji: str):
        """Find a specific reaction"""
        return db.query(cls).filter(
            cls.message_id == message_id,
            cls.user_id == user_id,
            cls.emoji == emoji,
        ).first()

    @classmethod
    def toggle(cls, db, message_id: int, user_id: int, emoji: str) -> tuple:
        """
        Toggle a reaction (add if not exists, remove if exists).

        Returns:
            (reaction or None, action: 'added' | 'removed')
        """
        existing = cls.find(db, message_id, user_id, emoji)
        if existing:
            db.delete(existing)
            db.flush()
            return None, "removed"
        else:
            reaction = cls.create(db, message_id, user_id, emoji)
            return reaction, "added"
