from typing import List, Optional

from app.db.base import Base
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Session, declared_attr
from sqlalchemy.sql import func


class TimestampMixin:
    """Mixin for adding timestamp columns to models"""

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Track when user audit fields were set
    created_by_datetime = Column(DateTime(timezone=True), nullable=True)
    updated_by_datetime = Column(DateTime(timezone=True), nullable=True)


class SoftDeleteMixin:
    """Mixin for adding soft delete functionality"""

    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)


class AuditMixin:
    """Mixin for adding audit fields"""

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    @declared_attr
    def created_by_user(cls):
        from sqlalchemy.orm import relationship

        return relationship(
            "User", primaryjoin=f"{cls.__name__}.created_by==User.id", viewonly=True
        )

    @declared_attr
    def updated_by_user(cls):
        from sqlalchemy.orm import relationship

        return relationship(
            "User", primaryjoin=f"{cls.__name__}.updated_by==User.id", viewonly=True
        )


class MetadataMixin:
    """Mixin for adding metadata fields"""

    metadata_json = Column(JSON, default={}, nullable=False)
    tags = Column(JSON, default=[], nullable=False)
    version = Column(String(20), default="1.0.0", nullable=False)


class ActivityMixin:
    """Mixin for automatic activity logging on CRUD operations"""

    def log_activity(self, db: Session, action: str, user_id: Optional[int] = None,
                    description: str = None, **kwargs):
        """Manually log activity for this instance"""
        from app.utils.activity_logger import log_activity
        from app.models.activity_log import ActivityAction, ActivityLevel, EventCategory

        action_map = {
            'create': ActivityAction.CREATE,
            'update': ActivityAction.UPDATE,
            'delete': ActivityAction.DELETE,
            'read': ActivityAction.READ
        }

        return log_activity(
            db=db,
            user_id=user_id or getattr(self, 'updated_by', None) or getattr(self, 'created_by', None),
            action=action_map.get(action, ActivityAction.UPDATE),
            entity_type=self.__class__.__name__.lower(),
            entity_id=getattr(self, 'id', None),
            entity_name=getattr(self, 'name', None) or str(getattr(self, 'id', None)),
            description=description or f"{action.title()} {self.__class__.__name__}",
            category=EventCategory.DATA_MANAGEMENT,
            **kwargs
        )


class MessageMixin:
    """Mixin for automatic message/notification creation"""

    def send_message(self, db: Session, recipient_ids: List[int],
                    message_type: str = 'info', channels: List[str] = None,
                    title: str = None, message: str = None, **kwargs):
        """Send message/notification about this instance"""
        from app.models.notification import Notification, NotificationType
        import json

        channels = channels or ['in_app']
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
                    'entity_type': self.__class__.__name__.lower(),
                    'entity_id': getattr(self, 'id', None),
                    'entity_name': getattr(self, 'name', None),
                    **kwargs
                })
            )
            notifications.append(notification)
            db.add(notification)

        db.commit()
        return notifications


class AuditTrailMixin:
    """Mixin for automatic audit trail creation"""

    def create_audit_entry(self, db: Session, operation: str,
                          old_values: dict = None, new_values: dict = None,
                          changed_fields: List[str] = None, user_id: int = None,
                          reason: str = None, **kwargs):
        """Create audit trail entry for this instance"""
        from app.models.audit_trail import AuditTrail
        import json

        audit_entry = AuditTrail(
            user_id=user_id or getattr(self, 'updated_by', None) or getattr(self, 'created_by', None),
            entity_type=self.__class__.__name__.lower(),
            entity_id=getattr(self, 'id', None),
            entity_name=getattr(self, 'name', None) or str(getattr(self, 'id', None)),
            operation=operation.upper(),
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            changed_fields=json.dumps(changed_fields) if changed_fields else None,
            reason=reason,
            extra_data=json.dumps(kwargs) if kwargs else None
        )

        db.add(audit_entry)
        db.commit()
        return audit_entry


class FullActivityMixin(ActivityMixin, MessageMixin, AuditTrailMixin):
    """Complete mixin combining all activity, message, and audit functionality"""
    pass


class BaseModel(Base, TimestampMixin):
    """Base model class with common fields"""

    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True)


class AuditableModel(BaseModel, AuditMixin):
    """Base model with audit capabilities"""

    __abstract__ = True


class SoftDeletableModel(BaseModel, SoftDeleteMixin):
    """Base model with soft delete capabilities"""

    __abstract__ = True


class FullAuditModel(BaseModel, AuditMixin, SoftDeleteMixin, MetadataMixin):
    """Full-featured base model with all capabilities"""

    __abstract__ = True


class ActivityModel(BaseModel, FullActivityMixin):
    """Base model with full activity tracking"""

    __abstract__ = True


class AuditableActivityModel(BaseModel, AuditMixin, FullActivityMixin):
    """Base model with audit and full activity capabilities"""

    __abstract__ = True


class FullFeaturedModel(BaseModel, AuditMixin, SoftDeleteMixin, MetadataMixin, FullActivityMixin):
    """Full-featured base model with all capabilities"""

    __abstract__ = True


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


# Example usage functions for creating new tables
def create_task_model():
    """Example: Create a Task model using the project_resource prototype"""
    import enum

    from sqlalchemy import Column, DateTime, Enum, String, Text

    class TaskStatus(str, enum.Enum):
        TODO = "todo"
        IN_PROGRESS = "in_progress"
        DONE = "done"
        CANCELLED = "cancelled"

    custom_fields = {
        "title": Column(String(500), nullable=False),
        "description": Column(Text, nullable=True),
        "status": Column(Enum(TaskStatus), default=TaskStatus.TODO),
        "due_date": Column(DateTime(timezone=True), nullable=True),
        "priority": Column(String(20), default="medium"),
        "assignee_id": Column(Integer, nullable=True),
    }

    return create_resource_from_prototype(
        "project_resource", name="Task", table_name="tasks", custom_fields=custom_fields
    )


def create_document_model():
    """Example: Create a Document model using the content_resource prototype"""
    from sqlalchemy import Boolean, Column, Integer, String

    custom_fields = {
        "file_path": Column(String(1000), nullable=True),
        "file_size": Column(Integer, nullable=True),
        "mime_type": Column(String(100), nullable=True),
        "is_template": Column(Boolean, default=False),
        "template_category": Column(String(100), nullable=True),
    }

    return create_resource_from_prototype(
        "content_resource",
        name="Document",
        table_name="documents",
        custom_fields=custom_fields,
    )
