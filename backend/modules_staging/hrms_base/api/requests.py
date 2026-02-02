"""
Request API Routes

CRUD operations for work type and shift requests.
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.work_type import RequestStatus
from ..services.work_type_service import WorkTypeService
from ..schemas.work_type import (
    WorkTypeRequestCreate,
    WorkTypeRequestResponse,
    ShiftRequestCreate,
    ShiftRequestResponse,
    RequestApproval,
)

router = APIRouter(prefix="/requests", tags=["Requests"])


def get_service(db: Session = Depends(get_db)) -> WorkTypeService:
    return WorkTypeService(db)


# Work Type Request Routes
@router.get("/work-type/", response_model=List[WorkTypeRequestResponse])
def list_work_type_requests(
    employee_id: Optional[int] = None,
    status: Optional[RequestStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List work type requests with filtering."""
    requests, _ = service.list_work_type_requests(
        company_id=current_user.current_company_id,
        employee_id=employee_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return requests


@router.get("/work-type/my-requests", response_model=List[WorkTypeRequestResponse])
def list_my_work_type_requests(
    status: Optional[RequestStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List current user's work type requests."""
    requests, _ = service.list_work_type_requests(
        company_id=current_user.current_company_id,
        employee_id=current_user.id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return requests


@router.post("/work-type/", response_model=WorkTypeRequestResponse, status_code=201)
def create_work_type_request(
    data: WorkTypeRequestCreate,
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new work type request."""
    return service.create_work_type_request(
        data=data,
        employee_id=current_user.id,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
    )


@router.post("/work-type/{request_id}/approve", response_model=WorkTypeRequestResponse)
def approve_work_type_request(
    request_id: int,
    approval: RequestApproval,
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Approve or reject a work type request."""
    if approval.action == "approve":
        request = service.approve_work_type_request(
            request_id=request_id,
            company_id=current_user.current_company_id,
            approver_id=current_user.id,
        )
    elif approval.action == "reject":
        request = service.reject_work_type_request(
            request_id=request_id,
            company_id=current_user.current_company_id,
            approver_id=current_user.id,
            reason=approval.reason,
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'.")

    if not request:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    return request


# Shift Request Routes
@router.get("/shift/", response_model=List[ShiftRequestResponse])
def list_shift_requests(
    employee_id: Optional[int] = None,
    status: Optional[RequestStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List shift requests with filtering."""
    requests, _ = service.list_shift_requests(
        company_id=current_user.current_company_id,
        employee_id=employee_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return requests


@router.get("/shift/my-requests", response_model=List[ShiftRequestResponse])
def list_my_shift_requests(
    status: Optional[RequestStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List current user's shift requests."""
    requests, _ = service.list_shift_requests(
        company_id=current_user.current_company_id,
        employee_id=current_user.id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return requests


@router.post("/shift/", response_model=ShiftRequestResponse, status_code=201)
def create_shift_request(
    data: ShiftRequestCreate,
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new shift request."""
    return service.create_shift_request(
        data=data,
        employee_id=current_user.id,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
    )


@router.post("/shift/{request_id}/approve", response_model=ShiftRequestResponse)
def approve_shift_request(
    request_id: int,
    approval: RequestApproval,
    service: WorkTypeService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Approve or reject a shift request."""
    if approval.action == "approve":
        request = service.approve_shift_request(
            request_id=request_id,
            company_id=current_user.current_company_id,
            approver_id=current_user.id,
        )
    elif approval.action == "reject":
        request = service.reject_shift_request(
            request_id=request_id,
            company_id=current_user.current_company_id,
            approver_id=current_user.id,
            reason=approval.reason,
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'.")

    if not request:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    return request
