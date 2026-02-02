"""
HRMS Department Model

Hierarchical organizational structure with parent-child relationships.
"""

from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin

if TYPE_CHECKING:
    from .job_position import JobPosition


class Department(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Department model for organizational structure.

    Supports hierarchical structure with parent-child relationships.
    Each department can have a manager and multiple job positions.
    """
    __tablename__ = "hrms_departments"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    name = Column(String(200), nullable=False, index=True)
    code = Column(String(50), nullable=True, unique=True, index=True)
    description = Column(Text, nullable=True)

    # Hierarchy
    parent_id = Column(Integer, ForeignKey("hrms_departments.id"), nullable=True, index=True)

    # Management
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Display
    color = Column(String(20), nullable=True)  # Hex color for UI
    sequence = Column(Integer, default=10)  # For ordering

    # Relationships
    parent = relationship(
        "Department",
        remote_side=[id],
        backref="children",
        foreign_keys=[parent_id]
    )

    manager = relationship(
        "User",
        foreign_keys=[manager_id],
        backref="managed_departments"
    )

    job_positions = relationship(
        "JobPosition",
        back_populates="department",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Department(id={self.id}, name='{self.name}', code='{self.code}')>"

    @property
    def full_path(self) -> str:
        """Get full hierarchical path (e.g., 'Company / IT / Development')"""
        if self.parent:
            return f"{self.parent.full_path} / {self.name}"
        return self.name

    @property
    def level(self) -> int:
        """Get hierarchy level (0 for root departments)"""
        if self.parent:
            return self.parent.level + 1
        return 0

    def get_all_children(self) -> List["Department"]:
        """Get all child departments recursively"""
        result = []
        for child in self.children:
            result.append(child)
            result.extend(child.get_all_children())
        return result

    def get_all_parent_ids(self) -> List[int]:
        """Get all parent department IDs"""
        result = []
        current = self.parent
        while current:
            result.append(current.id)
            current = current.parent
        return result

    def is_ancestor_of(self, department: "Department") -> bool:
        """Check if this department is an ancestor of the given department"""
        return self.id in department.get_all_parent_ids()

    def is_descendant_of(self, department: "Department") -> bool:
        """Check if this department is a descendant of the given department"""
        return department.id in self.get_all_parent_ids()
