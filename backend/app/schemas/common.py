from typing import Generic, List, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response schema"""

    items: List[T]
    total: int
    skip: int
    limit: int

    class Config:
        from_attributes = True


class PaginationParams(BaseModel):
    """Common pagination parameters"""

    skip: int = 0
    limit: int = 100

    class Config:
        from_attributes = True


class ListResponse(BaseModel, Generic[T]):
    """Generic list response with pagination metadata"""

    items: List[T]
    total: int
    skip: int
    limit: int

    @classmethod
    def paginate(cls, items: List[T], total: int, skip: int = 0, limit: int = 100):
        """Create paginated response from items list"""
        return cls(items=items, total=total, skip=skip, limit=limit)
