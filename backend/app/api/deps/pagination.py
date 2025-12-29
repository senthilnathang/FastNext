"""Pagination dependency"""

from dataclasses import dataclass
from typing import Optional

from fastapi import Query


@dataclass
class PaginationParams:
    """Pagination parameters"""
    page: int = 1
    page_size: int = 20
    skip: int = 0

    def __post_init__(self):
        self.skip = (self.page - 1) * self.page_size


def get_pagination(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> PaginationParams:
    """
    Pagination dependency.

    Usage:
        @router.get("/items")
        def get_items(
            pagination: PaginationParams = Depends(get_pagination)
        ):
            items = db.query(Item).offset(pagination.skip).limit(pagination.page_size).all()
            return {
                "items": items,
                "page": pagination.page,
                "page_size": pagination.page_size
            }
    """
    return PaginationParams(page=page, page_size=page_size)
