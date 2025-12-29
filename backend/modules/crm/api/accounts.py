"""
CRM Account API Routes

API endpoints for CRM account management.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..schemas.account import (
    AccountCreate,
    AccountUpdate,
    AccountResponse,
    AccountList,
)
from ..services.account_service import AccountService

router = APIRouter(prefix="/accounts", tags=["CRM Accounts"])


def get_account_service(db: Session = Depends(get_db)) -> AccountService:
    """Get account service instance."""
    return AccountService(db)


@router.get("/", response_model=AccountList)
def list_accounts(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max items to return"),
    user_id: Optional[int] = Query(None, description="Filter by assigned user"),
    account_type: Optional[str] = Query(None, description="Filter by account type"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in name, website, phone"),
    service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_active_user),
) -> AccountList:
    """List all accounts with pagination and filters."""
    items, total = service.get_all(
        skip=skip,
        limit=limit,
        company_id=current_user.current_company_id,
        user_id=user_id,
        account_type=account_type,
        industry=industry,
        is_active=is_active,
        search=search,
    )

    return AccountList(
        items=[AccountResponse.model_validate(item) for item in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: int,
    service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_active_user),
) -> AccountResponse:
    """Get an account by ID."""
    account = service.get_by_id(account_id)

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found",
        )

    return AccountResponse.model_validate(account)


@router.get("/{account_id}/subsidiaries", response_model=List[AccountResponse])
def get_subsidiaries(
    account_id: int,
    service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_active_user),
) -> List[AccountResponse]:
    """Get subsidiary accounts."""
    subsidiaries = service.get_subsidiaries(account_id)
    return [AccountResponse.model_validate(a) for a in subsidiaries]


@router.get("/{account_id}/hierarchy", response_model=List[AccountResponse])
def get_hierarchy(
    account_id: int,
    service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_active_user),
) -> List[AccountResponse]:
    """Get account hierarchy (parent chain)."""
    hierarchy = service.get_hierarchy(account_id)
    return [AccountResponse.model_validate(a) for a in hierarchy]


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    data: AccountCreate,
    service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_active_user),
) -> AccountResponse:
    """Create a new account."""
    account = service.create(
        data=data,
        company_id=current_user.current_company_id,
        user_id=current_user.id,
    )

    return AccountResponse.model_validate(account)


@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    data: AccountUpdate,
    service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_active_user),
) -> AccountResponse:
    """Update an account."""
    account = service.update(account_id, data, user_id=current_user.id)

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found",
        )

    return AccountResponse.model_validate(account)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int,
    service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete an account (soft delete)."""
    deleted = service.delete(account_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found",
        )
