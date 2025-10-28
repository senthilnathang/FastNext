"""
Base CRUD Service with automatic activity/message/audit logging
"""

from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.base import ActivityMixin, AuditTrailMixin, MessageMixin

T = TypeVar('T')

class BaseCRUDService(Generic[T]):
    """Base CRUD service with automatic logging"""

    def __init__(self, db: Session, model_class: Type[T]):
        self.db = db
        self.model_class = model_class

    def create(self, data: Dict[str, Any], user_id: Optional[int] = None,
               notify_users: List[int] = None, **kwargs) -> T:
        """Create with automatic logging"""
        instance = self.model_class(**data)

        # Set audit fields
        if user_id:
            instance.created_by = user_id
            instance.updated_by = user_id
            instance.created_by_datetime = datetime.utcnow()
            instance.updated_by_datetime = datetime.utcnow()

        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)

        # Automatic activity logging
        if isinstance(instance, ActivityMixin):
            instance.log_activity(
                db=self.db,
                action='create',
                user_id=user_id,
                description=f"Created {self.model_class.__name__}: {getattr(instance, 'name', instance.id)}"
            )

        # Automatic audit trail
        if isinstance(instance, AuditTrailMixin):
            instance.create_audit_entry(
                db=self.db,
                operation='INSERT',
                new_values=data,
                user_id=user_id
            )

        # Automatic notifications
        if isinstance(instance, MessageMixin) and notify_users:
            instance.send_message(
                db=self.db,
                recipient_ids=notify_users,
                message_type='success',
                title=f"New {self.model_class.__name__} Created",
                message=f"{getattr(instance, 'name', 'New item')} has been created"
            )

        return instance

    def update(self, instance_id: int, data: Dict[str, Any], user_id: Optional[int] = None,
               notify_users: List[int] = None, **kwargs) -> T:
        """Update with automatic logging"""
        instance = self.db.query(self.model_class).filter(self.model_class.id == instance_id).first()
        if not instance:
            raise NotFoundError(f"{self.model_class.__name__} not found")

        # Store old values for audit
        old_values = {k: getattr(instance, k) for k in data.keys()}

        # Update instance
        for key, value in data.items():
            setattr(instance, key, value)

        # Update audit fields
        if user_id:
            instance.updated_by = user_id
            instance.updated_by_datetime = datetime.utcnow()

        self.db.commit()
        self.db.refresh(instance)

        # Automatic activity logging
        if isinstance(instance, ActivityMixin):
            changed_fields = list(data.keys())
            instance.log_activity(
                db=self.db,
                action='update',
                user_id=user_id,
                description=f"Updated {self.model_class.__name__}: {getattr(instance, 'name', instance.id)} - {', '.join(changed_fields)}"
            )

        # Automatic audit trail
        if isinstance(instance, AuditTrailMixin):
            instance.create_audit_entry(
                db=self.db,
                operation='UPDATE',
                old_values=old_values,
                new_values=data,
                changed_fields=list(data.keys()),
                user_id=user_id
            )

        # Automatic notifications
        if isinstance(instance, MessageMixin) and notify_users:
            instance.send_message(
                db=self.db,
                recipient_ids=notify_users,
                message_type='info',
                title=f"{self.model_class.__name__} Updated",
                message=f"{getattr(instance, 'name', 'Item')} has been updated"
            )

        return instance

    def delete(self, instance_id: int, user_id: Optional[int] = None,
               notify_users: List[int] = None, **kwargs) -> bool:
        """Delete with automatic logging"""
        instance = self.db.query(self.model_class).filter(self.model_class.id == instance_id).first()
        if not instance:
            raise NotFoundError(f"{self.model_class.__name__} not found")

        instance_name = getattr(instance, 'name', str(instance.id))

        # Automatic activity logging
        if isinstance(instance, ActivityMixin):
            instance.log_activity(
                db=self.db,
                action='delete',
                user_id=user_id,
                description=f"Deleted {self.model_class.__name__}: {instance_name}"
            )

        # Automatic audit trail
        if isinstance(instance, AuditTrailMixin):
            instance.create_audit_entry(
                db=self.db,
                operation='DELETE',
                old_values={k: getattr(instance, k) for k in instance.__table__.columns.keys()},
                user_id=user_id
            )

        # Automatic notifications
        if isinstance(instance, MessageMixin) and notify_users:
            instance.send_message(
                db=self.db,
                recipient_ids=notify_users,
                message_type='warning',
                title=f"{self.model_class.__name__} Deleted",
                message=f"{instance_name} has been deleted"
            )

        self.db.delete(instance)
        self.db.commit()

        return True