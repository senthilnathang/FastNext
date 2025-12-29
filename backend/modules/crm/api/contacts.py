"""
CRM Contact API Routes

API endpoints for CRM contact management.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..schemas.contact import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactList,
)
from ..services.contact_service import ContactService

router = APIRouter(prefix="/contacts", tags=["CRM Contacts"])


def get_contact_service(db: Session = Depends(get_db)) -> ContactService:
    """Get contact service instance."""
    return ContactService(db)


@router.get("/", response_model=ContactList)
def list_contacts(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max items to return"),
    account_id: Optional[int] = Query(None, description="Filter by account"),
    user_id: Optional[int] = Query(None, description="Filter by assigned user"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in name, email, phone"),
    service: ContactService = Depends(get_contact_service),
    current_user: User = Depends(get_current_active_user),
) -> ContactList:
    """List all contacts with pagination and filters."""
    items, total = service.get_all(
        skip=skip,
        limit=limit,
        company_id=current_user.current_company_id,
        account_id=account_id,
        user_id=user_id,
        is_active=is_active,
        search=search,
    )

    return ContactList(
        items=[ContactResponse.model_validate(item) for item in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(
    contact_id: int,
    service: ContactService = Depends(get_contact_service),
    current_user: User = Depends(get_current_active_user),
) -> ContactResponse:
    """Get a contact by ID."""
    contact = service.get_by_id(contact_id)

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with id {contact_id} not found",
        )

    return ContactResponse.model_validate(contact)


@router.post("/", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(
    data: ContactCreate,
    service: ContactService = Depends(get_contact_service),
    current_user: User = Depends(get_current_active_user),
) -> ContactResponse:
    """Create a new contact."""
    contact = service.create(
        data=data,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
    )

    return ContactResponse.model_validate(contact)


@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: int,
    data: ContactUpdate,
    service: ContactService = Depends(get_contact_service),
    current_user: User = Depends(get_current_active_user),
) -> ContactResponse:
    """Update a contact."""
    contact = service.update(contact_id, data, user_id=current_user.id)

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with id {contact_id} not found",
        )

    return ContactResponse.model_validate(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int,
    service: ContactService = Depends(get_contact_service),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete a contact (soft delete)."""
    deleted = service.delete(contact_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with id {contact_id} not found",
        )


@router.post("/{contact_id}/set-primary", response_model=ContactResponse)
def set_primary_contact(
    contact_id: int,
    service: ContactService = Depends(get_contact_service),
    current_user: User = Depends(get_current_active_user),
) -> ContactResponse:
    """Set contact as primary for its account."""
    contact = service.set_primary(contact_id, user_id=current_user.id)

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contact with id {contact_id} not found or has no account",
        )

    return ContactResponse.model_validate(contact)
