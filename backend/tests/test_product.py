"""Tests for Product model and API"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from tests.utils import create_random_product

class TestProductModel:
    """Test Product model"""
    
    def test_create_product(self, db: Session):
        """Test creating a product"""
        product_data = {name: 'test_name', sku: 'test_sku', stock_quantity: 123, is_featured: True, support_email: 'test@example.com'}
        product = Product(**product_data)
        db.add(product)
        db.commit()
        db.refresh(product)
        
        assert product.id is not None
                assert product.name
        assert product.description
        assert product.price
        assert product.category
        assert product.sku
        assert product.stock_quantity
        assert product.is_featured
        assert product.launch_date
        assert product.specifications
        assert product.website_url
        assert product.support_email
        assert product.category_id
    
    def test_product_repr(self, db: Session):
        """Test product string representation"""
        product = create_random_product(db)
        assert str(product) == f"<Product(id={product.id})>"

class TestProductAPI:
    """Test Product API endpoints"""
    
    def test_create_product(self, client: TestClient, normal_user_token_headers: dict):
        """Test creating product via API"""
        data = {name: 'test_name', sku: 'test_sku', stock_quantity: 123, is_featured: True, support_email: 'test@example.com'}
        response = client.post(
            "/products/",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 201
        content = response.json()
        assert content["id"]
                assert content["name
        assert content["description
        assert content["price
        assert content["category
        assert content["sku
        assert content["stock_quantity
        assert content["is_featured
        assert content["launch_date
        assert content["specifications
        assert content["website_url
        assert content["support_email
        assert content["category_id
    
    def test_read_product(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test reading product via API"""
        product = create_random_product(db)
        response = client.get(
            f"/products/{product.id}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["id"] == product.id
    
    def test_update_product(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test updating product via API"""
        product = create_random_product(db)
        data = {"updated_field": "updated_value"}
        response = client.put(
            f"/products/{product.id}",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 200
        content = response.json()
                assert content["id"] == product.id
    
    def test_delete_product(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test deleting product via API"""
        product = create_random_product(db)
        response = client.delete(
            f"/products/{product.id}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 204
    
    def test_list_products(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test listing products via API"""
        # Create multiple products
        for _ in range(3):
            create_random_product(db)
        
        response = client.get(
            "/products/",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert len(content["items"]) >= 3
        assert "total" in content
        assert "skip" in content
        assert "limit" in content