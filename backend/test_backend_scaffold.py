#!/usr/bin/env python3
"""
Test script for the FastNext Backend Scaffolding System

This script demonstrates how to use the backend scaffolding generator
to create complete CRUD interfaces for FastAPI/SQLAlchemy models.
"""

from scaffolding.backend_generator import (
    BackendScaffoldGenerator,
    ModelDefinition,
    FieldDefinition,
    FieldType,
    ModelMixin,
    ValidationRule,
    RelationshipConfig
)

def create_product_model() -> ModelDefinition:
    """Create a sample Product model for testing the scaffolding system"""
    
    # Define validation rules
    name_validation = ValidationRule(
        min_length=2,
        max_length=200,
        error_message="Product name must be between 2 and 200 characters"
    )
    
    price_validation = ValidationRule(
        min_value=0,
        error_message="Price must be a positive number"
    )
    
    # Define model fields
    fields = [
        FieldDefinition(
            name="name",
            type=FieldType.STRING,
            required=True,
            max_length=200,
            validation=name_validation,
            description="Product name",
            example="Premium Headphones",
            unique=True,
            indexed=True,
            include_in_list=True,
            searchable=True,
            sortable=True
        ),
        
        FieldDefinition(
            name="description",
            type=FieldType.TEXT,
            required=False,
            description="Detailed product description",
            example="High-quality wireless headphones with noise cancellation",
            include_in_list=False,
            searchable=True
        ),
        
        FieldDefinition(
            name="price",
            type=FieldType.FLOAT,
            required=True,
            validation=price_validation,
            description="Product price in USD",
            example=299.99,
            include_in_list=True,
            sortable=True,
            filterable=True
        ),
        
        FieldDefinition(
            name="category",
            type=FieldType.ENUM,
            required=True,
            enum_values=["electronics", "clothing", "books", "sports", "home"],
            enum_name="ProductCategory",
            description="Product category",
            example="electronics",
            include_in_list=True,
            filterable=True
        ),
        
        FieldDefinition(
            name="sku",
            type=FieldType.STRING,
            required=True,
            max_length=50,
            unique=True,
            indexed=True,
            description="Stock Keeping Unit",
            example="HDPH-001-BLK",
            validation=ValidationRule(
                pattern=r"^[A-Z]{2,4}-\d{3}-[A-Z]{3}$",
                error_message="SKU must follow format: XX-000-XXX"
            )
        ),
        
        FieldDefinition(
            name="stock_quantity",
            type=FieldType.INTEGER,
            required=True,
            default=0,
            description="Current stock quantity",
            example=150,
            include_in_list=True,
            sortable=True,
            filterable=True
        ),
        
        FieldDefinition(
            name="is_featured",
            type=FieldType.BOOLEAN,
            required=False,
            default=False,
            description="Whether this product is featured",
            include_in_list=True,
            filterable=True
        ),
        
        FieldDefinition(
            name="launch_date",
            type=FieldType.DATE,
            required=False,
            description="Product launch date",
            include_in_list=True,
            sortable=True,
            filterable=True
        ),
        
        FieldDefinition(
            name="specifications",
            type=FieldType.JSON,
            required=False,
            description="Product specifications as JSON",
            example={"weight": "250g", "battery_life": "30 hours", "wireless": True},
            include_in_list=False
        ),
        
        FieldDefinition(
            name="website_url",
            type=FieldType.URL,
            required=False,
            description="Product website URL",
            example="https://example.com/products/premium-headphones",
            include_in_list=False
        ),
        
        FieldDefinition(
            name="support_email",
            type=FieldType.EMAIL,
            required=False,
            description="Product support email",
            example="support@example.com",
            include_in_list=False
        ),
        
        # Foreign key relationship to Category table
        FieldDefinition(
            name="category_id",
            type=FieldType.FOREIGN_KEY,
            required=False,
            description="Category foreign key",
            relationship=RelationshipConfig(
                target_model="Category",
                relationship_type="many_to_one",
                foreign_key="categories.id",
                back_populates="products"
            ),
            include_in_create=True,
            include_in_update=True,
            include_in_response=True
        ),
        
        # Owner relationship
        FieldDefinition(
            name="owner_id",
            type=FieldType.FOREIGN_KEY,
            required=True,
            description="Product owner (user)",
            relationship=RelationshipConfig(
                target_model="User",
                relationship_type="many_to_one",
                foreign_key="users.id",
                back_populates="products"
            ),
            include_in_create=False,  # Set automatically from current user
            include_in_update=False,
            include_in_response=True
        ),
    ]
    
    # Create the model definition
    model_def = ModelDefinition(
        name="Product",
        table_name="products",
        description="Product inventory management model",
        fields=fields,
        
        # Model configuration
        mixins=[
            ModelMixin.TIMESTAMP,    # created_at, updated_at
            ModelMixin.AUDIT,        # created_by, updated_by
            ModelMixin.SOFT_DELETE,  # is_deleted, deleted_at
            ModelMixin.METADATA      # metadata_json, tags, version
        ],
        
        # Permissions and ownership
        permission_category="product",
        owner_field="owner_id",
        project_scoped=False,
        
        # API configuration
        list_page_size=25,
        max_page_size=100,
        enable_search=True,
        enable_filtering=True,
        enable_sorting=True,
        
        # Generation options
        generate_service=True,
        generate_migrations=True,
        generate_tests=True
    )
    
    return model_def


