"""
Model enums for the FastNext application.
"""

from enum import Enum


class ProductCategory(str, Enum):
    """Product category enumeration"""

    ELECTRONICS = "Electronics"
    CLOTHING = "Clothing"
    BOOKS = "Books"
    SPORTS = "Sports"
    HOME_GARDEN = "Home & Garden"


class PostStatus(str, Enum):
    """Blog post status enumeration"""

    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
