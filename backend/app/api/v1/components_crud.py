"""
Components API using the new BaseCRUDRouter with automatic logging
"""

from app.api.base_crud_router import create_crud_router
from app.models.component import Component
from app.schemas.component import Component as ComponentSchema
from app.schemas.component import ComponentCreate, ComponentUpdate

# Create router with automatic CRUD operations and logging
router = create_crud_router(
    model_class=Component,
    create_schema=ComponentCreate,
    update_schema=ComponentUpdate,
    response_schema=ComponentSchema,
    prefix="/components",
    tags=["components"],
    resource_name="component",
)