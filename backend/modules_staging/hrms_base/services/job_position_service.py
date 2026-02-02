"""
Job Position Service

Business logic for job position operations.
"""

from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..models.job_position import JobPosition
from ..schemas.job_position import JobPositionCreate, JobPositionUpdate


class JobPositionService:
    """Service class for job position operations."""

    def __init__(self, db: Session):
        self.db = db

    def get(self, position_id: int, company_id: int) -> Optional[JobPosition]:
        """Get a job position by ID."""
        return self.db.query(JobPosition).filter(
            JobPosition.id == position_id,
            JobPosition.company_id == company_id,
            JobPosition.is_deleted == False
        ).first()

    def list(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        department_id: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[JobPosition], int]:
        """List job positions with filtering and pagination."""
        query = self.db.query(JobPosition).filter(
            JobPosition.company_id == company_id,
            JobPosition.is_deleted == False
        )

        if search:
            query = query.filter(
                or_(
                    JobPosition.name.ilike(f"%{search}%"),
                    JobPosition.code.ilike(f"%{search}%")
                )
            )

        if department_id is not None:
            query = query.filter(JobPosition.department_id == department_id)

        if is_active is not None:
            query = query.filter(JobPosition.is_active == is_active)

        total = query.count()
        positions = query.order_by(JobPosition.sequence, JobPosition.name).offset(skip).limit(limit).all()

        return positions, total

    def create(self, data: JobPositionCreate, company_id: int, user_id: int) -> JobPosition:
        """Create a new job position."""
        position = JobPosition(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(position)
        self.db.commit()
        self.db.refresh(position)
        return position

    def update(
        self,
        position_id: int,
        data: JobPositionUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[JobPosition]:
        """Update a job position."""
        position = self.get(position_id, company_id)
        if not position:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(position, field, value)

        position.updated_by = user_id
        self.db.commit()
        self.db.refresh(position)
        return position

    def delete(self, position_id: int, company_id: int, user_id: int) -> bool:
        """Soft delete a job position."""
        position = self.get(position_id, company_id)
        if not position:
            return False

        position.soft_delete(user_id)
        self.db.commit()
        return True

    def get_by_department(self, department_id: int, company_id: int) -> List[JobPosition]:
        """Get all positions in a department."""
        return self.db.query(JobPosition).filter(
            JobPosition.department_id == department_id,
            JobPosition.company_id == company_id,
            JobPosition.is_deleted == False,
            JobPosition.is_active == True
        ).order_by(JobPosition.sequence, JobPosition.name).all()
