"""
Shift Service

Business logic for shift and schedule operations.
"""

from datetime import date
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from ..models.shift import EmployeeShift, ShiftSchedule, RotatingShift
from ..schemas.shift import EmployeeShiftCreate, EmployeeShiftUpdate, ShiftScheduleCreate, ShiftScheduleUpdate


class ShiftService:
    """Service class for shift operations."""

    def __init__(self, db: Session):
        self.db = db

    # Employee Shift Methods
    def get_shift(self, shift_id: int, company_id: int) -> Optional[EmployeeShift]:
        """Get an employee shift by ID."""
        return self.db.query(EmployeeShift).filter(
            EmployeeShift.id == shift_id,
            EmployeeShift.company_id == company_id,
            EmployeeShift.is_deleted == False
        ).first()

    def list_shifts(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[EmployeeShift], int]:
        """List employee shifts with filtering and pagination."""
        query = self.db.query(EmployeeShift).filter(
            EmployeeShift.company_id == company_id,
            EmployeeShift.is_deleted == False
        )

        if search:
            query = query.filter(
                or_(
                    EmployeeShift.name.ilike(f"%{search}%"),
                    EmployeeShift.code.ilike(f"%{search}%")
                )
            )

        if is_active is not None:
            query = query.filter(EmployeeShift.is_active == is_active)

        total = query.count()
        shifts = query.order_by(EmployeeShift.sequence, EmployeeShift.name).offset(skip).limit(limit).all()

        return shifts, total

    def create_shift(self, data: EmployeeShiftCreate, company_id: int, user_id: int) -> EmployeeShift:
        """Create a new employee shift."""
        shift = EmployeeShift(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(shift)
        self.db.commit()
        self.db.refresh(shift)
        return shift

    def update_shift(
        self,
        shift_id: int,
        data: EmployeeShiftUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[EmployeeShift]:
        """Update an employee shift."""
        shift = self.get_shift(shift_id, company_id)
        if not shift:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(shift, field, value)

        shift.updated_by = user_id
        self.db.commit()
        self.db.refresh(shift)
        return shift

    def delete_shift(self, shift_id: int, company_id: int, user_id: int) -> bool:
        """Soft delete an employee shift."""
        shift = self.get_shift(shift_id, company_id)
        if not shift:
            return False

        shift.soft_delete(user_id)
        self.db.commit()
        return True

    # Shift Schedule Methods
    def get_schedule(self, schedule_id: int, company_id: int) -> Optional[ShiftSchedule]:
        """Get a shift schedule by ID."""
        return self.db.query(ShiftSchedule).filter(
            ShiftSchedule.id == schedule_id,
            ShiftSchedule.company_id == company_id
        ).first()

    def get_employee_schedule(
        self,
        employee_id: int,
        company_id: int,
        for_date: Optional[date] = None
    ) -> Optional[ShiftSchedule]:
        """Get current schedule for an employee."""
        query = self.db.query(ShiftSchedule).filter(
            ShiftSchedule.employee_id == employee_id,
            ShiftSchedule.company_id == company_id,
            ShiftSchedule.is_current == True
        )

        if for_date:
            query = query.filter(
                ShiftSchedule.start_date <= for_date,
                or_(
                    ShiftSchedule.end_date.is_(None),
                    ShiftSchedule.end_date >= for_date
                )
            )

        return query.first()

    def list_schedules(
        self,
        company_id: int,
        employee_id: Optional[int] = None,
        shift_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[ShiftSchedule], int]:
        """List shift schedules with filtering."""
        query = self.db.query(ShiftSchedule).filter(
            ShiftSchedule.company_id == company_id
        )

        if employee_id:
            query = query.filter(ShiftSchedule.employee_id == employee_id)

        if shift_id:
            query = query.filter(ShiftSchedule.shift_id == shift_id)

        total = query.count()
        schedules = query.order_by(ShiftSchedule.start_date.desc()).offset(skip).limit(limit).all()

        return schedules, total

    def create_schedule(self, data: ShiftScheduleCreate, company_id: int, user_id: int) -> ShiftSchedule:
        """Create a new shift schedule."""
        # Deactivate existing schedules for this employee if new one is current
        if data.is_current:
            self.db.query(ShiftSchedule).filter(
                ShiftSchedule.employee_id == data.employee_id,
                ShiftSchedule.company_id == company_id,
                ShiftSchedule.is_current == True
            ).update({"is_current": False})

        schedule = ShiftSchedule(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(schedule)
        self.db.commit()
        self.db.refresh(schedule)
        return schedule

    def update_schedule(
        self,
        schedule_id: int,
        data: ShiftScheduleUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[ShiftSchedule]:
        """Update a shift schedule."""
        schedule = self.get_schedule(schedule_id, company_id)
        if not schedule:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(schedule, field, value)

        schedule.updated_by = user_id
        self.db.commit()
        self.db.refresh(schedule)
        return schedule

    def delete_schedule(self, schedule_id: int, company_id: int) -> bool:
        """Delete a shift schedule."""
        schedule = self.get_schedule(schedule_id, company_id)
        if not schedule:
            return False

        self.db.delete(schedule)
        self.db.commit()
        return True

    # Rotating Shift Methods
    def get_rotating_shift(self, rotating_id: int, company_id: int) -> Optional[RotatingShift]:
        """Get a rotating shift by ID."""
        return self.db.query(RotatingShift).filter(
            RotatingShift.id == rotating_id,
            RotatingShift.company_id == company_id,
            RotatingShift.is_deleted == False
        ).first()

    def list_rotating_shifts(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[RotatingShift], int]:
        """List rotating shifts."""
        query = self.db.query(RotatingShift).filter(
            RotatingShift.company_id == company_id,
            RotatingShift.is_deleted == False
        )

        total = query.count()
        shifts = query.order_by(RotatingShift.name).offset(skip).limit(limit).all()

        return shifts, total
