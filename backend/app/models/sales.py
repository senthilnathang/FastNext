from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from typing import Optional, List

from app.models.base import TimestampMixin
from app.models.base import Base

class Sales(Base, TimestampMixin):
    """
    sales
    """
    __tablename__ = "saless"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(255))

    def __repr__(self) -> str:
        return f"<Sales(id={self.id})>"
