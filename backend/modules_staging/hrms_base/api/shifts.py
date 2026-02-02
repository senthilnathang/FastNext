"""
Shift API Routes

CRUD operations for shifts and schedules.
"""

from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.shift_service import ShiftService
from ..schemas.shift import (
    EmployeeShiftCreate,
    EmployeeShiftUpdate,
    EmployeeShiftResponse,
    EmployeeShiftList,
    ShiftScheduleCreate,
    ShiftScheduleUpdate,
    ShiftScheduleResponse,
    RotatingShiftCreate,
    RotatingShiftUpdate,
    RotatingShiftResponse,
)

router = APIRouter(prefix="/shifts", tags=["Shifts"])


def get_service(db: Session = Depends(get_db)) -> ShiftService:
    return ShiftService(db)


# Employee Shift Routes
@router.get("/", response_model=EmployeeShiftList)
def list_shifts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List employee shifts with filtering and pagination."""
    shifts, total = service.list_shifts(
        company_id=current_user.current_company_id,
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
    )
    return EmployeeShiftList(items=shifts, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/{shift_id}", response_model=EmployeeShiftResponse)
def get_shift(
    shift_id: int,
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get an employee shift by ID."""
    shift = service.get_shift(shift_id, current_user.current_company_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift


@router.post("/", response_model=EmployeeShiftResponse, status_code=201)
def create_shift(
    data: EmployeeShiftCreate,
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new employee shift."""
    return service.create_shift(data, current_user.current_company_id, current_user.id)


@router.put("/{shift_id}", response_model=EmployeeShiftResponse)
def update_shift(
    shift_id: int,
    data: EmployeeShiftUpdate,
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update an employee shift."""
    shift = service.update_shift(shift_id, data, current_user.current_company_id, current_user.id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift


@router.delete("/{shift_id}", status_code=204)
def delete_shift(
    shift_id: int,
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete an employee shift."""
    if not service.delete_shift(shift_id, current_user.current_company_id, current_user.id):
        raise HTTPException(status_code=404, detail="Shift not found")
    return None


# Shift Schedule Routes
@router.get("/schedules/", response_model=List[ShiftScheduleResponse])
def list_schedules(
    employee_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List shift schedules with filtering."""
    schedules, _ = service.list_schedules(
        company_id=current_user.current_company_id,
        employee_id=employee_id,
        shift_id=shift_id,
        skip=skip,
        limit=limit,
    )
    return schedules


@router.get("/schedules/employee/{employee_id}", response_model=ShiftScheduleResponse)
def get_employee_schedule(
    employee_id: int,
    for_date: Optional[date] = None,
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get current schedule for an employee."""
    schedule = service.get_employee_schedule(
        employee_id=employee_id,
        company_id=current_user.current_company_id,
        for_date=for_date,
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="No schedule found for employee")
    return schedule


@router.post("/schedules/", response_model=ShiftScheduleResponse, status_code=201)
def create_schedule(
    data: ShiftScheduleCreate,
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new shift schedule."""
    return service.create_schedule(data, current_user.current_company_id, current_user.id)


@router.put("/schedules/{schedule_id}", response_model=ShiftScheduleResponse)
def update_schedule(
    schedule_id: int,
    data: ShiftScheduleUpdate,
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a shift schedule."""
    schedule = service.update_schedule(schedule_id, data, current_user.current_company_id, current_user.id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.delete("/schedules/{schedule_id}", status_code=204)
def delete_schedule(
    schedule_id: int,
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete a shift schedule."""
    if not service.delete_schedule(schedule_id, current_user.current_company_id):
        raise HTTPException(status_code=404, detail="Schedule not found")
    return None


# Rotating Shift Routes
@router.get("/rotating/", response_model=List[RotatingShiftResponse])
def list_rotating_shifts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """List rotating shifts."""
    shifts, _ = service.list_rotating_shifts(
        company_id=current_user.current_company_id,
        skip=skip,
        limit=limit,
    )
    return shifts


@router.get("/rotating/{rotating_id}", response_model=RotatingShiftResponse)
def get_rotating_shift(
    rotating_id: int,
    service: ShiftService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get a rotating shift by ID."""
    shift = service.get_rotating_shift(rotating_id, current_user.current_company_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Rotating shift not found")
    return shift
