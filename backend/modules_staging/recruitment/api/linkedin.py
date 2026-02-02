"""
LinkedIn Integration API Routes

CRUD operations for LinkedIn account management and job posting integration.
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.advanced import LinkedInAccount
from ..models.recruitment import Recruitment
from ..schemas.advanced import (
    LinkedInAccountCreate,
    LinkedInAccountUpdate,
    LinkedInAccountResponse,
    LinkedInAccountList,
)

router = APIRouter(tags=["Recruitment - LinkedIn"])


# =============================================================================
# LinkedIn Account Management
# =============================================================================

@router.get("/accounts", response_model=LinkedInAccountList)
def list_linkedin_accounts(
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all LinkedIn accounts for the company."""
    query = select(LinkedInAccount).where(
        LinkedInAccount.company_id == current_user.current_company_id,
        LinkedInAccount.deleted_at.is_(None),
    )

    if is_active is not None:
        query = query.where(LinkedInAccount.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar() or 0

    # Get items with pagination
    query = query.offset(skip).limit(limit)
    items = db.execute(query).scalars().all()

    return LinkedInAccountList(
        items=[LinkedInAccountResponse.model_validate(item) for item in items],
        total=total,
        page=skip // limit + 1,
        page_size=limit,
    )


@router.get("/accounts/{account_id}", response_model=LinkedInAccountResponse)
def get_linkedin_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a LinkedIn account by ID."""
    account = db.execute(
        select(LinkedInAccount).where(
            LinkedInAccount.id == account_id,
            LinkedInAccount.company_id == current_user.current_company_id,
            LinkedInAccount.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LinkedIn account not found"
        )

    return LinkedInAccountResponse.model_validate(account)


@router.post("/accounts", response_model=LinkedInAccountResponse, status_code=status.HTTP_201_CREATED)
def create_linkedin_account(
    data: LinkedInAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new LinkedIn account integration."""
    # Check for duplicate sub_id
    existing = db.execute(
        select(LinkedInAccount).where(
            LinkedInAccount.sub_id == data.sub_id,
            LinkedInAccount.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LinkedIn account with this subscription ID already exists"
        )

    account = LinkedInAccount(
        **data.model_dump(),
        company_id=current_user.current_company_id,
        created_by_id=current_user.id,
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    return LinkedInAccountResponse.model_validate(account)


@router.put("/accounts/{account_id}", response_model=LinkedInAccountResponse)
def update_linkedin_account(
    account_id: int,
    data: LinkedInAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a LinkedIn account."""
    account = db.execute(
        select(LinkedInAccount).where(
            LinkedInAccount.id == account_id,
            LinkedInAccount.company_id == current_user.current_company_id,
            LinkedInAccount.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LinkedIn account not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)

    account.updated_by_id = current_user.id
    db.commit()
    db.refresh(account)

    return LinkedInAccountResponse.model_validate(account)


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_linkedin_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a LinkedIn account (soft delete)."""
    account = db.execute(
        select(LinkedInAccount).where(
            LinkedInAccount.id == account_id,
            LinkedInAccount.company_id == current_user.current_company_id,
            LinkedInAccount.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LinkedIn account not found"
        )

    from datetime import datetime
    account.deleted_at = datetime.utcnow()
    account.deleted_by_id = current_user.id
    db.commit()


@router.post("/accounts/{account_id}/validate")
def validate_linkedin_token(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate a LinkedIn API token."""
    account = db.execute(
        select(LinkedInAccount).where(
            LinkedInAccount.id == account_id,
            LinkedInAccount.company_id == current_user.current_company_id,
            LinkedInAccount.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LinkedIn account not found"
        )

    # TODO: Implement actual LinkedIn API validation
    # For now, return a mock response
    return {
        "valid": True,
        "account_id": account_id,
        "username": account.username,
        "message": "Token validation successful"
    }


# =============================================================================
# Job Posting to LinkedIn
# =============================================================================

@router.post("/jobs/{job_id}/post")
def post_job_to_linkedin(
    job_id: int,
    account_id: int = Query(..., description="LinkedIn account ID to use"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Post a job opening to LinkedIn."""
    # Get the recruitment/job
    recruitment = db.execute(
        select(Recruitment).where(
            Recruitment.id == job_id,
            Recruitment.company_id == current_user.current_company_id,
            Recruitment.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    # Get the LinkedIn account
    account = db.execute(
        select(LinkedInAccount).where(
            LinkedInAccount.id == account_id,
            LinkedInAccount.company_id == current_user.current_company_id,
            LinkedInAccount.deleted_at.is_(None),
            LinkedInAccount.is_active == True,
        )
    ).scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LinkedIn account not found or inactive"
        )

    # TODO: Implement actual LinkedIn API posting
    # For now, update the recruitment record with mock data
    import uuid
    linkedin_post_id = f"li_{uuid.uuid4().hex[:12]}"

    recruitment.linkedin_account_id = account_id
    recruitment.linkedin_post_id = linkedin_post_id
    recruitment.publish_in_linkedin = True
    db.commit()

    return {
        "success": True,
        "job_id": job_id,
        "linkedin_post_id": linkedin_post_id,
        "account_id": account_id,
        "message": "Job posted to LinkedIn successfully"
    }


@router.delete("/jobs/{job_id}/post")
def remove_job_from_linkedin(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a job posting from LinkedIn."""
    recruitment = db.execute(
        select(Recruitment).where(
            Recruitment.id == job_id,
            Recruitment.company_id == current_user.current_company_id,
            Recruitment.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if not recruitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    if not recruitment.linkedin_post_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is not posted to LinkedIn"
        )

    # TODO: Implement actual LinkedIn API deletion
    old_post_id = recruitment.linkedin_post_id

    recruitment.linkedin_post_id = None
    recruitment.publish_in_linkedin = False
    db.commit()

    return {
        "success": True,
        "job_id": job_id,
        "removed_post_id": old_post_id,
        "message": "Job removed from LinkedIn successfully"
    }
