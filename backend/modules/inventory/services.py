from sqlalchemy.orm import Session
from typing import List, Optional
from .models import Product, ProductCategory
from .schemas import ProductCreate, ProductUpdate, ProductCategoryCreate, ProductCategoryUpdate

class InventoryService:
    def __init__(self, db: Session):
        self.db = db

    def get_products(self, skip: int = 0, limit: int = 100) -> List[Product]:
        return self.db.query(Product).offset(skip).limit(limit).all()

    def get_product(self, product_id: int) -> Optional[Product]:
        return self.db.query(Product).filter(Product.id == product_id).first()

    def create_product(self, product: ProductCreate) -> Product:
        db_product = Product(**product.model_dump())
        self.db.add(db_product)
        self.db.commit()
        self.db.refresh(db_product)
        return db_product

    def update_product(self, product_id: int, product: ProductUpdate) -> Optional[Product]:
        db_product = self.get_product(product_id)
        if not db_product:
            return None

        update_data = product.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_product, key, value)

        self.db.commit()
        self.db.refresh(db_product)
        return db_product

    def delete_product(self, product_id: int) -> bool:
        db_product = self.get_product(product_id)
        if not db_product:
            return False

        self.db.delete(db_product)
        self.db.commit()
        return True

    # Category methods
    def get_categories(self, skip: int = 0, limit: int = 100) -> List[ProductCategory]:
        return self.db.query(ProductCategory).offset(skip).limit(limit).all()

    def create_category(self, category: ProductCategoryCreate) -> ProductCategory:
        db_category = ProductCategory(**category.model_dump())
        self.db.add(db_category)
        self.db.commit()
        self.db.refresh(db_category)
        return db_category
