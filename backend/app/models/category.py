from typing import List, Optional

from app.models.base import Base, TimestampMixin
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Category(Base, TimestampMixin):
    """
    Category model
    """

    __tablename__ = "categorys"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)

    def __repr__(self) -> str:
        return f"<Category(id={self.id})>"
