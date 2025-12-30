"""
Workflow and ACL models for dynamic access control.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class AccessControlList(Base):
    """
    Access Control List for dynamic per-record and field-level permissions.
    """

    __tablename__ = "access_control_lists"

    id = Column(Integer, primary_key=True, index=True)

    # ACL identification
    name = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)

    # Target entity and operation
    entity_type = Column(String(100), nullable=False, index=True)
    operation = Column(String(50), nullable=False, index=True)  # read, write, create, delete
    field_name = Column(String(100), nullable=True, index=True)  # For field-level ACLs

    # Condition script (Python expression)
    condition_script = Column(Text, nullable=True)
    condition_context = Column(JSONB, nullable=True, default=dict)

    # Role-based access
    allowed_roles = Column(JSONB, nullable=True, default=list)  # List of role names
    denied_roles = Column(JSONB, nullable=True, default=list)

    # User-based access
    allowed_users = Column(JSONB, nullable=True, default=list)  # List of user IDs
    denied_users = Column(JSONB, nullable=True, default=list)

    # Workflow integration
    requires_approval = Column(Boolean, default=False, nullable=False)
    approval_workflow_id = Column(Integer, nullable=True)

    # Priority (lower number = higher priority)
    priority = Column(Integer, default=100, nullable=False, index=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Audit fields
    created_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<AccessControlList(id={self.id}, name='{self.name}', entity_type='{self.entity_type}')>"


class RecordPermission(Base):
    """
    Per-record permission grants for specific users or roles.
    """

    __tablename__ = "record_permissions"

    id = Column(Integer, primary_key=True, index=True)

    # Target entity
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(100), nullable=False, index=True)

    # Permission target (user or role, not both)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    role_id = Column(
        Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # Permission type
    operation = Column(String(50), nullable=False, index=True)  # read, write, delete

    # Optional conditions
    conditions = Column(JSONB, nullable=True, default=dict)

    # Validity
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Grant tracking
    granted_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    granted_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Revocation tracking
    revoked_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    role = relationship("Role", foreign_keys=[role_id])
    granter = relationship("User", foreign_keys=[granted_by])
    revoker = relationship("User", foreign_keys=[revoked_by])

    def __repr__(self):
        return f"<RecordPermission(entity_type='{self.entity_type}', entity_id='{self.entity_id}', operation='{self.operation}')>"

    def is_valid(self) -> bool:
        """Check if this permission is currently valid."""
        if not self.is_active:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at.replace(tzinfo=None):
            return False
        return True
