"""
CRM Activity Model

Activities (calls, meetings, tasks, emails, notes) for CRM records.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Text, DateTime, Date, ForeignKey,
    Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, CompanyScopedMixin


class ActivityType(str, enum.Enum):
    """Activity type classification."""
    CALL = "call"
    MEETING = "meeting"
    TASK = "task"
    EMAIL = "email"
    NOTE = "note"
    DEMO = "demo"
    FOLLOW_UP = "follow_up"
    OTHER = "other"


class ActivityStatus(str, enum.Enum):
    """Activity status."""
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"


class ActivityPriority(str, enum.Enum):
    """Activity priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class CRMActivity(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    CRM Activity model.

    Polymorphic activity log for leads, opportunities, contacts, accounts.
    """
    __tablename__ = "crm_activities"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Activity Type
    activity_type = Column(SQLEnum(ActivityType), default=ActivityType.TASK, index=True)

    # Subject & Description
    subject = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Scheduling
    date_start = Column(DateTime(timezone=True), nullable=True, index=True)
    date_end = Column(DateTime(timezone=True), nullable=True)
    duration = Column(Integer, default=0)  # Duration in minutes
    is_all_day = Column(Boolean, default=False)

    # Due Date (for tasks)
    date_due = Column(Date, nullable=True, index=True)

    # Status & Priority
    status = Column(SQLEnum(ActivityStatus), default=ActivityStatus.PLANNED, index=True)
    priority = Column(SQLEnum(ActivityPriority), default=ActivityPriority.NORMAL)

    # Assignment
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Polymorphic relation (can relate to lead, opportunity, contact, account)
    res_model = Column(String(50), nullable=False, index=True)  # 'lead', 'opportunity', 'contact', 'account'
    res_id = Column(Integer, nullable=False, index=True)

    # For calls
    call_direction = Column(String(20), nullable=True)  # inbound, outbound
    call_duration = Column(Integer, nullable=True)  # seconds
    call_result = Column(String(100), nullable=True)  # answered, voicemail, no_answer, busy

    # For meetings
    location = Column(String(255), nullable=True)
    meeting_url = Column(String(500), nullable=True)  # Video call link

    # For emails
    email_from = Column(String(255), nullable=True)
    email_to = Column(Text, nullable=True)  # Can be multiple recipients
    email_cc = Column(Text, nullable=True)
    email_message_id = Column(String(255), nullable=True)

    # Reminder
    reminder_minutes = Column(Integer, default=0)  # Minutes before to remind
    reminder_sent = Column(Boolean, default=False)

    # Recurrence (for recurring activities)
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(String(255), nullable=True)  # RRULE format
    parent_activity_id = Column(Integer, ForeignKey("crm_activities.id"), nullable=True)

    # Completion
    date_completed = Column(DateTime(timezone=True), nullable=True)
    completed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Outcome/Notes
    outcome = Column(Text, nullable=True)

    # Custom Fields
    custom_fields = Column(JSONB, default=dict)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    completed_by = relationship("User", foreign_keys=[completed_by_id])
    parent_activity = relationship("CRMActivity", remote_side=[id], backref="child_activities")

    def __repr__(self) -> str:
        return f"<CRMActivity(id={self.id}, type='{self.activity_type}', subject='{self.subject}')>"

    @property
    def is_overdue(self) -> bool:
        """Check if activity is overdue."""
        if self.status in [ActivityStatus.COMPLETED, ActivityStatus.CANCELLED]:
            return False
        if self.date_due and self.date_due < datetime.now().date():
            return True
        if self.date_start and self.date_start < datetime.now():
            return True
        return False

    def mark_complete(self, user_id: int, outcome: str = None) -> None:
        """Mark activity as completed."""
        self.status = ActivityStatus.COMPLETED
        self.date_completed = datetime.utcnow()
        self.completed_by_id = user_id
        if outcome:
            self.outcome = outcome

    def mark_cancelled(self) -> None:
        """Mark activity as cancelled."""
        self.status = ActivityStatus.CANCELLED
