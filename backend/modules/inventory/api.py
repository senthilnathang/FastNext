from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db
from . import schemas
from .services import InventoryService

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.get("/products", response_model=List[schemas.Product])
def list_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    service = InventoryService(db)
    return service.get_products(skip=skip, limit=limit)

@router.post("/products", response_model=schemas.Product, status_code=status.HTTP_201_CREATED)
def create_product(
    product: schemas.ProductCreate,
    db: Session = Depends(get_db)
):
    service = InventoryService(db)
    return service.create_product(product)

@router.get("/products/{product_id}", response_model=schemas.Product)
def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    service = InventoryService(db)
    product = service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/products/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: int,
    product: schemas.ProductUpdate,
    db: Session = Depends(get_db)
):
    service = InventoryService(db)
    updated = service.update_product(product_id, product)
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    return updated

@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    service = InventoryService(db)
    if not service.delete_product(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}

@router.get("/categories", response_model=List[schemas.ProductCategory])
def list_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    service = InventoryService(db)
    return service.get_categories(skip=skip, limit=limit)

@router.post("/categories", response_model=schemas.ProductCategory, status_code=status.HTTP_201_CREATED)
def create_category(
    category: schemas.ProductCategoryCreate,
    db: Session = Depends(get_db)
):
    service = InventoryService(db)
    return service.create_category(category)
