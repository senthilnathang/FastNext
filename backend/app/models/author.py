from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from typing import Optional, List

from app.models.base import TimestampMixin
from app.models.base import Base

class Author(Base, TimestampMixin):
    """
    Author model
    """
    __tablename__ = "authors"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)

    def __repr__(self) -> str:
        return f"<Author(id={self.id})>"
