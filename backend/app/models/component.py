import enum

from app.db.base import Base
from app.models.base import AuditableActivityModel
from sqlalchemy.sql import func
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship



class ComponentType(str, enum.Enum):
    LAYOUT = "layout"
    TEXT = "text"
    IMAGE = "image"
    BUTTON = "button"
    FORM = "form"
    NAVIGATION = "navigation"
    CUSTOM = "custom"


class Component(AuditableActivityModel):
    __tablename__ = "components"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    type = Column(Enum(ComponentType), nullable=False)
    category = Column(String, default="general")
    description = Column(Text)
    project_id = Column(
        Integer, ForeignKey("projects.id"), nullable=True
    )  # null for global components
    component_schema = Column(JSON, default={})  # Component property schema
    default_props = Column(JSON, default={})
    template = Column(Text)  # React/HTML template
    styles = Column(JSON, default={})  # CSS styles
    is_global = Column(Boolean, default=False)  # Available across all projects
    is_published = Column(Boolean, default=False)
    version = Column(String, default="1.0.0")

    project = relationship("Project", back_populates="components")
    instances = relationship(
        "ComponentInstance", back_populates="component", cascade="all, delete-orphan"
    )


class ComponentInstance(Base):
    __tablename__ = "component_instances"

    id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("components.id"), nullable=False)
    page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)
    props = Column(JSON, default={})  # Instance-specific properties
    position = Column(JSON, default={})  # x, y, width, height
    parent_id = Column(Integer, ForeignKey("component_instances.id"), nullable=True)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    component = relationship("Component", back_populates="instances")
    page = relationship("Page", back_populates="components")
    parent = relationship("ComponentInstance", remote_side=[id])
    children = relationship("ComponentInstance", overlaps="parent")
