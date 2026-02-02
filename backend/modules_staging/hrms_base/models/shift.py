"""
HRMS Shift Models

Employee shifts, schedules, and rotating shift patterns.
"""

from datetime import time, date, datetime
from typing import Optional, List
import enum

from sqlalchemy import Column, Integer, String, Boolean, Text, Time, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


class EmployeeShift(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Employee Shift model.

    Defines work shifts with start/end times and break configurations.
    """
    __tablename__ = "hrms_employee_shifts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(20), nullable=True, index=True)
    description = Column(Text, nullable=True)

    # Timing
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Break Configuration
    break_start_time = Column(Time, nullable=True)
    break_end_time = Column(Time, nullable=True)
    break_duration_minutes = Column(Integer, default=60)

    # Grace Periods
    late_grace_minutes = Column(Integer, default=15)
    early_out_grace_minutes = Column(Integer, default=10)

    # Minimum Work Hours
    minimum_work_hours = Column(Integer, default=8)
    full_day_hours = Column(Integer, default=8)
    half_day_hours = Column(Integer, default=4)

    # Flags
    is_night_shift = Column(Boolean, default=False)
    is_flexible = Column(Boolean, default=False)

    # Display
    color = Column(String(20), nullable=True)
    sequence = Column(Integer, default=10)

    # Relationships
    schedules = relationship("ShiftSchedule", back_populates="shift", cascade="all, delete-orphan")
    grace_times = relationship("GraceTime", back_populates="shift", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<EmployeeShift(id={self.id}, name='{self.name}', start={self.start_time}, end={self.end_time})>"

    @property
    def duration_hours(self) -> float:
        """Calculate shift duration in hours"""
        start_minutes = self.start_time.hour * 60 + self.start_time.minute
        end_minutes = self.end_time.hour * 60 + self.end_time.minute

        if end_minutes < start_minutes:  # Night shift crosses midnight
            end_minutes += 24 * 60

        total_minutes = end_minutes - start_minutes - (self.break_duration_minutes or 0)
        return total_minutes / 60

    @property
    def formatted_time(self) -> str:
        """Get formatted shift time range"""
        return f"{self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}"


class GraceTime(Base, TimestampMixin, CompanyScopedMixin):
    """
    Grace Time configuration for shifts.

    Defines grace periods for late arrival and early departure.
    """
    __tablename__ = "hrms_grace_times"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    shift_id = Column(Integer, ForeignKey("hrms_employee_shifts.id"), nullable=False, index=True)

    # Grace Periods
    late_grace_minutes = Column(Integer, default=15)
    early_out_grace_minutes = Column(Integer, default=10)

    # Penalties
    late_penalty_per_occurrence = Column(Integer, default=0)  # In minutes deducted
    early_out_penalty_per_occurrence = Column(Integer, default=0)

    # Limits
    max_late_occurrences_per_month = Column(Integer, default=3)
    max_early_out_occurrences_per_month = Column(Integer, default=3)

    # Relationships
    shift = relationship("EmployeeShift", back_populates="grace_times")


class ShiftSchedule(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    Shift Schedule model.

    Assigns shifts to employees for specific date ranges.
    """
    __tablename__ = "hrms_shift_schedules"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Assignment
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    shift_id = Column(Integer, ForeignKey("hrms_employee_shifts.id"), nullable=False, index=True)

    # Date Range
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True, index=True)  # NULL means ongoing

    # Days of Week (JSON array: [0=Mon, 1=Tue, ..., 6=Sun])
    days_of_week = Column(JSONB, default=[0, 1, 2, 3, 4])  # Monday to Friday default

    # Status
    is_current = Column(Boolean, default=True, index=True)

    # Relationships
    employee = relationship("User", foreign_keys=[employee_id])
    shift = relationship("EmployeeShift", back_populates="schedules")

    def __repr__(self) -> str:
        return f"<ShiftSchedule(id={self.id}, employee={self.employee_id}, shift={self.shift_id})>"

    def is_active_on_date(self, check_date: date) -> bool:
        """Check if schedule is active on a specific date"""
        if check_date < self.start_date:
            return False
        if self.end_date and check_date > self.end_date:
            return False
        if self.days_of_week:
            return check_date.weekday() in self.days_of_week
        return True


class RotatingShift(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Rotating Shift model.

    Defines rotating shift patterns that cycle through multiple shifts.
    """
    __tablename__ = "hrms_rotating_shifts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Rotation Configuration
    # JSON: [{"shift_id": 1, "days": 7}, {"shift_id": 2, "days": 7}]
    rotation_pattern = Column(JSONB, default=list)
    rotation_start_date = Column(Date, nullable=True)

    # Rotation Period
    rotation_period_days = Column(Integer, default=14)  # Total days in rotation cycle

    # Relationships
    assignments = relationship("RotatingShiftAssignment", back_populates="rotating_shift", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<RotatingShift(id={self.id}, name='{self.name}')>"

    def get_current_shift_id(self, for_date: date) -> Optional[int]:
        """Get the shift ID for a specific date based on rotation pattern"""
        if not self.rotation_pattern or not self.rotation_start_date:
            return None

        days_since_start = (for_date - self.rotation_start_date).days
        if days_since_start < 0:
            return None

        # Calculate position in rotation cycle
        cycle_day = days_since_start % self.rotation_period_days

        # Find which shift is active
        accumulated_days = 0
        for pattern in self.rotation_pattern:
            accumulated_days += pattern.get("days", 0)
            if cycle_day < accumulated_days:
                return pattern.get("shift_id")

        return None


class RotatingShiftAssignment(Base, TimestampMixin, AuditMixin, CompanyScopedMixin):
    """
    Assignment of employees to rotating shifts.
    """
    __tablename__ = "hrms_rotating_shift_assignments"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rotating_shift_id = Column(Integer, ForeignKey("hrms_rotating_shifts.id"), nullable=False, index=True)

    # Date Range
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

    # Offset (days offset from rotation start for this employee)
    offset_days = Column(Integer, default=0)

    is_current = Column(Boolean, default=True, index=True)

    # Relationships
    employee = relationship("User", foreign_keys=[employee_id])
    rotating_shift = relationship("RotatingShift", back_populates="assignments")
