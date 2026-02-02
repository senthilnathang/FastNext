"""
HRMS Employee Type Model

Employee classification types (full-time, part-time, contract, intern, etc.)
"""

from typing import Optional

from sqlalchemy import Column, Integer, String, Boolean, Text

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


class EmployeeType(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Employee Type model.

    Defines employment classifications such as full-time, part-time,
    contract, intern, freelance, etc.
    """
    __tablename__ = "hrms_employee_types"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(20), nullable=False, index=True)  # FT, PT, CON, INT
    description = Column(Text, nullable=True)

    # Classification
    is_permanent = Column(Boolean, default=True)  # Permanent vs temporary
    is_billable = Column(Boolean, default=True)   # Can be billed to clients

    # Benefits & Policies
    has_benefits = Column(Boolean, default=True)  # Eligible for benefits
    probation_days = Column(Integer, default=90)  # Probation period in days
    notice_period_days = Column(Integer, default=30)  # Notice period in days

    # Display
    color = Column(String(20), nullable=True)
    sequence = Column(Integer, default=10)

    def __repr__(self) -> str:
        return f"<EmployeeType(id={self.id}, name='{self.name}', code='{self.code}')>"
