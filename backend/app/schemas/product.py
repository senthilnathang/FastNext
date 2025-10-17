from datetime import date, datetime
from typing import Any, Dict, List, Optional

from app.models.enums import ProductCategory
from app.schemas.base import BaseResponseModel
from pydantic import BaseModel, EmailStr, Field, HttpUrl


class ProductBase(BaseModel):
    """Base schema for Product"""

    name: str = Field(
        ...,
        description="Product name",
        example="Premium Headphones",
        min_length=2,
        max_length=200,
    )
    description: Optional[str] = Field(
        None,
        description="Detailed product description",
        example="High-quality wireless headphones with noise cancellation",
    )
    price: float = Field(..., description="Product price in USD", example=299.99, ge=0)
    category: ProductCategory = Field(
        ..., description="Product category", example="electronics"
    )
    sku: str = Field(..., description="Stock Keeping Unit", example="HDPH-001-BLK")
    stock_quantity: int = Field(0, description="Current stock quantity", example=150)
    is_featured: bool = Field(
        False, description="Whether this product is featured"
    )
    launch_date: Optional[date] = Field(None, description="Product launch date")
    specifications: Optional[Dict[str, Any]] = Field(
        None,
        description="Product specifications as JSON",
        example={"weight": "250g", "battery_life": "30 hours", "wireless": True},
    )
    website_url: Optional[str] = Field(
        None,
        description="Product website URL",
        example="https://example.com/products/premium-headphones",
    )
    support_email: Optional[str] = Field(
        None, description="Product support email", example="support@example.com"
    )
    category_id: Optional[int] = Field(None, description="Category foreign key")
    owner_id: int = Field(..., description="Product owner (user) - auto-set by system")


class ProductCreate(ProductBase):
    """Schema for creating Product"""

    name: str = Field(
        ...,
        description="Product name",
        example="Premium Headphones",
        min_length=2,
        max_length=200,
    )
    description: Optional[str] = Field(
        None,
        description="Detailed product description",
        example="High-quality wireless headphones with noise cancellation",
    )
    price: float = Field(..., description="Product price in USD", example=299.99, ge=0)
    category: ProductCategory = Field(
        ..., description="Product category", example="electronics"
    )
    sku: str = Field(..., description="Stock Keeping Unit", example="HDPH-001-BLK")
    stock_quantity: int = Field(0, description="Current stock quantity", example=150)
    is_featured: Optional[bool] = Field(
        False, description="Whether this product is featured"
    )
    launch_date: Optional[date] = Field(None, description="Product launch date")
    specifications: Optional[Dict[str, Any]] = Field(
        None,
        description="Product specifications as JSON",
        example={"weight": "250g", "battery_life": "30 hours", "wireless": True},
    )
    website_url: Optional[HttpUrl] = Field(
        None,
        description="Product website URL",
        example="https://example.com/products/premium-headphones",
    )
    support_email: Optional[EmailStr] = Field(
        None, description="Product support email", example="support@example.com"
    )
    category_id: Optional[int] = Field(None, description="Category foreign key")
    owner_id: Optional[int] = Field(None, description="Product owner (user) - auto-set by system")

    model_config = {"from_attributes": True}


class ProductUpdate(ProductBase):
    """Schema for updating Product"""

    name: Optional[str] = Field(
        None,
        description="Product name",
        example="Premium Headphones",
        min_length=2,
        max_length=200,
    )
    description: Optional[str] = Field(
        None,
        description="Detailed product description",
        example="High-quality wireless headphones with noise cancellation",
    )
    price: Optional[float] = Field(
        None, description="Product price in USD", example=299.99, ge=0
    )
    category: Optional[ProductCategory] = Field(
        None, description="Product category", example="electronics"
    )
    sku: Optional[str] = Field(
        None,
        description="Stock Keeping Unit",
        example="HDPH-001-BLK",
        min_length=3,
        max_length=50,
    )
    stock_quantity: Optional[int] = Field(
        None, description="Current stock quantity", example=150
    )
    is_featured: Optional[bool] = Field(
        None, description="Whether this product is featured"
    )
    launch_date: Optional[date] = Field(None, description="Product launch date")
    specifications: Optional[Dict[str, Any]] = Field(
        None,
        description="Product specifications as JSON",
        example={"weight": "250g", "battery_life": "30 hours", "wireless": True},
    )
    website_url: Optional[HttpUrl] = Field(
        None,
        description="Product website URL",
        example="https://example.com/products/premium-headphones",
    )
    support_email: Optional[EmailStr] = Field(
        None, description="Product support email", example="support@example.com"
    )
    category_id: Optional[int] = Field(None, description="Category foreign key")


class ProductResponse(ProductBase, BaseResponseModel):
    """Schema for Product responses"""

    id: int
    name: str = Field(
        ...,
        description="Product name",
        example="Premium Headphones",
        min_length=2,
        max_length=200,
    )
    description: Optional[str] = Field(
        None,
        description="Detailed product description",
        example="High-quality wireless headphones with noise cancellation",
    )
    price: float = Field(..., description="Product price in USD", example=299.99, ge=0)
    category: ProductCategory = Field(
        ..., description="Product category", example="electronics"
    )
    sku: str = Field(..., description="Stock Keeping Unit", example="HDPH-001-BLK")
    stock_quantity: int = Field(0, description="Current stock quantity", example=150)
    is_featured: bool = Field(False, description="Whether this product is featured")
    launch_date: Optional[date] = Field(None, description="Product launch date")
    specifications: Optional[Dict[str, Any]] = Field(
        None,
        description="Product specifications as JSON",
        example={"weight": "250g", "battery_life": "30 hours", "wireless": True},
    )
    website_url: Optional[HttpUrl] = Field(
        None,
        description="Product website URL",
        example="https://example.com/products/premium-headphones",
    )
    support_email: Optional[EmailStr] = Field(
        None, description="Product support email", example="support@example.com"
    )
    category_id: Optional[int] = Field(None, description="Category foreign key")
    owner_id: int = Field(..., description="Product owner (user)")
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    """Schema for Product list responses"""

    items: List[ProductResponse]
    total: int
    skip: int
    limit: int
    deleted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}