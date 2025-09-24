from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class WorkflowNodeType(str, enum.Enum):
    STATE = "state"
    ACTION = "action"
    CONDITION = "condition"
    GATEWAY = "gateway"  # For parallel/merge operations
    START = "start"
    END = "end"
    TIMER = "timer"
    USER_TASK = "user_task"
    SERVICE_TASK = "service_task"


class WorkflowStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"


class InstanceStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"


class WorkflowType(Base):
    __tablename__ = "workflow_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text)
    icon = Column(String)  # Icon name for UI
    color = Column(String)  # Color for UI
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    templates = relationship("WorkflowTemplate", back_populates="workflow_type", cascade="all, delete-orphan")
    instances = relationship("WorkflowInstance", back_populates="workflow_type", cascade="all, delete-orphan")


class WorkflowState(Base):
    __tablename__ = "workflow_states"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    label = Column(String, nullable=False)
    description = Column(Text)
    color = Column(String, nullable=False, default="#6B7280")  # Hex color
    bg_color = Column(String, nullable=False, default="#F9FAFB")  # Background color
    icon = Column(String, default="circle")  # Icon name
    is_initial = Column(Boolean, default=False)  # Can be starting state
    is_final = Column(Boolean, default=False)    # Is ending state
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WorkflowTemplate(Base):
    __tablename__ = "workflow_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    workflow_type_id = Column(Integer, ForeignKey("workflow_types.id"), nullable=False)
    default_state_id = Column(Integer, ForeignKey("workflow_states.id"))
    status = Column(SQLEnum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    version = Column(String, default="1.0.0")
    is_active = Column(Boolean, default=True)
    nodes = Column(JSON, default=[])  # ReactFlow nodes
    edges = Column(JSON, default=[])  # ReactFlow edges
    settings = Column(JSON, default={})  # Additional settings
    conditions = Column(JSON, default={})  # Conditional logic rules
    permissions = Column(JSON, default={})  # Role-based permissions
    sla_config = Column(JSON, default={})  # SLA and escalation rules
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    workflow_type = relationship("WorkflowType", back_populates="templates")
    default_state = relationship("WorkflowState", foreign_keys=[default_state_id])
    creator = relationship("User", foreign_keys=[created_by])
    instances = relationship("WorkflowInstance", back_populates="template", cascade="all, delete-orphan")


class WorkflowInstance(Base):
    __tablename__ = "workflow_instances"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("workflow_templates.id"), nullable=False)
    workflow_type_id = Column(Integer, ForeignKey("workflow_types.id"), nullable=False)
    current_state_id = Column(Integer, ForeignKey("workflow_states.id"), nullable=False)
    status = Column(SQLEnum(InstanceStatus), default=InstanceStatus.PENDING)
    entity_id = Column(String, nullable=False)  # ID of the related entity (order, invoice, etc.)
    entity_type = Column(String, nullable=False)  # Type of entity
    title = Column(String)  # Human readable title
    description = Column(Text)
    data = Column(JSON, default={})  # Additional data
    context = Column(JSON, default={})  # Runtime context variables
    active_nodes = Column(JSON, default=[])  # Currently active nodes (for parallel processing)
    deadline = Column(DateTime(timezone=True))  # SLA deadline
    priority = Column(Integer, default=0)  # Priority level
    assigned_to = Column(Integer, ForeignKey("users.id"))  # Currently assigned user
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    template = relationship("WorkflowTemplate", back_populates="instances")
    workflow_type = relationship("WorkflowType", back_populates="instances")
    current_state = relationship("WorkflowState", foreign_keys=[current_state_id])
    creator = relationship("User", foreign_keys=[created_by])
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    history = relationship("WorkflowHistory", back_populates="instance", cascade="all, delete-orphan")


class WorkflowHistory(Base):
    __tablename__ = "workflow_history"

    id = Column(Integer, primary_key=True, index=True)
    instance_id = Column(Integer, ForeignKey("workflow_instances.id"), nullable=False)
    from_state_id = Column(Integer, ForeignKey("workflow_states.id"))
    to_state_id = Column(Integer, ForeignKey("workflow_states.id"), nullable=False)
    action = Column(String, nullable=False)  # Action that triggered the transition
    comment = Column(Text)
    meta_data = Column(JSON, default={})
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    instance = relationship("WorkflowInstance", back_populates="history")
    from_state = relationship("WorkflowState", foreign_keys=[from_state_id])
    to_state = relationship("WorkflowState", foreign_keys=[to_state_id])
    user = relationship("User", foreign_keys=[user_id])


class WorkflowTransition(Base):
    __tablename__ = "workflow_transitions"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("workflow_templates.id"), nullable=False)
    from_state_id = Column(Integer, ForeignKey("workflow_states.id"), nullable=False)
    to_state_id = Column(Integer, ForeignKey("workflow_states.id"), nullable=False)
    action = Column(String, nullable=False)  # Action name
    label = Column(String, nullable=False)   # Display label
    condition = Column(Text)  # Optional condition (JSON or expression)
    requires_approval = Column(Boolean, default=False)
    allowed_roles = Column(JSON, default=[])  # List of role names
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    template = relationship("WorkflowTemplate", backref="transitions")
    from_state = relationship("WorkflowState", foreign_keys=[from_state_id])
    to_state = relationship("WorkflowState", foreign_keys=[to_state_id])