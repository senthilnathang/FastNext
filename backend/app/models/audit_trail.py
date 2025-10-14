from datetime import datetime

from app.db.base import Base
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class AuditTrail(Base):
    __tablename__ = "audit_trails"

    id = Column(Integer, primary_key=True, index=True)

    # User who made the change
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Entity being tracked
    entity_type = Column(
        String(100), nullable=False, index=True
    )  # 'user', 'project', 'component', etc.
    entity_id = Column(Integer, nullable=False, index=True)  # ID of the tracked entity
    entity_name = Column(String(255), nullable=True)  # Name/title of the tracked entity

    # Change details
    operation = Column(
        String(50), nullable=False, index=True
    )  # 'INSERT', 'UPDATE', 'DELETE'

    # Data snapshots (JSON format stored as text for compatibility)
    old_values = Column(Text, nullable=True)  # JSON string of previous values
    new_values = Column(Text, nullable=True)  # JSON string of new values
    changed_fields = Column(Text, nullable=True)  # JSON array of changed field names

    # Request metadata
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    session_id = Column(String(255), nullable=True)

    # Additional context
    reason = Column(Text, nullable=True)  # Optional reason for the change
    extra_data = Column(Text, nullable=True)  # Additional JSON metadata

    # Audit fields
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        """Convert audit trail to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "operation": self.operation,
            "old_values": self.old_values,
            "new_values": self.new_values,
            "changed_fields": self.changed_fields,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "session_id": self.session_id,
            "reason": self.reason,
            "extra_data": self.extra_data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
