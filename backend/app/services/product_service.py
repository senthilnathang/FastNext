from typing import Any, Dict, List, Optional

from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.permission_service import PermissionService
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload


class ProductService:
    """Business logic service for Product"""

    def __init__(self, db: Session):
        self.db = db

    def get_product_by_id(self, product_id: int, user: User) -> Product:
        """Get product by ID with permission check"""
        product = self.db.query(Product).filter(Product.id == product_id).first()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )

        # Check permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "read", "product", product.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
            )

        return product

    def create_product(self, product_data: ProductCreate, user: User) -> Product:
        """Create new product with business logic"""
        # Check creation permissions
        if not PermissionService.check_permission(
            self.db, user.id, "create", "product"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to create product",
            )

        # Create the product
        product_dict = product_data.model_dump()

        # Add owner information if applicable
        if hasattr(Product, "owner_id"):
            product_dict["owner_id"] = user.id

        product = Product(**product_dict)
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)

        return product

    def update_product(
        self, product_id: int, product_data: ProductUpdate, user: User
    ) -> Product:
        """Update product with business logic"""
        product = self.get_product_by_id(product_id, user)

        # Check update permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "update", "product", product.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to update this product",
            )

        # Update fields
        update_data = product_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)

        self.db.commit()
        self.db.refresh(product)

        return product

    def delete_product(self, product_id: int, user: User) -> bool:
        """Delete product with business logic"""
        product = self.get_product_by_id(product_id, user)

        # Check delete permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "delete", "product", product.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to delete this product",
            )

        # Soft delete
        product.is_deleted = True
        self.db.commit()

        return True

    def list_products(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        user: User = None,
    ) -> List[Product]:
        """Get list of products with filtering"""
        query = self.db.query(Product)

        # Apply soft delete filter if applicable
        query = query.filter(Product.is_deleted == False)

        # Apply search if provided
        if search:
            # TODO: Implement search across searchable fields
            query = query.filter(
                db.or_(
                    Product.name.ilike(f"%{search}%"),
                    Product.description.ilike(f"%{search}%"),
                )
            )

        # Apply pagination
        products = query.offset(skip).limit(limit).all()

        return products
