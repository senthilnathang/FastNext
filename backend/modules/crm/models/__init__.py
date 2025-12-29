"""
CRM Module Models

Export all CRM models for use in the application.
"""

from .pipeline import Pipeline
from .stage import Stage
from .tag import Tag, lead_tag_association, opportunity_tag_association, contact_tag_association, account_tag_association
from .lead import Lead, LeadPriority, LeadRating, LeadSource
from .opportunity import Opportunity, OpportunityType, OpportunityPriority
from .contact import Contact
from .account import Account, AccountType, AccountRating, Industry
from .activity import CRMActivity, ActivityType, ActivityStatus, ActivityPriority

__all__ = [
    # Pipeline & Stages
    "Pipeline",
    "Stage",

    # Tags
    "Tag",
    "lead_tag_association",
    "opportunity_tag_association",
    "contact_tag_association",
    "account_tag_association",

    # Lead
    "Lead",
    "LeadPriority",
    "LeadRating",
    "LeadSource",

    # Opportunity
    "Opportunity",
    "OpportunityType",
    "OpportunityPriority",

    # Contact
    "Contact",

    # Account
    "Account",
    "AccountType",
    "AccountRating",
    "Industry",

    # Activity
    "CRMActivity",
    "ActivityType",
    "ActivityStatus",
    "ActivityPriority",
]
