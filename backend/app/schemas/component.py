from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class ComponentType(str, Enum):
    LAYOUT = "layout"
    TEXT = "text"
    IMAGE = "image"
    BUTTON = "button"
    FORM = "form"
    NAVIGATION = "navigation"
    CUSTOM = "custom"


class ComponentBase(BaseModel):
    name: str
    type: ComponentType
    category: Optional[str] = "general"
    description: Optional[str] = None
    component_schema: Optional[Dict[str, Any]] = {}
    default_props: Optional[Dict[str, Any]] = {}
    template: Optional[str] = None
    styles: Optional[Dict[str, Any]] = {}
    is_global: Optional[bool] = False
    is_published: Optional[bool] = False
    version: Optional[str] = "1.0.0"


class ComponentCreate(ComponentBase):
    project_id: Optional[int] = None


class ComponentUpdate(ComponentBase):
    name: Optional[str] = None
    type: Optional[ComponentType] = None


class ComponentInDBBase(ComponentBase):
    id: Optional[int] = None
    project_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Component(ComponentInDBBase):
    pass


class ComponentInstanceBase(BaseModel):
    props: Optional[Dict[str, Any]] = {}
    position: Optional[Dict[str, Any]] = {}
    parent_id: Optional[int] = None
    order_index: Optional[int] = 0


class ComponentInstanceCreate(ComponentInstanceBase):
    component_id: int
    page_id: int


class ComponentInstanceUpdate(ComponentInstanceBase):
    pass


class ComponentInstanceInDBBase(ComponentInstanceBase):
    id: Optional[int] = None
    component_id: int
    page_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ComponentInstance(ComponentInstanceInDBBase):
    component: Optional[Component] = None


class ComponentInstanceWithChildren(ComponentInstance):
    children: List["ComponentInstance"] = []