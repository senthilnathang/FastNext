"""
Workflow Engine Models

Provides state machine functionality for model records with:
- Workflow definitions with configurable states
- Transitions with conditions and actions
- State tracking and history
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, String, Text,
    ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import Session, relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin


class WorkflowDefinition(Base, TimestampMixin, AuditMixin):
    """
    Workflow definition for a model.

    Defines the states and rules for a workflow that can be
    applied to records of a specific model.

    Example:
        WorkflowDefinition(
            name="Leave Request Workflow",
            code="leave_request",
            model_name="hr.leave",
            state_field="state",
            states=[
                {"code": "draft", "name": "Draft", "sequence": 10, "is_start": True},
                {"code": "submitted", "name": "Submitted", "sequence": 20},
                {"code": "approved", "name": "Approved", "sequence": 30, "is_end": True},
                {"code": "rejected", "name": "Rejected", "sequence": 30, "is_end": True},
            ],
            default_state="draft"
        )
    """

    __tablename__ = "workflow_definitions"
    __table_args__ = (
        Index("ix_workflow_definitions_model", "model_name"),
        Index("ix_workflow_definitions_module", "module_name"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Identification
    name = Column(
        String(200),
        nullable=False,
        comment="Human-readable workflow name"
    )
    code = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique workflow code"
    )
    description = Column(
        Text,
        nullable=True,
        comment="Workflow description"
    )

    # Ownership
    module_name = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Module that defines this workflow"
    )

    # Model binding
    model_name = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Model this workflow applies to"
    )
    state_field = Column(
        String(100),
        default="state",
        comment="Field name storing the state value"
    )

    # State configuration
    states = Column(
        JSONB,
        default=list,
        comment="List of state definitions: [{code, name, sequence, is_start, is_end, color}]"
    )
    default_state = Column(
        String(50),
        nullable=True,
        comment="Default state for new records"
    )

    # Status
    is_active = Column(
        Boolean,
        default=True,
        comment="Whether this workflow is active"
    )

    # Relationships
    transitions = relationship(
        "WorkflowTransition",
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="WorkflowTransition.sequence"
    )

    def __repr__(self) -> str:
        return f"<WorkflowDefinition({self.code}: {self.name})>"

    @property
    def state_codes(self) -> List[str]:
        """Get list of state codes."""
        return [s.get("code") for s in (self.states or [])]

    @property
    def start_states(self) -> List[str]:
        """Get list of start state codes."""
        return [s.get("code") for s in (self.states or []) if s.get("is_start")]

    @property
    def end_states(self) -> List[str]:
        """Get list of end state codes."""
        return [s.get("code") for s in (self.states or []) if s.get("is_end")]

    def get_state_info(self, state_code: str) -> Optional[Dict[str, Any]]:
        """Get state definition by code."""
        for state in (self.states or []):
            if state.get("code") == state_code:
                return state
        return None

    @classmethod
    def get_by_code(cls, db: Session, code: str) -> Optional["WorkflowDefinition"]:
        """Get workflow by code."""
        return db.query(cls).filter(
            cls.code == code,
            cls.is_active == True
        ).first()

    @classmethod
    def get_for_model(cls, db: Session, model_name: str) -> Optional["WorkflowDefinition"]:
        """Get active workflow for a model."""
        return db.query(cls).filter(
            cls.model_name == model_name,
            cls.is_active == True
        ).first()


class WorkflowTransition(Base, TimestampMixin):
    """
    Workflow state transition.

    Defines a possible transition between states with optional
    conditions and actions.

    Example:
        WorkflowTransition(
            workflow_id=1,
            name="Submit for Approval",
            code="submit",
            from_state="draft",
            to_state="submitted",
            button_name="Submit",
            button_class="btn-primary",
            required_groups=["hr_user"]
        )
    """

    __tablename__ = "workflow_transitions"
    __table_args__ = (
        Index("ix_workflow_transitions_workflow", "workflow_id"),
        Index("ix_workflow_transitions_states", "from_state", "to_state"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Parent workflow
    workflow_id = Column(
        Integer,
        ForeignKey("workflow_definitions.id", ondelete="CASCADE"),
        nullable=False
    )

    # Identification
    name = Column(
        String(200),
        nullable=False,
        comment="Human-readable transition name"
    )
    code = Column(
        String(100),
        nullable=False,
        comment="Transition code"
    )

    # State change
    from_state = Column(
        String(50),
        nullable=False,
        comment="Source state code"
    )
    to_state = Column(
        String(50),
        nullable=False,
        comment="Target state code"
    )

    # Conditions
    condition_domain = Column(
        JSONB,
        default=list,
        comment="Domain filter that record must match: [['field', 'op', 'value']]"
    )
    condition_code = Column(
        Text,
        nullable=True,
        comment="Python expression that must return True"
    )
    required_groups = Column(
        JSONB,
        default=list,
        comment="List of group codes required to execute this transition"
    )

    # Actions
    action_id = Column(
        Integer,
        nullable=True,
        comment="ServerAction ID to execute on transition"
    )
    python_code = Column(
        Text,
        nullable=True,
        comment="Python code to execute on transition"
    )

    # UI
    button_name = Column(
        String(100),
        nullable=True,
        comment="Button label in UI"
    )
    button_class = Column(
        String(50),
        default="btn-primary",
        comment="CSS class for button: btn-primary, btn-success, btn-danger"
    )
    icon = Column(
        String(50),
        nullable=True,
        comment="Icon name for button"
    )
    confirm_message = Column(
        Text,
        nullable=True,
        comment="Confirmation message to show before transition"
    )

    # Ordering
    sequence = Column(
        Integer,
        default=10,
        comment="Display order"
    )

    # Status
    is_active = Column(
        Boolean,
        default=True,
        comment="Whether this transition is active"
    )

    # Relationships
    workflow = relationship("WorkflowDefinition", back_populates="transitions")

    def __repr__(self) -> str:
        return f"<WorkflowTransition({self.code}: {self.from_state} -> {self.to_state})>"


class WorkflowState(Base, TimestampMixin):
    """
    Workflow state tracking for a record.

    Tracks the current state and history of state changes
    for a specific record.

    Example:
        WorkflowState(
            workflow_id=1,
            model_name="hr.leave",
            res_id=123,
            current_state="submitted",
            previous_state="draft",
            history=[
                {"from": "draft", "to": "submitted", "user_id": 1,
                 "timestamp": "2024-01-01T10:00:00", "note": "Submitted for approval"}
            ]
        )
    """

    __tablename__ = "workflow_states"
    __table_args__ = (
        Index("ix_workflow_states_record", "model_name", "res_id"),
        Index("ix_workflow_states_workflow", "workflow_id"),
        UniqueConstraint("workflow_id", "model_name", "res_id",
                         name="uq_workflow_states_record"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Parent workflow
    workflow_id = Column(
        Integer,
        ForeignKey("workflow_definitions.id", ondelete="CASCADE"),
        nullable=False
    )

    # Record reference
    model_name = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Model name"
    )
    res_id = Column(
        Integer,
        nullable=False,
        index=True,
        comment="Record ID"
    )

    # Current state
    current_state = Column(
        String(50),
        nullable=False,
        comment="Current state code"
    )
    previous_state = Column(
        String(50),
        nullable=True,
        comment="Previous state code"
    )

    # History
    history = Column(
        JSONB,
        default=list,
        comment="State change history: [{from, to, user_id, timestamp, note, transition_code}]"
    )

    # Last change info
    last_transition_id = Column(
        Integer,
        nullable=True,
        comment="ID of the last transition executed"
    )
    last_changed_by = Column(
        Integer,
        nullable=True,
        comment="User ID who made the last change"
    )
    last_changed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When the last change occurred"
    )

    def __repr__(self) -> str:
        return f"<WorkflowState({self.model_name}:{self.res_id} = {self.current_state})>"

    def add_history_entry(
        self,
        from_state: str,
        to_state: str,
        user_id: Optional[int] = None,
        transition_code: Optional[str] = None,
        note: Optional[str] = None,
    ) -> None:
        """Add an entry to the history."""
        entry = {
            "from": from_state,
            "to": to_state,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "transition_code": transition_code,
            "note": note,
        }

        if self.history is None:
            self.history = []

        # Create new list to trigger SQLAlchemy change detection
        self.history = self.history + [entry]

    @classmethod
    def get_or_create(
        cls,
        db: Session,
        workflow_id: int,
        model_name: str,
        res_id: int,
        default_state: str,
    ) -> "WorkflowState":
        """Get or create workflow state for a record."""
        state = db.query(cls).filter(
            cls.workflow_id == workflow_id,
            cls.model_name == model_name,
            cls.res_id == res_id,
        ).first()

        if not state:
            state = cls(
                workflow_id=workflow_id,
                model_name=model_name,
                res_id=res_id,
                current_state=default_state,
                history=[],
            )
            db.add(state)
            db.flush()

        return state

    @classmethod
    def get_for_record(
        cls,
        db: Session,
        model_name: str,
        res_id: int,
    ) -> Optional["WorkflowState"]:
        """Get workflow state for a record."""
        return db.query(cls).filter(
            cls.model_name == model_name,
            cls.res_id == res_id,
        ).first()

    @classmethod
    def get_records_in_state(
        cls,
        db: Session,
        workflow_id: int,
        state: str,
        model_name: Optional[str] = None,
    ) -> List["WorkflowState"]:
        """Get all records in a specific state."""
        query = db.query(cls).filter(
            cls.workflow_id == workflow_id,
            cls.current_state == state,
        )

        if model_name:
            query = query.filter(cls.model_name == model_name)

        return query.all()


class WorkflowActivity(Base, TimestampMixin):
    """
    Workflow activity log.

    Provides detailed logging of all workflow transitions
    for auditing and analysis.
    """

    __tablename__ = "workflow_activities"
    __table_args__ = (
        Index("ix_workflow_activities_record", "model_name", "res_id"),
        Index("ix_workflow_activities_workflow", "workflow_id"),
        Index("ix_workflow_activities_user", "user_id"),
        Index("ix_workflow_activities_created", "created_at"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # References
    workflow_id = Column(
        Integer,
        ForeignKey("workflow_definitions.id", ondelete="SET NULL"),
        nullable=True
    )
    transition_id = Column(
        Integer,
        ForeignKey("workflow_transitions.id", ondelete="SET NULL"),
        nullable=True
    )

    # Record reference
    model_name = Column(
        String(100),
        nullable=False,
        comment="Model name"
    )
    res_id = Column(
        Integer,
        nullable=False,
        comment="Record ID"
    )

    # Transition details
    from_state = Column(
        String(50),
        nullable=False,
        comment="Previous state"
    )
    to_state = Column(
        String(50),
        nullable=False,
        comment="New state"
    )
    transition_code = Column(
        String(100),
        nullable=True,
        comment="Transition code used"
    )

    # User info
    user_id = Column(
        Integer,
        nullable=True,
        comment="User who executed the transition"
    )
    user_name = Column(
        String(200),
        nullable=True,
        comment="User name (denormalized for history)"
    )

    # Context
    note = Column(
        Text,
        nullable=True,
        comment="User note or reason"
    )
    context_data = Column(
        JSONB,
        default=dict,
        comment="Additional context data"
    )

    # Status
    is_automatic = Column(
        Boolean,
        default=False,
        comment="Whether this was an automatic transition"
    )

    def __repr__(self) -> str:
        return f"<WorkflowActivity({self.model_name}:{self.res_id} {self.from_state} -> {self.to_state})>"
