"""
HRMS Settings, Stage, and Announcement Models

Configuration and workflow customization models.
"""

from datetime import date, datetime
from typing import Optional, List
import enum

from sqlalchemy import Column, Integer, String, Boolean, Text, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


class StageDefinition(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Stage Definition model.

    Custom stage definitions for various workflows (recruitment, onboarding, etc.)
    """
    __tablename__ = "hrms_stage_definitions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(50), nullable=True, index=True)
    description = Column(Text, nullable=True)

    # Scope
    model_name = Column(String(100), nullable=False, index=True)  # e.g., 'recruitment', 'onboarding'

    # Stage Configuration
    sequence = Column(Integer, default=10)
    is_initial = Column(Boolean, default=False)  # Starting stage
    is_final = Column(Boolean, default=False)    # Ending stage
    is_success = Column(Boolean, default=False)  # Success outcome
    is_failure = Column(Boolean, default=False)  # Failure outcome

    # Display
    color = Column(String(20), nullable=True)
    icon = Column(String(50), nullable=True)

    # Automation
    auto_actions = Column(JSONB, default=list)  # Actions to execute on stage entry

    def __repr__(self) -> str:
        return f"<StageDefinition(id={self.id}, name='{self.name}', model='{self.model_name}')>"


class StatusDefinition(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Status Definition model.

    Custom status definitions for records.
    """
    __tablename__ = "hrms_status_definitions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(50), nullable=True, index=True)
    description = Column(Text, nullable=True)

    # Scope
    model_name = Column(String(100), nullable=False, index=True)

    # Status Configuration
    is_default = Column(Boolean, default=False)
    is_terminal = Column(Boolean, default=False)  # No further transitions allowed
    sequence = Column(Integer, default=10)

    # Display
    color = Column(String(20), nullable=True)
    icon = Column(String(50), nullable=True)

    def __repr__(self) -> str:
        return f"<StatusDefinition(id={self.id}, name='{self.name}', model='{self.model_name}')>"


class StatusTransition(Base, TimestampMixin, AuditMixin, CompanyScopedMixin, ActiveMixin):
    """
    Status Transition model.

    Defines allowed transitions between statuses.
    """
    __tablename__ = "hrms_status_transitions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Transition
    from_status_id = Column(Integer, ForeignKey("hrms_status_definitions.id"), nullable=False, index=True)
    to_status_id = Column(Integer, ForeignKey("hrms_status_definitions.id"), nullable=False, index=True)

    # Name (for display in UI)
    name = Column(String(100), nullable=True)  # e.g., "Approve", "Reject", "Submit"

    # Access Control (JSON array of group IDs or role codes)
    allowed_groups = Column(JSONB, default=list)
    allowed_roles = Column(JSONB, default=list)

    # Conditions
    condition = Column(JSONB, nullable=True)  # Condition expression

    # Actions on Transition
    actions = Column(JSONB, default=list)  # Actions to execute

    # Relationships
    from_status = relationship("StatusDefinition", foreign_keys=[from_status_id])
    to_status = relationship("StatusDefinition", foreign_keys=[to_status_id])

    def __repr__(self) -> str:
        return f"<StatusTransition(id={self.id}, from={self.from_status_id}, to={self.to_status_id})>"


class HRMSSettings(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    HRMS Settings model.

    Key-value store for module-wide settings.
    """
    __tablename__ = "hrms_settings"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Setting
    key = Column(String(100), nullable=False, index=True)
    value = Column(Text, nullable=True)
    value_json = Column(JSONB, nullable=True)  # For complex values

    # Categorization
    module = Column(String(50), default="hrms_base", index=True)
    category = Column(String(50), nullable=True)

    # Metadata
    description = Column(Text, nullable=True)
    data_type = Column(String(20), default="string")  # string, integer, boolean, json, date

    # Display
    is_system = Column(Boolean, default=False)  # System setting (not editable in UI)
    is_secret = Column(Boolean, default=False)  # Secret value (masked in UI)

    def __repr__(self) -> str:
        return f"<HRMSSettings(id={self.id}, key='{self.key}', module='{self.module}')>"

    def get_value(self):
        """Get the value based on data type"""
        if self.data_type == "json":
            return self.value_json
        elif self.data_type == "integer":
            return int(self.value) if self.value else None
        elif self.data_type == "boolean":
            return self.value.lower() in ("true", "1", "yes") if self.value else False
        return self.value


class AnnouncementType(str, enum.Enum):
    """Announcement types"""
    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
    URGENT = "urgent"


class AnnouncementTarget(str, enum.Enum):
    """Announcement target audience"""
    ALL = "all"
    DEPARTMENT = "department"
    ROLE = "role"
    SPECIFIC = "specific"


class Announcement(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Announcement model.

    Company-wide announcements with targeting and tracking.
    """
    __tablename__ = "hrms_announcements"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Content
    title = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    summary = Column(String(500), nullable=True)  # Short summary for previews

    # Type and Priority
    announcement_type = Column(SQLEnum(AnnouncementType), default=AnnouncementType.INFO)
    is_pinned = Column(Boolean, default=False)  # Show at top

    # Targeting
    target = Column(SQLEnum(AnnouncementTarget), default=AnnouncementTarget.ALL)
    target_ids = Column(JSONB, default=list)  # Department IDs, Role IDs, or User IDs

    # Visibility Period
    publish_date = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    expire_date = Column(DateTime(timezone=True), nullable=True)

    # Acknowledgment
    requires_acknowledgment = Column(Boolean, default=False)

    # Author
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Relationships
    author = relationship("User", foreign_keys=[author_id])
    views = relationship("AnnouncementView", back_populates="announcement", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Announcement(id={self.id}, title='{self.title}')>"

    def is_published(self) -> bool:
        """Check if announcement is currently published"""
        now = datetime.utcnow()
        if self.publish_date and now < self.publish_date:
            return False
        if self.expire_date and now > self.expire_date:
            return False
        return self.is_active

    def is_visible_to_user(self, user_id: int, department_id: Optional[int] = None, role_ids: Optional[List[int]] = None) -> bool:
        """Check if announcement is visible to a specific user"""
        if not self.is_published():
            return False

        if self.target == AnnouncementTarget.ALL:
            return True
        elif self.target == AnnouncementTarget.DEPARTMENT:
            return department_id in (self.target_ids or [])
        elif self.target == AnnouncementTarget.ROLE:
            return any(r in (self.target_ids or []) for r in (role_ids or []))
        elif self.target == AnnouncementTarget.SPECIFIC:
            return user_id in (self.target_ids or [])

        return False


class AnnouncementView(Base, TimestampMixin, CompanyScopedMixin):
    """
    Announcement View model.

    Tracks which users have viewed/acknowledged announcements.
    """
    __tablename__ = "hrms_announcement_views"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    announcement_id = Column(Integer, ForeignKey("hrms_announcements.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Tracking
    viewed_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    announcement = relationship("Announcement", back_populates="views")
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self) -> str:
        return f"<AnnouncementView(id={self.id}, announcement={self.announcement_id}, user={self.user_id})>"

    def acknowledge(self) -> None:
        """Mark as acknowledged"""
        self.acknowledged_at = datetime.utcnow()


class MailTemplate(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Mail Template model.

    Email templates for various HRMS triggers.
    """
    __tablename__ = "hrms_mail_templates"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Template Identity
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)  # Unique identifier for programmatic use

    # Email Content
    subject = Column(String(255), nullable=False)
    body_html = Column(Text, nullable=True)
    body_text = Column(Text, nullable=True)  # Plain text fallback

    # Trigger
    model_name = Column(String(100), nullable=True, index=True)  # Associated model
    trigger_event = Column(String(50), nullable=True)  # create, update, status_change, etc.

    # Recipients Configuration
    # JSON: {"to": ["${record.email}"], "cc": ["hr@company.com"], "bcc": []}
    recipients_config = Column(JSONB, default=dict)

    # Placeholders/Variables (for documentation)
    available_variables = Column(JSONB, default=list)

    def __repr__(self) -> str:
        return f"<MailTemplate(id={self.id}, name='{self.name}', code='{self.code}')>"

    def render_subject(self, context: dict) -> str:
        """Render subject with context variables"""
        result = self.subject
        for key, value in context.items():
            result = result.replace(f"${{{key}}}", str(value))
        return result

    def render_body(self, context: dict, html: bool = True) -> str:
        """Render body with context variables"""
        body = self.body_html if html and self.body_html else self.body_text
        if not body:
            return ""
        result = body
        for key, value in context.items():
            result = result.replace(f"${{{key}}}", str(value))
        return result
