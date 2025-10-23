from datetime import date
from typing import Any, Dict, List, Optional

from app.models.base import (
    AuditMixin,
    Base,
    MetadataMixin,
    SoftDeleteMixin,
    TimestampMixin,
)
from app.models.enums import ProductCategory
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Product(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, MetadataMixin):
    """
    Product inventory management model
    """

    __tablename__ = "products"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Product name
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    # Detailed product description
    description: Mapped[Optional[str]] = mapped_column(Text)
    # Product price in USD
    price: Mapped[float] = mapped_column(Float, nullable=False)
    # Product category
    category: Mapped[ProductCategory] = mapped_column(Enum(ProductCategory), nullable=False)
    # Stock Keeping Unit
    sku: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True)
    # Current stock quantity
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Whether this product is featured
    is_featured: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    # Whether this product is active/available
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Product launch date
    launch_date: Mapped[Optional[date]] = mapped_column(Date)
    # Product specifications as JSON
    specifications: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    # Product website URL
    website_url: Mapped[Optional[str]] = mapped_column(String(500))
    # Product support email
    support_email: Mapped[Optional[str]] = mapped_column(String(255))
    # Category foreign key
    category_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("categorys.id"))
    # Product owner (user)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))

    # Relationships
    # category = relationship("Category", back_populates="products")
    # owner = relationship("User", back_populates="products")

    def __repr__(self) -> str:
        return f"<Product(id={self.id})>"
