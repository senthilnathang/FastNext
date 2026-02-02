"""
Policies API Routes
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.employee import Policy, PolicyAttachment, PolicyEmployee, Employee
from ..schemas.policies import (
    PolicyCreate, PolicyUpdate, PolicyResponse, PolicyListResponse
)

router = APIRouter(tags=["Policies"])


@router.get("/", response_model=PolicyListResponse)
def list_policies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all policies for the current company."""
    query = db.query(Policy).options(
        joinedload(Policy.attachments),
        joinedload(Policy.specific_employees)
    ).filter(
        Policy.company_id == current_user.current_company_id
    )

    total = query.count()
    skip = (page - 1) * page_size
    policies = query.order_by(Policy.created_at.desc()).offset(skip).limit(page_size).all()

    results = []
    for policy in policies:
        results.append(PolicyResponse(
            id=policy.id,
            title=policy.title,
            body=policy.body,
            is_visible_to_all=policy.is_visible_to_all,
            company_id=policy.company_id,
            created_by=policy.created_by,
            updated_by=policy.updated_by,
            created_at=policy.created_at,
            updated_at=policy.updated_at,
            attachments=[
                {"id": a.id, "file_name": a.file_name, "file_path": a.file_path}
                for a in policy.attachments
            ],
            specific_employees=[pe.employee_id for pe in policy.specific_employees],
        ))

    return PolicyListResponse(results=results, count=total)


@router.post("/", response_model=PolicyResponse)
def create_policy(
    data: PolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new policy."""
    policy = Policy(
        title=data.title,
        body=data.body,
        is_visible_to_all=data.is_visible_to_all,
        company_id=current_user.current_company_id,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(policy)
    db.flush()

    # Add specific employees if not visible to all
    if not data.is_visible_to_all and data.specific_employee_ids:
        for emp_id in data.specific_employee_ids:
            pe = PolicyEmployee(
                policy_id=policy.id,
                employee_id=emp_id,
            )
            db.add(pe)

    db.commit()
    db.refresh(policy)
    return PolicyResponse(
        id=policy.id,
        title=policy.title,
        body=policy.body,
        is_visible_to_all=policy.is_visible_to_all,
        company_id=policy.company_id,
        created_by=policy.created_by,
        updated_by=policy.updated_by,
        created_at=policy.created_at,
        updated_at=policy.updated_at,
        attachments=[],
        specific_employees=data.specific_employee_ids or [],
    )


@router.get("/{policy_id}", response_model=PolicyResponse)
def get_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific policy."""
    policy = db.query(Policy).options(
        joinedload(Policy.attachments),
        joinedload(Policy.specific_employees)
    ).filter(
        Policy.id == policy_id,
        Policy.company_id == current_user.current_company_id,
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    return PolicyResponse(
        id=policy.id,
        title=policy.title,
        body=policy.body,
        is_visible_to_all=policy.is_visible_to_all,
        company_id=policy.company_id,
        created_by=policy.created_by,
        updated_by=policy.updated_by,
        created_at=policy.created_at,
        updated_at=policy.updated_at,
        attachments=[
            {"id": a.id, "file_name": a.file_name, "file_path": a.file_path}
            for a in policy.attachments
        ],
        specific_employees=[pe.employee_id for pe in policy.specific_employees],
    )


@router.put("/{policy_id}", response_model=PolicyResponse)
def update_policy(
    policy_id: int,
    data: PolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a policy."""
    policy = db.query(Policy).filter(
        Policy.id == policy_id,
        Policy.company_id == current_user.current_company_id,
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    if data.title is not None:
        policy.title = data.title
    if data.body is not None:
        policy.body = data.body
    if data.is_visible_to_all is not None:
        policy.is_visible_to_all = data.is_visible_to_all

    # Update specific employees if provided
    if data.specific_employee_ids is not None:
        # Remove existing
        db.query(PolicyEmployee).filter(
            PolicyEmployee.policy_id == policy_id
        ).delete()
        # Add new
        for emp_id in data.specific_employee_ids:
            pe = PolicyEmployee(
                policy_id=policy_id,
                employee_id=emp_id,
            )
            db.add(pe)

    policy.updated_by = current_user.id
    db.commit()
    db.refresh(policy)
    return policy


@router.delete("/{policy_id}")
def delete_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a policy."""
    policy = db.query(Policy).filter(
        Policy.id == policy_id,
        Policy.company_id == current_user.current_company_id,
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    db.delete(policy)
    db.commit()
    return {"message": "Policy deleted successfully"}
