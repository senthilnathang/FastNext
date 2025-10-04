from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text, Enum, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime
from enum import Enum as PyEnum
import json


class ActivityLevel(str, PyEnum):
    DEBUG = "debug"
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
    SYSTEM_EVENT = "system_event"
    SECURITY_EVENT = "security_event"
    API_CALL = "api_call"
    FILE_UPLOAD = "file_upload"
    FILE_DOWNLOAD = "file_download"
    WORKFLOW_EXECUTE = "workflow_execute"
    VALIDATION_FAILED = "validation_failed"


class EventCategory(str, PyEnum):
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


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Event identification
    event_id = Column(String(36), nullable=True, unique=True, index=True)  # UUID for event tracking
    correlation_id = Column(String(36), nullable=True, index=True)  # For tracking related events
    
    # User who performed the action
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    username = Column(String(100), nullable=True, index=True)  # Denormalized for faster queries
    
    # Event categorization
    category = Column(Enum(EventCategory), nullable=False, index=True)
    action = Column(Enum(ActivityAction), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)  # 'user', 'project', 'component', etc.
    entity_id = Column(String(100), nullable=True, index=True)  # Support for UUID and Integer IDs
    entity_name = Column(String(255), nullable=True)  # Name/title of the affected entity
    
    # Event description and metadata
    description = Column(Text, nullable=False)
    level = Column(Enum(ActivityLevel), default=ActivityLevel.INFO, nullable=False, index=True)
    
    # Request metadata
    ip_address = Column(String(45), nullable=True, index=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True, index=True)
    request_headers = Column(JSON, nullable=True)  # Important headers as JSON
    status_code = Column(Integer, nullable=True, index=True)
    response_time_ms = Column(Integer, nullable=True)  # Response time in milliseconds
    
    # Geographic and session info
    country_code = Column(String(2), nullable=True)  # ISO country code
    city = Column(String(100), nullable=True)
    session_id = Column(String(100), nullable=True, index=True)
    
    # Additional context and metadata
    event_metadata = Column('metadata', JSON, nullable=True)  # Structured metadata as JSON
    tags = Column(JSON, nullable=True)  # Tags for filtering and categorization
    
    # Event impact and risk assessment
    risk_score = Column(Integer, nullable=True)  # 0-100 risk score
    affected_users_count = Column(Integer, nullable=True)  # Number of users affected
    
    # System context
    server_name = Column(String(100), nullable=True)
    environment = Column(String(20), nullable=True)  # dev, staging, prod
    application_version = Column(String(50), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)  # When event was processed/analyzed
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    
    def to_dict(self):
        """Convert activity log to dictionary"""
        return {
            'id': self.id,
            'event_id': self.event_id,
            'correlation_id': self.correlation_id,
            'user_id': self.user_id,
            'username': self.username,
            'category': self.category.value if self.category else None,
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
            'request_headers': self.request_headers,
            'status_code': self.status_code,
            'response_time_ms': self.response_time_ms,
            'country_code': self.country_code,
            'city': self.city,
            'session_id': self.session_id,
            'metadata': self.event_metadata,
            'tags': self.tags,
            'risk_score': self.risk_score,
            'affected_users_count': self.affected_users_count,
            'server_name': self.server_name,
            'environment': self.environment,
            'application_version': self.application_version,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None
        }
    
    def to_event_dict(self):
        """Convert to event-focused dictionary for event monitoring"""
        return {
            'eventId': self.event_id,
            'correlationId': self.correlation_id,
            'timestamp': self.created_at.isoformat() if self.created_at else None,
            'level': self.level.value if self.level else None,
            'category': self.category.value if self.category else None,
            'action': self.action.value if self.action else None,
            'user': {
                'id': self.user_id,
                'username': self.username
            } if self.user_id else None,
            'entity': {
                'type': self.entity_type,
                'id': self.entity_id,
                'name': self.entity_name
            },
            'request': {
                'method': self.request_method,
                'path': self.request_path,
                'ip': self.ip_address,
                'userAgent': self.user_agent,
                'statusCode': self.status_code,
                'responseTime': self.response_time_ms
            },
            'location': {
                'country': self.country_code,
                'city': self.city
            } if self.country_code or self.city else None,
            'description': self.description,
            'metadata': self.event_metadata,
            'tags': self.tags,
            'riskScore': self.risk_score,
            'affectedUsersCount': self.affected_users_count,
            'system': {
                'server': self.server_name,
                'environment': self.environment,
                'version': self.application_version
            }
        }
    
    def to_user_event_dict(self):
        """Convert to frontend UserEvent interface format"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'event_type': self.entity_type,
            'event_category': self.category.value if self.category else None,
            'event_action': self.action.value if self.action else None,
            'entity_type': self.entity_type,
            'entity_id': int(self.entity_id) if self.entity_id and str(self.entity_id).isdigit() else None,
            'entity_name': self.entity_name,
            'description': self.description,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'location': f"{self.city}, {self.country_code}" if self.city and self.country_code else self.country_code,
            'metadata': self.event_metadata,
            'timestamp': self.created_at.isoformat() if self.created_at else None,
            'session_id': self.session_id,
            'device_info': self.user_agent  # Using user_agent as device_info
        }
    
    @property
    def severity_color(self):
        """Get color code for severity level"""
        colors = {
            ActivityLevel.DEBUG: "#6B7280",     # Gray
            ActivityLevel.INFO: "#3B82F6",      # Blue
            ActivityLevel.WARNING: "#F59E0B",   # Yellow
            ActivityLevel.ERROR: "#EF4444",     # Red
            ActivityLevel.CRITICAL: "#7C2D12"   # Dark Red
        }
        return colors.get(self.level, "#6B7280")
    
    @property
    def category_icon(self):
        """Get icon for event category"""
        icons = {
            EventCategory.AUTHENTICATION: "🔐",
            EventCategory.AUTHORIZATION: "🛡️",
            EventCategory.USER_MANAGEMENT: "👥",
            EventCategory.DATA_MANAGEMENT: "📊",
            EventCategory.SYSTEM_MANAGEMENT: "⚙️",
            EventCategory.SECURITY: "🚨",
            EventCategory.WORKFLOW: "🔄",
            EventCategory.API: "🌐",
            EventCategory.FILE_MANAGEMENT: "📁",
            EventCategory.CONFIGURATION: "⚙️"
        }
        return icons.get(self.category, "📋")