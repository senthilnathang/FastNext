from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# WorkflowType schemas
class WorkflowTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: bool = True


class WorkflowTypeCreate(WorkflowTypeBase):
    pass


class WorkflowTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class WorkflowType(WorkflowTypeBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# WorkflowState schemas
class WorkflowStateBase(BaseModel):
    name: str
    label: str
    description: Optional[str] = None
    color: str = "#6B7280"
    bg_color: str = "#F9FAFB"
    icon: str = "circle"
    is_initial: bool = False
    is_final: bool = False


class WorkflowStateCreate(WorkflowStateBase):
    pass


class WorkflowStateUpdate(BaseModel):
    name: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    bg_color: Optional[str] = None
    icon: Optional[str] = None
    is_initial: Optional[bool] = None
    is_final: Optional[bool] = None


class WorkflowState(WorkflowStateBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# WorkflowTemplate schemas
class WorkflowTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    workflow_type_id: int
    default_state_id: Optional[int] = None
    is_active: bool = True
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    settings: Dict[str, Any] = {}


class WorkflowTemplateCreate(WorkflowTemplateBase):
    pass


class WorkflowTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_state_id: Optional[int] = None
    is_active: Optional[bool] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    edges: Optional[List[Dict[str, Any]]] = None
    settings: Optional[Dict[str, Any]] = None


class WorkflowTemplate(WorkflowTemplateBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    workflow_type: Optional[WorkflowType] = None
    default_state: Optional[WorkflowState] = None

    class Config:
        from_attributes = True


# WorkflowInstance schemas
class WorkflowInstanceBase(BaseModel):
    template_id: int
    workflow_type_id: int
    entity_id: str
    entity_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    data: Dict[str, Any] = {}


class WorkflowInstanceCreate(WorkflowInstanceBase):
    current_state_id: Optional[int] = None  # Will use template default if not provided


class WorkflowInstanceUpdate(BaseModel):
    current_state_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class WorkflowInstance(WorkflowInstanceBase):
    id: int
    current_state_id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    workflow_type: Optional[WorkflowType] = None
    current_state: Optional[WorkflowState] = None
    template: Optional[WorkflowTemplate] = None

    class Config:
        from_attributes = True


# WorkflowHistory schemas
class WorkflowHistoryBase(BaseModel):
    action: str
    comment: Optional[str] = None
    metadata: Dict[str, Any] = {}


class WorkflowHistoryCreate(WorkflowHistoryBase):
    instance_id: int
    from_state_id: Optional[int] = None
    to_state_id: int


class WorkflowHistory(WorkflowHistoryBase):
    id: int
    instance_id: int
    from_state_id: Optional[int] = None
    to_state_id: int
    user_id: int
    timestamp: datetime
    from_state: Optional[WorkflowState] = None
    to_state: Optional[WorkflowState] = None

    class Config:
        from_attributes = True


# WorkflowTransition schemas
class WorkflowTransitionBase(BaseModel):
    template_id: int
    from_state_id: int
    to_state_id: int
    action: str
    label: str
    condition: Optional[str] = None
    requires_approval: bool = False
    allowed_roles: List[str] = []


class WorkflowTransitionCreate(WorkflowTransitionBase):
    pass


class WorkflowTransition(WorkflowTransitionBase):
    id: int
    created_at: datetime
    from_state: Optional[WorkflowState] = None
    to_state: Optional[WorkflowState] = None

    class Config:
        from_attributes = True


# Action schemas for state transitions
class WorkflowAction(BaseModel):
    action: str
    comment: Optional[str] = None
    metadata: Dict[str, Any] = {}
