"""
RBAC Models for database-backed menu permissions, access rules, and content types.
Replaces in-memory storage with proper database persistence.
"""

from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class ContentType(Base):
    """
    Content type model - similar to Django's ContentType.
    Used to reference different model types for access rules.
    """

    __tablename__ = "content_types"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    app_label = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)

    # Relationships
    access_rules = relationship("AccessRule", back_populates="content_type")

    __table_args__ = (
        UniqueConstraint("app_label", "model", name="uq_content_type_app_model"),
    )

    def __repr__(self):
        return f"<ContentType {self.app_label}.{self.model}>"


class MenuItem(Base):
    """
    Menu item model for storing menu structure in database.
    Supports hierarchical menu structure with parent-child relationships.
    """

    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    path = Column(String(500), nullable=True)
    icon = Column(String(100), nullable=True)
    component = Column(String(500), nullable=True)
    redirect = Column(String(500), nullable=True)

    # Hierarchy
    parent_id = Column(Integer, ForeignKey("menu_items.id"), nullable=True)
    order = Column(Integer, default=0)

    # Visibility and access
    is_visible = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    requires_auth = Column(Boolean, default=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    parent = relationship("MenuItem", remote_side=[id], back_populates="children")
    children = relationship("MenuItem", back_populates="parent", order_by="MenuItem.order")
    user_permissions = relationship("UserMenuPermission", back_populates="menu_item")

    def __repr__(self):
        return f"<MenuItem {self.code}>"


class UserMenuPermission(Base):
    """
    User-specific menu permissions.
    Stores which menu items a user can access and what actions they can perform.
    """

    __tablename__ = "user_menu_permissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # User reference
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Menu item reference
    menu_item_id = Column(
        Integer,
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Company scope (optional - for multi-tenant)
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Permissions
    can_view = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_create = Column(Boolean, default=False)

    # Status
    is_active = Column(Boolean, default=True)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    menu_item = relationship("MenuItem", back_populates="user_permissions")
    company = relationship("Company")

    __table_args__ = (
        UniqueConstraint(
            "user_id", "menu_item_id", "company_id",
            name="uq_user_menu_permission"
        ),
        Index("ix_user_menu_user_company", "user_id", "company_id"),
    )

    def __repr__(self):
        return f"<UserMenuPermission user={self.user_id} menu={self.menu_item_id}>"


class AccessRule(Base):
    """
    Access rule model for field-level and record-level access control.
    Similar to Odoo's ir.rule or Django's object-level permissions.
    """

    __tablename__ = "access_rules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Content type reference
    content_type_id = Column(
        Integer,
        ForeignKey("content_types.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Scope - user or group
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    group_id = Column(
        Integer,
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Company scope (for multi-tenant)
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Permissions
    can_read = Column(Boolean, default=True)
    can_write = Column(Boolean, default=False)
    can_create = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)

    # Domain filter (JSON expression for record filtering)
    domain_filter = Column(Text, nullable=True)

    # Priority (higher priority rules take precedence)
    priority = Column(Integer, default=10)

    # Status
    is_active = Column(Boolean, default=True)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    content_type = relationship("ContentType", back_populates="access_rules")
    user = relationship("User", foreign_keys=[user_id])
    group = relationship("Group")
    company = relationship("Company")

    __table_args__ = (
        Index("ix_access_rule_content_type", "content_type_id"),
        Index("ix_access_rule_user_group", "user_id", "group_id"),
    )

    def __repr__(self):
        return f"<AccessRule {self.name}>"

    @classmethod
    def get_rules_for_user(cls, db, user_id: int, content_type_id: int, company_id: int = None):
        """Get all access rules applicable to a user for a content type."""
        from app.models.user import User
        from app.models.group import UserGroup

        # Get user's groups
        user_groups = db.query(UserGroup.group_id).filter(
            UserGroup.user_id == user_id
        ).subquery()

        # Build query for applicable rules
        query = db.query(cls).filter(
            cls.content_type_id == content_type_id,
            cls.is_active == True,
        )

        # Filter by user or group
        query = query.filter(
            (cls.user_id == user_id) |
            (cls.group_id.in_(user_groups)) |
            ((cls.user_id == None) & (cls.group_id == None))  # Global rules
        )

        # Filter by company if specified
        if company_id:
            query = query.filter(
                (cls.company_id == company_id) |
                (cls.company_id == None)  # Global rules
            )

        return query.order_by(cls.priority.desc()).all()


class GroupMenuPermission(Base):
    """
    Group-based menu permissions.
    Stores which menu items a group can access.
    """

    __tablename__ = "group_menu_permissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Group reference
    group_id = Column(
        Integer,
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Menu item reference
    menu_item_id = Column(
        Integer,
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Company scope (optional - for multi-tenant)
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Permissions
    can_view = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_create = Column(Boolean, default=False)

    # Status
    is_active = Column(Boolean, default=True)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    group = relationship("Group")
    menu_item = relationship("MenuItem")
    company = relationship("Company")

    __table_args__ = (
        UniqueConstraint(
            "group_id", "menu_item_id", "company_id",
            name="uq_group_menu_permission"
        ),
        Index("ix_group_menu_group_company", "group_id", "company_id"),
    )

    def __repr__(self):
        return f"<GroupMenuPermission group={self.group_id} menu={self.menu_item_id}>"
