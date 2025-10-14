from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class PageBase(BaseModel):
    name: str
    slug: str
    layout: Optional[List[Dict[str, Any]]] = []
    meta_data: Optional[Dict[str, Any]] = {}
    is_home: Optional[bool] = False
    order_index: Optional[int] = 0


class PageCreate(PageBase):
    project_id: int


class PageUpdate(PageBase):
    name: Optional[str] = None
    slug: Optional[str] = None


class PageInDBBase(PageBase):
    id: Optional[int] = None
    project_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Page(PageInDBBase):
    pass


class PageWithComponents(Page):
    components: List["ComponentInstance"] = []
