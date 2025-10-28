"""
Base CRUD Router with automatic activity/message/audit logging
"""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps.database import get_db
from app.api.deps.auth import get_current_active_user
from app.models.user import User
from app.services.base_crud_service import BaseCRUDService

T = TypeVar('T')
CreateSchema = TypeVar('CreateSchema', bound=BaseModel)
UpdateSchema = TypeVar('UpdateSchema', bound=BaseModel)


class BaseCRUDRouter(Generic[T, CreateSchema, UpdateSchema]):
    """FastAPI router with automatic CRUD operations and logging"""

    def __init__(
        self,
        model_class: Type[T],
        create_schema: Type[CreateSchema],
        update_schema: Type[UpdateSchema],
        response_schema: Type[BaseModel],
        prefix: str = "",
        tags: List[str] = None,
        resource_name: str = None,
    ):
        self.model_class = model_class
        self.create_schema = create_schema
        self.update_schema = update_schema
        self.response_schema = response_schema
        self.prefix = prefix or f"/{model_class.__tablename__}"
        self.tags = tags or [resource_name or model_class.__name__]
        self.resource_name = resource_name or model_class.__name__.lower()

        # Create router
        self.router = APIRouter(prefix=self.prefix, tags=self.tags)

        # Register routes
        self._register_routes()

    def _register_routes(self):
        """Register all CRUD routes"""

        @self.router.get("/", response_model=List[self.response_schema])
        def get_list(
            db: Session = Depends(get_db),
            skip: int = 0,
            limit: int = 100,
            current_user: User = Depends(get_current_active_user),
        ):
            """Get list of items"""
            service = BaseCRUDService(db, self.model_class)
            try:
                items = service.get_list(skip=skip, limit=limit)
                return items
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to retrieve {self.resource_name}: {str(e)}"
                )

        @self.router.post("/", response_model=self.response_schema)
        def create_item(
            item_in: self.create_schema,
            db: Session = Depends(get_db),
            current_user: User = Depends(get_current_active_user),
        ):
            """Create new item with automatic logging"""
            service = BaseCRUDService(db, self.model_class)
            try:
                data = item_in.model_dump()
                item = service.create(
                    data=data,
                    user_id=current_user.id,
                    notify_users=[],  # Can be extended to notify relevant users
                )
                return item
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create {self.resource_name}: {str(e)}"
                )

        @self.router.get("/{item_id}", response_model=self.response_schema)
        def get_item(
            item_id: int,
            db: Session = Depends(get_db),
            current_user: User = Depends(get_current_active_user),
        ):
            """Get item by ID"""
            service = BaseCRUDService(db, self.model_class)
            try:
                item = service.get_by_id(item_id)
                if not item:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"{self.resource_name.title()} not found"
                    )
                return item
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to retrieve {self.resource_name}: {str(e)}"
                )

        @self.router.put("/{item_id}", response_model=self.response_schema)
        def update_item(
            item_id: int,
            item_in: self.update_schema,
            db: Session = Depends(get_db),
            current_user: User = Depends(get_current_active_user),
        ):
            """Update item with automatic logging"""
            service = BaseCRUDService(db, self.model_class)
            try:
                data = item_in.model_dump(exclude_unset=True)
                item = service.update(
                    item_id=item_id,
                    data=data,
                    user_id=current_user.id,
                )
                if not item:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"{self.resource_name.title()} not found"
                    )
                return item
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to update {self.resource_name}: {str(e)}"
                )

        @self.router.delete("/{item_id}")
        def delete_item(
            item_id: int,
            db: Session = Depends(get_db),
            current_user: User = Depends(get_current_active_user),
        ):
            """Delete item with automatic logging"""
            service = BaseCRUDService(db, self.model_class)
            try:
                result = service.delete(
                    item_id=item_id,
                    user_id=current_user.id,
                )
                return result
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to delete {self.resource_name}: {str(e)}"
                )

    def get_router(self) -> APIRouter:
        """Get the configured router"""
        return self.router


def create_crud_router(
    model_class: Type[T],
    create_schema: Type[CreateSchema],
    update_schema: Type[UpdateSchema],
    response_schema: Type[BaseModel],
    prefix: str = "",
    tags: List[str] = None,
    resource_name: str = None,
) -> APIRouter:
    """
    Factory function to create a CRUD router with automatic logging

    Args:
        model_class: SQLAlchemy model class
        create_schema: Pydantic schema for creation
        update_schema: Pydantic schema for updates
        response_schema: Pydantic schema for responses
        prefix: URL prefix for routes
        tags: OpenAPI tags
        resource_name: Human-readable resource name

    Returns:
        Configured FastAPI router
    """
    crud_router = BaseCRUDRouter(
        model_class=model_class,
        create_schema=create_schema,
        update_schema=update_schema,
        response_schema=response_schema,
        prefix=prefix,
        tags=tags,
        resource_name=resource_name,
    )
    return crud_router.get_router()