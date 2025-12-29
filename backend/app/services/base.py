"""Base CRUD service with common operations"""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.audit import AuditAction, AuditLog

ModelType = TypeVar("ModelType", bound=Base)


class BaseService(Generic[ModelType]):
    """
    Base service class with CRUD operations.

    Provides common database operations with optional audit logging.
    """

    def __init__(
        self,
        db: Session,
        model: Type[ModelType],
        enable_audit: bool = True,
    ):
        self.db = db
        self.model = model
        self.enable_audit = enable_audit

    def get(self, id: int) -> Optional[ModelType]:
        """Get a record by ID"""
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[ModelType]:
        """Get multiple records with optional filters"""
        query = self.db.query(self.model)

        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key) and value is not None:
                    query = query.filter(getattr(self.model, key) == value)

        return query.offset(skip).limit(limit).all()

    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters"""
        query = self.db.query(self.model)

        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key) and value is not None:
                    query = query.filter(getattr(self.model, key) == value)

        return query.count()

    def create(
        self,
        data: Dict[str, Any],
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
    ) -> ModelType:
        """Create a new record"""
        # Set audit fields if model supports them
        if hasattr(self.model, "created_by") and user_id:
            data["created_by"] = user_id

        obj = self.model(**data)
        self.db.add(obj)
        self.db.flush()

        # Log creation
        if self.enable_audit and user_id:
            self._log_action(
                action=AuditAction.CREATE,
                entity_id=obj.id,
                new_values=data,
                user_id=user_id,
                company_id=company_id,
            )

        return obj

    def update(
        self,
        id: int,
        data: Dict[str, Any],
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
    ) -> Optional[ModelType]:
        """Update an existing record"""
        obj = self.get(id)
        if not obj:
            return None

        # Store old values for audit
        old_values = {k: getattr(obj, k) for k in data.keys() if hasattr(obj, k)}

        # Set audit fields if model supports them
        if hasattr(self.model, "updated_by") and user_id:
            data["updated_by"] = user_id

        # Update fields
        for key, value in data.items():
            if hasattr(obj, key):
                setattr(obj, key, value)

        self.db.flush()

        # Log update
        if self.enable_audit and user_id:
            changed_fields = [k for k in data.keys() if old_values.get(k) != data.get(k)]
            if changed_fields:
                self._log_action(
                    action=AuditAction.UPDATE,
                    entity_id=obj.id,
                    old_values=old_values,
                    new_values=data,
                    changed_fields=changed_fields,
                    user_id=user_id,
                    company_id=company_id,
                )

        return obj

    def delete(
        self,
        id: int,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
        soft_delete: bool = True,
    ) -> bool:
        """Delete a record (soft or hard delete)"""
        obj = self.get(id)
        if not obj:
            return False

        if soft_delete and hasattr(obj, "is_deleted"):
            # Soft delete
            obj.is_deleted = True
            if hasattr(obj, "deleted_by") and user_id:
                obj.deleted_by = user_id
        else:
            # Hard delete
            self.db.delete(obj)

        self.db.flush()

        # Log deletion
        if self.enable_audit and user_id:
            self._log_action(
                action=AuditAction.DELETE,
                entity_id=id,
                user_id=user_id,
                company_id=company_id,
            )

        return True

    def _log_action(
        self,
        action: AuditAction,
        entity_id: int,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        changed_fields: Optional[List[str]] = None,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
    ) -> None:
        """Log an action to the audit trail"""
        AuditLog.log(
            db=self.db,
            action=action,
            entity_type=self.model.__tablename__,
            entity_id=entity_id,
            user_id=user_id,
            company_id=company_id,
            old_values=old_values,
            new_values=new_values,
            changed_fields=changed_fields,
        )
