"""
Job Role Service

Business logic for job role operations.
"""

from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..models.job_role import JobRole
from ..schemas.job_role import JobRoleCreate, JobRoleUpdate


class JobRoleService:
    """Service class for job role operations."""

    def __init__(self, db: Session):
        self.db = db

    def get(self, role_id: int, company_id: int) -> Optional[JobRole]:
        """Get a job role by ID."""
        return self.db.query(JobRole).filter(
            JobRole.id == role_id,
            JobRole.company_id == company_id,
            JobRole.is_deleted == False
        ).first()

    def list(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        level: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[JobRole], int]:
        """List job roles with filtering and pagination."""
        query = self.db.query(JobRole).filter(
            JobRole.company_id == company_id,
            JobRole.is_deleted == False
        )

        if search:
            query = query.filter(
                or_(
                    JobRole.name.ilike(f"%{search}%"),
                    JobRole.code.ilike(f"%{search}%")
                )
            )

        if level is not None:
            query = query.filter(JobRole.level == level)

        if is_active is not None:
            query = query.filter(JobRole.is_active == is_active)

        total = query.count()
        roles = query.order_by(JobRole.level.desc(), JobRole.sequence, JobRole.name).offset(skip).limit(limit).all()

        return roles, total

    def create(self, data: JobRoleCreate, company_id: int, user_id: int) -> JobRole:
        """Create a new job role."""
        role = JobRole(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role

    def update(
        self,
        role_id: int,
        data: JobRoleUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[JobRole]:
        """Update a job role."""
        role = self.get(role_id, company_id)
        if not role:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(role, field, value)

        role.updated_by = user_id
        self.db.commit()
        self.db.refresh(role)
        return role

    def delete(self, role_id: int, company_id: int, user_id: int) -> bool:
        """Soft delete a job role."""
        role = self.get(role_id, company_id)
        if not role:
            return False

        role.soft_delete(user_id)
        self.db.commit()
        return True
