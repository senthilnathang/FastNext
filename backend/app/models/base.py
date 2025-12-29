"""Base model classes and mixins for FastVue framework

This module provides reusable mixins and base models inspired by FastNext and HRMS patterns.
Available mixins:
- TimestampMixin: Automatic created_at/updated_at tracking
- SoftDeleteMixin: Soft delete with restore capability
- AuditMixin: Track created_by/updated_by users
- MetadataMixin: Flexible JSON metadata and tags
- ActiveMixin: Active/inactive status management
- CompanyScopedMixin: Multi-tenant company scoping
- VersionMixin: Optimistic locking with version tracking
- ActivityMixin: Activity logging integration
- MailThreadMixin: Message/notification threading
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, TYPE_CHECKING
import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, event
from sqlalchemy.orm import declared_attr, relationship
from sqlalchemy.sql import func

from app.db.base import Base

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class TimestampMixin:
    """Mixin for adding timestamp columns to models"""

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )


class SoftDeleteMixin:
    """Mixin for soft delete functionality"""

    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(Integer, nullable=True)

    def soft_delete(self, user_id: Optional[int] = None):
        """Mark record as deleted"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        if user_id:
            self.deleted_by = user_id

    def restore(self):
        """Restore soft-deleted record"""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None


class AuditMixin:
    """Mixin for tracking who created/updated records"""

    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    @declared_attr
    def creator(cls):
        from sqlalchemy.orm import relationship
        return relationship(
            "User",
            primaryjoin=f"{cls.__name__}.created_by==User.id",
            foreign_keys=f"[{cls.__name__}.created_by]",
            viewonly=True,
            lazy="select",
        )

    @declared_attr
    def updater(cls):
        from sqlalchemy.orm import relationship
        return relationship(
            "User",
            primaryjoin=f"{cls.__name__}.updated_by==User.id",
            foreign_keys=f"[{cls.__name__}.updated_by]",
            viewonly=True,
            lazy="select",
        )


class MetadataMixin:
    """Mixin for adding flexible metadata fields"""

    metadata_json = Column(JSON, default=dict, nullable=False)
    tags = Column(JSON, default=list, nullable=False)

    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Get a metadata value by key"""
        return (self.metadata_json or {}).get(key, default)

    def set_metadata(self, key: str, value: Any) -> None:
        """Set a metadata value"""
        if self.metadata_json is None:
            self.metadata_json = {}
        self.metadata_json[key] = value

    def add_tag(self, tag: str) -> None:
        """Add a tag if not already present"""
        if self.tags is None:
            self.tags = []
        if tag not in self.tags:
            self.tags.append(tag)

    def remove_tag(self, tag: str) -> None:
        """Remove a tag if present"""
        if self.tags and tag in self.tags:
            self.tags.remove(tag)

    def has_tag(self, tag: str) -> bool:
        """Check if tag exists"""
        return tag in (self.tags or [])


class ActiveMixin:
    """Mixin for active/inactive status management"""

    is_active = Column(Boolean, default=True, nullable=False, index=True)
    deactivated_at = Column(DateTime(timezone=True), nullable=True)
    deactivated_by = Column(Integer, nullable=True)
    deactivation_reason = Column(String(500), nullable=True)

    def activate(self) -> None:
        """Activate the record"""
        self.is_active = True
        self.deactivated_at = None
        self.deactivated_by = None
        self.deactivation_reason = None

    def deactivate(self, user_id: Optional[int] = None, reason: Optional[str] = None) -> None:
        """Deactivate the record with optional reason"""
        self.is_active = False
        self.deactivated_at = datetime.utcnow()
        if user_id:
            self.deactivated_by = user_id
        if reason:
            self.deactivation_reason = reason


class CompanyScopedMixin:
    """Mixin for multi-tenant company scoping"""

    @declared_attr
    def company_id(cls):
        return Column(
            Integer,
            ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )

    @declared_attr
    def company(cls):
        return relationship(
            "Company",
            primaryjoin=f"{cls.__name__}.company_id==Company.id",
            foreign_keys=f"[{cls.__name__}.company_id]",
            viewonly=True,
            lazy="select",
        )

    @classmethod
    def for_company(cls, query, company_id: int):
        """Filter query by company"""
        return query.filter(cls.company_id == company_id)


class VersionMixin:
    """Mixin for optimistic locking with version tracking"""

    version = Column(Integer, default=1, nullable=False)

    def increment_version(self) -> None:
        """Increment version number for optimistic locking"""
        self.version = (self.version or 0) + 1


class ActivityAction(str, enum.Enum):
    """Types of activity actions for logging"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    SHARE = "share"
    EXPORT = "export"
    IMPORT = "import"
    APPROVE = "approve"
    REJECT = "reject"
    SUBMIT = "submit"
    ARCHIVE = "archive"
    RESTORE = "restore"
    COMMENT = "comment"
    ASSIGN = "assign"
    UNASSIGN = "unassign"


