"""Tests for Category model and API"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from tests.utils import create_random_category

class TestCategoryModel:
    """Test Category model"""
    
    def test_create_category(self, db: Session):
        """Test creating a category"""
        category_data = {name: 'test_name', is_active: True}
        category = Category(**category_data)
        db.add(category)
        db.commit()
        db.refresh(category)
        
        assert category.id is not None
                assert category.name
        assert category.description
        assert category.is_active
    
    def test_category_repr(self, db: Session):
        """Test category string representation"""
        category = create_random_category(db)
        assert str(category) == f"<Category(id={category.id})>"

class TestCategoryAPI:
    """Test Category API endpoints"""
    
    def test_create_category(self, client: TestClient, normal_user_token_headers: dict):
        """Test creating category via API"""
        data = {name: 'test_name', is_active: True}
        response = client.post(
            "/categorys/",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 201
        content = response.json()
        assert content["id"]
                assert content["name
        assert content["description
        assert content["is_active
    
    def test_read_category(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test reading category via API"""
        category = create_random_category(db)
        response = client.get(
            f"/categorys/{category.id}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["id"] == category.id
    
    def test_update_category(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test updating category via API"""
        category = create_random_category(db)
        data = {"updated_field": "updated_value"}
        response = client.put(
            f"/categorys/{category.id}",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 200
        content = response.json()
                assert content["id"] == category.id
    
    def test_delete_category(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test deleting category via API"""
        category = create_random_category(db)
        response = client.delete(
            f"/categorys/{category.id}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 204
    
    def test_list_categorys(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test listing categorys via API"""
        # Create multiple categorys
        for _ in range(3):
            create_random_category(db)
        
        response = client.get(
            "/categorys/",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert len(content["items"]) >= 3
        assert "total" in content
        assert "skip" in content
        assert "limit" in content