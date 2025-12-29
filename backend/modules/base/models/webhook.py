"""
Webhook Models

Provides webhook functionality for event notifications to external systems:
- Webhook definitions with configurable events
- Authentication support (Basic, Bearer, HMAC signature)
- Retry logic with exponential backoff
- Detailed logging
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, String, Text,
    ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import Session, relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin


class WebhookEvent(str, Enum):
    """Webhook event types."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    WORKFLOW_CHANGE = "workflow_change"
    CUSTOM = "custom"


class WebhookAuthType(str, Enum):
    """Webhook authentication types."""
    NONE = "none"
    BASIC = "basic"
    BEARER = "bearer"
    SIGNATURE = "signature"  # HMAC signature
    API_KEY = "api_key"


class WebhookStatus(str, Enum):
    """Webhook delivery status."""
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"


class WebhookDefinition(Base, TimestampMixin, AuditMixin):
    """
    Webhook definition.

    Configures outgoing webhooks to notify external systems
    when events occur.

    Example:
        WebhookDefinition(
            name="Order Created Webhook",
            code="order_created",
            url="https://api.example.com/webhooks/orders",
            method="POST",
            events=["create"],
            model_name="sales.order",
            auth_type="bearer",
            auth_token="your-api-token"
        )
    """

    __tablename__ = "webhook_definitions"
    __table_args__ = (
        Index("ix_webhook_definitions_model", "model_name"),
        Index("ix_webhook_definitions_module", "module_name"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Identification
    name = Column(
        String(200),
        nullable=False,
        comment="Human-readable webhook name"
    )
    code = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique webhook code"
    )
    description = Column(
        Text,
        nullable=True,
        comment="Webhook description"
    )

    # Ownership
    module_name = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Module that owns this webhook"
    )

    # Target configuration
    url = Column(
        String(1000),
        nullable=False,
        comment="Webhook URL"
    )
    method = Column(
        String(10),
        default="POST",
        comment="HTTP method: GET, POST, PUT, PATCH, DELETE"
    )
    headers = Column(
        JSONB,
        default=dict,
        comment="Custom HTTP headers"
    )
    content_type = Column(
        String(100),
        default="application/json",
        comment="Content-Type header"
    )

    # Authentication
    auth_type = Column(
        String(20),
        default=WebhookAuthType.NONE.value,
        comment="Authentication type: none, basic, bearer, signature, api_key"
    )
    auth_username = Column(
        String(200),
        nullable=True,
        comment="Username for basic auth"
    )
    auth_password = Column(
        String(500),
        nullable=True,
        comment="Password for basic auth (encrypted)"
    )
    auth_token = Column(
        String(500),
        nullable=True,
        comment="Bearer token or API key (encrypted)"
    )
    auth_header_name = Column(
        String(100),
        nullable=True,
        comment="Custom header name for API key auth"
    )
    secret_key = Column(
        String(200),
        nullable=True,
        comment="Secret key for HMAC signature"
    )
    signature_header = Column(
        String(100),
        default="X-Webhook-Signature",
        comment="Header name for signature"
    )

    # Event configuration
    events = Column(
        JSONB,
        default=list,
        comment="List of events to trigger: ['create', 'update', 'delete', 'workflow_change']"
    )
    model_name = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Model to watch for events"
    )
    filter_domain = Column(
        JSONB,
        default=list,
        comment="Domain filter for records: [['field', 'op', 'value']]"
    )

    # Payload configuration
    payload_template = Column(
        Text,
        nullable=True,
        comment="Jinja2 template for payload (JSON string)"
    )
    include_record = Column(
        Boolean,
        default=True,
        comment="Include full record data in payload"
    )
    include_changes = Column(
        Boolean,
        default=True,
        comment="Include changed fields in update events"
    )

    # Retry configuration
    max_retries = Column(
        Integer,
        default=3,
        comment="Maximum retry attempts"
    )
    retry_delay = Column(
        Integer,
        default=60,
        comment="Initial retry delay in seconds"
    )
    retry_backoff = Column(
        Integer,
        default=2,
        comment="Exponential backoff multiplier"
    )
    timeout = Column(
        Integer,
        default=30,
        comment="Request timeout in seconds"
    )

    # Status
    is_active = Column(
        Boolean,
        default=True,
        comment="Whether this webhook is active"
    )

    # Multi-tenant
    company_id = Column(
        Integer,
        nullable=True,
        index=True,
        comment="Company ID for multi-tenant"
    )

    # Relationships
    logs = relationship(
        "WebhookLog",
        back_populates="webhook",
        cascade="all, delete-orphan",
        order_by="desc(WebhookLog.created_at)"
    )

    def __repr__(self) -> str:
        return f"<WebhookDefinition({self.code}: {self.url})>"

    @property
    def event_list(self) -> List[str]:
        """Get list of events."""
        return self.events or []

    def should_trigger(self, event: str, model_name: str) -> bool:
        """Check if webhook should trigger for this event."""
        if not self.is_active:
            return False
        if self.model_name and self.model_name != model_name:
            return False
        if event not in self.event_list:
            return False
        return True

    @classmethod
    def get_by_code(cls, db: Session, code: str) -> Optional["WebhookDefinition"]:
        """Get webhook by code."""
        return db.query(cls).filter(
            cls.code == code,
            cls.is_active == True
        ).first()

    @classmethod
    def get_for_event(
        cls,
        db: Session,
        event: str,
        model_name: str,
        company_id: Optional[int] = None,
    ) -> List["WebhookDefinition"]:
        """Get all webhooks for an event."""
        from sqlalchemy import cast
        from sqlalchemy.dialects.postgresql import JSONB as JSONB_TYPE

        query = db.query(cls).filter(
            cls.is_active == True,
            cls.model_name == model_name,
        )

        if company_id:
            query = query.filter(
                (cls.company_id.is_(None)) | (cls.company_id == company_id)
            )

        webhooks = query.all()
        return [w for w in webhooks if event in (w.events or [])]


