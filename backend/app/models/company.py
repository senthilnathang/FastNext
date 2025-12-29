"""Company model for multi-company support"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.models.base import AuditableModel


class Company(AuditableModel):
    """Company model for multi-tenant/multi-company support"""

    __tablename__ = "companies"

    # Basic info
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Hierarchy - parent company for branches
    parent_company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Contact info
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)

    # Business info
    tax_id = Column(String(50), nullable=True)
    registration_number = Column(String(100), nullable=True)

    # Settings
    date_format = Column(String(20), default="YYYY-MM-DD")
    time_format = Column(String(20), default="HH:mm:ss")
    timezone = Column(String(50), default="UTC")
    currency = Column(String(10), default="USD")
    logo_url = Column(String(500), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_headquarters = Column(Boolean, default=False, nullable=False)

    # Relationships
    parent_company = relationship(
        "Company",
        remote_side="Company.id",
        foreign_keys=[parent_company_id],
        backref="branches",
    )

    # Users with roles in this company
    user_roles = relationship(
        "UserCompanyRole",
        back_populates="company",
        cascade="all, delete-orphan",
    )

    # Groups belonging to this company
    groups = relationship(
        "Group",
        back_populates="company",
        cascade="all, delete-orphan",
    )

    # Company-specific roles
    roles = relationship(
        "Role",
        back_populates="company",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Company(id={self.id}, name='{self.name}', code='{self.code}')>"

    @property
    def full_address(self) -> str:
        """Get formatted full address"""
        parts = [self.address, self.city, self.state, self.zip_code, self.country]
        return ", ".join(filter(None, parts))
