"""Permission model for access control"""

import enum

from sqlalchemy import Boolean, Column, Enum, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import BaseModel


class PermissionCategory(str, enum.Enum):
    """Categories of permissions"""
    USER = "user"
    COMPANY = "company"
    GROUP = "group"
    ROLE = "role"
    PERMISSION = "permission"
    SYSTEM = "system"
    AUDIT = "audit"


class PermissionAction(str, enum.Enum):
    """Types of permission actions"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    MANAGE = "manage"  # Full access including admin functions
    EXPORT = "export"
    IMPORT = "import"


class Permission(BaseModel):
    """Permission model defining granular access rights"""

    __tablename__ = "permissions"

    # Permission identification
    name = Column(String(100), unique=True, nullable=False, index=True)
    codename = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Categorization
    category = Column(
        Enum(PermissionCategory),
        nullable=False,
        default=PermissionCategory.SYSTEM,
        index=True,
    )
    action = Column(
        Enum(PermissionAction),
        nullable=False,
        default=PermissionAction.READ,
        index=True,
    )
    resource = Column(String(100), nullable=True)  # Specific resource if needed

    # Flags
    is_system_permission = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    role_permissions = relationship(
        "RolePermission",
        back_populates="permission",
        cascade="all, delete-orphan",
    )
    group_permissions = relationship(
        "GroupPermission",
        back_populates="permission",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Permission(id={self.id}, codename='{self.codename}')>"

    @classmethod
    def generate_codename(cls, category: str, action: str, resource: str = None) -> str:
        """Generate a standard codename for a permission"""
        if resource:
            return f"{category}.{resource}.{action}"
        return f"{category}.{action}"


# Default system permissions to seed
DEFAULT_PERMISSIONS = [
    # User permissions
    ("user.create", "Create Users", PermissionCategory.USER, PermissionAction.CREATE),
    ("user.read", "View Users", PermissionCategory.USER, PermissionAction.READ),
    ("user.update", "Update Users", PermissionCategory.USER, PermissionAction.UPDATE),
    ("user.delete", "Delete Users", PermissionCategory.USER, PermissionAction.DELETE),
    ("user.manage", "Manage Users", PermissionCategory.USER, PermissionAction.MANAGE),

    # Company permissions
    ("company.create", "Create Companies", PermissionCategory.COMPANY, PermissionAction.CREATE),
    ("company.read", "View Companies", PermissionCategory.COMPANY, PermissionAction.READ),
    ("company.update", "Update Companies", PermissionCategory.COMPANY, PermissionAction.UPDATE),
    ("company.delete", "Delete Companies", PermissionCategory.COMPANY, PermissionAction.DELETE),
    ("company.manage", "Manage Companies", PermissionCategory.COMPANY, PermissionAction.MANAGE),

    # Group permissions
    ("group.create", "Create Groups", PermissionCategory.GROUP, PermissionAction.CREATE),
    ("group.read", "View Groups", PermissionCategory.GROUP, PermissionAction.READ),
    ("group.update", "Update Groups", PermissionCategory.GROUP, PermissionAction.UPDATE),
    ("group.delete", "Delete Groups", PermissionCategory.GROUP, PermissionAction.DELETE),
    ("group.manage", "Manage Groups", PermissionCategory.GROUP, PermissionAction.MANAGE),

    # Role permissions
    ("role.create", "Create Roles", PermissionCategory.ROLE, PermissionAction.CREATE),
    ("role.read", "View Roles", PermissionCategory.ROLE, PermissionAction.READ),
    ("role.update", "Update Roles", PermissionCategory.ROLE, PermissionAction.UPDATE),
    ("role.delete", "Delete Roles", PermissionCategory.ROLE, PermissionAction.DELETE),
    ("role.manage", "Manage Roles", PermissionCategory.ROLE, PermissionAction.MANAGE),

    # Permission management
    ("permission.read", "View Permissions", PermissionCategory.PERMISSION, PermissionAction.READ),
    ("permission.manage", "Manage Permissions", PermissionCategory.PERMISSION, PermissionAction.MANAGE),

    # System permissions
    ("system.settings", "System Settings", PermissionCategory.SYSTEM, PermissionAction.MANAGE),
    ("system.audit", "View Audit Logs", PermissionCategory.AUDIT, PermissionAction.READ),
]
