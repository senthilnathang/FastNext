from datetime import datetime
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: Optional[bool] = False
    settings: Optional[Dict[str, Any]] = {}


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(ProjectBase):
    name: Optional[str] = None


class ProjectInDBBase(ProjectBase):
    id: Optional[int] = None
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Project(ProjectInDBBase):
    pass


class ProjectWithPages(Project):
    pages: List[Dict[str, Any]] = []


class ProjectWithComponents(Project):
    components: List[Dict[str, Any]] = []
