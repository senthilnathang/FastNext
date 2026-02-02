"""
Work Type Service

Business logic for work type and request operations.
"""

from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..models.work_type import WorkType, WorkTypeRequest, ShiftRequest, RequestStatus
from ..schemas.work_type import WorkTypeCreate, WorkTypeUpdate, WorkTypeRequestCreate, ShiftRequestCreate


class WorkTypeService:
    """Service class for work type operations."""

    def __init__(self, db: Session):
        self.db = db

    # Work Type Methods
    def get_work_type(self, type_id: int, company_id: int) -> Optional[WorkType]:
        """Get a work type by ID."""
        return self.db.query(WorkType).filter(
            WorkType.id == type_id,
            WorkType.company_id == company_id,
            WorkType.is_deleted == False
        ).first()

    def list_work_types(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[WorkType], int]:
        """List work types with filtering and pagination."""
        query = self.db.query(WorkType).filter(
            WorkType.company_id == company_id,
            WorkType.is_deleted == False
        )

        if search:
            query = query.filter(
                or_(
                    WorkType.name.ilike(f"%{search}%"),
                    WorkType.code.ilike(f"%{search}%")
                )
            )

        if is_active is not None:
            query = query.filter(WorkType.is_active == is_active)

        total = query.count()
        types = query.order_by(WorkType.sequence, WorkType.name).offset(skip).limit(limit).all()

        return types, total

    def create_work_type(self, data: WorkTypeCreate, company_id: int, user_id: int) -> WorkType:
        """Create a new work type."""
        work_type = WorkType(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(work_type)
        self.db.commit()
        self.db.refresh(work_type)
        return work_type

    def update_work_type(
        self,
        type_id: int,
        data: WorkTypeUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[WorkType]:
        """Update a work type."""
        work_type = self.get_work_type(type_id, company_id)
        if not work_type:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(work_type, field, value)

        work_type.updated_by = user_id
        self.db.commit()
        self.db.refresh(work_type)
        return work_type

    def delete_work_type(self, type_id: int, company_id: int, user_id: int) -> bool:
        """Soft delete a work type."""
        work_type = self.get_work_type(type_id, company_id)
        if not work_type:
            return False

        work_type.soft_delete(user_id)
        self.db.commit()
        return True

    # Work Type Request Methods
    def get_work_type_request(self, request_id: int, company_id: int) -> Optional[WorkTypeRequest]:
        """Get a work type request by ID."""
        return self.db.query(WorkTypeRequest).filter(
            WorkTypeRequest.id == request_id,
            WorkTypeRequest.company_id == company_id
        ).first()

    def list_work_type_requests(
        self,
        company_id: int,
        employee_id: Optional[int] = None,
        status: Optional[RequestStatus] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[WorkTypeRequest], int]:
        """List work type requests with filtering."""
        query = self.db.query(WorkTypeRequest).filter(
            WorkTypeRequest.company_id == company_id
        )

        if employee_id:
            query = query.filter(WorkTypeRequest.employee_id == employee_id)

        if status:
            query = query.filter(WorkTypeRequest.status == status)

        total = query.count()
        requests = query.order_by(WorkTypeRequest.created_at.desc()).offset(skip).limit(limit).all()

        return requests, total

    def create_work_type_request(
        self,
        data: WorkTypeRequestCreate,
        employee_id: int,
        company_id: int,
        user_id: int
    ) -> WorkTypeRequest:
        """Create a new work type request."""
        request = WorkTypeRequest(
            **data.model_dump(),
            employee_id=employee_id,
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def approve_work_type_request(
        self,
        request_id: int,
        company_id: int,
        approver_id: int
    ) -> Optional[WorkTypeRequest]:
        """Approve a work type request."""
        request = self.get_work_type_request(request_id, company_id)
        if not request or request.status != RequestStatus.PENDING:
            return None

        request.approve(approver_id)
        self.db.commit()
        self.db.refresh(request)
        return request

    def reject_work_type_request(
        self,
        request_id: int,
        company_id: int,
        approver_id: int,
        reason: Optional[str] = None
    ) -> Optional[WorkTypeRequest]:
        """Reject a work type request."""
        request = self.get_work_type_request(request_id, company_id)
        if not request or request.status != RequestStatus.PENDING:
            return None

        request.reject(approver_id, reason)
        self.db.commit()
        self.db.refresh(request)
        return request

    # Shift Request Methods
    def get_shift_request(self, request_id: int, company_id: int) -> Optional[ShiftRequest]:
        """Get a shift request by ID."""
        return self.db.query(ShiftRequest).filter(
            ShiftRequest.id == request_id,
            ShiftRequest.company_id == company_id
        ).first()

    def list_shift_requests(
        self,
        company_id: int,
        employee_id: Optional[int] = None,
        status: Optional[RequestStatus] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[ShiftRequest], int]:
        """List shift requests with filtering."""
        query = self.db.query(ShiftRequest).filter(
            ShiftRequest.company_id == company_id
        )

        if employee_id:
            query = query.filter(ShiftRequest.employee_id == employee_id)

        if status:
            query = query.filter(ShiftRequest.status == status)

        total = query.count()
        requests = query.order_by(ShiftRequest.created_at.desc()).offset(skip).limit(limit).all()

        return requests, total

    def create_shift_request(
        self,
        data: ShiftRequestCreate,
        employee_id: int,
        company_id: int,
        user_id: int
    ) -> ShiftRequest:
        """Create a new shift request."""
        request = ShiftRequest(
            **data.model_dump(),
            employee_id=employee_id,
            company_id=company_id,
            request_date=date.today(),
            created_by=user_id
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def approve_shift_request(
        self,
        request_id: int,
        company_id: int,
        approver_id: int
    ) -> Optional[ShiftRequest]:
        """Approve a shift request."""
        request = self.get_shift_request(request_id, company_id)
        if not request or request.status != RequestStatus.PENDING:
            return None

        request.approve(approver_id)
        self.db.commit()
        self.db.refresh(request)
        return request

    def reject_shift_request(
        self,
        request_id: int,
        company_id: int,
        approver_id: int,
        reason: Optional[str] = None
    ) -> Optional[ShiftRequest]:
        """Reject a shift request."""
        request = self.get_shift_request(request_id, company_id)
        if not request or request.status != RequestStatus.PENDING:
            return None

        request.reject(approver_id, reason)
        self.db.commit()
        self.db.refresh(request)
        return request
