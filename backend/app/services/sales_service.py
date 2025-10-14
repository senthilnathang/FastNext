from typing import Any, Dict, List, Optional

from app.models.sales import Sales
from app.models.user import User
from app.schemas.sales import SalesCreate, SalesUpdate
from app.services.permission_service import PermissionService
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload


class SalesService:
    """Business logic service for Sales"""

    def __init__(self, db: Session):
        self.db = db

    def get_sales_by_id(self, sales_id: int, user: User) -> Sales:
        """Get sales by ID with permission check"""
        sales = self.db.query(Sales).filter(Sales.id == sales_id).first()

        if not sales:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Sales not found"
            )

        # Check permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "read", "sales", sales.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
            )

        return sales

    def create_sales(self, sales_data: SalesCreate, user: User) -> Sales:
        """Create new sales with business logic"""
        # Check creation permissions
        if not PermissionService.check_permission(self.db, user.id, "create", "sales"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to create sales",
            )

        # Create the sales
        sales_dict = sales_data.model_dump()

        # Add owner information if applicable
        if hasattr(Sales, "user_id"):
            sales_dict["user_id"] = user.id

        sales = Sales(**sales_dict)
        self.db.add(sales)
        self.db.commit()
        self.db.refresh(sales)

        return sales

    def update_sales(self, sales_id: int, sales_data: SalesUpdate, user: User) -> Sales:
        """Update sales with business logic"""
        sales = self.get_sales_by_id(sales_id, user)

        # Check update permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "update", "sales", sales.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to update this sales",
            )

        # Update fields
        update_data = sales_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(sales, field, value)

        self.db.commit()
        self.db.refresh(sales)

        return sales

    def delete_sales(self, sales_id: int, user: User) -> bool:
        """Delete sales with business logic"""
        sales = self.get_sales_by_id(sales_id, user)

        # Check delete permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "delete", "sales", sales.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to delete this sales",
            )

        # Hard delete
        self.db.delete(sales)
        self.db.commit()

        return True

    def list_saless(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        user: User = None,
    ) -> List[Sales]:
        """Get list of saless with filtering"""
        query = self.db.query(Sales)

        # Apply soft delete filter if applicable

        # Apply search if provided
        if search:
            # TODO: Implement search across searchable fields
            query = query.filter(db.or_(Sales.name.ilike(f"%{search}%")))

        # Apply pagination
        saless = query.offset(skip).limit(limit).all()

        return saless
