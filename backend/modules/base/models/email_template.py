"""
Email Template Models

Provides template-based email functionality with:
- Jinja2 templates for subject and body
- Email queue for async sending
- Attachment support
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


class EmailStatus(str, Enum):
    """Email queue status."""
    PENDING = "pending"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


class EmailTemplate(Base, TimestampMixin, AuditMixin):
    """
    Email template definition.

    Supports Jinja2 templates for dynamic content with
    access to record data and context variables.

    Example:
        EmailTemplate(
            name="Welcome Email",
            code="welcome_email",
            model_name="users",
            subject="Welcome, {{ record.full_name }}!",
            body_html="<h1>Welcome to {{ company_name }}</h1>...",
            email_to="{{ record.email }}"
        )
    """

    __tablename__ = "email_templates"
    __table_args__ = (
        Index("ix_email_templates_model", "model_name"),
        Index("ix_email_templates_module", "module_name"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Identification
    name = Column(
        String(200),
        nullable=False,
        comment="Human-readable template name"
    )
    code = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique template code"
    )
    description = Column(
        Text,
        nullable=True,
        comment="Template description"
    )

    # Ownership
    module_name = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Module that owns this template"
    )

    # Model binding (optional)
    model_name = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Model for record context (e.g., 'users')"
    )

    # Email content (Jinja2 templates)
    subject = Column(
        String(500),
        nullable=False,
        comment="Email subject (Jinja2 template)"
    )
    body_html = Column(
        Text,
        nullable=True,
        comment="HTML body (Jinja2 template)"
    )
    body_text = Column(
        Text,
        nullable=True,
        comment="Plain text body (Jinja2 template)"
    )

    # Sender/Recipients (Jinja2 templates)
    email_from = Column(
        String(200),
        nullable=True,
        comment="From address (Jinja2 template)"
    )
    reply_to = Column(
        String(200),
        nullable=True,
        comment="Reply-to address (Jinja2 template)"
    )
    email_to = Column(
        String(500),
        nullable=True,
        comment="To addresses (Jinja2 template, comma-separated)"
    )
    email_cc = Column(
        String(500),
        nullable=True,
        comment="CC addresses (Jinja2 template)"
    )
    email_bcc = Column(
        String(500),
        nullable=True,
        comment="BCC addresses (Jinja2 template)"
    )

    # Attachments
    attachment_ids = Column(
        JSONB,
        default=list,
        comment="Static attachment IDs"
    )
    report_template_id = Column(
        Integer,
        nullable=True,
        comment="Report template to generate and attach"
    )

    # Preview/Testing
    preview_context = Column(
        JSONB,
        default=dict,
        comment="Sample context for preview"
    )

    # Localization
    lang = Column(
        String(10),
        nullable=True,
        comment="Language code for translation"
    )

    # Status
    is_active = Column(
        Boolean,
        default=True,
        comment="Whether this template is active"
    )

    def __repr__(self) -> str:
        return f"<EmailTemplate({self.code}: {self.name})>"

    @classmethod
    def get_by_code(cls, db: Session, code: str) -> Optional["EmailTemplate"]:
        """Get template by code."""
        return db.query(cls).filter(
            cls.code == code,
            cls.is_active == True
        ).first()

    @classmethod
    def get_for_model(cls, db: Session, model_name: str) -> List["EmailTemplate"]:
        """Get all templates for a model."""
        return db.query(cls).filter(
            cls.model_name == model_name,
            cls.is_active == True
        ).order_by(cls.name).all()


class EmailQueue(Base, TimestampMixin):
    """
    Email queue for async sending.

    Emails are added to the queue and processed by a
    scheduled action or background worker.

    Example:
        EmailQueue(
            template_id=1,
            email_from="noreply@example.com",
            email_to="user@example.com",
            subject="Welcome!",
            body_html="<h1>Welcome!</h1>",
            status="pending"
        )
    """

    __tablename__ = "email_queue"
    __table_args__ = (
        Index("ix_email_queue_status", "status"),
        Index("ix_email_queue_next_retry", "next_retry"),
        Index("ix_email_queue_record", "model_name", "res_id"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Template reference (optional)
    template_id = Column(
        Integer,
        ForeignKey("email_templates.id", ondelete="SET NULL"),
        nullable=True
    )

    # Email content
    email_from = Column(
        String(200),
        nullable=False,
        comment="From address"
    )
    email_to = Column(
        String(500),
        nullable=False,
        comment="To addresses (comma-separated)"
    )
    email_cc = Column(
        String(500),
        nullable=True,
        comment="CC addresses"
    )
    email_bcc = Column(
        String(500),
        nullable=True,
        comment="BCC addresses"
    )
    reply_to = Column(
        String(200),
        nullable=True,
        comment="Reply-to address"
    )
    subject = Column(
        String(500),
        nullable=False,
        comment="Email subject"
    )
    body_html = Column(
        Text,
        nullable=True,
        comment="HTML body"
    )
    body_text = Column(
        Text,
        nullable=True,
        comment="Plain text body"
    )

    # Attachments
    attachments = Column(
        JSONB,
        default=list,
        comment="Attachments: [{filename, content_base64, content_type}]"
    )

    # Status
    status = Column(
        String(20),
        default=EmailStatus.PENDING.value,
        index=True,
        comment="Status: pending, sending, sent, failed, cancelled"
    )

    # Retry logic
    retry_count = Column(
        Integer,
        default=0,
        comment="Number of retry attempts"
    )
    max_retries = Column(
        Integer,
        default=3,
        comment="Maximum retry attempts"
    )
    next_retry = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Next retry time"
    )

    # Error tracking
    last_error = Column(
        Text,
        nullable=True,
        comment="Last error message"
    )

    # Timestamps
    sent_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When email was sent"
    )
    scheduled_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Scheduled send time"
    )

    # Record reference (for logging/tracking)
    model_name = Column(
        String(100),
        nullable=True,
        comment="Source model"
    )
    res_id = Column(
        Integer,
        nullable=True,
        comment="Source record ID"
    )

    # Priority
    priority = Column(
        Integer,
        default=10,
        comment="Priority (lower = higher priority)"
    )

    # Relationships
    template = relationship("EmailTemplate")

    def __repr__(self) -> str:
        return f"<EmailQueue({self.id}: {self.email_to} - {self.status})>"

    @property
    def can_retry(self) -> bool:
        """Check if email can be retried."""
        return (
            self.status == EmailStatus.FAILED.value and
            self.retry_count < self.max_retries
        )

    def mark_sending(self) -> None:
        """Mark email as currently sending."""
        self.status = EmailStatus.SENDING.value

    def mark_sent(self) -> None:
        """Mark email as sent."""
        self.status = EmailStatus.SENT.value
        self.sent_at = datetime.utcnow()

    def mark_failed(self, error: str) -> None:
        """Mark email as failed."""
        self.status = EmailStatus.FAILED.value
        self.last_error = error
        self.retry_count += 1

    def schedule_retry(self, delay_seconds: int = 300) -> None:
        """Schedule a retry."""
        from datetime import timedelta
        self.next_retry = datetime.utcnow() + timedelta(seconds=delay_seconds)
        self.status = EmailStatus.PENDING.value

    @classmethod
    def get_pending(
        cls,
        db: Session,
        limit: int = 50,
    ) -> List["EmailQueue"]:
        """Get pending emails ready to send."""
        now = datetime.utcnow()
        return db.query(cls).filter(
            cls.status == EmailStatus.PENDING.value,
            or_(
                cls.scheduled_at.is_(None),
                cls.scheduled_at <= now
            ),
            or_(
                cls.next_retry.is_(None),
                cls.next_retry <= now
            )
        ).order_by(cls.priority, cls.created_at).limit(limit).all()

    @classmethod
    def cleanup_old(
        cls,
        db: Session,
        days: int = 30,
    ) -> int:
        """Delete old sent/cancelled emails."""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=days)
        return db.query(cls).filter(
            cls.status.in_([EmailStatus.SENT.value, EmailStatus.CANCELLED.value]),
            cls.created_at < cutoff
        ).delete(synchronize_session=False)


# Import for get_pending query
from sqlalchemy import or_


class EmailLog(Base, TimestampMixin):
    """
    Email sending log for auditing.

    Tracks all sent emails with delivery status.
    """

    __tablename__ = "email_logs"
    __table_args__ = (
        Index("ix_email_logs_record", "model_name", "res_id"),
        Index("ix_email_logs_status", "status"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # References
    queue_id = Column(
        Integer,
        nullable=True,
        comment="Original queue entry ID"
    )
    template_id = Column(
        Integer,
        nullable=True,
        comment="Template ID used"
    )

    # Email details
    email_from = Column(
        String(200),
        nullable=False,
        comment="From address"
    )
    email_to = Column(
        String(500),
        nullable=False,
        comment="To addresses"
    )
    subject = Column(
        String(500),
        nullable=False,
        comment="Email subject"
    )

    # Status
    status = Column(
        String(20),
        default="sent",
        comment="Delivery status"
    )
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if failed"
    )

    # Record reference
    model_name = Column(
        String(100),
        nullable=True,
        comment="Source model"
    )
    res_id = Column(
        Integer,
        nullable=True,
        comment="Source record ID"
    )

    # Metadata
    message_id = Column(
        String(200),
        nullable=True,
        comment="SMTP message ID"
    )

    def __repr__(self) -> str:
        return f"<EmailLog({self.id}: {self.email_to} - {self.status})>"
