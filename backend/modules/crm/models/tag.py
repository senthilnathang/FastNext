"""
CRM Tag Model

Tags for categorizing leads, opportunities, contacts, and accounts.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, CompanyScopedMixin


# Association tables for many-to-many relationships
lead_tag_association = Table(
    "crm_lead_tag",
    Base.metadata,
    Column("lead_id", Integer, ForeignKey("crm_leads.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("crm_tags.id", ondelete="CASCADE"), primary_key=True),
)

opportunity_tag_association = Table(
    "crm_opportunity_tag",
    Base.metadata,
    Column("opportunity_id", Integer, ForeignKey("crm_opportunities.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("crm_tags.id", ondelete="CASCADE"), primary_key=True),
)

contact_tag_association = Table(
    "crm_contact_tag",
    Base.metadata,
    Column("contact_id", Integer, ForeignKey("crm_contacts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("crm_tags.id", ondelete="CASCADE"), primary_key=True),
)

account_tag_association = Table(
    "crm_account_tag",
    Base.metadata,
    Column("account_id", Integer, ForeignKey("crm_accounts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("crm_tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base, TimestampMixin, CompanyScopedMixin):
    """
    CRM Tag model.

    Tags for categorizing and filtering CRM records.
    Examples: "Hot Lead", "Enterprise", "Partner", "VIP"
    """
    __tablename__ = "crm_tags"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Info
    name = Column(String(50), nullable=False, index=True)
    color = Column(String(20), default="#6c757d")  # Hex color

    # Relationships (back_populates defined in respective models)

    def __repr__(self) -> str:
        return f"<Tag(id={self.id}, name='{self.name}')>"