class WebhookLog(Base, TimestampMixin):
    """
    Webhook delivery log.

    Tracks all webhook delivery attempts with full
    request/response details.

    Example:
        WebhookLog(
            webhook_id=1,
            event_type="create",
            model_name="sales.order",
            res_id=123,
            request_url="https://api.example.com/webhooks/orders",
            request_method="POST",
            response_status=200,
            status="success"
        )
    """

    __tablename__ = "webhook_logs"
    __table_args__ = (
        Index("ix_webhook_logs_webhook", "webhook_id"),
        Index("ix_webhook_logs_record", "model_name", "res_id"),
        Index("ix_webhook_logs_status", "status"),
        Index("ix_webhook_logs_created", "created_at"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Webhook reference
    webhook_id = Column(
        Integer,
        ForeignKey("webhook_definitions.id", ondelete="CASCADE"),
        nullable=False
    )

    # Event info
    event_type = Column(
        String(50),
        nullable=False,
        comment="Event type: create, update, delete, workflow_change"
    )
    model_name = Column(
        String(100),
        nullable=True,
        comment="Model name"
    )
    res_id = Column(
        Integer,
        nullable=True,
        comment="Record ID"
    )

    # Request details
    request_url = Column(
        String(1000),
        nullable=False,
        comment="Request URL"
    )
    request_method = Column(
        String(10),
        nullable=False,
        comment="HTTP method"
    )
    request_headers = Column(
        JSONB,
        nullable=True,
        comment="Request headers (sensitive data redacted)"
    )
    request_payload = Column(
        JSONB,
        nullable=True,
        comment="Request payload"
    )

    # Response details
    response_status = Column(
        Integer,
        nullable=True,
        comment="HTTP status code"
    )
    response_headers = Column(
        JSONB,
        nullable=True,
        comment="Response headers"
    )
    response_body = Column(
        Text,
        nullable=True,
        comment="Response body (truncated if large)"
    )

    # Timing
    duration_ms = Column(
        Integer,
        nullable=True,
        comment="Request duration in milliseconds"
    )

    # Status
    status = Column(
        String(20),
        default=WebhookStatus.PENDING.value,
        comment="Delivery status: pending, success, failed, retrying"
    )

    # Retry info
    retry_count = Column(
        Integer,
        default=0,
        comment="Number of retry attempts"
    )
    next_retry = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Next retry time"
    )

    # Error info
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if failed"
    )

    # Relationships
    webhook = relationship("WebhookDefinition", back_populates="logs")

    def __repr__(self) -> str:
        return f"<WebhookLog({self.id}: {self.event_type} - {self.status})>"

    @property
    def is_success(self) -> bool:
        """Check if delivery was successful."""
        return self.status == WebhookStatus.SUCCESS.value

    @property
    def can_retry(self) -> bool:
        """Check if can retry."""
        return (
            self.status == WebhookStatus.FAILED.value and
            self.webhook and
            self.retry_count < self.webhook.max_retries
        )

    def mark_success(self) -> None:
        """Mark delivery as successful."""
        self.status = WebhookStatus.SUCCESS.value

    def mark_failed(self, error: str) -> None:
        """Mark delivery as failed."""
        self.status = WebhookStatus.FAILED.value
        self.error_message = error
        self.retry_count += 1

    def schedule_retry(self) -> None:
        """Schedule a retry with exponential backoff."""
        from datetime import timedelta

        if self.webhook:
            delay = self.webhook.retry_delay * (
                self.webhook.retry_backoff ** self.retry_count
            )
            self.next_retry = datetime.utcnow() + timedelta(seconds=delay)
            self.status = WebhookStatus.RETRYING.value

    @classmethod
    def get_pending_retries(
        cls,
        db: Session,
        limit: int = 50,
    ) -> List["WebhookLog"]:
        """Get logs ready for retry."""
        now = datetime.utcnow()
        return db.query(cls).filter(
            cls.status == WebhookStatus.RETRYING.value,
            cls.next_retry <= now
        ).order_by(cls.next_retry).limit(limit).all()

    @classmethod
    def cleanup_old(
        cls,
        db: Session,
        days: int = 30,
    ) -> int:
        """Delete old successful logs."""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=days)
        return db.query(cls).filter(
            cls.status == WebhookStatus.SUCCESS.value,
            cls.created_at < cutoff
        ).delete(synchronize_session=False)


class WebhookSecret(Base, TimestampMixin):
    """
    Incoming webhook secrets for verification.

    Used to verify incoming webhooks from external systems.
    """

    __tablename__ = "webhook_secrets"
    __table_args__ = (
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Identification
    name = Column(
        String(200),
        nullable=False,
        comment="Secret name"
    )
    code = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique code"
    )

    # Secret
    secret_key = Column(
        String(500),
        nullable=False,
        comment="Secret key for verification"
    )
    algorithm = Column(
        String(20),
        default="sha256",
        comment="HMAC algorithm: sha256, sha512"
    )
    header_name = Column(
        String(100),
        default="X-Webhook-Signature",
        comment="Header containing signature"
    )

    # Status
    is_active = Column(
        Boolean,
        default=True,
        comment="Whether this secret is active"
    )

    def __repr__(self) -> str:
        return f"<WebhookSecret({self.code})>"

    @classmethod
    def get_by_code(cls, db: Session, code: str) -> Optional["WebhookSecret"]:
        """Get secret by code."""
        return db.query(cls).filter(
            cls.code == code,
            cls.is_active == True
        ).first()
