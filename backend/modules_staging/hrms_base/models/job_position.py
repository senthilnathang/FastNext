"""
HRMS Job Position Model

Job positions/titles within the organization.
"""

from typing import Optional

from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


class JobPosition(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Job Position model.

    Represents job titles/positions within the organization.
    Each position belongs to a department and can have salary ranges.
    """
    __tablename__ = "hrms_job_positions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    name = Column(String(200), nullable=False, index=True)
    code = Column(String(50), nullable=True, index=True)
    description = Column(Text, nullable=True)

    # Department Association
    department_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True, index=True)

    # Requirements
    requirements = Column(Text, nullable=True)
    qualifications = Column(Text, nullable=True)

    # Compensation Range
    min_salary = Column(Numeric(15, 2), nullable=True)
    max_salary = Column(Numeric(15, 2), nullable=True)
    currency = Column(String(3), default="USD")

    # Headcount
    expected_employees = Column(Integer, default=1)  # Expected number of employees in this position

    # Display
    sequence = Column(Integer, default=10)

    # Relationships
    department = relationship(
        "Department",
        back_populates="job_positions",
        foreign_keys=[department_id]
    )

    def __repr__(self) -> str:
        return f"<JobPosition(id={self.id}, name='{self.name}')>"

    @property
    def salary_range(self) -> str:
        """Get formatted salary range"""
        if self.min_salary and self.max_salary:
            return f"{self.currency} {self.min_salary:,.2f} - {self.max_salary:,.2f}"
        elif self.min_salary:
            return f"{self.currency} {self.min_salary:,.2f}+"
        elif self.max_salary:
            return f"Up to {self.currency} {self.max_salary:,.2f}"
        return "Not specified"
