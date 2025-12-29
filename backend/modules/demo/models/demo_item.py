"""
Demo Item Model

A simple demonstration model for the module system.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.base import TimestampMixin


class DemoItem(Base, TimestampMixin):
    """
    Demo item model.

    A simple model to demonstrate module functionality.
    """

    __tablename__ = "demo_items"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic fields
    name = Column(String(200), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)
    priority = Column(Integer, default=0)

    # Metadata
    tags = Column(JSONB, default=list)
    extra_data = Column(JSONB, default=dict)

    # Ownership
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    def __repr__(self) -> str:
        return f"<DemoItem(code={self.code}, name={self.name})>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "description": self.description,
            "is_active": self.is_active,
            "priority": self.priority,
            "tags": self.tags or [],
            "extra_data": self.extra_data or {},
            "company_id": self.company_id,
            "created_by_id": self.created_by_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
