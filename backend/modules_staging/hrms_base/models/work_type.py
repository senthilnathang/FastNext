"""
HRMS Work Type Models

Work arrangements (office, remote, hybrid) and related requests.
"""

from datetime import date, datetime
from typing import Optional, List
import enum

from sqlalchemy import Column, Integer, String, Boolean, Text, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


class WorkType(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Work Type model.

    Defines work arrangements such as office, remote, hybrid, field work, etc.
    """
    __tablename__ = "hrms_work_types"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(20), nullable=True, index=True)
    description = Column(Text, nullable=True)

    # Classification
    is_remote = Column(Boolean, default=False)
    requires_location = Column(Boolean, default=True)  # Must clock from specific location

    # Policies
    max_days_per_week = Column(Integer, nullable=True)  # Max days allowed per week
    max_days_per_month = Column(Integer, nullable=True)  # Max days allowed per month
    requires_approval = Column(Boolean, default=False)

    # Display
    color = Column(String(20), nullable=True)
    icon = Column(String(50), nullable=True)  # Icon name
    sequence = Column(Integer, default=10)

    def __repr__(self) -> str:
        return f"<WorkType(id={self.id}, name='{self.name}', code='{self.code}')>"


class RotatingWorkType(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Rotating Work Type model.

    Defines rotating work type patterns (e.g., 3 days office, 2 days remote).
    """
    __tablename__ = "hrms_rotating_work_types"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Rotation Configuration
    # JSON: [{"work_type_id": 1, "days": 3}, {"work_type_id": 2, "days": 2}]
    rotation_pattern = Column(JSONB, default=list)
    rotation_start_date = Column(Date, nullable=True)

    # Rotation Period
    rotation_period_days = Column(Integer, default=7)

    # Relationships
    assignments = relationship(
        "RotatingWorkTypeAssignment",
        back_populates="rotating_work_type",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<RotatingWorkType(id={self.id}, name='{self.name}')>"

    def get_current_work_type_id(self, for_date: date) -> Optional[int]:
        """Get the work type ID for a specific date based on rotation pattern"""
        if not self.rotation_pattern or not self.rotation_start_date:
            return None

        days_since_start = (for_date - self.rotation_start_date).days
        if days_since_start < 0:
            return None

        cycle_day = days_since_start % self.rotation_period_days

        accumulated_days = 0
        for pattern in self.rotation_pattern:
            accumulated_days += pattern.get("days", 0)
            if cycle_day < accumulated_days:
                return pattern.get("work_type_id")

        return None


class RotatingWorkTypeAssignment(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    Assignment of employees to rotating work types.
    """
    __tablename__ = "hrms_rotating_work_type_assignments"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rotating_work_type_id = Column(Integer, ForeignKey("hrms_rotating_work_types.id"), nullable=False, index=True)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    offset_days = Column(Integer, default=0)
    is_current = Column(Boolean, default=True, index=True)

    # Relationships
    employee = relationship("User", foreign_keys=[employee_id])
    rotating_work_type = relationship("RotatingWorkType", back_populates="assignments")


class RequestStatus(str, enum.Enum):
    """Request status enum"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class WorkTypeRequest(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    Work Type Request model.

    Employee requests to change work type for specific dates.
    """
    __tablename__ = "hrms_work_type_requests"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Requestor
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Request Details
    work_type_id = Column(Integer, ForeignKey("hrms_work_types.id"), nullable=False, index=True)
    previous_work_type_id = Column(Integer, ForeignKey("hrms_work_types.id"), nullable=True)

    # Date Range
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True)  # NULL for single day

    # Request Info
    reason = Column(Text, nullable=True)
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, index=True)

    # Approval
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Relationships
    employee = relationship("User", foreign_keys=[employee_id], backref="work_type_requests")
    work_type = relationship("WorkType", foreign_keys=[work_type_id])
    previous_work_type = relationship("WorkType", foreign_keys=[previous_work_type_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])

    def __repr__(self) -> str:
        return f"<WorkTypeRequest(id={self.id}, employee={self.employee_id}, status={self.status})>"

    def approve(self, approver_id: int) -> None:
        """Approve the request"""
        self.status = RequestStatus.APPROVED
        self.approved_by_id = approver_id
        self.approved_at = datetime.utcnow()

    def reject(self, approver_id: int, reason: Optional[str] = None) -> None:
        """Reject the request"""
        self.status = RequestStatus.REJECTED
        self.approved_by_id = approver_id
        self.approved_at = datetime.utcnow()
        self.rejection_reason = reason

    def cancel(self) -> None:
        """Cancel the request"""
        self.status = RequestStatus.CANCELLED


class ShiftRequest(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    Shift Request model.

    Employee requests to change shift for specific dates.
    """
    __tablename__ = "hrms_shift_requests"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Requestor
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Request Details
    shift_id = Column(Integer, ForeignKey("hrms_employee_shifts.id"), nullable=False, index=True)
    previous_shift_id = Column(Integer, ForeignKey("hrms_employee_shifts.id"), nullable=True)

    # Date Range
    request_date = Column(Date, nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

    # Request Info
    reason = Column(Text, nullable=True)
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, index=True)

    # Approval
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Relationships
    employee = relationship("User", foreign_keys=[employee_id], backref="shift_requests")
    shift = relationship("EmployeeShift", foreign_keys=[shift_id])
    previous_shift = relationship("EmployeeShift", foreign_keys=[previous_shift_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])

    def __repr__(self) -> str:
        return f"<ShiftRequest(id={self.id}, employee={self.employee_id}, status={self.status})>"

    def approve(self, approver_id: int) -> None:
        """Approve the request"""
        self.status = RequestStatus.APPROVED
        self.approved_by_id = approver_id
        self.approved_at = datetime.utcnow()

    def reject(self, approver_id: int, reason: Optional[str] = None) -> None:
        """Reject the request"""
        self.status = RequestStatus.REJECTED
        self.approved_by_id = approver_id
        self.approved_at = datetime.utcnow()
        self.rejection_reason = reason

    def cancel(self) -> None:
        """Cancel the request"""
        self.status = RequestStatus.CANCELLED
