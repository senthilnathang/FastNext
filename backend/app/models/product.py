from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from typing import Optional, List

from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, MetadataMixin
from app.models.base import Base
from app.models.enums import ProductCategory

class Product(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, MetadataMixin):
    """
    Product inventory management model
    """
    __tablename__ = "products"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Product name
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    # Detailed product description
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=False)
    # Product price in USD
    price: Mapped[float] = mapped_column(Float)
    # Product category
    category: Mapped[ProductCategory] = mapped_column(Enum(ProductCategory))
    # Stock Keeping Unit
    sku: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    # Current stock quantity
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    # Whether this product is featured
    is_featured: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=False, default=False)
    # Product launch date
    launch_date: Mapped[Optional[date]] = mapped_column(Date, nullable=False)
    # Product specifications as JSON
    specifications: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=False)
    # Product website URL
    website_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=False)
    # Product support email
    support_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=False)
    # Category foreign key
    category_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=False, ForeignKey("categories.id"))
    # Product owner (user)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))

    # Relationships
    category_id: Mapped[Optional[Category]] = relationship("Category", back_populates="products")
    owner_id: Mapped[Optional[User]] = relationship("User", back_populates="products")

    def __repr__(self) -> str:
        return f"<Product(id={self.id})>"
