from typing import Optional, List
from pydantic import BaseModel
from .models import ProductType

class ProductCategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None

class ProductCategoryCreate(ProductCategoryBase):
    pass

class ProductCategoryUpdate(ProductCategoryBase):
    name: Optional[str] = None

class ProductCategory(ProductCategoryBase):
    id: int

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    code: Optional[str] = None
    barcode: Optional[str] = None
    product_type: ProductType = ProductType.PRODUCT
    list_price: float = 0.0
    standard_price: float = 0.0
    category_id: Optional[int] = None
    description: Optional[str] = None
    active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    name: Optional[str] = None

class Product(ProductBase):
    id: int
    category: Optional[ProductCategory] = None

    class Config:
        from_attributes = True
