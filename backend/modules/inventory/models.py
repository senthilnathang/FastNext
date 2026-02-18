from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum

class ProductType(str, enum.Enum):
    CONSU = "consumable"
    SERVICE = "service"
    PRODUCT = "product"

class ProductCategory(Base):
    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)

    parent = relationship("ProductCategory", remote_side=[id], backref="children")
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    code = Column(String, index=True)  # Internal Reference
    barcode = Column(String, index=True)

    product_type = Column(String, default=ProductType.PRODUCT)  # stored as string

    list_price = Column(Float, default=0.0)  # Sales Price
    standard_price = Column(Float, default=0.0)  # Cost

    category_id = Column(Integer, ForeignKey("product_categories.id"))
    category = relationship("ProductCategory", back_populates="products")

    description = Column(Text)
    active = Column(Boolean, default=True)
