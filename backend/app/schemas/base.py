"""
Base schema classes for the FastNext application.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BaseResponseModel(BaseModel):
    """Base response model with common fields"""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BaseAuditResponseModel(BaseResponseModel):
    """Base response model with audit fields"""

    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None


class BaseSoftDeleteResponseModel(BaseResponseModel):
    """Base response model with soft delete fields"""

    is_deleted: bool = False
    deleted_at: Optional[datetime] = None


class BaseMetadataResponseModel(BaseResponseModel):
    """Base response model with metadata fields"""

    metadata_json: Optional[dict] = None
    tags: Optional[list] = None
    version: int = 1


class BaseFullResponseModel(BaseResponseModel):
    """Full base response model with all common fields"""

    # Audit fields
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    # Soft delete fields
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None

    # Metadata fields
    metadata_json: Optional[dict] = None
    tags: Optional[list] = None
    version: int = 1
