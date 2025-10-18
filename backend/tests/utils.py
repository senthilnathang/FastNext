"""Test utilities for creating random test data."""

import random
import string
from typing import Optional

from app.models.author import Author
from app.models.blog_post import BlogPost
from app.models.category import Category
from app.models.product import Product
from app.models.sales import Sales
from sqlalchemy.orm import Session


def random_string(length: int = 10) -> str:
    """Generate a random string of given length."""
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


def random_email() -> str:
    """Generate a random email address."""
    return f"{random_string(8)}@{random_string(5)}.com"


def create_random_product(db: Session, **overrides) -> Product:
    """Create a random product for testing."""
    product_data = {
        "name": f"Test Product {random_string(5)}",
        "price": round(random.uniform(10.0, 1000.0), 2),
        "category": random.choice(["Electronics", "Clothing", "Books", "Sports", "Home & Garden"]),
        "sku": f"TEST-{random_string(6).upper()}",
        "stock_quantity": random.randint(0, 1000),
        "is_featured": random.choice([True, False]),
        "description": f"Test description for {random_string(10)}",
        "support_email": random_email(),
        **overrides,
    }
    product = Product(**product_data)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def create_random_category(db: Session, **overrides) -> Category:
    """Create a random category for testing."""
    category_data = {
        "name": f"Test Category {random_string(5)}",
        "description": f"Test description for {random_string(10)}",
        **overrides,
    }
    category = Category(**category_data)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def create_random_author(db: Session, **overrides) -> Author:
    """Create a random author for testing."""
    author_data = {
        "name": f"Test Author {random_string(5)}",
        "email": random_email(),
        "bio": f"Test bio for {random_string(10)}",
        **overrides,
    }
    author = Author(**author_data)
    db.add(author)
    db.commit()
    db.refresh(author)
    return author


def create_random_blog_post(db: Session, author_id: Optional[int] = None, **overrides) -> BlogPost:
    """Create a random blog post for testing."""
    if author_id is None:
        # Create an author if not provided
        author = create_random_author(db)
        author_id = author.id

    blog_post_data = {
        "title": f"Test Blog Post {random_string(5)}",
        "content": f"Test content for {random_string(20)}",
        "status": random.choice(["draft", "published", "archived"]),
        "author_id": author_id,
        **overrides,
    }
    blog_post = BlogPost(**blog_post_data)
    db.add(blog_post)
    db.commit()
    db.refresh(blog_post)
    return blog_post


def create_random_sales(db: Session, **overrides) -> Sales:
    """Create a random sales record for testing."""
    sales_data = {
        "product_name": f"Test Product {random_string(5)}",
        "quantity": random.randint(1, 100),
        "price": round(random.uniform(10.0, 500.0), 2),
        "total": round(random.uniform(10.0, 5000.0), 2),
        "customer_email": random_email(),
        "sale_date": None,  # Will be set by default
        **overrides,
    }
    sales = Sales(**sales_data)
    db.add(sales)
    db.commit()
    db.refresh(sales)
    return sales