def create_blog_post_model() -> ModelDefinition:
    """Create a Blog Post model to demonstrate content management"""
    
    fields = [
        FieldDefinition(
            name="title",
            type=FieldType.STRING,
            required=True,
            max_length=300,
            validation=ValidationRule(min_length=5, max_length=300),
            description="Blog post title",
            example="How to Build Amazing Products",
            unique=True,
            indexed=True,
            searchable=True,
            sortable=True
        ),
        
        FieldDefinition(
            name="slug",
            type=FieldType.STRING,
            required=True,
            max_length=150,
            unique=True,
            indexed=True,
            validation=ValidationRule(
                pattern=r"^[a-z0-9-]+$",
                error_message="Slug must contain only lowercase letters, numbers, and hyphens"
            ),
            description="URL slug for the blog post",
            example="how-to-build-amazing-products"
        ),
        
        FieldDefinition(
            name="excerpt",
            type=FieldType.TEXT,
            required=False,
            description="Short excerpt or summary",
            searchable=True,
            include_in_list=True
        ),
        
        FieldDefinition(
            name="content",
            type=FieldType.TEXT,
            required=True,
            description="Full blog post content",
            searchable=True,
            include_in_list=False
        ),
        
        FieldDefinition(
            name="status",
            type=FieldType.ENUM,
            required=True,
            enum_values=["draft", "published", "archived"],
            enum_name="PostStatus",
            default="draft",
            description="Post publication status",
            include_in_list=True,
            filterable=True
        ),
        
        FieldDefinition(
            name="published_at",
            type=FieldType.DATETIME,
            required=False,
            description="Publication date and time",
            include_in_list=True,
            sortable=True,
            filterable=True
        ),
        
        FieldDefinition(
            name="view_count",
            type=FieldType.INTEGER,
            required=False,
            default=0,
            description="Number of views",
            include_in_list=True,
            sortable=True
        ),
        
        FieldDefinition(
            name="tags",
            type=FieldType.JSON,
            required=False,
            description="Post tags as JSON array",
            example=["technology", "tutorial", "python"],
            filterable=True
        ),
        
        FieldDefinition(
            name="author_id",
            type=FieldType.FOREIGN_KEY,
            required=True,
            description="Post author",
            relationship=RelationshipConfig(
                target_model="User",
                relationship_type="many_to_one",
                foreign_key="users.id",
                back_populates="blog_posts"
            )
        ),
    ]
    
    return ModelDefinition(
        name="BlogPost",
        table_name="blog_posts",
        description="Blog post content management model",
        fields=fields,
        
        mixins=[ModelMixin.TIMESTAMP, ModelMixin.AUDIT],
        
        permission_category="blog_post",
        owner_field="author_id",
        project_scoped=False,
        
        list_page_size=20,
        max_page_size=50,
        enable_search=True,
        enable_filtering=True,
        enable_sorting=True,
        
        generate_service=True,
        generate_migrations=True,
        generate_tests=True
    )


def main():
    """Main test function"""
    print("🚀 Testing FastNext Backend Scaffolding System")
    print("=" * 60)
    
    # Test Product model generation
    print("\n📦 Testing Product model scaffolding...")
    try:
        product_model = create_product_model()
        product_generator = BackendScaffoldGenerator(product_model, "/home/sen/FastNext/backend")
        product_generator.generate_all()
        print("✅ Product model scaffolding completed successfully!")
    except Exception as e:
        print(f"❌ Error generating Product model: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    
    # Test Blog Post model generation
    print("\n📝 Testing BlogPost model scaffolding...")
    try:
        blog_model = create_blog_post_model()
        blog_generator = BackendScaffoldGenerator(blog_model, "/home/sen/FastNext/backend")
        blog_generator.generate_all()
        print("✅ BlogPost model scaffolding completed successfully!")
    except Exception as e:
        print(f"❌ Error generating BlogPost model: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("🎉 Backend scaffolding tests completed!")
    print("\nGenerated files should now be available in the FastNext backend directory.")
    print("Don't forget to:")
    print("1. Run database migrations: alembic upgrade head")
    print("2. Add any additional business logic to the service classes")
    print("3. Customize the generated code as needed")
    print("4. Run tests to ensure everything works correctly")


if __name__ == "__main__":
    main()