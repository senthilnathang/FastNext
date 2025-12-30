"""
Common schemas used across the application.
"""

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field


T = TypeVar("T")


class ListResponse(BaseModel, Generic[T]):
    """Generic paginated list response."""

    items: List[T]
    total: int
    page: int = 1
    pages: int = 1
    size: int = 0

    class Config:
        from_attributes = True


class PaginationParams(BaseModel):
    """Common pagination parameters."""

    skip: int = Field(0, ge=0, description="Number of items to skip")
    limit: int = Field(100, ge=1, le=1000, description="Maximum number of items to return")


class SuccessResponse(BaseModel):
    """Generic success response."""

    success: bool = True
    message: str


class ErrorResponse(BaseModel):
    """Generic error response."""

    success: bool = False
    error: str
    detail: Optional[str] = None


class DeleteResponse(BaseModel):
    """Generic delete response."""

    success: bool = True
    message: str = "Successfully deleted"
    deleted_id: Optional[int] = None
