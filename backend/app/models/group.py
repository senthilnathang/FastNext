"""Group model for organizing users"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.models.base import AuditableModel, BaseModel


class Group(AuditableModel):
    """User group model for organizing users and assigning permissions"""

    __tablename__ = "groups"

    # Group identification
    name = Column(String(100), nullable=False, index=True)
    codename = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Company association (groups are company-specific)
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Flags
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_system_group = Column(Boolean, default=False, nullable=False)

    # Relationships
    company = relationship("Company", back_populates="groups")
    users = relationship(
        "UserGroup",
        back_populates="group",
        cascade="all, delete-orphan",
    )
    permissions = relationship(
        "GroupPermission",
        back_populates="group",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Group(id={self.id}, name='{self.name}', company_id={self.company_id})>"

    @property
    def permission_codenames(self) -> list:
        """Get list of all permission codenames for this group"""
        return [gp.permission.codename for gp in self.permissions if gp.permission.is_active]

    @property
    def member_count(self) -> int:
        """Get count of active members"""
        return len([ug for ug in self.users if ug.is_active])


class UserGroup(BaseModel):
    """Association table for users and groups"""

    __tablename__ = "user_groups"

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    group_id = Column(
        Integer,
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="groups")
    group = relationship("Group", back_populates="users")

    def __repr__(self):
        return f"<UserGroup(user_id={self.user_id}, group_id={self.group_id})>"


class GroupPermission(BaseModel):
    """Association table for groups and permissions"""

    __tablename__ = "group_permissions"

    group_id = Column(
        Integer,
        ForeignKey("groups.id", ondelete="CASCADE"),
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
    group = relationship("Group", back_populates="permissions")
    permission = relationship("Permission", back_populates="group_permissions")

    def __repr__(self):
        return f"<GroupPermission(group_id={self.group_id}, permission_id={self.permission_id})>"
