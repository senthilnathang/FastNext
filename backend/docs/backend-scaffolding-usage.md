# Backend Scaffolding System Usage Guide

The FastNext Backend Scaffolding System automatically generates complete Python/FastAPI CRUD interfaces following the established architecture patterns of the FastNext framework.

## Quick Start

### Basic Usage

```python
from scaffolding.backend_generator import (
    BackendScaffoldGenerator,
    ModelDefinition,
    FieldDefinition,
    FieldType,
    ModelMixin
)

# Define your model
model_def = ModelDefinition(
    name="Product",
    description="Product inventory management model",
    fields=[
        FieldDefinition(
            name="name",
            type=FieldType.STRING,
            required=True,
            max_length=200,
            description="Product name",
            searchable=True,
            sortable=True
        ),
        # ... more fields
    ]
)

# Generate all backend components
generator = BackendScaffoldGenerator(model_def, "/path/to/backend")
generator.generate_all()
```

## Field Types

The system supports comprehensive field types with proper SQLAlchemy and Pydantic mappings:

### Basic Types

#### String Fields
```python
FieldDefinition(
    name="name",
    type=FieldType.STRING,
    required=True,
    max_length=200,
    validation=ValidationRule(
        min_length=2,
        max_length=200,
        pattern=r"^[A-Za-z\s]+$",
        error_message="Only letters and spaces allowed"
    ),
    unique=True,
    indexed=True,
    searchable=True,
    sortable=True
)
```

#### Integer Fields
```python
FieldDefinition(
    name="quantity",
    type=FieldType.INTEGER,
    required=True,
    default=0,
    validation=ValidationRule(min_value=0, max_value=9999),
    filterable=True,
    sortable=True
)
```

#### Float Fields
```python
FieldDefinition(
    name="price",
    type=FieldType.FLOAT,
    required=True,
    validation=ValidationRule(
        min_value=0.01,
        error_message="Price must be positive"
    ),
    description="Price in USD",
    example=29.99
)
```

#### Boolean Fields
```python
FieldDefinition(
    name="is_active",
    type=FieldType.BOOLEAN,
    required=False,
    default=True,
    description="Whether the item is active",
    filterable=True
)
```

### Date and Time Fields

#### Date Fields
```python
FieldDefinition(
    name="launch_date",
    type=FieldType.DATE,
    required=False,
    description="Product launch date",
    sortable=True,
    filterable=True
)
```

#### DateTime Fields
```python
FieldDefinition(
    name="scheduled_at",
    type=FieldType.DATETIME,
    required=True,
    description="Scheduled execution time",
    sortable=True
)
```

### Text Fields

#### Text Fields (Multi-line)
```python
FieldDefinition(
    name="description",
    type=FieldType.TEXT,
    required=False,
    description="Detailed description",
    searchable=True,
    include_in_list=False  # Don't show in list views
)
```

#### Email Fields
```python
FieldDefinition(
    name="contact_email",
    type=FieldType.EMAIL,
    required=False,
    description="Contact email address",
    example="contact@example.com"
)
```

#### URL Fields
```python
FieldDefinition(
    name="website",
    type=FieldType.URL,
    required=False,
    description="Website URL",
    example="https://example.com"
)
```

### Advanced Types

#### JSON Fields
```python
FieldDefinition(
    name="metadata",
    type=FieldType.JSON,
    required=False,
    description="Additional metadata as JSON",
    example={"key": "value", "settings": {"enabled": True}}
)
```

#### Enum Fields
```python
FieldDefinition(
    name="status",
    type=FieldType.ENUM,
    required=True,
    enum_values=["draft", "published", "archived"],
    enum_name="PostStatus",
    default="draft",
    description="Publication status",
    filterable=True
)
```

#### Foreign Key Relationships
```python
FieldDefinition(
    name="category_id",
    type=FieldType.FOREIGN_KEY,
    required=True,
    description="Product category",
    relationship=RelationshipConfig(
        target_model="Category",
        relationship_type="many_to_one",
        foreign_key="categories.id",
        back_populates="products"
    )
)
```

## Model Configuration

### Model Mixins

The system supports multiple mixins for common functionality:

```python
ModelDefinition(
    name="Product",
    mixins=[
        ModelMixin.TIMESTAMP,    # created_at, updated_at
        ModelMixin.AUDIT,        # created_by, updated_by  
        ModelMixin.SOFT_DELETE,  # is_deleted, deleted_at
        ModelMixin.METADATA      # metadata_json, tags, version
    ]
)
```

### Permission Configuration

```python
ModelDefinition(
    name="Product",
    permission_category="product",  # For RBAC permissions
    owner_field="owner_id",        # Field that determines ownership
    project_scoped=True,           # Whether model is project-scoped
)
```

### API Configuration

```python
ModelDefinition(
    name="Product",
    list_page_size=25,        # Default page size
    max_page_size=100,        # Maximum allowed page size
    enable_search=True,       # Enable search functionality
    enable_filtering=True,    # Enable field filtering
    enable_sorting=True,      # Enable sorting
)
```

### Generation Options

```python
ModelDefinition(
    name="Product",
    generate_service=True,      # Generate service layer
    generate_migrations=True,   # Generate Alembic migrations
    generate_tests=True,        # Generate test files
)
```

## Generated Components

### 1. SQLAlchemy Models
**Location**: `app/models/{model_name}.py`

Features:
- Modern SQLAlchemy 2.x syntax with `Mapped` types
- Proper mixin inheritance
- Relationship definitions
- Index and constraint management
- Type annotations

### 2. Pydantic Schemas
**Location**: `app/schemas/{model_name}.py`

Generated schemas:
- `{Model}Base` - Base schema with common fields
- `{Model}Create` - For creation requests
- `{Model}Update` - For update requests
- `{Model}Response` - For API responses
- `{Model}ListResponse` - For paginated lists

### 3. FastAPI Routes
**Location**: `app/api/{model_plural}.py`

Generated endpoints:
- `GET /` - List with pagination, search, filtering
- `POST /` - Create new resource
- `GET /{id}` - Get single resource
- `PUT /{id}` - Update resource
- `DELETE /{id}` - Delete resource
- Custom endpoints based on mixins

### 4. Service Layer
**Location**: `app/services/{model_name}_service.py`

Features:
- Business logic separation
- Permission checking integration
- Custom validation logic
- Complex operations handling

### 5. Database Migrations
**Location**: `alembic/versions/{timestamp}_add_{table_name}.py`

Features:
- Complete table creation
- Proper column definitions
- Foreign key constraints
- Index creation

### 6. Test Files
**Location**: `tests/test_{model_name}.py`

Generated tests:
- Model creation and validation
- API endpoint testing
- Permission testing
- Error handling

## Advanced Features

### Complex Relationships

#### One-to-Many
```python
FieldDefinition(
    name="orders",
    type=FieldType.FOREIGN_KEY,
    relationship=RelationshipConfig(
        target_model="Order",
        relationship_type="one_to_many",
        back_populates="customer",
        cascade="all, delete-orphan"
    )
)
```

#### Many-to-Many
```python
FieldDefinition(
    name="tags",
    type=FieldType.FOREIGN_KEY,
    relationship=RelationshipConfig(
        target_model="Tag",
        relationship_type="many_to_many",
        back_populates="products",
        # secondary table would be created separately
    )
)
```

### Custom Validation

```python
FieldDefinition(
    name="email",
    type=FieldType.EMAIL,
    validation=ValidationRule(
        custom_validator="""
        if '@' not in v:
            raise ValueError('Invalid email format')
        if v.endswith('.tmp'):
            raise ValueError('Temporary emails not allowed')
        """,
        error_message="Invalid email address"
    )
)
```

### Search Configuration

```python
# Enable search across specific fields
fields = [
    FieldDefinition(
        name="title",
        type=FieldType.STRING,
        searchable=True  # Include in search
    ),
    FieldDefinition(
        name="content",
        type=FieldType.TEXT,
        searchable=True  # Include in search
    ),
    FieldDefinition(
        name="internal_notes",
        type=FieldType.TEXT,
        searchable=False  # Exclude from search
    )
]
```

## Complete Example: E-commerce Product

```python
from scaffolding.backend_generator import *

def create_ecommerce_product_model():
    fields = [
        # Basic product information
        FieldDefinition(
            name="name",
            type=FieldType.STRING,
            required=True,
            max_length=200,
            validation=ValidationRule(min_length=2),
            unique=True,
            indexed=True,
            searchable=True,
            sortable=True,
            description="Product name"
        ),
        
        FieldDefinition(
            name="sku",
            type=FieldType.STRING,
            required=True,
            max_length=50,
            unique=True,
            indexed=True,
            validation=ValidationRule(
                pattern=r"^[A-Z0-9-]+$",
                error_message="SKU must contain only uppercase letters, numbers, and hyphens"
            ),
            description="Stock Keeping Unit"
        ),
        
        FieldDefinition(
            name="description",
            type=FieldType.TEXT,
            required=False,
            searchable=True,
            include_in_list=False,
            description="Product description"
        ),
        
        # Pricing
        FieldDefinition(
            name="price",
            type=FieldType.FLOAT,
            required=True,
            validation=ValidationRule(min_value=0.01),
            sortable=True,
            filterable=True,
            description="Product price"
        ),
        
        FieldDefinition(
            name="sale_price",
            type=FieldType.FLOAT,
            required=False,
            validation=ValidationRule(min_value=0.01),
            description="Sale price (optional)"
        ),
        
        # Inventory
        FieldDefinition(
            name="stock_quantity",
            type=FieldType.INTEGER,
            required=True,
            default=0,
            validation=ValidationRule(min_value=0),
            sortable=True,
            filterable=True,
            description="Stock quantity"
        ),
        
        FieldDefinition(
            name="low_stock_threshold",
            type=FieldType.INTEGER,
            required=False,
            default=10,
            validation=ValidationRule(min_value=0),
            description="Low stock warning threshold"
        ),
        
        # Status and visibility
        FieldDefinition(
            name="status",
            type=FieldType.ENUM,
            required=True,
            enum_values=["draft", "active", "discontinued", "out_of_stock"],
            enum_name="ProductStatus",
            default="draft",
            filterable=True,
            description="Product status"
        ),
        
        FieldDefinition(
            name="is_featured",
            type=FieldType.BOOLEAN,
            required=False,
            default=False,
            filterable=True,
            description="Featured product"
        ),
        
        # Categorization
        FieldDefinition(
            name="category_id",
            type=FieldType.FOREIGN_KEY,
            required=True,
            relationship=RelationshipConfig(
                target_model="Category",
                relationship_type="many_to_one",
                foreign_key="categories.id",
                back_populates="products"
            ),
            filterable=True,
            description="Product category"
        ),
        
        FieldDefinition(
            name="brand_id",
            type=FieldType.FOREIGN_KEY,
            required=False,
            relationship=RelationshipConfig(
                target_model="Brand",
                relationship_type="many_to_one",
                foreign_key="brands.id",
                back_populates="products"
            ),
            filterable=True,
            description="Product brand"
        ),
        
        # Media and specifications
        FieldDefinition(
            name="images",
            type=FieldType.JSON,
            required=False,
            description="Product images URLs",
            example=["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
        ),
        
        FieldDefinition(
            name="specifications",
            type=FieldType.JSON,
            required=False,
            description="Product specifications",
            example={"weight": "1.2kg", "dimensions": "30x20x10cm", "material": "plastic"}
        ),
        
        # SEO and marketing
        FieldDefinition(
            name="meta_title",
            type=FieldType.STRING,
            required=False,
            max_length=60,
            description="SEO meta title"
        ),
        
        FieldDefinition(
            name="meta_description",
            type=FieldType.STRING,
            required=False,
            max_length=160,
            description="SEO meta description"
        ),
        
        # Dates
        FieldDefinition(
            name="launch_date",
            type=FieldType.DATE,
            required=False,
            sortable=True,
            filterable=True,
            description="Product launch date"
        ),
        
        # Ownership
        FieldDefinition(
            name="created_by_id",
            type=FieldType.FOREIGN_KEY,
            required=True,
            relationship=RelationshipConfig(
                target_model="User",
                relationship_type="many_to_one",
                foreign_key="users.id"
            ),
            include_in_create=False,  # Set automatically
            description="Created by user"
        ),
    ]
    
    return ModelDefinition(
        name="Product",
        table_name="products",
        description="E-commerce product model",
        fields=fields,
        
        # Use comprehensive mixins
        mixins=[
            ModelMixin.TIMESTAMP,
            ModelMixin.AUDIT,
            ModelMixin.SOFT_DELETE,
            ModelMixin.METADATA
        ],
        
        # Permission configuration
        permission_category="product",
        owner_field="created_by_id",
        project_scoped=False,
        
        # API configuration
        list_page_size=20,
        max_page_size=100,
        enable_search=True,
        enable_filtering=True,
        enable_sorting=True,
        
        # Generate all components
        generate_service=True,
        generate_migrations=True,
        generate_tests=True
    )

# Generate the model
product_model = create_ecommerce_product_model()
generator = BackendScaffoldGenerator(product_model)
generator.generate_all()
```

## Best Practices

### 1. Field Configuration
- Use descriptive field names and descriptions
- Set appropriate validation rules
- Configure searchable/filterable flags thoughtfully
- Use proper field types for data integrity

### 2. Relationship Design
- Define clear relationship patterns
- Use appropriate back_populates
- Consider cascade options carefully
- Plan foreign key constraints

### 3. Permission Strategy
- Use descriptive permission categories
- Set appropriate owner fields
- Consider project scoping needs
- Plan permission hierarchies

### 4. Performance Optimization
- Index frequently queried fields
- Limit text field inclusion in lists
- Set reasonable pagination limits
- Plan for efficient search patterns

### 5. Testing Strategy
- Generate comprehensive tests
- Add custom business logic tests
- Test permission scenarios
- Validate API contracts

## Integration with Frontend

The backend scaffolding system is designed to work seamlessly with the frontend scaffolding system:

1. **Consistent naming**: Models, fields, and endpoints match
2. **Type compatibility**: TypeScript interfaces align with Pydantic schemas
3. **API contracts**: Generated OpenAPI docs work with frontend generators
4. **Permission integration**: RBAC works across both systems

## Next Steps

After generating your backend scaffolding:

1. **Review generated code** and customize as needed
2. **Run migrations**: `alembic upgrade head`
3. **Add business logic** to service classes
4. **Implement custom validators** if needed
5. **Run tests** to verify functionality
6. **Generate frontend** using the companion system
7. **Deploy and monitor** performance

The scaffolding provides a production-ready foundation that follows FastNext framework conventions while allowing for customization and extension.