class ActivityMixin:
    """
    Mixin for activity logging integration.
    Provides methods to log activities on model instances.
    """

    def log_activity(
        self,
        db: "Session",
        action: ActivityAction,
        user_id: Optional[int] = None,
        description: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log an activity for this model instance.
        Creates an entry in the activity_logs table.
        """
        from app.models.activity_log import ActivityLog

        ActivityLog.log(
            db=db,
            action=action.value,
            entity_type=self.__class__.__tablename__,
            entity_id=getattr(self, 'id', None),
            entity_name=getattr(self, 'name', None) or str(self),
            user_id=user_id,
            company_id=getattr(self, 'company_id', None),
            description=description,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data,
        )

    @classmethod
    def get_activities(
        cls,
        db: "Session",
        entity_id: int,
        limit: int = 50,
        action: Optional[str] = None,
    ):
        """Get activities for a specific entity"""
        from app.models.activity_log import ActivityLog

        query = db.query(ActivityLog).filter(
            ActivityLog.entity_type == cls.__tablename__,
            ActivityLog.entity_id == entity_id,
        )
        if action:
            query = query.filter(ActivityLog.action == action)
        return query.order_by(ActivityLog.created_at.desc()).limit(limit).all()


class MessageLevel(str, enum.Enum):
    """Message notification levels"""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    DEBUG = "debug"


class MailThreadMixin:
    """
    Mixin for message/notification threading.
    Allows models to have associated messages and notifications.
    Inspired by mail.thread pattern in ERP systems.
    """

    # Store message thread IDs as JSON array
    message_ids = Column(JSON, default=list, nullable=False)

    # Track followers (users who receive notifications)
    follower_ids = Column(JSON, default=list, nullable=False)

    def post_message(
        self,
        db: "Session",
        user_id: int,
        body: str,
        subject: Optional[str] = None,
        message_type: str = "comment",
        level: MessageLevel = MessageLevel.INFO,
        notify_followers: bool = True,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> int:
        """
        Post a message to this record's thread.
        Returns the message ID.
        """
        from app.models.message import Message

        message = Message.create(
            db=db,
            model_name=self.__class__.__tablename__,
            record_id=getattr(self, 'id', None),
            user_id=user_id,
            subject=subject,
            body=body,
            message_type=message_type,
            level=level.value,
            extra_data=extra_data,
        )

        # Add message to thread
        if self.message_ids is None:
            self.message_ids = []
        self.message_ids.append(message.id)

        # Notify followers if requested
        if notify_followers:
            self._notify_followers(db, message, user_id)

        return message.id

    def add_follower(self, user_id: int) -> None:
        """Add a user as a follower"""
        if self.follower_ids is None:
            self.follower_ids = []
        if user_id not in self.follower_ids:
            self.follower_ids.append(user_id)

    def remove_follower(self, user_id: int) -> None:
        """Remove a user from followers"""
        if self.follower_ids and user_id in self.follower_ids:
            self.follower_ids.remove(user_id)

    def get_followers(self) -> List[int]:
        """Get list of follower user IDs"""
        return self.follower_ids or []

    def get_messages(self, db: "Session", limit: int = 50):
        """Get messages for this record"""
        from app.models.message import Message

        return db.query(Message).filter(
            Message.model_name == self.__class__.__tablename__,
            Message.record_id == getattr(self, 'id', None),
        ).order_by(Message.created_at.desc()).limit(limit).all()

    def _notify_followers(self, db: "Session", message, author_id: int) -> None:
        """Send notifications to all followers except the author"""
        from app.models.notification import Notification, NotificationLevel

        for follower_id in self.get_followers():
            if follower_id != author_id:
                Notification.create(
                    db=db,
                    user_id=follower_id,
                    title=f"New message on {self.__class__.__name__}",
                    description=message.body[:200],
                    level=NotificationLevel.INFO,
                    link=f"/{self.__class__.__tablename__}/{getattr(self, 'id', '')}",
                    data={
                        "message_id": message.id,
                        "model": self.__class__.__tablename__,
                        "record_id": getattr(self, 'id', None),
                    },
                )


class URLMixin:
    """
    Mixin for generating URLs for model instances.
    Useful for API responses and frontend links.
    """

    @property
    def detail_url(self) -> str:
        """Generate detail view URL"""
        return f"/api/v1/{self.__class__.__tablename__}/{getattr(self, 'id', '')}"

    @property
    def edit_url(self) -> str:
        """Generate edit URL"""
        return f"/{self.__class__.__tablename__}/{getattr(self, 'id', '')}/edit"

    @property
    def delete_url(self) -> str:
        """Generate delete URL"""
        return f"/api/v1/{self.__class__.__tablename__}/{getattr(self, 'id', '')}"


class BaseModel(Base, TimestampMixin):
    """Base model with ID and timestamps"""

    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)


class AuditableModel(BaseModel, AuditMixin):
    """Base model with audit tracking (created_by, updated_by)"""

    __abstract__ = True


class SoftDeletableModel(BaseModel, SoftDeleteMixin):
    """Base model with soft delete capability"""

    __abstract__ = True


class FullFeaturedModel(BaseModel, AuditMixin, SoftDeleteMixin, MetadataMixin):
    """Full-featured base model with all mixins"""

    __abstract__ = True


class ActiveModel(BaseModel, ActiveMixin):
    """Base model with active status management"""

    __abstract__ = True


class CompanyScopedModel(BaseModel, CompanyScopedMixin):
    """Base model with company scoping for multi-tenant apps"""

    __abstract__ = True


class ActivityModel(BaseModel, ActivityMixin):
    """Base model with activity logging integration"""

    __abstract__ = True


class MailThreadModel(BaseModel, MailThreadMixin):
    """Base model with message threading capability"""

    __abstract__ = True


class FullAuditModel(BaseModel, AuditMixin, SoftDeleteMixin, MetadataMixin, ActivityMixin, VersionMixin):
    """
    Comprehensive audit model with:
    - Timestamps (created_at, updated_at)
    - Audit tracking (created_by, updated_by)
    - Soft delete capability
    - Flexible metadata and tags
    - Activity logging integration
    - Version tracking for optimistic locking
    """

    __abstract__ = True


class EnterpriseModel(
    BaseModel,
    AuditMixin,
    SoftDeleteMixin,
    MetadataMixin,
    ActiveMixin,
    ActivityMixin,
    MailThreadMixin,
    VersionMixin,
    URLMixin,
):
    """
    Enterprise-grade model with all features:
    - Timestamps and audit tracking
    - Soft delete with restore
    - Flexible metadata and tags
    - Active/inactive status
    - Activity logging
    - Message threading
    - Version control
    - URL generation

    Use this for complex business entities that need full tracking.
    """

    __abstract__ = True

    # Fields to exclude from change tracking
    _tracking_exclude_fields = {
        'id', 'created_at', 'updated_at', 'created_by', 'updated_by',
        'version', 'message_ids', 'follower_ids', 'metadata_json',
        'hashed_password', 'two_factor_secret', 'backup_codes',
    }

    # Human-readable field labels (override in subclass)
    _field_labels: Dict[str, str] = {}

    def get_tracking_fields(self) -> set:
        """Get fields that should be tracked for changes"""
        from sqlalchemy import inspect
        mapper = inspect(self.__class__)
        all_fields = {c.key for c in mapper.columns}
        return all_fields - self._tracking_exclude_fields

    def get_field_label(self, field_name: str) -> str:
        """Get human-readable label for a field"""
        if field_name in self._field_labels:
            return self._field_labels[field_name]
        # Convert snake_case to Title Case
        return field_name.replace('_', ' ').title()

    def get_display_name(self) -> str:
        """Get display name for this record"""
        for attr in ['name', 'title', 'full_name', 'username', 'email', 'code']:
            if hasattr(self, attr) and getattr(self, attr):
                return str(getattr(self, attr))
        return f"{self.__class__.__name__} #{getattr(self, 'id', 'new')}"


# =============================================================================
# AUTOMATIC ACTIVITY TRACKING WITH SQLALCHEMY EVENTS
# =============================================================================

def _get_model_changes(instance) -> tuple:
    """
    Get changes made to a model instance.
    Returns (old_values, new_values, changed_fields)
    """
    from sqlalchemy import inspect
    from sqlalchemy.orm.attributes import get_history

    old_values = {}
    new_values = {}
    changed_fields = []

    # Get fields to track
    if hasattr(instance, 'get_tracking_fields'):
        tracking_fields = instance.get_tracking_fields()
    else:
        mapper = inspect(instance.__class__)
        tracking_fields = {c.key for c in mapper.columns}

    for field in tracking_fields:
        if not hasattr(instance, field):
            continue

        history = get_history(instance, field)

        if history.has_changes():
            old_val = history.deleted[0] if history.deleted else None
            new_val = history.added[0] if history.added else getattr(instance, field, None)

            # Skip if both are None or empty
            if old_val is None and new_val is None:
                continue

            # Convert values to serializable format
            if hasattr(old_val, 'isoformat'):
                old_val = old_val.isoformat()
            if hasattr(new_val, 'isoformat'):
                new_val = new_val.isoformat()

            old_values[field] = old_val
            new_values[field] = new_val
            changed_fields.append(field)

    return old_values, new_values, changed_fields


def _format_change_description(instance, old_values: dict, new_values: dict, changed_fields: list) -> str:
    """Format a human-readable description of changes"""
    if not changed_fields:
        return ""

    changes = []
    for field in changed_fields[:5]:  # Limit to first 5 fields
        label = instance.get_field_label(field) if hasattr(instance, 'get_field_label') else field.replace('_', ' ').title()
        old_val = old_values.get(field, '')
        new_val = new_values.get(field, '')

        # Truncate long values
        old_str = str(old_val)[:50] if old_val else '(empty)'
        new_str = str(new_val)[:50] if new_val else '(empty)'

        changes.append(f"{label}: {old_str} → {new_str}")

    desc = "; ".join(changes)
    if len(changed_fields) > 5:
        desc += f" (+{len(changed_fields) - 5} more fields)"

    return desc


def _log_activity(session, instance, action: str, old_values: dict = None, new_values: dict = None, changed_fields: list = None):
    """Log an activity for a model instance"""
    from app.core.context import get_request_context
    from app.models.activity_log import ActivityLog, ActivityCategory, ActivityLevel

    # Get request context
    ctx = get_request_context()
    user_id = ctx.user_id if ctx else None
    company_id = ctx.company_id if ctx else getattr(instance, 'company_id', None)
    ip_address = ctx.ip_address if ctx else None

    # Get entity name
    entity_name = instance.get_display_name() if hasattr(instance, 'get_display_name') else str(instance)

    # Format description
    if action == 'create':
        description = f"Created {instance.__class__.__name__}: {entity_name}"
    elif action == 'update':
        description = _format_change_description(instance, old_values or {}, new_values or {}, changed_fields or [])
        if not description:
            return  # No actual changes to log
        description = f"Updated {instance.__class__.__name__}: {description}"
    elif action == 'delete':
        description = f"Deleted {instance.__class__.__name__}: {entity_name}"
    else:
        description = f"{action.title()} {instance.__class__.__name__}: {entity_name}"

    # Create activity log (auto_flush=False to avoid "Session is already flushing" error)
    ActivityLog.log(
        db=session,
        action=action,
        entity_type=instance.__tablename__,
        entity_id=getattr(instance, 'id', None),
        entity_name=entity_name[:255] if entity_name else None,
        user_id=user_id,
        company_id=company_id,
        category=ActivityCategory.DATA_MANAGEMENT,
        level=ActivityLevel.INFO,
        old_values=old_values,
        new_values=new_values,
        changed_fields=changed_fields,
        description=description[:500] if description else None,
        ip_address=ip_address,
        auto_flush=False,
    )


def _post_system_message(session, instance, action: str, old_values: dict = None, new_values: dict = None, changed_fields: list = None):
    """Post a system message to the record's thread"""
    from app.core.context import get_request_context
    from app.models.message import Message, MessageType, MessageLevel

    if not hasattr(instance, 'message_ids'):
        return

    ctx = get_request_context()
    user_id = ctx.user_id if ctx else None

    # Format message body
    if action == 'create':
        body = f"Record created"
    elif action == 'update' and changed_fields:
        changes = []
        for field in changed_fields[:10]:
            label = instance.get_field_label(field) if hasattr(instance, 'get_field_label') else field.replace('_', ' ').title()
            old_val = str(old_values.get(field, ''))[:100] or '(empty)'
            new_val = str(new_values.get(field, ''))[:100] or '(empty)'
            changes.append(f"• {label}: {old_val} → {new_val}")
        body = "Fields updated:\n" + "\n".join(changes)
        if len(changed_fields) > 10:
            body += f"\n... and {len(changed_fields) - 10} more fields"
    elif action == 'delete':
        body = "Record deleted"
    else:
        return

    # Determine message type based on action
    if action == 'create':
        msg_type = MessageType.LOG
    elif action == 'update':
        msg_type = MessageType.LOG
    elif action == 'delete':
        msg_type = MessageType.SYSTEM
    else:
        msg_type = MessageType.LOG

    try:
        Message.create(
            db=session,
            model_name=instance.__tablename__,
            record_id=getattr(instance, 'id', None),
            user_id=user_id,
            body=body,
            message_type=msg_type.value if hasattr(msg_type, 'value') else str(msg_type),
            level=MessageLevel.INFO.value if hasattr(MessageLevel.INFO, 'value') else 'info',
            is_internal=True,
            auto_flush=False,  # Avoid "Session is already flushing" error
        )
    except Exception as e:
        # Don't fail the main operation if message creation fails
        import logging
        logging.getLogger(__name__).warning(f"Failed to post system message: {e}")


# Store original values before flush for update tracking
_pending_changes = {}


def setup_activity_tracking(Session):
    """
    Setup SQLAlchemy event listeners for automatic activity tracking.
    Call this function after creating your Session class.

    Usage:
        from app.models.base import setup_activity_tracking
        setup_activity_tracking(SessionLocal)
    """
    from sqlalchemy import event as sa_event

    @sa_event.listens_for(Session, 'before_flush')
    def before_flush_handler(session, flush_context, instances):
        """Capture original values before flush for update tracking"""
        for instance in session.dirty:
            if isinstance(instance, (ActivityMixin, MailThreadMixin)):
                # Store the changes before they're committed
                old_values, new_values, changed_fields = _get_model_changes(instance)
                if changed_fields:
                    key = (instance.__class__.__name__, id(instance))
                    _pending_changes[key] = (old_values, new_values, changed_fields)

    @sa_event.listens_for(Session, 'after_flush')
    def after_flush_handler(session, flush_context):
        """Log activities after successful flush"""
        global _pending_changes

        # Process new records (inserts)
        for instance in session.new:
            if isinstance(instance, (ActivityMixin,)):
                try:
                    _log_activity(session, instance, 'create')
                    if isinstance(instance, MailThreadMixin):
                        _post_system_message(session, instance, 'create')
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to log create activity: {e}")

        # Process updated records
        for instance in session.dirty:
            if isinstance(instance, (ActivityMixin,)):
                key = (instance.__class__.__name__, id(instance))
                if key in _pending_changes:
                    old_values, new_values, changed_fields = _pending_changes.pop(key)
                    try:
                        _log_activity(session, instance, 'update', old_values, new_values, changed_fields)
                        if isinstance(instance, MailThreadMixin):
                            _post_system_message(session, instance, 'update', old_values, new_values, changed_fields)
                    except Exception as e:
                        import logging
                        logging.getLogger(__name__).warning(f"Failed to log update activity: {e}")

        # Process deleted records
        for instance in session.deleted:
            if isinstance(instance, (ActivityMixin,)):
                try:
                    _log_activity(session, instance, 'delete')
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to log delete activity: {e}")

        # Clear any remaining pending changes
        _pending_changes.clear()
