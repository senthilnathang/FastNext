"""
CRM Account Model

Company/Organization records.
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, Text, ForeignKey, Numeric,
    Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin
from .tag import account_tag_association


class AccountType(str, enum.Enum):
    """Account type classification."""
    PROSPECT = "prospect"
    CUSTOMER = "customer"
    PARTNER = "partner"
    VENDOR = "vendor"
    COMPETITOR = "competitor"
    OTHER = "other"


class AccountRating(str, enum.Enum):
    """Account rating/tier."""
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"


class Industry(str, enum.Enum):
    """Industry classification."""
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    MANUFACTURING = "manufacturing"
    RETAIL = "retail"
    EDUCATION = "education"
    GOVERNMENT = "government"
    NON_PROFIT = "non_profit"
    REAL_ESTATE = "real_estate"
    HOSPITALITY = "hospitality"
    MEDIA = "media"
    ENERGY = "energy"
    TRANSPORTATION = "transportation"
    TELECOMMUNICATIONS = "telecommunications"
    OTHER = "other"


class Account(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """
    CRM Account model.

    Represents a company or organization.
    """
    __tablename__ = "crm_accounts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Company Name
    name = Column(String(200), nullable=False, index=True)

    # Website & Contact
    website = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    fax = Column(String(50), nullable=True)

    # Classification
    account_type = Column(SQLEnum(AccountType), default=AccountType.PROSPECT, index=True)
    industry = Column(SQLEnum(Industry), nullable=True, index=True)
    rating = Column(SQLEnum(AccountRating), default=AccountRating.WARM)

    # Company Size
    employees = Column(Integer, nullable=True)
    annual_revenue = Column(Numeric(18, 2), nullable=True)

    # Assignment
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    team_id = Column(Integer, nullable=True)

    # Parent company (for hierarchies)
    parent_id = Column(Integer, ForeignKey("crm_accounts.id"), nullable=True)

    # Billing Address
    billing_street = Column(String(255), nullable=True)
    billing_street2 = Column(String(255), nullable=True)
    billing_city = Column(String(100), nullable=True)
    billing_state = Column(String(100), nullable=True)
    billing_zip = Column(String(20), nullable=True)
    billing_country = Column(String(100), nullable=True)

    # Shipping Address
    shipping_street = Column(String(255), nullable=True)
    shipping_street2 = Column(String(255), nullable=True)
    shipping_city = Column(String(100), nullable=True)
    shipping_state = Column(String(100), nullable=True)
    shipping_zip = Column(String(20), nullable=True)
    shipping_country = Column(String(100), nullable=True)

    # Social
    linkedin = Column(String(255), nullable=True)
    twitter = Column(String(255), nullable=True)
    facebook = Column(String(255), nullable=True)

    # Notes
    description = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # Custom Fields
    custom_fields = Column(JSONB, default=dict)

    # SLA/Tier
    sla_level = Column(String(50), nullable=True)
    tier = Column(String(50), nullable=True)

    # Ownership history
    ownership = Column(String(100), nullable=True)  # Public, Private, Subsidiary

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    parent = relationship("Account", remote_side=[id], backref="subsidiaries")

    contacts = relationship(
        "Contact",
        back_populates="account",
        foreign_keys="Contact.account_id"
    )

    opportunities = relationship(
        "Opportunity",
        back_populates="account",
        foreign_keys="Opportunity.account_id"
    )

    tags = relationship(
        "Tag",
        secondary=account_tag_association,
        backref="accounts"
    )

    activities = relationship(
        "CRMActivity",
        primaryjoin="and_(Account.id == foreign(CRMActivity.res_id), CRMActivity.res_model == 'account')",
        viewonly=True
    )

    def __repr__(self) -> str:
        return f"<Account(id={self.id}, name='{self.name}')>"

    @property
    def contact_count(self) -> int:
        """Number of contacts associated with this account."""
        return len(self.contacts) if self.contacts else 0

    @property
    def opportunity_count(self) -> int:
        """Number of opportunities associated with this account."""
        return len(self.opportunities) if self.opportunities else 0

    @property
    def total_opportunity_value(self):
        """Total value of all opportunities."""
        if self.opportunities:
            return sum(opp.amount or 0 for opp in self.opportunities)
        return 0
