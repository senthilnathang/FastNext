"""Tests for Sales model and API"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.sales import Sales
from app.schemas.sales import SalesCreate, SalesUpdate
from tests.utils import create_random_sales

class TestSalesModel:
    """Test Sales model"""
    
    def test_create_sales(self, db: Session):
        """Test creating a sales"""
        sales_data = {name: 'test_name'}
        sales = Sales(**sales_data)
        db.add(sales)
        db.commit()
        db.refresh(sales)
        
        assert sales.id is not None
                assert sales.name
    
    def test_sales_repr(self, db: Session):
        """Test sales string representation"""
        sales = create_random_sales(db)
        assert str(sales) == f"<Sales(id={sales.id})>"

class TestSalesAPI:
    """Test Sales API endpoints"""
    
    def test_create_sales(self, client: TestClient, normal_user_token_headers: dict):
        """Test creating sales via API"""
        data = {name: 'test_name'}
        response = client.post(
            "/saless/",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 201
        content = response.json()
        assert content["id"]
                assert content["name
    
    def test_read_sales(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test reading sales via API"""
        sales = create_random_sales(db)
        response = client.get(
            f"/saless/{sales.id}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["id"] == sales.id
    
    def test_update_sales(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test updating sales via API"""
        sales = create_random_sales(db)
        data = {"updated_field": "updated_value"}
        response = client.put(
            f"/saless/{sales.id}",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 200
        content = response.json()
                assert content["id"] == sales.id
    
    def test_delete_sales(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test deleting sales via API"""
        sales = create_random_sales(db)
        response = client.delete(
            f"/saless/{sales.id}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 204
    
    def test_list_saless(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test listing saless via API"""
        # Create multiple saless
        for _ in range(3):
            create_random_sales(db)
        
        response = client.get(
            "/saless/",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert len(content["items"]) >= 3
        assert "total" in content
        assert "skip" in content
        assert "limit" in content