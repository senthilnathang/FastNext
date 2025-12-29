"""Company management endpoints"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, get_pagination, PaginationParams
from app.api.deps.auth import PermissionChecker
from app.models import User, Company
from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse,
    CompanyList,
)
from app.services.base import BaseService

router = APIRouter()


@router.get("/", response_model=CompanyList)
def list_companies(
    pagination: PaginationParams = Depends(get_pagination),
    is_active: bool = None,
    current_user: User = Depends(PermissionChecker("company.read")),
    db: Session = Depends(get_db),
):
    """List all companies"""
    service = BaseService(db, Company)

    filters = {}
    if is_active is not None:
        filters["is_active"] = is_active

    companies = service.get_multi(
        skip=pagination.skip,
        limit=pagination.page_size,
        filters=filters,
    )
    total = service.count(filters=filters)

    return CompanyList(
        total=total,
        items=[CompanyResponse.model_validate(c) for c in companies],
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/my-companies", response_model=List[CompanyResponse])
def get_my_companies(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get companies the current user belongs to"""
    from app.services.user import UserService

    user_service = UserService(db)
    companies = user_service.get_user_companies(current_user)

    return [CompanyResponse.model_validate(c) for c in companies]


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: int,
    current_user: User = Depends(PermissionChecker("company.read")),
    db: Session = Depends(get_db),
):
    """Get company by ID"""
    company = db.query(Company).filter(Company.id == company_id).first()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return CompanyResponse.model_validate(company)


@router.post("/", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    company_in: CompanyCreate,
    current_user: User = Depends(PermissionChecker("company.create")),
    db: Session = Depends(get_db),
):
    """Create a new company"""
    # Check if code already exists
    existing = db.query(Company).filter(Company.code == company_in.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company code already exists",
        )

    # Validate parent company if specified
    if company_in.parent_company_id:
        parent = db.query(Company).filter(
            Company.id == company_in.parent_company_id
        ).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent company not found",
            )

    service = BaseService(db, Company)
    company = service.create(
        company_in.model_dump(),
        user_id=current_user.id,
        company_id=current_user.current_company_id,
    )
    db.commit()

    return CompanyResponse.model_validate(company)


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int,
    company_in: CompanyUpdate,
    current_user: User = Depends(PermissionChecker("company.update")),
    db: Session = Depends(get_db),
):
    """Update a company"""
    company = db.query(Company).filter(Company.id == company_id).first()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    # Validate parent company if changing
    if company_in.parent_company_id:
        if company_in.parent_company_id == company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company cannot be its own parent",
            )
        parent = db.query(Company).filter(
            Company.id == company_in.parent_company_id
        ).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent company not found",
            )

    service = BaseService(db, Company)
    company = service.update(
        company_id,
        company_in.model_dump(exclude_unset=True),
        user_id=current_user.id,
        company_id=current_user.current_company_id,
    )
    db.commit()

    return CompanyResponse.model_validate(company)


@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    current_user: User = Depends(PermissionChecker("company.delete")),
    db: Session = Depends(get_db),
):
    """Delete a company (soft delete)"""
    company = db.query(Company).filter(Company.id == company_id).first()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    # Check if company has users
    if company.user_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete company with assigned users",
        )

    service = BaseService(db, Company)
    service.delete(
        company_id,
        user_id=current_user.id,
        company_id=current_user.current_company_id,
    )
    db.commit()

    return {"message": "Company deleted successfully"}


@router.get("/{company_id}/users")
def get_company_users(
    company_id: int,
    pagination: PaginationParams = Depends(get_pagination),
    current_user: User = Depends(PermissionChecker("company.read")),
    db: Session = Depends(get_db),
):
    """Get users in a company"""
    from app.services.user import UserService
    from app.schemas.user import UserResponse

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    user_service = UserService(db)
    users = user_service.get_users_by_company(
        company_id,
        skip=pagination.skip,
        limit=pagination.page_size,
    )

    return {
        "company_id": company_id,
        "company_name": company.name,
        "users": [UserResponse.model_validate(u) for u in users],
        "page": pagination.page,
        "page_size": pagination.page_size,
    }
