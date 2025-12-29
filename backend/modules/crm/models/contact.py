"""
CRM Contact Model

Individual contacts/people associated with accounts.
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, Text, Date, ForeignKey
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin
from .tag import contact_tag_association


class Contact(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin):
    """
    CRM Contact model.

    Represents an individual person, typically associated with an Account (company).
    """
    __tablename__ = "crm_contacts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Name
    first_name = Column(String(100), nullable=False, index=True)
    last_name = Column(String(100), nullable=True, index=True)
    middle_name = Column(String(100), nullable=True)
    title = Column(String(20), nullable=True)  # Mr., Mrs., Dr., etc.

    # Contact Info
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    fax = Column(String(50), nullable=True)

    # Work Info
    job_title = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    assistant_name = Column(String(100), nullable=True)
    assistant_phone = Column(String(50), nullable=True)

    # Account relationship
    account_id = Column(Integer, ForeignKey("crm_accounts.id"), nullable=True, index=True)

    # Assignment
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Address (Mailing)
    street = Column(String(255), nullable=True)
    street2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)

    # Other Address
    other_street = Column(String(255), nullable=True)
    other_city = Column(String(100), nullable=True)
    other_state = Column(String(100), nullable=True)
    other_zip = Column(String(20), nullable=True)
    other_country = Column(String(100), nullable=True)

    # Social
    linkedin = Column(String(255), nullable=True)
    twitter = Column(String(255), nullable=True)
    facebook = Column(String(255), nullable=True)

    # Personal
    birthdate = Column(Date, nullable=True)

    # Notes
    description = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_primary = Column(Boolean, default=False)  # Primary contact for account

    # Email preferences
    do_not_call = Column(Boolean, default=False)
    email_opt_out = Column(Boolean, default=False)

    # Custom Fields
    custom_fields = Column(JSONB, default=dict)

    # Lead source tracking
    lead_source = Column(String(100), nullable=True)

    # Relationships
    account = relationship("Account", back_populates="contacts", foreign_keys=[account_id])
    user = relationship("User", foreign_keys=[user_id])

    opportunities = relationship(
        "Opportunity",
        back_populates="contact",
        foreign_keys="Opportunity.contact_id"
    )

    tags = relationship(
        "Tag",
        secondary=contact_tag_association,
        backref="contacts"
    )

    activities = relationship(
        "CRMActivity",
        primaryjoin="and_(Contact.id == foreign(CRMActivity.res_id), CRMActivity.res_model == 'contact')",
        viewonly=True
    )

    def __repr__(self) -> str:
        return f"<Contact(id={self.id}, name='{self.full_name}')>"

    @property
    def full_name(self) -> str:
        """Full name of the contact."""
        parts = []
        if self.title:
            parts.append(self.title)
        if self.first_name:
            parts.append(self.first_name)
        if self.middle_name:
            parts.append(self.middle_name)
        if self.last_name:
            parts.append(self.last_name)
        return " ".join(parts) if parts else "Unknown"

    @property
    def display_name(self) -> str:
        """Display name with company."""
        if hasattr(self, 'account') and self.account:
            return f"{self.full_name} ({self.account.name})"
        return self.full_name
