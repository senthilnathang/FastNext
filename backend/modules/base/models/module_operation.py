"""
Module Operation Model

Tracks batch module operations for state machine workflow.
Enables mark-and-apply pattern for module installation, upgrade, and removal.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, String, Text,
    ForeignKey, Index, CheckConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import Session, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class OperationType(str, Enum):
    """Types of module operations."""
    INSTALL = "install"
    UPGRADE = "upgrade"
    REMOVE = "remove"


class OperationStatus(str, Enum):
    """Status of a module operation."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"


class ModuleOperation(Base, TimestampMixin):
    """
    Tracks individual module operations within a batch.

    Enables the mark-and-apply workflow:
    1. Mark modules for install/upgrade/remove
    2. Review pending operations
    3. Apply all operations as a batch
    4. Rollback if needed

    Example workflow:
        # Mark modules
        service.mark_for_install(["crm", "sales"])
        service.mark_for_upgrade(["base"])

        # Review
        pending = service.get_pending_operations()

        # Apply all
        result = service.apply_pending_operations()

        # Or rollback if issues
        service.rollback_operation(batch_id)
    """

    __tablename__ = "module_operations"
    __table_args__ = (
        Index("ix_module_operations_batch", "batch_id"),
        Index("ix_module_operations_status", "status"),
        Index("ix_module_operations_module", "module_name"),
        CheckConstraint(
            "operation IN ('install', 'upgrade', 'remove')",
            name="ck_module_operations_operation"
        ),
        CheckConstraint(
            "status IN ('pending', 'in_progress', 'success', 'failed', 'rolled_back', 'cancelled')",
            name="ck_module_operations_status"
        ),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Batch identification
    batch_id = Column(
        String(50),
        nullable=False,
        index=True,
        comment="UUID grouping operations that should be applied together"
    )

    # Module and operation details
    module_name = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Technical name of the module"
    )
    operation = Column(
        String(30),
        nullable=False,
        comment="Type of operation: install, upgrade, remove"
    )

    # Status tracking
    status = Column(
        String(20),
        default=OperationStatus.PENDING.value,
        nullable=False,
        comment="Current status of the operation"
    )
    sequence = Column(
        Integer,
        default=10,
        comment="Order of execution within batch (for dependencies)"
    )

    # Timing
    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When operation execution started"
    )
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When operation completed (success or failure)"
    )
    duration_ms = Column(
        Integer,
        nullable=True,
        comment="Duration of operation in milliseconds"
    )

    # Error handling
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if operation failed"
    )
    error_traceback = Column(
        Text,
        nullable=True,
        comment="Full traceback for debugging"
    )

    # Rollback support
    rollback_data = Column(
        JSONB,
        nullable=True,
        default=dict,
        comment="Data needed to rollback this operation"
    )
    previous_version = Column(
        String(50),
        nullable=True,
        comment="Previous version for upgrade operations"
    )
    previous_state = Column(
        String(20),
        nullable=True,
        comment="Previous module state for rollback"
    )

    # User tracking
    marked_by = Column(
        Integer,
        nullable=True,
        comment="User ID who marked this operation"
    )
    executed_by = Column(
        Integer,
        nullable=True,
        comment="User ID who executed this operation"
    )

    def __repr__(self) -> str:
        return f"<ModuleOperation({self.operation} {self.module_name} [{self.status}])>"

    @property
    def is_pending(self) -> bool:
        return self.status == OperationStatus.PENDING.value

    @property
    def is_completed(self) -> bool:
        return self.status in (
            OperationStatus.SUCCESS.value,
            OperationStatus.FAILED.value,
            OperationStatus.ROLLED_BACK.value,
            OperationStatus.CANCELLED.value
        )

    @property
    def is_success(self) -> bool:
        return self.status == OperationStatus.SUCCESS.value

    @property
    def is_failed(self) -> bool:
        return self.status == OperationStatus.FAILED.value

    def start(self) -> None:
        """Mark operation as started."""
        self.status = OperationStatus.IN_PROGRESS.value
        self.started_at = datetime.utcnow()

    def complete_success(self) -> None:
        """Mark operation as successfully completed."""
        self.status = OperationStatus.SUCCESS.value
        self.completed_at = datetime.utcnow()
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_ms = int(delta.total_seconds() * 1000)

    def complete_failure(self, error: str, traceback: str = None) -> None:
        """Mark operation as failed."""
        self.status = OperationStatus.FAILED.value
        self.completed_at = datetime.utcnow()
        self.error_message = error
        self.error_traceback = traceback
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_ms = int(delta.total_seconds() * 1000)

    def mark_rolled_back(self) -> None:
        """Mark operation as rolled back."""
        self.status = OperationStatus.ROLLED_BACK.value

    def cancel(self) -> None:
        """Cancel a pending operation."""
        if self.is_pending:
            self.status = OperationStatus.CANCELLED.value

    # Class methods for batch operations
    @classmethod
    def create_batch_id(cls) -> str:
        """Generate a new batch ID."""
        return str(uuid.uuid4())[:8]

    @classmethod
    def create_operation(
        cls,
        db: Session,
        module_name: str,
        operation: OperationType,
        batch_id: str = None,
        sequence: int = 10,
        marked_by: int = None,
        previous_version: str = None,
        previous_state: str = None
    ) -> "ModuleOperation":
        """
        Create a new module operation.

        Args:
            db: Database session
            module_name: Module technical name
            operation: Type of operation
            batch_id: Optional batch ID (generates new if not provided)
            sequence: Execution order
            marked_by: User ID
            previous_version: For upgrade operations
            previous_state: Current state for rollback

        Returns:
            Created ModuleOperation
        """
        if batch_id is None:
            batch_id = cls.create_batch_id()

        op = cls(
            batch_id=batch_id,
            module_name=module_name,
            operation=operation.value if isinstance(operation, OperationType) else operation,
            status=OperationStatus.PENDING.value,
            sequence=sequence,
            marked_by=marked_by,
            previous_version=previous_version,
            previous_state=previous_state
        )
        db.add(op)
        db.flush()
        return op

    @classmethod
    def get_pending_operations(
        cls,
        db: Session,
        batch_id: str = None
    ) -> List["ModuleOperation"]:
        """
        Get all pending operations, optionally filtered by batch.

        Args:
            db: Database session
            batch_id: Optional batch filter

        Returns:
            List of pending operations ordered by sequence
        """
        query = db.query(cls).filter(cls.status == OperationStatus.PENDING.value)
        if batch_id:
            query = query.filter(cls.batch_id == batch_id)
        return query.order_by(cls.sequence, cls.id).all()

    @classmethod
    def get_batch_operations(cls, db: Session, batch_id: str) -> List["ModuleOperation"]:
        """
        Get all operations in a batch.

        Args:
            db: Database session
            batch_id: Batch ID

        Returns:
            List of operations in the batch
        """
        return db.query(cls).filter(
            cls.batch_id == batch_id
        ).order_by(cls.sequence, cls.id).all()

    @classmethod
    def cancel_pending(cls, db: Session, batch_id: str = None) -> int:
        """
        Cancel all pending operations.

        Args:
            db: Database session
            batch_id: Optional batch filter

        Returns:
            Number of cancelled operations
        """
        query = db.query(cls).filter(cls.status == OperationStatus.PENDING.value)
        if batch_id:
            query = query.filter(cls.batch_id == batch_id)

        pending = query.all()
        for op in pending:
            op.cancel()

        return len(pending)

    @classmethod
    def has_pending_for_module(cls, db: Session, module_name: str) -> bool:
        """
        Check if module has pending operations.

        Args:
            db: Database session
            module_name: Module technical name

        Returns:
            True if there are pending operations
        """
        return db.query(cls).filter(
            cls.module_name == module_name,
            cls.status == OperationStatus.PENDING.value
        ).first() is not None

    @classmethod
    def get_recent_batches(
        cls,
        db: Session,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent batch summaries.

        Args:
            db: Database session
            limit: Maximum number of batches

        Returns:
            List of batch summaries
        """
        from sqlalchemy import distinct, func as sqlfunc

        # Get distinct batch IDs ordered by created_at
        subquery = db.query(
            cls.batch_id,
            sqlfunc.min(cls.created_at).label("created_at")
        ).group_by(cls.batch_id).order_by(
            sqlfunc.min(cls.created_at).desc()
        ).limit(limit).subquery()

        batch_ids = [row.batch_id for row in db.query(subquery.c.batch_id).all()]

        results = []
        for batch_id in batch_ids:
            ops = cls.get_batch_operations(db, batch_id)
            if ops:
                results.append({
                    "batch_id": batch_id,
                    "created_at": ops[0].created_at.isoformat() if ops[0].created_at else None,
                    "operations_count": len(ops),
                    "pending": sum(1 for o in ops if o.is_pending),
                    "success": sum(1 for o in ops if o.is_success),
                    "failed": sum(1 for o in ops if o.is_failed),
                    "operations": [
                        {
                            "module": o.module_name,
                            "operation": o.operation,
                            "status": o.status
                        }
                        for o in ops
                    ]
                })

        return results
