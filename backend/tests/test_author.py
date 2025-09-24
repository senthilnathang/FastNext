"""Tests for Author model and API"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.author import Author
from app.schemas.author import AuthorCreate, AuthorUpdate
from tests.utils import create_random_author

class TestAuthorModel:
    """Test Author model"""
    
    def test_create_author(self, db: Session):
        """Test creating a author"""
        author_data = {name: 'test_name', is_active: True}
        author = Author(**author_data)
        db.add(author)
        db.commit()
        db.refresh(author)
        
        assert author.id is not None
                assert author.name
        assert author.description
        assert author.is_active
    
    def test_author_repr(self, db: Session):
        """Test author string representation"""
        author = create_random_author(db)
        assert str(author) == f"<Author(id={author.id})>"

class TestAuthorAPI:
    """Test Author API endpoints"""
    
    def test_create_author(self, client: TestClient, normal_user_token_headers: dict):
        """Test creating author via API"""
        data = {name: 'test_name', is_active: True}
        response = client.post(
            "/authors/",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 201
        content = response.json()
        assert content["id"]
                assert content["name
        assert content["description
        assert content["is_active
    
    def test_read_author(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test reading author via API"""
        author = create_random_author(db)
        response = client.get(
            f"/authors/{author.id}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["id"] == author.id
    
    def test_update_author(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test updating author via API"""
        author = create_random_author(db)
        data = {"updated_field": "updated_value"}
        response = client.put(
            f"/authors/{author.id}",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 200
        content = response.json()
                assert content["id"] == author.id
    
    def test_delete_author(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test deleting author via API"""
        author = create_random_author(db)
        response = client.delete(
            f"/authors/{author.id}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 204
    
    def test_list_authors(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test listing authors via API"""
        # Create multiple authors
        for _ in range(3):
            create_random_author(db)
        
        response = client.get(
            "/authors/",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert len(content["items"]) >= 3
        assert "total" in content
        assert "skip" in content
        assert "limit" in content