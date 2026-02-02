"""
Employee Type Service

Business logic for employee type operations.
"""

from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..models.employee_type import EmployeeType
from ..schemas.employee_type import EmployeeTypeCreate, EmployeeTypeUpdate


class EmployeeTypeService:
    """Service class for employee type operations."""

    def __init__(self, db: Session):
        self.db = db

    def get(self, type_id: int, company_id: int) -> Optional[EmployeeType]:
        """Get an employee type by ID."""
        return self.db.query(EmployeeType).filter(
            EmployeeType.id == type_id,
            EmployeeType.company_id == company_id,
            EmployeeType.is_deleted == False
        ).first()

    def get_by_code(self, code: str, company_id: int) -> Optional[EmployeeType]:
        """Get an employee type by code."""
        return self.db.query(EmployeeType).filter(
            EmployeeType.code == code,
            EmployeeType.company_id == company_id,
            EmployeeType.is_deleted == False
        ).first()

    def list(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[EmployeeType], int]:
        """List employee types with filtering and pagination."""
        query = self.db.query(EmployeeType).filter(
            EmployeeType.company_id == company_id,
            EmployeeType.is_deleted == False
        )

        if search:
            query = query.filter(
                or_(
                    EmployeeType.name.ilike(f"%{search}%"),
                    EmployeeType.code.ilike(f"%{search}%")
                )
            )

        if is_active is not None:
            query = query.filter(EmployeeType.is_active == is_active)

        total = query.count()
        types = query.order_by(EmployeeType.sequence, EmployeeType.name).offset(skip).limit(limit).all()

        return types, total

    def create(self, data: EmployeeTypeCreate, company_id: int, user_id: int) -> EmployeeType:
        """Create a new employee type."""
        emp_type = EmployeeType(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(emp_type)
        self.db.commit()
        self.db.refresh(emp_type)
        return emp_type

    def update(
        self,
        type_id: int,
        data: EmployeeTypeUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[EmployeeType]:
        """Update an employee type."""
        emp_type = self.get(type_id, company_id)
        if not emp_type:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(emp_type, field, value)

        emp_type.updated_by = user_id
        self.db.commit()
        self.db.refresh(emp_type)
        return emp_type

    def delete(self, type_id: int, company_id: int, user_id: int) -> bool:
        """Soft delete an employee type."""
        emp_type = self.get(type_id, company_id)
        if not emp_type:
            return False

        emp_type.soft_delete(user_id)
        self.db.commit()
        return True
