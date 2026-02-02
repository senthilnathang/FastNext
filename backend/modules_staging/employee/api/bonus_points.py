"""
Bonus Points API Routes
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.employee import BonusPoint, Employee
from ..schemas.bonus_points import (
    BonusPointCreate, BonusPointUpdate, BonusPointResponse,
    BonusPointListResponse
)

router = APIRouter(tags=["Bonus Points"])


@router.get("/", response_model=BonusPointListResponse)
def list_bonus_points(
    employee_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List bonus points with pagination."""
    query = db.query(BonusPoint).options(
        joinedload(BonusPoint.employee)
    ).filter(
        BonusPoint.company_id == current_user.current_company_id
    )

    if employee_id:
        query = query.filter(BonusPoint.employee_id == employee_id)

    total = query.count()
    skip = (page - 1) * page_size
    points = query.order_by(BonusPoint.created_at.desc()).offset(skip).limit(page_size).all()

    results = []
    for point in points:
        point_dict = {
            "id": point.id,
            "employee_id": point.employee_id,
            "points": point.points,
            "encashment_condition": point.encashment_condition,
            "redeeming_points": point.redeeming_points,
            "reason": point.reason,
            "company_id": point.company_id,
            "created_by": point.created_by,
            "updated_by": point.updated_by,
            "created_at": point.created_at,
            "updated_at": point.updated_at,
            "employee_first_name": point.employee.first_name if point.employee else None,
            "employee_last_name": point.employee.last_name if point.employee else None,
            "badge_id": point.employee.badge_id if point.employee else None,
            "employee_profile_url": point.employee.avatar_url if point.employee else None,
        }
        results.append(BonusPointResponse(**point_dict))

    return BonusPointListResponse(results=results, count=total)


@router.post("/", response_model=BonusPointResponse)
def create_bonus_point(
    data: BonusPointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new bonus point record."""
    # Verify employee exists
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id,
        Employee.company_id == current_user.current_company_id,
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    point = BonusPoint(
        employee_id=data.employee_id,
        points=data.points,
        encashment_condition=data.encashment_condition,
        redeeming_points=data.redeeming_points,
        reason=data.reason,
        company_id=current_user.current_company_id,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(point)
    db.commit()
    db.refresh(point)

    # Return with employee info
    return BonusPointResponse(
        id=point.id,
        employee_id=point.employee_id,
        points=point.points,
        encashment_condition=point.encashment_condition,
        redeeming_points=point.redeeming_points,
        reason=point.reason,
        company_id=point.company_id,
        created_by=point.created_by,
        updated_by=point.updated_by,
        created_at=point.created_at,
        updated_at=point.updated_at,
        employee_first_name=employee.first_name,
        employee_last_name=employee.last_name,
        badge_id=employee.badge_id,
        employee_profile_url=employee.avatar_url,
    )


@router.get("/{point_id}", response_model=BonusPointResponse)
def get_bonus_point(
    point_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific bonus point record."""
    point = db.query(BonusPoint).options(
        joinedload(BonusPoint.employee)
    ).filter(
        BonusPoint.id == point_id,
        BonusPoint.company_id == current_user.current_company_id,
    ).first()
    if not point:
        raise HTTPException(status_code=404, detail="Bonus point not found")
    return point


@router.put("/{point_id}", response_model=BonusPointResponse)
def update_bonus_point(
    point_id: int,
    data: BonusPointUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a bonus point record."""
    point = db.query(BonusPoint).filter(
        BonusPoint.id == point_id,
        BonusPoint.company_id == current_user.current_company_id,
    ).first()
    if not point:
        raise HTTPException(status_code=404, detail="Bonus point not found")

    if data.points is not None:
        point.points = data.points
    if data.encashment_condition is not None:
        point.encashment_condition = data.encashment_condition
    if data.redeeming_points is not None:
        point.redeeming_points = data.redeeming_points
    if data.reason is not None:
        point.reason = data.reason
    point.updated_by = current_user.id

    db.commit()
    db.refresh(point)
    return point


@router.delete("/{point_id}")
def delete_bonus_point(
    point_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a bonus point record."""
    point = db.query(BonusPoint).filter(
        BonusPoint.id == point_id,
        BonusPoint.company_id == current_user.current_company_id,
    ).first()
    if not point:
        raise HTTPException(status_code=404, detail="Bonus point not found")

    db.delete(point)
    db.commit()
    return {"message": "Bonus point deleted successfully"}
