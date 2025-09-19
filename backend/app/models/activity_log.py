from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime
from enum import Enum as PyEnum


class ActivityLevel(str, PyEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ActivityAction(str, PyEnum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    IMPORT = "import"
    SHARE = "share"
    PERMISSION_CHANGE = "permission_change"


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # User who performed the action
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Action details
    action = Column(Enum(ActivityAction), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)  # 'user', 'project', 'component', etc.
    entity_id = Column(Integer, nullable=True, index=True)  # ID of the affected entity
    entity_name = Column(String(255), nullable=True)  # Name/title of the affected entity
    
    # Activity description and metadata
    description = Column(Text, nullable=False)
    level = Column(Enum(ActivityLevel), default=ActivityLevel.INFO, nullable=False)
    
    # Request metadata
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True)
    status_code = Column(Integer, nullable=True)
    
    # Additional context (JSON-serializable)
    extra_data = Column(Text, nullable=True)  # Store JSON string
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    
    def to_dict(self):
        """Convert activity log to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action.value if self.action else None,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'entity_name': self.entity_name,
            'description': self.description,
            'level': self.level.value if self.level else None,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'request_method': self.request_method,
            'request_path': self.request_path,
            'status_code': self.status_code,
            'extra_data': self.extra_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }