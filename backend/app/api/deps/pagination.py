"""
Pagination Dependencies
FastAPI dependencies for pagination parameters
"""
from typing import Optional
from fastapi import Query
from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    """Pagination parameters model"""
    skip: int = Field(0, ge=0, description="Number of records to skip")
    limit: int = Field(20, ge=1, le=100, description="Number of records to return")
    
    @property
    def offset(self) -> int:
        """Alias for skip for SQL compatibility"""
        return self.skip
    
    @property  
    def page(self) -> int:
        """Calculate current page number"""
        return (self.skip // self.limit) + 1


def get_pagination_params(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return")
) -> PaginationParams:
    """
    Get pagination parameters from query params
    
    Args:
        skip: Number of records to skip
        limit: Number of records to return (max 100)
        
    Returns:
        PaginationParams: Pagination parameters
    """
    return PaginationParams(skip=skip, limit=limit)


class SearchParams(BaseModel):
    """Search parameters model"""
    q: Optional[str] = Field(None, description="Search query")
    sort_by: Optional[str] = Field(None, description="Sort by field")
    sort_order: Optional[str] = Field("asc", regex="^(asc|desc)$", description="Sort order")


def get_search_params(
    q: Optional[str] = Query(None, description="Search query"),
    sort_by: Optional[str] = Query(None, description="Sort by field"),
    sort_order: str = Query("asc", regex="^(asc|desc)$", description="Sort order")
) -> SearchParams:
    """
    Get search parameters from query params
    
    Args:
        q: Search query string
        sort_by: Field to sort by
        sort_order: Sort order (asc/desc)
        
    Returns:
        SearchParams: Search parameters
    """
    return SearchParams(q=q, sort_by=sort_by, sort_order=sort_order)


class FilterParams(BaseModel):
    """Filter parameters model"""
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    created_after: Optional[str] = Field(None, description="Filter by creation date (ISO format)")
    created_before: Optional[str] = Field(None, description="Filter by creation date (ISO format)")


def get_filter_params(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    created_after: Optional[str] = Query(None, description="Created after date (ISO format)"),
    created_before: Optional[str] = Query(None, description="Created before date (ISO format)")
) -> FilterParams:
    """
    Get filter parameters from query params
    
    Args:
        is_active: Filter by active status
        created_after: Filter by creation date (after)
        created_before: Filter by creation date (before)
        
    Returns:
        FilterParams: Filter parameters
    """
    return FilterParams(
        is_active=is_active,
        created_after=created_after,
        created_before=created_before
    )