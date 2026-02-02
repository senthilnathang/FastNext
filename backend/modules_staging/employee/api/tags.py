"""
Employee Tags API Routes
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.employee import EmployeeTag
from ..schemas.tags import EmployeeTagCreate, EmployeeTagUpdate, EmployeeTagResponse

router = APIRouter(tags=["Employee Tags"])


@router.get("/", response_model=List[EmployeeTagResponse])
def list_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all employee tags for the current company."""
    tags = db.query(EmployeeTag).filter(
        EmployeeTag.company_id == current_user.current_company_id
    ).all()
    return tags


@router.post("/", response_model=EmployeeTagResponse)
def create_tag(
    data: EmployeeTagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new employee tag."""
    tag = EmployeeTag(
        title=data.title,
        color=data.color,
        company_id=current_user.current_company_id,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.get("/{tag_id}", response_model=EmployeeTagResponse)
def get_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific employee tag."""
    tag = db.query(EmployeeTag).filter(
        EmployeeTag.id == tag_id,
        EmployeeTag.company_id == current_user.current_company_id,
    ).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.put("/{tag_id}", response_model=EmployeeTagResponse)
def update_tag(
    tag_id: int,
    data: EmployeeTagUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an employee tag."""
    tag = db.query(EmployeeTag).filter(
        EmployeeTag.id == tag_id,
        EmployeeTag.company_id == current_user.current_company_id,
    ).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    if data.title is not None:
        tag.title = data.title
    if data.color is not None:
        tag.color = data.color

    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}")
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an employee tag."""
    tag = db.query(EmployeeTag).filter(
        EmployeeTag.id == tag_id,
        EmployeeTag.company_id == current_user.current_company_id,
    ).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    db.delete(tag)
    db.commit()
    return {"message": "Tag deleted successfully"}
