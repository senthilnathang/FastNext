from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AssetBase(BaseModel):
    name: str
    original_name: str
    file_path: str
    file_url: str
    mime_type: str
    file_size: int
    is_public: Optional[bool] = False


class AssetCreate(AssetBase):
    project_id: Optional[int] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    is_public: Optional[bool] = None


class AssetInDBBase(AssetBase):
    id: Optional[int] = None
    user_id: int
    project_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Asset(AssetInDBBase):
    pass
