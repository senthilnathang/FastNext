import enum

from app.db.base import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class PermissionCategory(str, enum.Enum):
    PROJECT = "project"
    PAGE = "page"
    COMPONENT = "component"
    USER = "user"
    SYSTEM = "system"
    PRODUCT = "product"
    WORKFLOW_TYPE = "workflow_type"
    WORKFLOW_TEMPLATE = "workflow_template"
    WORKFLOW_INSTANCE = "workflow_instance"
    WORKFLOW_STATE = "workflow_state"


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
