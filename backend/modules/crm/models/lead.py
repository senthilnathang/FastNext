"""
CRM Lead Model

Sales leads with pipeline stage tracking and conversion capability.
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
from .tag import lead_tag_association


class LeadPriority(str, enum.Enum):
    """Lead priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class LeadRating(str, enum.Enum):
    """Lead temperature rating."""
    COLD = "cold"
    WARM = "warm"
    HOT = "hot"


class LeadSource(str, enum.Enum):
    """Lead source channels."""
    WEBSITE = "website"
    REFERRAL = "referral"
    COLD_CALL = "cold_call"
    ADVERTISEMENT = "advertisement"
    TRADE_SHOW = "trade_show"
    SOCIAL_MEDIA = "social_media"
    EMAIL_CAMPAIGN = "email_campaign"
    PARTNER = "partner"
    OTHER = "other"


class Lead(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """
    CRM Lead model.

    Represents a potential customer or sales opportunity that hasn't been qualified yet.
    Leads can be converted to Opportunities + Contacts + Accounts.
    """
    __tablename__ = "crm_leads"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Lead Title/Name
    name = Column(String(200), nullable=False, index=True)

    # Contact Information
    contact_name = Column(String(100), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    job_title = Column(String(100), nullable=True)

    # Company Information
    company_name = Column(String(200), nullable=True, index=True)
    website = Column(String(255), nullable=True)
    industry = Column(String(100), nullable=True)
    employees = Column(Integer, nullable=True)

    # Pipeline & Stage
    pipeline_id = Column(Integer, ForeignKey("crm_pipelines.id"), nullable=True, index=True)
    stage_id = Column(Integer, ForeignKey("crm_stages.id"), nullable=True, index=True)

    # Classification
    priority = Column(SQLEnum(LeadPriority), default=LeadPriority.MEDIUM, index=True)
    rating = Column(SQLEnum(LeadRating), default=LeadRating.WARM, index=True)
    source = Column(SQLEnum(LeadSource), default=LeadSource.WEBSITE, index=True)

    # Assignment
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    team_id = Column(Integer, nullable=True)  # Future: sales team

    # Financial
    expected_revenue = Column(Numeric(15, 2), default=0)
    probability = Column(Integer, default=10)  # 0-100%

    # Dates
    date_deadline = Column(Date, nullable=True)
    date_conversion = Column(DateTime(timezone=True), nullable=True)
    date_last_activity = Column(DateTime(timezone=True), nullable=True)

    # Conversion
    # Note: use_alter=True defers FK constraint creation to avoid circular dependency
    # between crm_leads and crm_opportunities tables
    is_converted = Column(Boolean, default=False, index=True)
    converted_opportunity_id = Column(
        Integer,
        ForeignKey("crm_opportunities.id", use_alter=True, name="fk_lead_converted_opportunity"),
        nullable=True
    )
    converted_contact_id = Column(Integer, ForeignKey("crm_contacts.id"), nullable=True)
    converted_account_id = Column(Integer, ForeignKey("crm_accounts.id"), nullable=True)

    # Lost
    is_lost = Column(Boolean, default=False, index=True)
    lost_reason = Column(String(255), nullable=True)
    date_lost = Column(DateTime(timezone=True), nullable=True)

    # Address
    street = Column(String(255), nullable=True)
    street2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)

    # Social
    linkedin = Column(String(255), nullable=True)
    twitter = Column(String(255), nullable=True)
    facebook = Column(String(255), nullable=True)

    # Notes & Description
    description = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)

    # Custom Fields (JSON for flexibility)
    custom_fields = Column(JSONB, default=dict)

    # Activity Tracking
    activity_count = Column(Integer, default=0)
    next_activity_date = Column(Date, nullable=True)
    next_activity_summary = Column(String(255), nullable=True)

    # Relationships
    pipeline = relationship("Pipeline", back_populates="leads", foreign_keys=[pipeline_id])
    stage = relationship("Stage", back_populates="leads", foreign_keys=[stage_id])
    user = relationship("User", foreign_keys=[user_id])

    tags = relationship(
        "Tag",
        secondary=lead_tag_association,
        backref="leads"
    )

    activities = relationship(
        "CRMActivity",
        primaryjoin="and_(Lead.id == foreign(CRMActivity.res_id), CRMActivity.res_model == 'lead')",
        viewonly=True
    )

    converted_opportunity = relationship(
        "Opportunity",
        foreign_keys=[converted_opportunity_id],
        post_update=True
    )

    def __repr__(self) -> str:
        return f"<Lead(id={self.id}, name='{self.name}')>"

    @property
    def expected_revenue_weighted(self) -> Decimal:
        """Calculate weighted revenue based on probability."""
        if self.expected_revenue and self.probability:
            return Decimal(self.expected_revenue) * Decimal(self.probability) / 100
        return Decimal(0)

    @property
    def display_name(self) -> str:
        """Display name for the lead."""
        if self.contact_name and self.company_name:
            return f"{self.contact_name} - {self.company_name}"
        return self.name

    def mark_lost(self, reason: Optional[str] = None) -> None:
        """Mark lead as lost."""
        self.is_lost = True
        self.lost_reason = reason
        self.date_lost = datetime.utcnow()

    def can_convert(self) -> bool:
        """Check if lead can be converted."""
        return not self.is_converted and not self.is_lost
