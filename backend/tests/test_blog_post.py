"""Tests for BlogPost model and API"""

import pytest
from app.models.blog_post import BlogPost
from app.schemas.blog_post import BlogPostCreate, BlogPostUpdate
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.utils import create_random_blog_post


class TestBlogPostModel:
    """Test BlogPost model"""

    def test_create_blog_post(self, db: Session):
        """Test creating a blog_post"""
        blog_post_data = {"title": "test_title", "slug": "test_slug", "view_count": 123}
        blog_post = BlogPost(**blog_post_data)
        db.add(blog_post)
        db.commit()
        db.refresh(blog_post)

        assert blog_post.id is not None
        assert blog_post.title
        assert blog_post.slug
        assert blog_post.excerpt
        assert blog_post.content
        assert blog_post.status
        assert blog_post.published_at
        assert blog_post.view_count
        assert blog_post.tags
        assert blog_post.author_id

    def test_blog_post_repr(self, db: Session):
        """Test blog_post string representation"""
        blog_post = create_random_blog_post(db)
        assert str(blog_post) == f"<BlogPost(id={blog_post.id})>"


class TestBlogPostAPI:
    """Test BlogPost API endpoints"""

    def test_create_blog_post(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """Test creating blog_post via API"""
        data = {"title": "test_title", "slug": "test_slug", "view_count": 123}
        response = client.post(
            "/blog_posts/",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 201
        content = response.json()
        assert content["id"]
        assert content["title"]
        assert content["slug"]
        assert content["excerpt"]
        assert content["content"]
        assert content["status"]
        assert content["published_at"]
        assert content["view_count"]
        assert content["tags"]
        assert content["author_id"]

    def test_read_blog_post(
        self, client: TestClient, normal_user_token_headers: dict, db: Session
    ):
        """Test reading blog_post via API"""
        blog_post = create_random_blog_post(db)
        response = client.get(
            f"/blog_posts/{blog_post.id}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["id"] == blog_post.id

    def test_update_blog_post(
        self, client: TestClient, normal_user_token_headers: dict, db: Session
    ):
        """Test updating blog_post via API"""
        blog_post = create_random_blog_post(db)
        data = {"updated_field": "updated_value"}
        response = client.put(
            f"/blog_posts/{blog_post.id}",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["id"] == blog_post.id

    def test_delete_blog_post(
        self, client: TestClient, normal_user_token_headers: dict, db: Session
    ):
        """Test deleting blog_post via API"""
        blog_post = create_random_blog_post(db)
        response = client.delete(
            f"/blog_posts/{blog_post.id}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 204

    def test_list_blog_posts(
        self, client: TestClient, normal_user_token_headers: dict, db: Session
    ):
        """Test listing blog_posts via API"""
        # Create multiple blog_posts
        for _ in range(3):
            create_random_blog_post(db)

        response = client.get(
            "/blog_posts/",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert len(content["items"]) >= 3
        assert "total" in content
        assert "skip" in content
        assert "limit" in content
