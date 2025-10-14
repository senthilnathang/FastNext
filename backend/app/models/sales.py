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
