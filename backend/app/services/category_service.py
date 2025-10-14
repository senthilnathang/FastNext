from typing import Any, Dict, List, Optional

from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.services.permission_service import PermissionService
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload


class CategoryService:
    """Business logic service for Category"""

    def __init__(self, db: Session):
        self.db = db

    def get_category_by_id(self, category_id: int, user: User) -> Category:
        """Get category by ID with permission check"""
        category = self.db.query(Category).filter(Category.id == category_id).first()

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
            )

        # Check permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "read", "category", category.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
            )

        return category

    def create_category(self, category_data: CategoryCreate, user: User) -> Category:
        """Create new category with business logic"""
        # Check creation permissions
        if not PermissionService.check_permission(
            self.db, user.id, "create", "category"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to create category",
            )

        # Create the category
        category_dict = category_data.model_dump()

        # Add owner information if applicable
        if hasattr(Category, "user_id"):
            category_dict["user_id"] = user.id

        category = Category(**category_dict)
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)

        return category

    def update_category(
        self, category_id: int, category_data: CategoryUpdate, user: User
    ) -> Category:
        """Update category with business logic"""
        category = self.get_category_by_id(category_id, user)

        # Check update permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "update", "category", category.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to update this category",
            )

        # Update fields
        update_data = category_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)

        self.db.commit()
        self.db.refresh(category)

        return category

    def delete_category(self, category_id: int, user: User) -> bool:
        """Delete category with business logic"""
        category = self.get_category_by_id(category_id, user)

        # Check delete permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "delete", "category", category.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to delete this category",
            )

        # Hard delete
        self.db.delete(category)
        self.db.commit()

        return True

    def list_categorys(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        user: User = None,
    ) -> List[Category]:
        """Get list of categorys with filtering"""
        query = self.db.query(Category)

        # Apply soft delete filter if applicable

        # Apply search if provided
        if search:
            # Search across searchable fields
            query = query.filter(
                db.or_(
                    Category.name.ilike(f"%{search}%"),
                    Category.description.ilike(f"%{search}%"),
                )
            )

        # Apply pagination
        categorys = query.offset(skip).limit(limit).all()

        return categorys
