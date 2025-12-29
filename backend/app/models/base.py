"""Base model classes and mixins for FastNext framework

This module provides reusable mixins and base models inspired by FastBackend and enterprise patterns.
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
- AuditTrailMixin: Audit trail creation
- URLMixin: URL generation helpers
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, TYPE_CHECKING
import enum
import json

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import declared_attr, relationship, Session
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
    """Mixin for soft delete functionality with restore capability"""

    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(Integer, nullable=True)

    def soft_delete(self, user_id: Optional[int] = None) -> None:
        """Mark record as deleted"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        if user_id:
            self.deleted_by = user_id

    def restore(self) -> None:
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
        return relationship(
            "User",
            primaryjoin=f"{cls.__name__}.created_by==User.id",
            foreign_keys=f"[{cls.__name__}.created_by]",
            viewonly=True,
            lazy="select",
        )

    @declared_attr
    def updater(cls):
        return relationship(
            "User",
            primaryjoin=f"{cls.__name__}.updated_by==User.id",
            foreign_keys=f"[{cls.__name__}.updated_by]",
            viewonly=True,
            lazy="select",
        )

    # Aliases for backward compatibility
    @declared_attr
    def created_by_user(cls):
        return relationship(
            "User",
            primaryjoin=f"{cls.__name__}.created_by==User.id",
            foreign_keys=f"[{cls.__name__}.created_by]",
            viewonly=True,
            lazy="select",
            overlaps="creator",
        )

    @declared_attr
    def updated_by_user(cls):
        return relationship(
            "User",
            primaryjoin=f"{cls.__name__}.updated_by==User.id",
            foreign_keys=f"[{cls.__name__}.updated_by]",
            viewonly=True,
            lazy="select",
            overlaps="updater",
        )


