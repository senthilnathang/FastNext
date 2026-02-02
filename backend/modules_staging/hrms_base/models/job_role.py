"""
HRMS Job Role Model

Job roles define responsibilities and permissions for positions.
"""

from typing import Optional

from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin


class JobRole(Base, TimestampMixin, AuditMixin, SoftDeleteMixin, CompanyScopedMixin, ActiveMixin):
    """
    Job Role model.

    Defines roles with their responsibilities and associated permissions.
    Job roles can be assigned to job positions or directly to employees.
    """
    __tablename__ = "hrms_job_roles"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    name = Column(String(200), nullable=False, index=True)
    code = Column(String(50), nullable=True, index=True)
    description = Column(Text, nullable=True)

    # Responsibilities
    responsibilities = Column(Text, nullable=True)

    # Permissions (JSON array of permission codes)
    permissions = Column(JSONB, default=list)

    # Role Level (for hierarchy: 1=entry, 2=mid, 3=senior, 4=lead, 5=manager, 6=director, 7=executive)
    level = Column(Integer, default=1)

    # Display
    color = Column(String(20), nullable=True)
    sequence = Column(Integer, default=10)

    def __repr__(self) -> str:
        return f"<JobRole(id={self.id}, name='{self.name}', level={self.level})>"

    def has_permission(self, permission_code: str) -> bool:
        """Check if role has a specific permission"""
        return permission_code in (self.permissions or [])

    def add_permission(self, permission_code: str) -> None:
        """Add a permission to the role"""
        if self.permissions is None:
            self.permissions = []
        if permission_code not in self.permissions:
            self.permissions.append(permission_code)

    def remove_permission(self, permission_code: str) -> None:
        """Remove a permission from the role"""
        if self.permissions and permission_code in self.permissions:
            self.permissions.remove(permission_code)

    @property
    def level_name(self) -> str:
        """Get human-readable level name"""
        levels = {
            1: "Entry Level",
            2: "Mid Level",
            3: "Senior",
            4: "Team Lead",
            5: "Manager",
            6: "Director",
            7: "Executive"
        }
        return levels.get(self.level, "Unknown")
