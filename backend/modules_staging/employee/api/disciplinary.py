"""
Disciplinary Actions API Routes
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.employee import (
    ActionType, DisciplinaryAction, DisciplinaryActionEmployee, Employee
)
from ..schemas.disciplinary import (
    ActionTypeCreate, ActionTypeUpdate, ActionTypeResponse,
    DisciplinaryActionCreate, DisciplinaryActionUpdate, DisciplinaryActionResponse,
    DisciplinaryActionListResponse, DisciplinaryEmployeeInfo
)

router = APIRouter(tags=["Disciplinary"])


# Action Types

@router.get("/action-types/", response_model=List[ActionTypeResponse])
def list_action_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all action types."""
    types = db.query(ActionType).filter(
        ActionType.company_id == current_user.current_company_id
    ).all()
    return types


@router.post("/action-types/", response_model=ActionTypeResponse)
def create_action_type(
    data: ActionTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new action type."""
    action_type = ActionType(
        title=data.title,
        action_type=data.action_type,
        block_option=data.block_option,
        company_id=current_user.current_company_id,
    )
    db.add(action_type)
    db.commit()
    db.refresh(action_type)
    return action_type


@router.put("/action-types/{type_id}", response_model=ActionTypeResponse)
def update_action_type(
    type_id: int,
    data: ActionTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an action type."""
    action_type = db.query(ActionType).filter(
        ActionType.id == type_id,
        ActionType.company_id == current_user.current_company_id,
    ).first()
    if not action_type:
        raise HTTPException(status_code=404, detail="Action type not found")

    if data.title is not None:
        action_type.title = data.title
    if data.action_type is not None:
        action_type.action_type = data.action_type
    if data.block_option is not None:
        action_type.block_option = data.block_option

    db.commit()
    db.refresh(action_type)
    return action_type


@router.delete("/action-types/{type_id}")
def delete_action_type(
    type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an action type."""
    action_type = db.query(ActionType).filter(
        ActionType.id == type_id,
        ActionType.company_id == current_user.current_company_id,
    ).first()
    if not action_type:
        raise HTTPException(status_code=404, detail="Action type not found")

    db.delete(action_type)
    db.commit()
    return {"message": "Action type deleted successfully"}


# Disciplinary Actions

@router.get("/", response_model=DisciplinaryActionListResponse)
def list_disciplinary_actions(
    employee_id: Optional[int] = None,
    action_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List disciplinary actions with pagination."""
    query = db.query(DisciplinaryAction).options(
        joinedload(DisciplinaryAction.action),
        joinedload(DisciplinaryAction.employees).joinedload(DisciplinaryActionEmployee.employee)
    ).filter(
        DisciplinaryAction.company_id == current_user.current_company_id
    )

    if action_id:
        query = query.filter(DisciplinaryAction.action_id == action_id)

    if employee_id:
        query = query.join(DisciplinaryActionEmployee).filter(
            DisciplinaryActionEmployee.employee_id == employee_id
        )

    total = query.count()
    skip = (page - 1) * page_size
    actions = query.order_by(DisciplinaryAction.created_at.desc()).offset(skip).limit(page_size).all()

    results = []
    for action in actions:
        employees_info = []
        for dae in action.employees:
            if dae.employee:
                employees_info.append(DisciplinaryEmployeeInfo(
                    id=dae.employee.id,
                    employee_first_name=dae.employee.first_name,
                    employee_last_name=dae.employee.last_name,
                    badge_id=dae.employee.badge_id,
                ))

        results.append(DisciplinaryActionResponse(
            id=action.id,
            action_id=action.action_id,
            description=action.description,
            unit_in=action.unit_in,
            days=action.days,
            hours=action.hours,
            start_date=action.start_date,
            attachment=action.attachment,
            company_id=action.company_id,
            created_by=action.created_by,
            updated_by=action.updated_by,
            created_at=action.created_at,
            updated_at=action.updated_at,
            action_title=action.action.title if action.action else None,
            employees=employees_info,
        ))

    return DisciplinaryActionListResponse(results=results, count=total)


@router.post("/", response_model=DisciplinaryActionResponse)
def create_disciplinary_action(
    data: DisciplinaryActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new disciplinary action."""
    # Verify action type exists
    action_type = db.query(ActionType).filter(
        ActionType.id == data.action_id,
        ActionType.company_id == current_user.current_company_id,
    ).first()
    if not action_type:
        raise HTTPException(status_code=404, detail="Action type not found")

    action = DisciplinaryAction(
        action_id=data.action_id,
        description=data.description,
        unit_in=data.unit_in,
        days=data.days,
        hours=data.hours,
        start_date=data.start_date,
        attachment=data.attachment,
        company_id=current_user.current_company_id,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(action)
    db.flush()

    # Add employees
    for emp_id in data.employee_ids:
        employee = db.query(Employee).filter(
            Employee.id == emp_id,
            Employee.company_id == current_user.current_company_id,
        ).first()
        if employee:
            dae = DisciplinaryActionEmployee(
                disciplinary_action_id=action.id,
                employee_id=emp_id,
            )
            db.add(dae)

    db.commit()
    db.refresh(action)
    return action


@router.get("/{action_id}", response_model=DisciplinaryActionResponse)
def get_disciplinary_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific disciplinary action."""
    action = db.query(DisciplinaryAction).options(
        joinedload(DisciplinaryAction.action),
        joinedload(DisciplinaryAction.employees).joinedload(DisciplinaryActionEmployee.employee)
    ).filter(
        DisciplinaryAction.id == action_id,
        DisciplinaryAction.company_id == current_user.current_company_id,
    ).first()
    if not action:
        raise HTTPException(status_code=404, detail="Disciplinary action not found")
    return action


@router.put("/{action_id}", response_model=DisciplinaryActionResponse)
def update_disciplinary_action(
    action_id: int,
    data: DisciplinaryActionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a disciplinary action."""
    action = db.query(DisciplinaryAction).filter(
        DisciplinaryAction.id == action_id,
        DisciplinaryAction.company_id == current_user.current_company_id,
    ).first()
    if not action:
        raise HTTPException(status_code=404, detail="Disciplinary action not found")

    if data.action_id is not None:
        action.action_id = data.action_id
    if data.description is not None:
        action.description = data.description
    if data.unit_in is not None:
        action.unit_in = data.unit_in
    if data.days is not None:
        action.days = data.days
    if data.hours is not None:
        action.hours = data.hours
    if data.start_date is not None:
        action.start_date = data.start_date
    if data.attachment is not None:
        action.attachment = data.attachment

    # Update employees if provided
    if data.employee_ids is not None:
        # Remove existing
        db.query(DisciplinaryActionEmployee).filter(
            DisciplinaryActionEmployee.disciplinary_action_id == action_id
        ).delete()
        # Add new
        for emp_id in data.employee_ids:
            dae = DisciplinaryActionEmployee(
                disciplinary_action_id=action_id,
                employee_id=emp_id,
            )
            db.add(dae)

    action.updated_by = current_user.id
    db.commit()
    db.refresh(action)
    return action


@router.delete("/{action_id}")
def delete_disciplinary_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a disciplinary action."""
    action = db.query(DisciplinaryAction).filter(
        DisciplinaryAction.id == action_id,
        DisciplinaryAction.company_id == current_user.current_company_id,
    ).first()
    if not action:
        raise HTTPException(status_code=404, detail="Disciplinary action not found")

    db.delete(action)
    db.commit()
    return {"message": "Disciplinary action deleted successfully"}
