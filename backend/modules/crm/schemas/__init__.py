"""
CRM Module Schemas

Export all CRM Pydantic schemas.
"""

from .pipeline import (
    PipelineBase,
    PipelineCreate,
    PipelineUpdate,
    PipelineResponse,
    PipelineList,
    StageInPipeline,
)
from .stage import (
    StageBase,
    StageCreate,
    StageUpdate,
    StageResponse,
    StageList,
    StageReorder,
)
from .lead import (
    LeadBase,
    LeadCreate,
    LeadUpdate,
    LeadResponse,
    LeadList,
    LeadKanban,
    LeadKanbanColumn,
    LeadStageMove,
    LeadConvert,
    LeadConvertResult,
    LeadMarkLost,
)
from .opportunity import (
    OpportunityBase,
    OpportunityCreate,
    OpportunityUpdate,
    OpportunityResponse,
    OpportunityList,
    OpportunityKanban,
    OpportunityKanbanColumn,
    OpportunityStageMove,
    OpportunityMarkWon,
    OpportunityMarkLost,
    OpportunityForecast,
)
from .contact import (
    ContactBase,
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactList,
)
from .account import (
    AccountBase,
    AccountCreate,
    AccountUpdate,
    AccountResponse,
    AccountList,
)
from .activity import (
    ActivityBase,
    ActivityCreate,
    ActivityUpdate,
    ActivityResponse,
    ActivityList,
    ActivityComplete,
    ActivitySchedule,
)

__all__ = [
    # Pipeline
    "PipelineBase",
    "PipelineCreate",
    "PipelineUpdate",
    "PipelineResponse",
    "PipelineList",
    "StageInPipeline",
    # Stage
    "StageBase",
    "StageCreate",
    "StageUpdate",
    "StageResponse",
    "StageList",
    "StageReorder",
    # Lead
    "LeadBase",
    "LeadCreate",
    "LeadUpdate",
    "LeadResponse",
    "LeadList",
    "LeadKanban",
    "LeadKanbanColumn",
    "LeadStageMove",
    "LeadConvert",
    "LeadConvertResult",
    "LeadMarkLost",
    # Opportunity
    "OpportunityBase",
    "OpportunityCreate",
    "OpportunityUpdate",
    "OpportunityResponse",
    "OpportunityList",
    "OpportunityKanban",
    "OpportunityKanbanColumn",
    "OpportunityStageMove",
    "OpportunityMarkWon",
    "OpportunityMarkLost",
    "OpportunityForecast",
    # Contact
    "ContactBase",
    "ContactCreate",
    "ContactUpdate",
    "ContactResponse",
    "ContactList",
    # Account
    "AccountBase",
    "AccountCreate",
    "AccountUpdate",
    "AccountResponse",
    "AccountList",
    # Activity
    "ActivityBase",
    "ActivityCreate",
    "ActivityUpdate",
    "ActivityResponse",
    "ActivityList",
    "ActivityComplete",
    "ActivitySchedule",
]
