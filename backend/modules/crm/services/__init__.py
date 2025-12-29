"""
CRM Module Services

Export all CRM services.
"""

from .pipeline_service import PipelineService
from .stage_service import StageService
from .lead_service import LeadService
from .opportunity_service import OpportunityService
from .contact_service import ContactService
from .account_service import AccountService
from .activity_service import ActivityService

__all__ = [
    "PipelineService",
    "StageService",
    "LeadService",
    "OpportunityService",
    "ContactService",
    "AccountService",
    "ActivityService",
]
