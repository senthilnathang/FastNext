"""
Department Service

Business logic for department operations.
"""

from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..models.department import Department
from ..schemas.department import DepartmentCreate, DepartmentUpdate


class DepartmentService:
    """Service class for department operations."""

    def __init__(self, db: Session):
        self.db = db

    def get(self, department_id: int, company_id: int) -> Optional[Department]:
        """Get a department by ID."""
        return self.db.query(Department).filter(
            Department.id == department_id,
            Department.company_id == company_id,
            Department.is_deleted == False
        ).first()

    def get_by_code(self, code: str, company_id: int) -> Optional[Department]:
        """Get a department by code."""
        return self.db.query(Department).filter(
            Department.code == code,
            Department.company_id == company_id,
            Department.is_deleted == False
        ).first()

    def list(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        parent_id: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[Department], int]:
        """List departments with filtering and pagination."""
        query = self.db.query(Department).filter(
            Department.company_id == company_id,
            Department.is_deleted == False
        )

        if search:
            query = query.filter(
                or_(
                    Department.name.ilike(f"%{search}%"),
                    Department.code.ilike(f"%{search}%")
                )
            )

        if parent_id is not None:
            query = query.filter(Department.parent_id == parent_id)

        if is_active is not None:
            query = query.filter(Department.is_active == is_active)

        total = query.count()
        departments = query.order_by(Department.sequence, Department.name).offset(skip).limit(limit).all()

        return departments, total

    def get_tree(self, company_id: int, parent_id: Optional[int] = None) -> List[Department]:
        """Get departments as a tree structure."""
        query = self.db.query(Department).filter(
            Department.company_id == company_id,
            Department.is_deleted == False,
            Department.is_active == True
        )

        if parent_id is None:
            query = query.filter(Department.parent_id.is_(None))
        else:
            query = query.filter(Department.parent_id == parent_id)

        return query.order_by(Department.sequence, Department.name).all()

    def create(self, data: DepartmentCreate, company_id: int, user_id: int) -> Department:
        """Create a new department."""
        department = Department(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(department)
        self.db.commit()
        self.db.refresh(department)
        return department

    def update(
        self,
        department_id: int,
        data: DepartmentUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[Department]:
        """Update a department."""
        department = self.get(department_id, company_id)
        if not department:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(department, field, value)

        department.updated_by = user_id
        self.db.commit()
        self.db.refresh(department)
        return department

    def delete(self, department_id: int, company_id: int, user_id: int) -> bool:
        """Soft delete a department."""
        department = self.get(department_id, company_id)
        if not department:
            return False

        department.soft_delete(user_id)
        self.db.commit()
        return True

    def get_children(self, department_id: int, company_id: int) -> List[Department]:
        """Get child departments."""
        return self.db.query(Department).filter(
            Department.parent_id == department_id,
            Department.company_id == company_id,
            Department.is_deleted == False
        ).order_by(Department.sequence, Department.name).all()

    def get_all_children_ids(self, department_id: int, company_id: int) -> List[int]:
        """Get all child department IDs recursively."""
        result = []
        children = self.get_children(department_id, company_id)
        for child in children:
            result.append(child.id)
            result.extend(self.get_all_children_ids(child.id, company_id))
        return result
