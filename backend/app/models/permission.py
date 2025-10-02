from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class PermissionCategory(str, enum.Enum):
    PROJECT = "project"
    PAGE = "page"
    COMPONENT = "component"
    USER = "user"
    SYSTEM = "system"
    PRODUCT = "product"


class PermissionAction(str, enum.Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    MANAGE = "manage"  # Full access
    PUBLISH = "publish"
    DEPLOY = "deploy"


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text)
    category = Column(String, nullable=False)  # project, page, component, user, system
    action = Column(String, nullable=False)  # create, read, update, delete, manage
    resource = Column(String)  # specific resource if needed
    is_system_permission = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission")