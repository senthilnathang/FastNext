"""
Backend Scaffolding Generator for FastNext Framework

This utility generates complete backend CRUD interfaces including:
- SQLAlchemy models with mixins and relationships
- Pydantic schemas for validation
- FastAPI routes with permissions
- Service layer for business logic
- Database migrations with Alembic
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import re


def to_snake_case(name: str) -> str:
    """Convert CamelCase to snake_case"""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


class FieldType(Enum):
    """Supported field types for backend generation"""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATE = "date"
    DATETIME = "datetime"
    TEXT = "text"
    EMAIL = "email"
    URL = "url"
    JSON = "json"
    ENUM = "enum"
    FOREIGN_KEY = "foreign_key"
    

class ModelMixin(Enum):
    """Available model mixins"""
    TIMESTAMP = "timestamp"
    SOFT_DELETE = "soft_delete"
    AUDIT = "audit"
    METADATA = "metadata"


@dataclass
class ValidationRule:
    """Field validation configuration"""
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[Union[int, float]] = None
    max_value: Optional[Union[int, float]] = None
    pattern: Optional[str] = None
    custom_validator: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class RelationshipConfig:
    """Database relationship configuration"""
    target_model: str
    relationship_type: str  # "one_to_many", "many_to_one", "many_to_many"
    back_populates: Optional[str] = None
    foreign_key: Optional[str] = None
    cascade: Optional[str] = None
    lazy: str = "select"


@dataclass
class FieldDefinition:
    """Backend field definition with validation and relationships"""
    name: str
    type: FieldType
    required: bool = True
    nullable: bool = False
    unique: bool = False
    indexed: bool = False
    default: Optional[Any] = None
    server_default: Optional[str] = None
    
    # Validation
    validation: Optional[ValidationRule] = None
    
    # String fields
    max_length: Optional[int] = None
    
    # Enum fields
    enum_values: Optional[List[str]] = None
    enum_name: Optional[str] = None
    
    # Foreign key relationships
    relationship: Optional[RelationshipConfig] = None
    
    # Documentation
    description: Optional[str] = None
    example: Optional[Any] = None
    
    # API exposure
    include_in_create: bool = True
    include_in_update: bool = True
    include_in_response: bool = True
    include_in_list: bool = True
    
    # Search and filtering
    searchable: bool = False
    filterable: bool = False
    sortable: bool = True


@dataclass 
class ModelDefinition:
    """Complete model definition for backend generation"""
    name: str  # e.g., "Product"
    table_name: Optional[str] = None  # e.g., "products" 
    description: Optional[str] = None
    
    # Fields
    fields: List[FieldDefinition] = field(default_factory=list)
    
    # Model configuration
    mixins: List[ModelMixin] = field(default_factory=lambda: [ModelMixin.TIMESTAMP])
    
    # Permissions
    permission_category: Optional[str] = None  # For RBAC
    owner_field: Optional[str] = None  # Field that determines ownership
    project_scoped: bool = False  # Whether this model is project-scoped
    
    # API configuration
    list_page_size: int = 50
    max_page_size: int = 1000
    enable_search: bool = True
    enable_filtering: bool = True
    enable_sorting: bool = True
    
    # Generation options
    generate_service: bool = True
    generate_migrations: bool = True
    generate_tests: bool = True
    
    def __post_init__(self):
        """Set defaults after initialization"""
        if self.table_name is None:
            self.table_name = to_snake_case(self.name.lower() + 's')
        
        if self.permission_category is None:
            self.permission_category = self.name.lower()


class BackendScaffoldGenerator:
    """Main backend scaffolding generator"""
    
    def __init__(self, model_def: ModelDefinition, base_path: str = "."):
        self.model_def = model_def
        self.base_path = Path(base_path)
        self.model_name = model_def.name
        self.table_name = model_def.table_name
        self.snake_name = to_snake_case(self.model_name)
        self.plural_name = self.snake_name + 's'
        
    def generate_all(self):
        """Generate all backend components"""
        print(f"🚀 Generating backend scaffolding for {self.model_name}...")
        
        try:
            # 1. Generate SQLAlchemy model
            self.generate_model()
            
            # 2. Generate Pydantic schemas
            self.generate_schemas()
            
            # 3. Generate API routes
            self.generate_routes()
            
            # 4. Generate service layer
            if self.model_def.generate_service:
                self.generate_service()
            
            # 5. Generate database migration
            if self.model_def.generate_migrations:
                self.generate_migration()
            
            # 6. Generate tests
            if self.model_def.generate_tests:
                self.generate_tests()
            
            # 7. Update API router
            self.update_main_router()
            
            print(f"✅ Successfully generated backend scaffolding for {self.model_name}!")
            print("\nGenerated files:")
            print(f"📁 Model: app/models/{self.snake_name}.py")
            print(f"📁 Schemas: app/schemas/{self.snake_name}.py") 
            print(f"📁 Routes: app/api/{self.plural_name}.py")
            if self.model_def.generate_service:
                print(f"📁 Service: app/services/{self.snake_name}_service.py")
            if self.model_def.generate_migrations:
                print(f"📁 Migration: migrations/versions/add_{self.table_name}.py")
            print(f"📁 Router: Updated app/api/main.py")
            
        except Exception as error:
            print(f"❌ Error generating backend scaffolding: {error}")
            raise
    
    def generate_model(self):
        """Generate SQLAlchemy model file"""
        imports = self._generate_model_imports()
        class_def = self._generate_model_class()
        
        content = f'''{imports}

{class_def}
'''
        
        self._write_file(f"app/models/{self.snake_name}.py", content)
    
    def _generate_model_imports(self) -> str:
        """Generate imports for SQLAlchemy model"""
        imports = [
            "from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey, JSON",
            "from sqlalchemy.orm import relationship, Mapped, mapped_column",
            "from sqlalchemy.sql import func",
            "from typing import Optional, List",
            "",
            "from app.models.base import Base"
        ]
        
        # Add mixin imports
        mixin_imports = []
        for mixin in self.model_def.mixins:
            if mixin == ModelMixin.TIMESTAMP:
                mixin_imports.append("TimestampMixin")
            elif mixin == ModelMixin.SOFT_DELETE:
                mixin_imports.append("SoftDeleteMixin") 
            elif mixin == ModelMixin.AUDIT:
                mixin_imports.append("AuditMixin")
            elif mixin == ModelMixin.METADATA:
                mixin_imports.append("MetadataMixin")
        
        if mixin_imports:
            imports.insert(-1, f"from app.models.base import {', '.join(mixin_imports)}")
        
        # Add enum imports
        for field in self.model_def.fields:
            if field.type == FieldType.ENUM and field.enum_name:
                imports.append(f"from app.models.enums import {field.enum_name}")
        
        return '\n'.join(imports)
    
    def _generate_model_class(self) -> str:
        """Generate the main SQLAlchemy model class"""
        # Determine base classes
        base_classes = ["Base"]
        for mixin in self.model_def.mixins:
            if mixin == ModelMixin.TIMESTAMP:
                base_classes.append("TimestampMixin")
            elif mixin == ModelMixin.SOFT_DELETE:
                base_classes.append("SoftDeleteMixin")
            elif mixin == ModelMixin.AUDIT:
                base_classes.append("AuditMixin") 
            elif mixin == ModelMixin.METADATA:
                base_classes.append("MetadataMixin")
        
        base_class_str = ", ".join(base_classes)
        
        # Generate class definition
        class_lines = [
            f'class {self.model_name}({base_class_str}):',
            f'    """',
            f'    {self.model_def.description or f"{self.model_name} model"}',
            f'    """',
            f'    __tablename__ = "{self.table_name}"',
            "",
            "    # Primary key",
            "    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)",
            ""
        ]
        
        # Generate field definitions
        for field in self.model_def.fields:
            field_def = self._generate_field_definition(field)
            class_lines.extend(field_def)
        
        # Generate relationships
        relationships = self._generate_relationships()
        if relationships:
            class_lines.append("")
            class_lines.extend(relationships)
        
        # Add repr method
        class_lines.extend([
            "",
            "    def __repr__(self) -> str:",
            f'        return f"<{self.model_name}(id={{self.id}})>"'
        ])
        
        return '\n'.join(class_lines)
    
    def _generate_field_definition(self, field: FieldDefinition) -> List[str]:
        """Generate SQLAlchemy field definition"""
        lines = []
        
        # Add comment if description exists
        if field.description:
            lines.append(f"    # {field.description}")
        
        # Determine SQLAlchemy column type
        column_type = self._get_sqlalchemy_type(field)
        
        # Build column definition
        column_args = []
        
        # Add constraints
        if field.unique:
            column_args.append("unique=True")
        if field.indexed:
            column_args.append("index=True")
        if not field.nullable and not field.required:
            column_args.append("nullable=False")
        if field.default is not None:
            column_args.append(f"default={repr(field.default)}")
        if field.server_default:
            column_args.append(f"server_default={field.server_default}")
        
        # Foreign key handling
        if field.relationship:
            if field.relationship.foreign_key:
                column_args.append(f'ForeignKey("{field.relationship.foreign_key}")')
        
        args_str = ", ".join(column_args)
        if args_str:
            args_str = ", " + args_str
        
        # Generate the field definition
        optional = "" if field.required else "Optional["
        close_bracket = "" if field.required else "]"
        
        lines.append(f"    {field.name}: Mapped[{optional}{self._get_python_type(field)}{close_bracket}] = mapped_column({column_type}{args_str})")
        
        return lines
    
    def _generate_relationships(self) -> List[str]:
        """Generate SQLAlchemy relationships"""
        lines = ["    # Relationships"]
        
        for field in self.model_def.fields:
            if field.relationship:
                rel = field.relationship
                
                # Determine relationship function
                if rel.relationship_type == "many_to_one":
                    rel_func = "relationship"
                elif rel.relationship_type == "one_to_many":
                    rel_func = "relationship"
                elif rel.relationship_type == "many_to_many":
                    rel_func = "relationship"  # Would need secondary table
                else:
                    continue
                
                # Build relationship arguments
                rel_args = [f'"{rel.target_model}"']
                
                if rel.back_populates:
                    rel_args.append(f'back_populates="{rel.back_populates}"')
                if rel.cascade:
                    rel_args.append(f'cascade="{rel.cascade}"')
                if rel.lazy != "select":
                    rel_args.append(f'lazy="{rel.lazy}"')
                
                args_str = ", ".join(rel_args)
                
                # Determine type annotation
                if rel.relationship_type == "one_to_many":
                    type_annotation = f"List[{rel.target_model}]"
                else:
                    type_annotation = f"Optional[{rel.target_model}]"
                
                lines.append(f"    {field.name}: Mapped[{type_annotation}] = {rel_func}({args_str})")
        
        return lines if len(lines) > 1 else []
    
    def generate_schemas(self):
        """Generate Pydantic schemas file"""
        imports = self._generate_schema_imports()
        schemas = self._generate_schema_classes()
        
        content = f'''{imports}

{schemas}
'''
        
        self._write_file(f"app/schemas/{self.snake_name}.py", content)
    
    def _generate_schema_imports(self) -> str:
        """Generate imports for Pydantic schemas"""
        imports = [
            "from pydantic import BaseModel, Field, EmailStr, HttpUrl, validator",
            "from typing import Optional, List, Dict, Any",
            "from datetime import datetime, date",
            "",
            "from app.schemas.base import BaseResponseModel"
        ]
        
        # Add enum imports
        for field in self.model_def.fields:
            if field.type == FieldType.ENUM and field.enum_name:
                imports.append(f"from app.models.enums import {field.enum_name}")
        
        return '\n'.join(imports)
    
    def _generate_schema_classes(self) -> str:
        """Generate all Pydantic schema classes"""
        schemas = []
        
        # Base schema
        schemas.append(self._generate_base_schema())
        schemas.append("")
        
        # Create schema
        schemas.append(self._generate_create_schema())
        schemas.append("")
        
        # Update schema
        schemas.append(self._generate_update_schema())
        schemas.append("")
        
        # Response schema
        schemas.append(self._generate_response_schema())
        schemas.append("")
        
        # List response schema
        schemas.append(self._generate_list_response_schema())
        
        return '\n'.join(schemas)
    
    def _generate_base_schema(self) -> str:
        """Generate base Pydantic schema"""
        fields = []
        
        for field in self.model_def.fields:
            if field.include_in_response:
                field_def = self._generate_pydantic_field(field, for_base=True)
                if field_def:
                    fields.append(field_def)
        
        fields_str = '\n    '.join(fields) if fields else "    pass"
        
        return f'''class {self.model_name}Base(BaseModel):
    """Base schema for {self.model_name}"""
    {fields_str}'''
    
    def _generate_create_schema(self) -> str:
        """Generate create Pydantic schema"""
        fields = []
        
        for field in self.model_def.fields:
            if field.include_in_create:
                field_def = self._generate_pydantic_field(field, for_create=True)
                if field_def:
                    fields.append(field_def)
        
        validators = self._generate_validators()
        
        fields_str = '\n    '.join(fields) if fields else "    pass"
        validators_str = '\n    '.join(validators) if validators else ""
        
        schema_content = f'''class {self.model_name}Create({self.model_name}Base):
    """Schema for creating {self.model_name}"""
    {fields_str}'''
        
        if validators_str:
            schema_content += f"\n    \n    {validators_str}"
        
        return schema_content
    
    def _generate_update_schema(self) -> str:
        """Generate update Pydantic schema"""
        fields = []
        
        for field in self.model_def.fields:
            if field.include_in_update:
                field_def = self._generate_pydantic_field(field, for_update=True)
                if field_def:
                    fields.append(field_def)
        
        fields_str = '\n    '.join(fields) if fields else "    pass"
        
        return f'''class {self.model_name}Update(BaseModel):
    """Schema for updating {self.model_name}"""
    {fields_str}'''
    
    def _generate_response_schema(self) -> str:
        """Generate response Pydantic schema"""
        fields = ["id: int"]
        
        for field in self.model_def.fields:
            if field.include_in_response:
                field_def = self._generate_pydantic_field(field, for_response=True)
                if field_def:
                    fields.append(field_def)
        
        # Add mixin fields
        if ModelMixin.TIMESTAMP in self.model_def.mixins:
            fields.extend([
                "created_at: datetime",
                "updated_at: Optional[datetime] = None"
            ])
        
        if ModelMixin.SOFT_DELETE in self.model_def.mixins:
            fields.extend([
                "is_deleted: bool = False",
                "deleted_at: Optional[datetime] = None"
            ])
        
        fields_str = '\n    '.join(fields)
        
        return f'''class {self.model_name}Response({self.model_name}Base, BaseResponseModel):
    """Schema for {self.model_name} responses"""
    {fields_str}
    
    model_config = {{"from_attributes": True}}'''
    
    def _generate_list_response_schema(self) -> str:
        """Generate list response schema"""
        return f'''class {self.model_name}ListResponse(BaseModel):
    """Schema for {self.model_name} list responses"""
    items: List[{self.model_name}Response]
    total: int
    skip: int
    limit: int'''
    
    def _generate_pydantic_field(self, field: FieldDefinition, for_base=False, for_create=False, for_update=False, for_response=False) -> Optional[str]:
        """Generate a single Pydantic field definition"""
        python_type = self._get_pydantic_type(field)
        
        # Handle optional fields
        if for_update or (not field.required and not for_response):
            python_type = f"Optional[{python_type}]"
        
        # Build Field() arguments
        field_args = []
        
        if field.description:
            field_args.append(f'description="{field.description}"')
        
        if field.example is not None:
            field_args.append(f"example={repr(field.example)}")
        
        # Add validation arguments
        if field.validation:
            val = field.validation
            if val.min_length is not None:
                field_args.append(f"min_length={val.min_length}")
            if val.max_length is not None:
                field_args.append(f"max_length={val.max_length}")
            if val.min_value is not None:
                field_args.append(f"ge={val.min_value}")  # greater or equal
            if val.max_value is not None:
                field_args.append(f"le={val.max_value}")  # less or equal
            if val.pattern:
                field_args.append(f'regex=r"{val.pattern}"')
        
        # Handle defaults
        default_value = "..."
        if for_update:
            default_value = "None"
        elif field.default is not None:
            default_value = repr(field.default)
        elif not field.required:
            default_value = "None"
        
        # Build field definition
        if field_args:
            args_str = ", ".join([default_value] + field_args)
            return f"{field.name}: {python_type} = Field({args_str})"
        else:
            if default_value == "...":
                return f"{field.name}: {python_type}"
            else:
                return f"{field.name}: {python_type} = {default_value}"
    
    def _generate_validators(self) -> List[str]:
        """Generate Pydantic validators"""
        validators = []
        
        for field in self.model_def.fields:
            if field.validation and field.validation.custom_validator:
                validator_code = f'''@validator('{field.name}')
    def validate_{field.name}(cls, v):
        {field.validation.custom_validator}
        return v'''
                validators.append(validator_code)
        
        return validators
    
    def generate_routes(self):
        """Generate FastAPI routes file"""
        imports = self._generate_route_imports()
        router_def = self._generate_router()
        
        content = f'''{imports}

{router_def}
'''
        
        self._write_file(f"app/api/{self.plural_name}.py", content)
    
    def _generate_route_imports(self) -> str:
        """Generate imports for FastAPI routes"""
        return f'''from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.base_crud import BaseCRUDController, create_crud_routes
from app.auth.deps import get_current_active_user
from app.auth.permissions import require_permission
from app.db.session import get_db
from app.models.{self.snake_name} import {self.model_name}
from app.models.user import User
from app.schemas.{self.snake_name} import (
    {self.model_name}Create,
    {self.model_name}Update, 
    {self.model_name}Response,
    {self.model_name}ListResponse
)'''
    
    def _generate_router(self) -> str:
        """Generate FastAPI router with CRUD endpoints"""
        permission_decorators = self._generate_permission_decorators()
        
        # Format owner and project field configurations
        owner_field = self.model_def.owner_field or "user_id"
        has_owner_field = "True" if self.model_def.owner_field else "False"
        is_project_scoped = "True" if self.model_def.project_scoped else "False"
        
        return f'''# Create CRUD controller
controller = BaseCRUDController[{self.model_name}, {self.model_name}Create, {self.model_name}Update](
    model={self.model_name},
    resource_name="{self.snake_name}",
    owner_field="{owner_field}" if {has_owner_field} else None,
    project_field="project_id" if {is_project_scoped} else None
)

# Create router
router = APIRouter()

{self._generate_crud_endpoints()}

{self._generate_custom_endpoints()}'''
    
    def _generate_permission_decorators(self) -> Dict[str, str]:
        """Generate permission decorators for different actions"""
        category = self.model_def.permission_category
        return {
            "list": f'@require_permission("read", "{category}")',
            "create": f'@require_permission("create", "{category}")', 
            "read": f'@require_permission("read", "{category}")',
            "update": f'@require_permission("update", "{category}")',
            "delete": f'@require_permission("delete", "{category}")'
        }
    
    def _generate_crud_endpoints(self) -> str:
        """Generate standard CRUD endpoints"""
        decorators = self._generate_permission_decorators()
        
        return f'''# List {self.plural_name}
@router.get("/", response_model={self.model_name}ListResponse)
{decorators["list"]}
async def list_{self.plural_name}(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query({self.model_def.list_page_size}, ge=1, le={self.model_def.max_page_size}, description="Number of items to return"),
    search: Optional[str] = Query(None, description="Search term"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get list of {self.plural_name} with pagination and search"""
    return await controller.get_list(db, current_user, skip=skip, limit=limit, search=search)

# Get single {self.snake_name}
@router.get("/{{id}}", response_model={self.model_name}Response)
{decorators["read"]}
async def get_{self.snake_name}(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific {self.snake_name} by ID"""
    return await controller.get_by_id(db, current_user, id)

# Create new {self.snake_name}
@router.post("/", response_model={self.model_name}Response, status_code=status.HTTP_201_CREATED)
{decorators["create"]}
async def create_{self.snake_name}(
    {self.snake_name}_in: {self.model_name}Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new {self.snake_name}"""
    return await controller.create(db, current_user, {self.snake_name}_in)

# Update {self.snake_name}
@router.put("/{{id}}", response_model={self.model_name}Response)
{decorators["update"]}
async def update_{self.snake_name}(
    id: int,
    {self.snake_name}_in: {self.model_name}Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing {self.snake_name}"""
    return await controller.update(db, current_user, id, {self.snake_name}_in)

# Delete {self.snake_name}
@router.delete("/{{id}}", status_code=status.HTTP_204_NO_CONTENT)
{decorators["delete"]}
async def delete_{self.snake_name}(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a {self.snake_name}"""
    await controller.delete(db, current_user, id)'''
    
    def _generate_custom_endpoints(self) -> str:
        """Generate custom endpoints based on model configuration"""
        endpoints = []
        
        # Add soft delete toggle if applicable
        if ModelMixin.SOFT_DELETE in self.model_def.mixins:
            decorators = self._generate_permission_decorators()
            endpoints.append(f'''
# Toggle {self.snake_name} deletion status
@router.patch("/{{id}}/toggle-delete", response_model={self.model_name}Response)
{decorators["update"]}
async def toggle_{self.snake_name}_delete(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Toggle soft delete status of a {self.snake_name}"""
    {self.snake_name} = await controller.get_by_id(db, current_user, id)
    {self.snake_name}.is_deleted = not {self.snake_name}.is_deleted
    db.commit()
    db.refresh({self.snake_name})
    return {self.snake_name}''')
        
        # Add search endpoint if enabled
        if self.model_def.enable_search:
            search_fields = [f.name for f in self.model_def.fields if f.searchable]
            if search_fields:
                decorators = self._generate_permission_decorators()
                endpoints.append(f'''
# Search {self.plural_name}
@router.get("/search", response_model={self.model_name}ListResponse)
{decorators["list"]}
async def search_{self.plural_name}(
    q: str = Query(..., description="Search query"),
    skip: int = Query(0, ge=0),
    limit: int = Query({self.model_def.list_page_size}, ge=1, le={self.model_def.max_page_size}),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Advanced search for {self.plural_name}"""
    # TODO: Implement advanced search logic
    return await controller.get_list(db, current_user, skip=skip, limit=limit, search=q)''')
        
        return '\n'.join(endpoints)
    
    def generate_service(self):
        """Generate service layer file"""
        imports = self._generate_service_imports()
        service_class = self._generate_service_class()
        
        content = f'''{imports}

{service_class}
'''
        
        self._write_file(f"app/services/{self.snake_name}_service.py", content)
    
    def _generate_service_imports(self) -> str:
        """Generate imports for service layer"""
        return f'''from sqlalchemy.orm import Session, selectinload
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status

from app.models.{self.snake_name} import {self.model_name}
from app.models.user import User
from app.schemas.{self.snake_name} import {self.model_name}Create, {self.model_name}Update
from app.services.permission_service import PermissionService'''
    
    def _generate_service_class(self) -> str:
        """Generate service class with business logic"""
        return f'''class {self.model_name}Service:
    """Business logic service for {self.model_name}"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_{self.snake_name}_by_id(self, {self.snake_name}_id: int, user: User) -> {self.model_name}:
        """Get {self.snake_name} by ID with permission check"""
        {self.snake_name} = self.db.query({self.model_name}).filter({self.model_name}.id == {self.snake_name}_id).first()
        
        if not {self.snake_name}:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="{self.model_name} not found"
            )
        
        # Check permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "read", "{self.model_def.permission_category}", {self.snake_name}.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        return {self.snake_name}
    
    def create_{self.snake_name}(self, {self.snake_name}_data: {self.model_name}Create, user: User) -> {self.model_name}:
        """Create new {self.snake_name} with business logic"""
        # Check creation permissions
        if not PermissionService.check_permission(
            self.db, user.id, "create", "{self.model_def.permission_category}"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to create {self.snake_name}"
            )
        
        # Create the {self.snake_name}
        {self.snake_name}_dict = {self.snake_name}_data.model_dump()
        
        # Add owner information if applicable
        {f"if hasattr({self.model_name}, '{self.model_def.owner_field}'):" if self.model_def.owner_field else "# No owner field configured"}
            {f"{self.snake_name}_dict['{self.model_def.owner_field}'] = user.id" if self.model_def.owner_field else "pass"}
        
        {self.snake_name} = {self.model_name}(**{self.snake_name}_dict)
        self.db.add({self.snake_name})
        self.db.commit()
        self.db.refresh({self.snake_name})
        
        return {self.snake_name}
    
    def update_{self.snake_name}(self, {self.snake_name}_id: int, {self.snake_name}_data: {self.model_name}Update, user: User) -> {self.model_name}:
        """Update {self.snake_name} with business logic"""
        {self.snake_name} = self.get_{self.snake_name}_by_id({self.snake_name}_id, user)
        
        # Check update permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "update", "{self.model_def.permission_category}", {self.snake_name}.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to update this {self.snake_name}"
            )
        
        # Update fields
        update_data = {self.snake_name}_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr({self.snake_name}, field, value)
        
        self.db.commit()
        self.db.refresh({self.snake_name})
        
        return {self.snake_name}
    
    def delete_{self.snake_name}(self, {self.snake_name}_id: int, user: User) -> bool:
        """Delete {self.snake_name} with business logic"""
        {self.snake_name} = self.get_{self.snake_name}_by_id({self.snake_name}_id, user)
        
        # Check delete permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "delete", "{self.model_def.permission_category}", {self.snake_name}.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to delete this {self.snake_name}"
            )
        
        {"# Soft delete" if ModelMixin.SOFT_DELETE in self.model_def.mixins else "# Hard delete"}
        {f"{self.snake_name}.is_deleted = True" if ModelMixin.SOFT_DELETE in self.model_def.mixins else f"self.db.delete({self.snake_name})"}
        self.db.commit()
        
        return True
    
    def list_{self.plural_name}(self, skip: int = 0, limit: int = 100, search: Optional[str] = None, user: User = None) -> List[{self.model_name}]:
        """Get list of {self.plural_name} with filtering"""
        query = self.db.query({self.model_name})
        
        # Apply soft delete filter if applicable
        {"query = query.filter(" + self.model_name + ".is_deleted == False)" if ModelMixin.SOFT_DELETE in self.model_def.mixins else ""}
        
        # Apply search if provided
        if search:
            # TODO: Implement search across searchable fields
            {self._generate_search_logic()}
        
        # Apply pagination
        {self.plural_name} = query.offset(skip).limit(limit).all()
        
        return {self.plural_name}'''
    
    def _generate_search_logic(self) -> str:
        """Generate search logic for searchable fields"""
        searchable_fields = [f for f in self.model_def.fields if f.searchable]
        if not searchable_fields:
            return "pass"
        
        search_conditions = []
        for field in searchable_fields:
            if field.type in [FieldType.STRING, FieldType.TEXT, FieldType.EMAIL]:
                search_conditions.append(f"{self.model_name}.{field.name}.ilike(f'%{{search}}%')")
        
        if search_conditions:
            return f"query = query.filter(db.or_({', '.join(search_conditions)}))"
        
        return "pass"
    
    def generate_migration(self):
        """Generate Alembic migration file"""
        # This would typically be done via Alembic CLI, but we can generate the template
        migration_content = self._generate_migration_content()
        
        # Create a timestamp-based filename
        import time
        timestamp = str(int(time.time()))
        filename = f"migrations/versions/{timestamp}_add_{self.table_name}.py"
        
        self._write_file(filename, migration_content)
    
    def _generate_migration_content(self) -> str:
        """Generate Alembic migration content"""
        # Generate the migration operations
        table_def = self._generate_table_creation()
        
        return f'''"""Add {self.table_name} table

Revision ID: {self._generate_revision_id()}
Revises: 
Create Date: {self._get_current_timestamp()}

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '{self._generate_revision_id()}'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Create {self.table_name} table"""
{table_def}

def downgrade() -> None:
    """Drop {self.table_name} table"""
    op.drop_table('{self.table_name}')'''
    
    def _generate_table_creation(self) -> str:
        """Generate table creation SQL for migration"""
        lines = [f"    op.create_table('{self.table_name}',"]
        
        # Primary key
        lines.append("        sa.Column('id', sa.Integer(), primary_key=True, index=True),")
        
        # Generate columns for each field
        for field in self.model_def.fields:
            column_def = self._generate_migration_column(field)
            lines.append(f"        {column_def},")
        
        # Add mixin columns
        if ModelMixin.TIMESTAMP in self.model_def.mixins:
            lines.append("        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),")
            lines.append("        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),")
        
        if ModelMixin.SOFT_DELETE in self.model_def.mixins:
            lines.append("        sa.Column('is_deleted', sa.Boolean(), default=False),")
            lines.append("        sa.Column('deleted_at', sa.DateTime(timezone=True)),")
        
        if ModelMixin.AUDIT in self.model_def.mixins:
            lines.append("        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id')),")
            lines.append("        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id')),")
        
        lines.append("    )")
        
        return '\n'.join(lines)
    
    def _generate_migration_column(self, field: FieldDefinition) -> str:
        """Generate column definition for migration"""
        column_type = self._get_sqlalchemy_type(field, for_migration=True)
        
        args = [f"'{field.name}'", column_type]
        
        if not field.nullable:
            args.append("nullable=False")
        if field.unique:
            args.append("unique=True")
        if field.indexed:
            args.append("index=True")
        if field.default is not None:
            args.append(f"default={repr(field.default)}")
        
        # Handle foreign keys
        if field.relationship and field.relationship.foreign_key:
            args.append(f"sa.ForeignKey('{field.relationship.foreign_key}')")
        
        return f"sa.Column({', '.join(args)})"
    
    def generate_tests(self):
        """Generate test files"""
        test_content = self._generate_test_content()
        
        self._write_file(f"tests/test_{self.snake_name}.py", test_content)
    
    def _generate_test_content(self) -> str:
        """Generate pytest test content"""
        return f'''"""Tests for {self.model_name} model and API"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.{self.snake_name} import {self.model_name}
from app.schemas.{self.snake_name} import {self.model_name}Create, {self.model_name}Update
from tests.utils import create_random_{self.snake_name}

class Test{self.model_name}Model:
    """Test {self.model_name} model"""
    
    def test_create_{self.snake_name}(self, db: Session):
        """Test creating a {self.snake_name}"""
        {self.snake_name}_data = {self._generate_test_data()}
        {self.snake_name} = {self.model_name}(**{self.snake_name}_data)
        db.add({self.snake_name})
        db.commit()
        db.refresh({self.snake_name})
        
        assert {self.snake_name}.id is not None
        {self._generate_field_assertions()}
    
    def test_{self.snake_name}_repr(self, db: Session):
        """Test {self.snake_name} string representation"""
        {self.snake_name} = create_random_{self.snake_name}(db)
        assert str({self.snake_name}) == f"<{self.model_name}(id={{{self.snake_name}.id}})>"

class Test{self.model_name}API:
    """Test {self.model_name} API endpoints"""
    
    def test_create_{self.snake_name}(self, client: TestClient, normal_user_token_headers: dict):
        """Test creating {self.snake_name} via API"""
        data = {self._generate_api_test_data()}
        response = client.post(
            "/{self.plural_name}/",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 201
        content = response.json()
        assert content["id"]
        {self._generate_api_assertions()}
    
    def test_read_{self.snake_name}(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test reading {self.snake_name} via API"""
        {self.snake_name} = create_random_{self.snake_name}(db)
        response = client.get(
            f"/{self.plural_name}/{{{self.snake_name}.id}}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["id"] == {self.snake_name}.id
    
    def test_update_{self.snake_name}(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test updating {self.snake_name} via API"""
        {self.snake_name} = create_random_{self.snake_name}(db)
        data = {self._generate_update_test_data()}
        response = client.put(
            f"/{self.plural_name}/{{{self.snake_name}.id}}",
            headers=normal_user_token_headers,
            json=data,
        )
        assert response.status_code == 200
        content = response.json()
        {self._generate_update_assertions()}
    
    def test_delete_{self.snake_name}(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test deleting {self.snake_name} via API"""
        {self.snake_name} = create_random_{self.snake_name}(db)
        response = client.delete(
            f"/{self.plural_name}/{{{self.snake_name}.id}}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 204
    
    def test_list_{self.plural_name}(self, client: TestClient, normal_user_token_headers: dict, db: Session):
        """Test listing {self.plural_name} via API"""
        # Create multiple {self.plural_name}
        for _ in range(3):
            create_random_{self.snake_name}(db)
        
        response = client.get(
            "/{self.plural_name}/",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert len(content["items"]) >= 3
        assert "total" in content
        assert "skip" in content
        assert "limit" in content'''
    
    def update_main_router(self):
        """Update main API router to include new routes"""
        router_file = self.base_path / "app" / "api" / "main.py"
        
        if router_file.exists():
            # Read current content
            content = router_file.read_text()
            
            # Add import if not exists
            import_line = f"from app.api import {self.plural_name}"
            if import_line not in content:
                # Find the imports section and add our import
                lines = content.split('\n')
                import_index = -1
                for i, line in enumerate(lines):
                    if line.startswith('from app.api import'):
                        import_index = i
                
                if import_index >= 0:
                    lines.insert(import_index + 1, import_line)
                else:
                    # Add at the top after existing imports
                    for i, line in enumerate(lines):
                        if line.startswith('from app.api'):
                            lines.insert(i, import_line)
                            break
                
                content = '\n'.join(lines)
            
            # Add router inclusion if not exists
            router_line = f'api_router.include_router({self.plural_name}.router, prefix="/{self.plural_name}", tags=["{self.plural_name}"])'
            if router_line not in content:
                # Find where other routers are included and add ours
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if 'api_router.include_router' in line:
                        lines.insert(i + 1, router_line)
                        break
                
                content = '\n'.join(lines)
            
            # Write back
            router_file.write_text(content)
        else:
            # Create basic main.py if it doesn't exist
            content = f'''from fastapi import APIRouter

from app.api import {self.plural_name}

api_router = APIRouter()

api_router.include_router({self.plural_name}.router, prefix="/{self.plural_name}", tags=["{self.plural_name}"])
'''
            self._write_file("app/api/main.py", content)
    
    # Utility methods
    
    def _get_sqlalchemy_type(self, field: FieldDefinition, for_migration: bool = False) -> str:
        """Get SQLAlchemy column type for field"""
        prefix = "sa." if for_migration else ""
        
        if field.type == FieldType.STRING:
            max_len = field.max_length or 255
            return f"{prefix}String({max_len})"
        elif field.type == FieldType.INTEGER:
            return f"{prefix}Integer"
        elif field.type == FieldType.FLOAT:
            return f"{prefix}Float"
        elif field.type == FieldType.BOOLEAN:
            return f"{prefix}Boolean"
        elif field.type == FieldType.DATE:
            return f"{prefix}Date"
        elif field.type == FieldType.DATETIME:
            return f"{prefix}DateTime(timezone=True)"
        elif field.type == FieldType.TEXT:
            return f"{prefix}Text"
        elif field.type == FieldType.EMAIL:
            return f"{prefix}String(255)"
        elif field.type == FieldType.URL:
            return f"{prefix}String(500)"
        elif field.type == FieldType.JSON:
            return f"{prefix}JSON"
        elif field.type == FieldType.ENUM:
            if field.enum_name:
                return f"{prefix}Enum({field.enum_name})"
            return f"{prefix}String(50)"
        elif field.type == FieldType.FOREIGN_KEY:
            return f"{prefix}Integer"
        else:
            return f"{prefix}String(255)"
    
    def _get_python_type(self, field: FieldDefinition) -> str:
        """Get Python type annotation for field"""
        if field.type == FieldType.STRING:
            return "str"
        elif field.type == FieldType.INTEGER:
            return "int"
        elif field.type == FieldType.FLOAT:
            return "float"
        elif field.type == FieldType.BOOLEAN:
            return "bool"
        elif field.type == FieldType.DATE:
            return "date"
        elif field.type == FieldType.DATETIME:
            return "datetime"
        elif field.type == FieldType.TEXT:
            return "str"
        elif field.type == FieldType.EMAIL:
            return "str"
        elif field.type == FieldType.URL:
            return "str"
        elif field.type == FieldType.JSON:
            return "Dict[str, Any]"
        elif field.type == FieldType.ENUM:
            return field.enum_name if field.enum_name else "str"
        elif field.type == FieldType.FOREIGN_KEY:
            return "int"
        else:
            return "str"
    
    def _get_pydantic_type(self, field: FieldDefinition) -> str:
        """Get Pydantic type for field"""
        if field.type == FieldType.EMAIL:
            return "EmailStr"
        elif field.type == FieldType.URL:
            return "HttpUrl"
        else:
            return self._get_python_type(field)
    
    def _write_file(self, filepath: str, content: str):
        """Write content to file, creating directories as needed"""
        full_path = self.base_path / filepath
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content)
        print(f"Created: {filepath}")
    
    def _generate_revision_id(self) -> str:
        """Generate unique revision ID for migration"""
        import hashlib
        import time
        content = f"{self.model_name}{self.table_name}{time.time()}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def _get_current_timestamp(self) -> str:
        """Get current timestamp for migration"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
    
    def _generate_test_data(self) -> str:
        """Generate test data dictionary"""
        test_data = {}
        for field in self.model_def.fields:
            if field.include_in_create:
                if field.type == FieldType.STRING:
                    test_data[field.name] = f"'test_{field.name}'"
                elif field.type == FieldType.INTEGER:
                    test_data[field.name] = "123"
                elif field.type == FieldType.BOOLEAN:
                    test_data[field.name] = "True"
                elif field.type == FieldType.EMAIL:
                    test_data[field.name] = "'test@example.com'"
                # Add more test data types as needed
        
        return str(test_data).replace("'", "").replace('"', "'")
    
    def _generate_field_assertions(self) -> str:
        """Generate test assertions for model fields"""
        assertions = []
        for field in self.model_def.fields:
            if field.include_in_create:
                assertions.append(f"        assert {self.snake_name}.{field.name}")
        
        return '\n'.join(assertions) if assertions else "        pass"
    
    def _generate_api_test_data(self) -> str:
        """Generate API test data"""
        return self._generate_test_data()
    
    def _generate_api_assertions(self) -> str:
        """Generate API test assertions"""
        return self._generate_field_assertions().replace(f"{self.snake_name}.", "content[\"").replace("]", "\"]")
    
    def _generate_update_test_data(self) -> str:
        """Generate test data for updates"""
        return '{"updated_field": "updated_value"}'
    
    def _generate_update_assertions(self) -> str:
        """Generate assertions for update tests"""
        return '        assert content["id"] == {}.id'.format(self.snake_name)