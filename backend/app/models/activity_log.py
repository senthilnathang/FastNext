"""
Activity Log model for comprehensive activity tracking.
Inspired by FastNext's activity logging system.
"""

import enum
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class ActivityCategory(str, enum.Enum):
    """Categories for activity classification"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    USER_MANAGEMENT = "user_management"
    DATA_MANAGEMENT = "data_management"
    SYSTEM_MANAGEMENT = "system_management"
    SECURITY = "security"
    WORKFLOW = "workflow"
    API = "api"
    FILE_MANAGEMENT = "file_management"
    CONFIGURATION = "configuration"
    NOTIFICATION = "notification"
    INTEGRATION = "integration"


class ActivityLevel(str, enum.Enum):
    """Severity levels for activities"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ActivityLog(Base):
    """
    Comprehensive activity logging model.
    Tracks all significant actions in the system with rich metadata.
    """

    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Event identification
    event_id = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    correlation_id = Column(String(36), nullable=True, index=True)  # Links related events

    # Who performed the action
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Company context
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # What action was performed
    action = Column(String(50), nullable=False, index=True)
    category = Column(
        Enum(ActivityCategory),
        default=ActivityCategory.DATA_MANAGEMENT,
        nullable=False,
        index=True,
    )
    level = Column(
        Enum(ActivityLevel),
        default=ActivityLevel.INFO,
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
    changed_fields = Column(Text, nullable=True)  # JSON array
    description = Column(Text, nullable=True)
    extra_data = Column(Text, nullable=True)  # Additional JSON metadata

    # Request context
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(String(500), nullable=True)
    request_id = Column(String(100), nullable=True, index=True)
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True)
    http_status = Column(Integer, nullable=True)

    # Performance metrics
    response_time_ms = Column(Float, nullable=True)

    # Geographic data (optional)
    country_code = Column(String(2), nullable=True)
    city = Column(String(100), nullable=True)

    # Session tracking
    session_id = Column(String(100), nullable=True, index=True)

    # Risk assessment
    risk_score = Column(Integer, default=0, nullable=False)  # 0-100
    is_suspicious = Column(Boolean, default=False, nullable=False)

    # Success/failure tracking
    success = Column(Boolean, default=True, nullable=False)
    error_message = Column(Text, nullable=True)

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

    # Composite indexes for common queries
    __table_args__ = (
        Index("ix_activity_logs_entity", "entity_type", "entity_id"),
        Index("ix_activity_logs_user_action", "user_id", "action"),
        Index("ix_activity_logs_company_date", "company_id", "created_at"),
        Index("ix_activity_logs_security", "is_suspicious", "risk_score"),
    )

    def __repr__(self):
        return f"<ActivityLog(id={self.id}, action='{self.action}', entity='{self.entity_type}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "event_id": self.event_id,
            "user_id": self.user_id,
            "company_id": self.company_id,
            "action": self.action,
            "category": self.category.value if self.category else None,
            "level": self.level.value if self.level else None,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "description": self.description,
            "ip_address": self.ip_address,
            "success": self.success,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_event_dict(self) -> Dict[str, Any]:
        """Convert to event format for monitoring systems"""
        return {
            "event_id": self.event_id,
            "correlation_id": self.correlation_id,
            "timestamp": self.created_at.isoformat() if self.created_at else None,
            "user_id": self.user_id,
            "action": self.action,
            "category": self.category.value if self.category else None,
            "level": self.level.value if self.level else None,
            "entity": {
                "type": self.entity_type,
                "id": self.entity_id,
                "name": self.entity_name,
            },
            "request": {
                "method": self.request_method,
                "path": self.request_path,
                "ip": self.ip_address,
                "user_agent": self.user_agent,
            },
            "performance": {
                "response_time_ms": self.response_time_ms,
                "http_status": self.http_status,
            },
            "security": {
                "risk_score": self.risk_score,
                "is_suspicious": self.is_suspicious,
            },
            "success": self.success,
            "error": self.error_message,
        }

    @classmethod
    def log(
        cls,
        db,
        action: str,
        entity_type: str,
        entity_id: int = None,
        entity_name: str = None,
        user_id: int = None,
        company_id: int = None,
        category: ActivityCategory = ActivityCategory.DATA_MANAGEMENT,
        level: ActivityLevel = ActivityLevel.INFO,
        old_values: Dict = None,
        new_values: Dict = None,
        changed_fields: List[str] = None,
        description: str = None,
        extra_data: Dict = None,
        ip_address: str = None,
        user_agent: str = None,
        request_id: str = None,
        request_method: str = None,
        request_path: str = None,
        http_status: int = None,
        response_time_ms: float = None,
        session_id: str = None,
        correlation_id: str = None,
        success: bool = True,
        error_message: str = None,
        risk_score: int = 0,
        is_suspicious: bool = False,
        auto_flush: bool = True,
    ):
        """Create an activity log entry

        Args:
            auto_flush: Whether to flush after adding. Set to False when called from event handlers.
        """
        entry = cls(
            event_id=str(uuid.uuid4()),
            correlation_id=correlation_id,
            user_id=user_id,
            company_id=company_id,
            action=action,
            category=category,
            level=level,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            old_values=json.dumps(old_values, default=str) if old_values else None,
            new_values=json.dumps(new_values, default=str) if new_values else None,
            changed_fields=json.dumps(changed_fields) if changed_fields else None,
            description=description,
            extra_data=json.dumps(extra_data, default=str) if extra_data else None,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            request_method=request_method,
            request_path=request_path,
            http_status=http_status,
            response_time_ms=response_time_ms,
            session_id=session_id,
            success=success,
            error_message=error_message,
            risk_score=risk_score,
            is_suspicious=is_suspicious,
        )
        db.add(entry)
        if auto_flush:
            db.flush()
        return entry

    @classmethod
    def get_user_activities(
        cls,
        db,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        action: str = None,
        category: ActivityCategory = None,
    ):
        """Get activities for a specific user"""
        query = db.query(cls).filter(cls.user_id == user_id)
        if action:
            query = query.filter(cls.action == action)
        if category:
            query = query.filter(cls.category == category)
        return query.order_by(cls.created_at.desc()).offset(offset).limit(limit).all()

    @classmethod
    def get_entity_activities(
        cls,
        db,
        entity_type: str,
        entity_id: int,
        limit: int = 50,
    ):
        """Get activities for a specific entity"""
        return (
            db.query(cls)
            .filter(cls.entity_type == entity_type, cls.entity_id == entity_id)
            .order_by(cls.created_at.desc())
            .limit(limit)
            .all()
        )

    @classmethod
    def get_suspicious_activities(
        cls,
        db,
        min_risk_score: int = 50,
        limit: int = 100,
    ):
        """Get suspicious activities above a risk threshold"""
        return (
            db.query(cls)
            .filter((cls.is_suspicious == True) | (cls.risk_score >= min_risk_score))
            .order_by(cls.created_at.desc())
            .limit(limit)
            .all()
        )
