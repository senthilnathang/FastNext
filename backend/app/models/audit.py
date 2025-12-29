"""Audit log model for tracking all changes"""

import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class AuditAction(str, enum.Enum):
    """Types of audit actions"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    TWO_FACTOR_ENABLE = "2fa_enable"
    TWO_FACTOR_DISABLE = "2fa_disable"
    ROLE_ASSIGN = "role_assign"
    ROLE_REMOVE = "role_remove"
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"
    COMPANY_SWITCH = "company_switch"
    EXPORT = "export"
    IMPORT = "import"


class AuditLog(Base):
    """
    Audit log model for tracking all system changes.
    Used for compliance, security monitoring, and debugging.
    """

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Who performed the action
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Company context (if applicable)
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # What action was performed
    action = Column(
        Enum(AuditAction),
        nullable=False,
        index=True,
    )

    # What entity was affected
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    entity_name = Column(String(255), nullable=True)

    # Change details
    old_values = Column(Text, nullable=True)  # JSON string
    new_values = Column(Text, nullable=True)  # JSON string
    changed_fields = Column(Text, nullable=True)  # JSON array of field names

    # Description
    description = Column(Text, nullable=True)

    # Request context
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(String(500), nullable=True)
    request_id = Column(String(100), nullable=True)

    # Timestamp
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id], viewonly=True)
    company = relationship("Company", foreign_keys=[company_id], viewonly=True)

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', entity='{self.entity_type}')>"

    @classmethod
    def log(
        cls,
        db,
        action: AuditAction,
        entity_type: str,
        entity_id: int = None,
        entity_name: str = None,
        user_id: int = None,
        company_id: int = None,
        old_values: dict = None,
        new_values: dict = None,
        changed_fields: list = None,
        description: str = None,
        ip_address: str = None,
        user_agent: str = None,
        request_id: str = None,
    ):
        """Helper method to create an audit log entry"""
        import json

        entry = cls(
            user_id=user_id,
            company_id=company_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            old_values=json.dumps(old_values, default=str) if old_values else None,
            new_values=json.dumps(new_values, default=str) if new_values else None,
            changed_fields=json.dumps(changed_fields) if changed_fields else None,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
        )
        db.add(entry)
        db.flush()
        return entry
