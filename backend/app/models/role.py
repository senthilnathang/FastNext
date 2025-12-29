"""Role model for role-based access control"""

import enum

from sqlalchemy import Boolean, Column, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.models.base import AuditableModel


class SystemRole(str, enum.Enum):
    """System-defined roles that cannot be deleted"""
    SUPER_ADMIN = "super_admin"  # Full system access
    ADMIN = "admin"  # Company admin
    MANAGER = "manager"  # Department/team manager
    EDITOR = "editor"  # Can create and edit content
    VIEWER = "viewer"  # Read-only access
    MEMBER = "member"  # Basic authenticated user


class Role(AuditableModel):
    """Role model defining a set of permissions"""

    __tablename__ = "roles"

    # Role identification
    name = Column(String(100), nullable=False, index=True)
    codename = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Company association (null = global role)
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Flags
    is_system_role = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    company = relationship("Company", back_populates="roles")
    permissions = relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
    )
    user_company_roles = relationship(
        "UserCompanyRole",
        back_populates="role",
        cascade="all, delete-orphan",
    )

    # Unique constraint: name unique within company (or globally if company_id is null)
    __table_args__ = (
        # Index for faster lookups
        {"sqlite_autoincrement": True},
    )

    def __repr__(self):
        return f"<Role(id={self.id}, name='{self.name}', company_id={self.company_id})>"

    def has_permission(self, codename: str) -> bool:
        """Check if role has a specific permission"""
        return any(rp.permission.codename == codename for rp in self.permissions)

    @property
    def permission_codenames(self) -> list:
        """Get list of all permission codenames for this role"""
        return [rp.permission.codename for rp in self.permissions if rp.permission.is_active]


# Default roles configuration
DEFAULT_ROLES = [
    {
        "name": "Super Admin",
        "codename": SystemRole.SUPER_ADMIN,
        "description": "Full system access with all permissions",
        "is_system_role": True,
        "permissions": ["*"],  # All permissions
    },
    {
        "name": "Admin",
        "codename": SystemRole.ADMIN,
        "description": "Company administrator with full company access",
        "is_system_role": True,
        "permissions": [
            "user.manage", "company.manage", "group.manage",
            "role.manage", "permission.read",
        ],
    },
    {
        "name": "Manager",
        "codename": SystemRole.MANAGER,
        "description": "Team/department manager with limited admin access",
        "is_system_role": True,
        "permissions": [
            "user.read", "user.update", "group.read", "group.update",
            "role.read", "permission.read",
        ],
    },
    {
        "name": "Editor",
        "codename": SystemRole.EDITOR,
        "description": "Can create and edit content",
        "is_system_role": True,
        "permissions": [
            "user.read", "group.read", "role.read",
        ],
    },
    {
        "name": "Viewer",
        "codename": SystemRole.VIEWER,
        "description": "Read-only access to resources",
        "is_system_role": True,
        "permissions": [
            "user.read", "group.read", "role.read",
        ],
    },
    {
        "name": "Member",
        "codename": SystemRole.MEMBER,
        "description": "Basic authenticated user",
        "is_system_role": True,
        "permissions": ["user.read"],
    },
]
