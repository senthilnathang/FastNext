"""User-Company-Role association for multi-company with different roles per company"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import BaseModel


class UserCompanyRole(BaseModel):
    """
    Association table linking users to companies with specific roles.
    Allows a user to have different roles in different companies.
    """

    __tablename__ = "user_company_roles"

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role_id = Column(
        Integer,
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Is this the user's default company?
    is_default = Column(Boolean, default=False, nullable=False)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Assignment tracking
    assigned_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    assigned_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    user = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="company_roles",
    )
    company = relationship("Company", back_populates="user_roles")
    role = relationship("Role", back_populates="user_company_roles")
    assigner = relationship(
        "User",
        foreign_keys=[assigned_by],
        viewonly=True,
    )

    def __repr__(self):
        return f"<UserCompanyRole(user_id={self.user_id}, company_id={self.company_id}, role_id={self.role_id})>"


class RolePermission(BaseModel):
    """Association table for roles and permissions"""

    __tablename__ = "role_permissions"

    role_id = Column(
        Integer,
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    permission_id = Column(
        Integer,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Relationships
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="role_permissions")

    def __repr__(self):
        return f"<RolePermission(role_id={self.role_id}, permission_id={self.permission_id})>"