class MetadataMixin:
    """Mixin for adding flexible metadata fields with helper methods"""

    metadata_json = Column(JSON, default=dict, nullable=False)
    tags = Column(JSON, default=list, nullable=False)
    version = Column(String(20), default="1.0.0", nullable=False)

    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Get a metadata value by key"""
        return (self.metadata_json or {}).get(key, default)

    def set_metadata(self, key: str, value: Any) -> None:
        """Set a metadata value"""
        if self.metadata_json is None:
            self.metadata_json = {}
        self.metadata_json[key] = value

    def update_metadata(self, data: Dict[str, Any]) -> None:
        """Update multiple metadata values"""
        if self.metadata_json is None:
            self.metadata_json = {}
        self.metadata_json.update(data)

    def remove_metadata(self, key: str) -> None:
        """Remove a metadata key"""
        if self.metadata_json and key in self.metadata_json:
            del self.metadata_json[key]

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

    def get_tags(self) -> List[str]:
        """Get all tags"""
        return self.tags or []

    def set_tags(self, tags: List[str]) -> None:
        """Set all tags"""
        self.tags = tags or []


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

    record_version = Column(Integer, default=1, nullable=False)

    def increment_version(self) -> None:
        """Increment version number for optimistic locking"""
        self.record_version = (self.record_version or 0) + 1


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
        **kwargs
    ) -> None:
        """
        Log an activity for this model instance.
        Creates an entry in the activity_logs table.
        """
        from app.utils.activity_logger import log_activity
        from app.models.activity_log import ActivityAction as LogAction, ActivityLevel, EventCategory

        action_map = {
            ActivityAction.CREATE: LogAction.CREATE,
            ActivityAction.UPDATE: LogAction.UPDATE,
            ActivityAction.DELETE: LogAction.DELETE,
            ActivityAction.READ: LogAction.READ,
        }

        log_action = action_map.get(action, LogAction.UPDATE)

        return log_activity(
            db=db,
            user_id=user_id or getattr(self, 'updated_by', None) or getattr(self, 'created_by', None),
            action=log_action,
            entity_type=self.__class__.__name__.lower(),
            entity_id=getattr(self, 'id', None),
            entity_name=getattr(self, 'name', None) or str(getattr(self, 'id', None)),
            description=description or f"{action.value.title()} {self.__class__.__name__}",
            category=EventCategory.DATA_MANAGEMENT,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            **kwargs
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
        from app.models.notification import Notification, NotificationType

        # Create a notification-based message
        notification = Notification(
            user_id=user_id,
            title=subject or f"Message on {self.__class__.__name__}",
            message=body,
            type=NotificationType.INFO,
            channels=json.dumps(["in_app"]),
            data=json.dumps({
                "entity_type": self.__class__.__name__.lower(),
                "entity_id": getattr(self, "id", None),
                "message_type": message_type,
                "level": level.value,
                **(extra_data or {}),
            }),
        )
        db.add(notification)
        db.flush()

        # Add message to thread
        if self.message_ids is None:
            self.message_ids = []
        self.message_ids.append(notification.id)

        # Notify followers if requested
        if notify_followers:
            self._notify_followers(db, notification, user_id)

        return notification.id

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
        from app.models.notification import Notification

        if not self.message_ids:
            return []

        return db.query(Notification).filter(
            Notification.id.in_(self.message_ids)
        ).order_by(Notification.created_at.desc()).limit(limit).all()

    def _notify_followers(self, db: "Session", message, author_id: int) -> None:
        """Send notifications to all followers except the author"""
        from app.models.notification import Notification, NotificationType

        for follower_id in self.get_followers():
            if follower_id != author_id:
                notification = Notification(
                    user_id=follower_id,
                    title=f"New message on {self.__class__.__name__}",
                    message=message.message[:200] if message.message else "",
                    type=NotificationType.INFO,
                    channels=json.dumps(["in_app"]),
                    action_url=f"/{self.__class__.__tablename__}/{getattr(self, 'id', '')}",
                    data=json.dumps({
                        "message_id": message.id,
                        "model": self.__class__.__tablename__,
                        "record_id": getattr(self, "id", None),
                    }),
                )
                db.add(notification)


class MessageMixin:
    """Mixin for automatic message/notification creation (legacy compatibility)"""

    def send_message(
        self,
        db: Session,
        recipient_ids: List[int],
        message_type: str = "info",
        channels: List[str] = None,
        title: str = None,
        message: str = None,
        **kwargs
    ):
        """Send message/notification about this instance"""
        from app.models.notification import Notification, NotificationType

        channels = channels or ["in_app"]
        title = title or f"Update on {self.__class__.__name__}"
        message = message or f"There was an update to {getattr(self, 'name', 'this item')}"

        notifications = []
        for recipient_id in recipient_ids:
            notification = Notification(
                user_id=recipient_id,
                title=title,
                message=message,
                type=getattr(NotificationType, message_type.upper(), NotificationType.INFO),
                channels=json.dumps(channels),
                data=json.dumps({
                    "entity_type": self.__class__.__name__.lower(),
                    "entity_id": getattr(self, "id", None),
                    "entity_name": getattr(self, "name", None),
                    **kwargs,
                }),
            )
            notifications.append(notification)
            db.add(notification)

        db.commit()
        return notifications


class AuditTrailMixin:
    """Mixin for automatic audit trail creation"""

    def create_audit_entry(
        self,
        db: Session,
        operation: str,
        old_values: dict = None,
        new_values: dict = None,
        changed_fields: List[str] = None,
        user_id: int = None,
        reason: str = None,
        **kwargs
    ):
        """Create audit trail entry for this instance"""
        from app.models.audit_trail import AuditTrail

        audit_entry = AuditTrail(
            user_id=user_id or getattr(self, "updated_by", None) or getattr(self, "created_by", None),
            entity_type=self.__class__.__name__.lower(),
            entity_id=getattr(self, "id", None),
            entity_name=getattr(self, "name", None) or str(getattr(self, "id", None)),
            operation=operation.upper(),
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            changed_fields=json.dumps(changed_fields) if changed_fields else None,
            reason=reason,
            extra_data=json.dumps(kwargs) if kwargs else None,
        )

        db.add(audit_entry)
        db.commit()
        return audit_entry


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


class FullActivityMixin(ActivityMixin, MessageMixin, AuditTrailMixin):
    """Complete mixin combining all activity, message, and audit functionality"""
    pass


# =============================================================================
# BASE MODEL CLASSES
# =============================================================================

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


class FullAuditModel(BaseModel, AuditMixin, SoftDeleteMixin, MetadataMixin):
    """Full-featured base model with audit, soft delete, and metadata"""

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


class AuditableActivityModel(BaseModel, AuditMixin, FullActivityMixin):
    """Base model with audit and full activity capabilities"""

    __abstract__ = True


class FullFeaturedModel(BaseModel, AuditMixin, SoftDeleteMixin, MetadataMixin, FullActivityMixin):
    """Full-featured base model with all capabilities"""

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
        "id", "created_at", "updated_at", "created_by", "updated_by",
        "record_version", "message_ids", "follower_ids", "metadata_json",
        "hashed_password", "two_factor_secret", "backup_codes",
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
        return field_name.replace("_", " ").title()

    def get_display_name(self) -> str:
        """Get display name for this record"""
        for attr in ["name", "title", "full_name", "username", "email", "code"]:
            if hasattr(self, attr) and getattr(self, attr):
                return str(getattr(self, attr))
        return f"{self.__class__.__name__} #{getattr(self, 'id', 'new')}"


class CompanyScopedEnterpriseModel(EnterpriseModel, CompanyScopedMixin):
    """
    Enterprise model with company scoping for multi-tenant applications.
    Includes all EnterpriseModel features plus company isolation.
    """

    __abstract__ = True


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
    if hasattr(instance, "get_tracking_fields"):
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
            if hasattr(old_val, "isoformat"):
                old_val = old_val.isoformat()
            if hasattr(new_val, "isoformat"):
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
        label = instance.get_field_label(field) if hasattr(instance, "get_field_label") else field.replace("_", " ").title()
        old_val = old_values.get(field, "")
        new_val = new_values.get(field, "")

        # Truncate long values
        old_str = str(old_val)[:50] if old_val else "(empty)"
        new_str = str(new_val)[:50] if new_val else "(empty)"

        changes.append(f"{label}: {old_str} -> {new_str}")

    desc = "; ".join(changes)
    if len(changed_fields) > 5:
        desc += f" (+{len(changed_fields) - 5} more fields)"

    return desc


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

    @sa_event.listens_for(Session, "before_flush")
    def before_flush_handler(session, flush_context, instances):
        """Capture original values before flush for update tracking"""
        for instance in session.dirty:
            if isinstance(instance, (ActivityMixin, MailThreadMixin)):
                # Store the changes before they're committed
                old_values, new_values, changed_fields = _get_model_changes(instance)
                if changed_fields:
                    key = (instance.__class__.__name__, id(instance))
                    _pending_changes[key] = (old_values, new_values, changed_fields)

    @sa_event.listens_for(Session, "after_flush")
    def after_flush_handler(session, flush_context):
        """Log activities after successful flush"""
        global _pending_changes

        # Process new records (inserts)
        for instance in session.new:
            if isinstance(instance, ActivityMixin):
                try:
                    instance.log_activity(
                        db=session,
                        action=ActivityAction.CREATE,
                        user_id=getattr(instance, "created_by", None),
                    )
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to log create activity: {e}")

        # Process updated records
        for instance in session.dirty:
            if isinstance(instance, ActivityMixin):
                key = (instance.__class__.__name__, id(instance))
                if key in _pending_changes:
                    old_values, new_values, changed_fields = _pending_changes.pop(key)
                    try:
                        description = _format_change_description(instance, old_values, new_values, changed_fields)
                        instance.log_activity(
                            db=session,
                            action=ActivityAction.UPDATE,
                            user_id=getattr(instance, "updated_by", None),
                            description=description,
                            old_values=old_values,
                            new_values=new_values,
                        )
                    except Exception as e:
                        import logging
                        logging.getLogger(__name__).warning(f"Failed to log update activity: {e}")

        # Process deleted records
        for instance in session.deleted:
            if isinstance(instance, ActivityMixin):
                try:
                    instance.log_activity(
                        db=session,
                        action=ActivityAction.DELETE,
                        user_id=getattr(instance, "updated_by", None),
                    )
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to log delete activity: {e}")

        # Clear any remaining pending changes
        _pending_changes.clear()


# =============================================================================
# RESOURCE PROTOTYPE PATTERN
# =============================================================================

class ResourcePrototype:
    """Prototype pattern for creating new resource types"""

    def __init__(
        self,
        name: str,
        table_name: str,
        base_class: type = BaseModel,
        mixins: list = None,
        fields: dict = None,
        relationships: dict = None,
    ):
        self.name = name
        self.table_name = table_name
        self.base_class = base_class
        self.mixins = mixins or []
        self.fields = fields or {}
        self.relationships = relationships or {}

    def create_model(self):
        """Create a new model class based on the prototype"""
        # Combine base class and mixins
        bases = tuple([self.base_class] + self.mixins)

        # Create class attributes
        attrs = {"__tablename__": self.table_name, **self.fields}

        # Add relationships
        for rel_name, rel_config in self.relationships.items():
            attrs[rel_name] = rel_config

        # Create the model class dynamically
        model_class = type(self.name, bases, attrs)
        return model_class

    def clone(self, **overrides):
        """Create a copy of this prototype with modifications"""
        return ResourcePrototype(
            name=overrides.get("name", self.name),
            table_name=overrides.get("table_name", self.table_name),
            base_class=overrides.get("base_class", self.base_class),
            mixins=overrides.get("mixins", self.mixins.copy()),
            fields=overrides.get("fields", self.fields.copy()),
            relationships=overrides.get("relationships", self.relationships.copy()),
        )


# Common prototype configurations
STANDARD_PROTOTYPES = {
    "basic_resource": ResourcePrototype(
        name="BasicResource",
        table_name="basic_resources",
        base_class=BaseModel,
        fields={
            "name": Column(String(255), nullable=False, index=True),
            "description": Column(Text, nullable=True),
            "is_active": Column(Boolean, default=True, nullable=False),
        },
    ),
    "user_owned_resource": ResourcePrototype(
        name="UserOwnedResource",
        table_name="user_owned_resources",
        base_class=AuditableModel,
        fields={
            "name": Column(String(255), nullable=False, index=True),
            "description": Column(Text, nullable=True),
            "is_active": Column(Boolean, default=True, nullable=False),
            "is_public": Column(Boolean, default=False, nullable=False),
        },
    ),
    "project_resource": ResourcePrototype(
        name="ProjectResource",
        table_name="project_resources",
        base_class=AuditableModel,
        fields={
            "name": Column(String(255), nullable=False, index=True),
            "description": Column(Text, nullable=True),
            "project_id": Column(Integer, nullable=False),
            "is_active": Column(Boolean, default=True, nullable=False),
        },
    ),
    "content_resource": ResourcePrototype(
        name="ContentResource",
        table_name="content_resources",
        base_class=FullAuditModel,
        fields={
            "title": Column(String(500), nullable=False, index=True),
            "content": Column(Text, nullable=True),
            "status": Column(String(50), default="draft", nullable=False),
            "category": Column(String(100), nullable=True),
            "slug": Column(String(255), unique=True, nullable=True),
        },
    ),
    "enterprise_resource": ResourcePrototype(
        name="EnterpriseResource",
        table_name="enterprise_resources",
        base_class=EnterpriseModel,
        fields={
            "name": Column(String(255), nullable=False, index=True),
            "description": Column(Text, nullable=True),
            "code": Column(String(50), unique=True, nullable=True),
        },
    ),
}


def create_resource_from_prototype(
    prototype_name: str, custom_fields: dict = None, **kwargs
):
    """Create a new resource model from a predefined prototype"""
    if prototype_name not in STANDARD_PROTOTYPES:
        raise ValueError(f"Unknown prototype: {prototype_name}")

    prototype = STANDARD_PROTOTYPES[prototype_name].clone(**kwargs)

    if custom_fields:
        prototype.fields.update(custom_fields)

    return prototype.create_model()
