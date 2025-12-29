"""
CRM Opportunity Model

Sales opportunities/deals with pipeline stage tracking.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Column, Integer, String, Boolean, Text, Date, DateTime,
    ForeignKey, Numeric, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin
from .tag import opportunity_tag_association


class OpportunityType(str, enum.Enum):
    """Opportunity/deal type."""
    NEW_BUSINESS = "new_business"
    EXISTING_BUSINESS = "existing_business"
    RENEWAL = "renewal"
    UPSELL = "upsell"


class OpportunityPriority(str, enum.Enum):
    """Opportunity priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Opportunity(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """
    CRM Opportunity model.

    Represents a qualified sales opportunity or deal in the pipeline.
    """
    __tablename__ = "crm_opportunities"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Deal Name
    name = Column(String(200), nullable=False, index=True)

    # Relationships to other CRM records
    account_id = Column(Integer, ForeignKey("crm_accounts.id"), nullable=True, index=True)
    contact_id = Column(Integer, ForeignKey("crm_contacts.id"), nullable=True, index=True)
    lead_id = Column(Integer, ForeignKey("crm_leads.id"), nullable=True, index=True)

    # Pipeline & Stage
    pipeline_id = Column(Integer, ForeignKey("crm_pipelines.id"), nullable=True, index=True)
    stage_id = Column(Integer, ForeignKey("crm_stages.id"), nullable=True, index=True)

    # Financial
    amount = Column(Numeric(15, 2), default=0, index=True)
    currency = Column(String(3), default="USD")
    probability = Column(Integer, default=10)  # 0-100%

    # Calculated revenue (amount * probability / 100)
    expected_revenue = Column(Numeric(15, 2), default=0)

    # Classification
    opportunity_type = Column(SQLEnum(OpportunityType), default=OpportunityType.NEW_BUSINESS)
    priority = Column(SQLEnum(OpportunityPriority), default=OpportunityPriority.MEDIUM, index=True)

    # Assignment
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    team_id = Column(Integer, nullable=True)  # Future: sales team

    # Dates
    date_deadline = Column(Date, nullable=True, index=True)  # Expected close date
    date_closed = Column(Date, nullable=True)  # Actual close date

    # Status
    is_won = Column(Boolean, default=False, index=True)
    is_lost = Column(Boolean, default=False, index=True)
    lost_reason = Column(String(255), nullable=True)
    competitor = Column(String(200), nullable=True)

    # Next Steps
    next_action = Column(String(255), nullable=True)
    next_action_date = Column(Date, nullable=True)

    # Notes & Description
    description = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)

    # Custom Fields
    custom_fields = Column(JSONB, default=dict)

    # Activity Tracking
    activity_count = Column(Integer, default=0)
    date_last_activity = Column(DateTime(timezone=True), nullable=True)

    # Campaign tracking
    campaign_id = Column(Integer, nullable=True)
    source = Column(String(100), nullable=True)
    medium = Column(String(100), nullable=True)

    # Relationships
    pipeline = relationship("Pipeline", back_populates="opportunities", foreign_keys=[pipeline_id])
    stage = relationship("Stage", back_populates="opportunities", foreign_keys=[stage_id])
    user = relationship("User", foreign_keys=[user_id])
    account = relationship("Account", back_populates="opportunities", foreign_keys=[account_id])
    contact = relationship("Contact", back_populates="opportunities", foreign_keys=[contact_id])
    lead = relationship("Lead", foreign_keys=[lead_id])

    tags = relationship(
        "Tag",
        secondary=opportunity_tag_association,
        backref="opportunities"
    )

    activities = relationship(
        "CRMActivity",
        primaryjoin="and_(Opportunity.id == foreign(CRMActivity.res_id), CRMActivity.res_model == 'opportunity')",
        viewonly=True
    )

    def __repr__(self) -> str:
        return f"<Opportunity(id={self.id}, name='{self.name}', amount={self.amount})>"

    @property
    def is_open(self) -> bool:
        """Check if opportunity is still open."""
        return not self.is_won and not self.is_lost

    @property
    def weighted_amount(self) -> Decimal:
        """Calculate weighted amount based on probability."""
        if self.amount and self.probability:
            return Decimal(self.amount) * Decimal(self.probability) / 100
        return Decimal(0)

    def update_expected_revenue(self) -> None:
        """Update expected revenue based on amount and probability."""
        self.expected_revenue = self.weighted_amount

    def mark_won(self) -> None:
        """Mark opportunity as won."""
        self.is_won = True
        self.is_lost = False
        self.date_closed = date.today()
        self.probability = 100

    def mark_lost(self, reason: Optional[str] = None, competitor: Optional[str] = None) -> None:
        """Mark opportunity as lost."""
        self.is_lost = True
        self.is_won = False
        self.date_closed = date.today()
        self.probability = 0
        self.lost_reason = reason
        self.competitor = competitor
