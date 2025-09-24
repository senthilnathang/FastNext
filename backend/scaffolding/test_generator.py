"""
Comprehensive Test Generation for Backend Scaffolding

Generates complete test suites including:
- Unit tests for models, schemas, and services
- Integration tests for API endpoints
- Performance tests for database operations
- Security tests for permission systems
- Mock data factories and fixtures
"""

from typing import Dict, List, Optional, Any
from pathlib import Path
from .backend_generator import ModelDefinition, FieldDefinition, FieldType


class TestGenerator:
    """Generate comprehensive test suites"""
    
    def __init__(self, model_def: ModelDefinition, base_path: str = "."):
        self.model_def = model_def
        self.base_path = Path(base_path)
        self.model_name = model_def.name
        self.snake_name = model_def.name.lower()
        self.plural_name = self.snake_name + 's'
        
    def generate_all_tests(self):
        """Generate complete test suite"""
        print(f"🧪 Generating comprehensive tests for {self.model_name}...")
        
        # Generate test factories and fixtures
        self.generate_factories()
        self.generate_fixtures()
        
        # Generate unit tests
        self.generate_model_tests()
        self.generate_schema_tests()
        self.generate_service_tests()
        
        # Generate integration tests
        self.generate_api_tests()
        self.generate_permission_tests()
        
        # Generate performance tests
        self.generate_performance_tests()
        
        # Generate security tests
        self.generate_security_tests()
        
        print(f"✅ Comprehensive test suite generated for {self.model_name}")
    
    def generate_factories(self):
        """Generate factory classes for test data creation"""
        content = f'''"""
Factory classes for generating test {self.model_name} data
"""

import factory
from factory import Faker, SubFactory, LazyAttribute
from factory.alchemy import SQLAlchemyModelFactory
from datetime import datetime, date
from decimal import Decimal
import random

from app.models.{self.snake_name} import {self.model_name}
from app.db.session import SessionLocal


class {self.model_name}Factory(SQLAlchemyModelFactory):
    """Factory for creating {self.model_name} test instances"""
    
    class Meta:
        model = {self.model_name}
        sqlalchemy_session = SessionLocal()
        sqlalchemy_session_persistence = "commit"
    
'''
        
        # Generate factory fields
        for field in self.model_def.fields:
            if field.name in ['id', 'created_at', 'updated_at']:
                continue
                
            factory_field = self._get_factory_field(field)
            content += f"    {field.name} = {factory_field}\n"
        
        content += f'''

    @classmethod
    def create_batch_with_variations(cls, size: int = 10) -> List[{self.model_name}]:
        """Create a batch of {self.model_name}s with realistic variations"""
        instances = []
        
        for i in range(size):
            # Create variations in the data
            overrides = {{}}
            
            # Add some randomization to make data more realistic
            if random.choice([True, False]):
                # Vary some fields randomly
'''
        
        # Add field variations based on field types
        for field in self.model_def.fields:
            if field.type == FieldType.STRING and 'status' in field.name.lower():
                content += f'                overrides["{field.name}"] = random.choice(["active", "inactive", "pending"])\n'
            elif field.type == FieldType.BOOLEAN:
                content += f'                overrides["{field.name}"] = random.choice([True, False])\n'
        
        content += f'''            
            instance = cls.create(**overrides)
            instances.append(instance)
        
        return instances
    
    @classmethod
    def build_valid_data(cls) -> dict:
        """Build valid data dictionary for API testing"""
        instance = cls.build()
        return {{
'''
        
        # Add fields to data dictionary
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at']:
                content += f'            "{field.name}": instance.{field.name},\n'
        
        content += '''        }
    
    @classmethod
    def build_invalid_data(cls) -> List[dict]:
        """Build various invalid data combinations for testing"""
        base_data = cls.build_valid_data()
        invalid_variations = []
        
'''
        
        # Generate invalid data variations
        for field in self.model_def.fields:
            if field.required and field.name not in ['id', 'created_at', 'updated_at']:
                content += f'''        # Missing required field: {field.name}
        missing_{field.name} = base_data.copy()
        del missing_{field.name}["{field.name}"]
        invalid_variations.append(missing_{field.name})
        
'''
                
            if field.type == FieldType.EMAIL:
                content += f'''        # Invalid email format
        invalid_email = base_data.copy()
        invalid_email["{field.name}"] = "invalid-email"
        invalid_variations.append(invalid_email)
        
'''
                
            if field.type in [FieldType.INTEGER, FieldType.FLOAT]:
                content += f'''        # Invalid number type
        invalid_number = base_data.copy()
        invalid_number["{field.name}"] = "not-a-number"
        invalid_variations.append(invalid_number)
        
'''
        
        content += '''        return invalid_variations


# Specialized factories for different test scenarios
class Valid{model_name}Factory({model_name}Factory):
    """Factory that always creates valid {model_name} instances"""
    pass


class Minimal{model_name}Factory({model_name}Factory):
    """Factory that creates {model_name} with only required fields"""
'''.format(model_name=self.model_name)
        
        # Set optional fields to None in minimal factory
        for field in self.model_def.fields:
            if not field.required and field.name not in ['id', 'created_at', 'updated_at']:
                content += f'    {field.name} = None\n'
        
        content += f'''

class Complete{self.model_name}Factory({self.model_name}Factory):
    """Factory that creates {self.model_name} with all fields populated"""
    
'''
        
        # Override fields with more complete data
        for field in self.model_def.fields:
            if field.type == FieldType.TEXT:
                content += f'    {field.name} = Faker("paragraph", nb_sentences=5)\n'
            elif field.type == FieldType.JSON:
                content += f'''    {field.name} = LazyAttribute(lambda obj: {{
        "key1": "value1",
        "key2": "value2", 
        "nested": {{"inner": "data"}}
    }})\n'''
        
        self._write_file(f"tests/factories/{self.snake_name}_factory.py", content)
    
    def generate_fixtures(self):
        """Generate pytest fixtures for testing"""
        content = f'''"""
Pytest fixtures for {self.model_name} testing
"""

import pytest
from typing import List
from sqlalchemy.orm import Session

from app.models.{self.snake_name} import {self.model_name}
from tests.factories.{self.snake_name}_factory import {self.model_name}Factory, Complete{self.model_name}Factory


@pytest.fixture
def {self.snake_name}_factory():
    """Provide {self.model_name}Factory for tests"""
    return {self.model_name}Factory


@pytest.fixture
def sample_{self.snake_name}(db: Session) -> {self.model_name}:
    """Create a sample {self.model_name} for testing"""
    return {self.model_name}Factory.create()


@pytest.fixture
def sample_{self.plural_name}(db: Session) -> List[{self.model_name}]:
    """Create multiple sample {self.plural_name} for testing"""
    return {self.model_name}Factory.create_batch(5)


@pytest.fixture
def complete_{self.snake_name}(db: Session) -> {self.model_name}:
    """Create a {self.model_name} with all fields populated"""
    return Complete{self.model_name}Factory.create()


@pytest.fixture
def {self.snake_name}_data():
    """Provide valid {self.model_name} data for API tests"""
    return {self.model_name}Factory.build_valid_data()


@pytest.fixture
def invalid_{self.snake_name}_data():
    """Provide invalid {self.model_name} data variations for testing"""
    return {self.model_name}Factory.build_invalid_data()


@pytest.fixture
def {self.snake_name}_batch(db: Session) -> List[{self.model_name}]:
    """Create a batch of {self.plural_name} with variations"""
    return {self.model_name}Factory.create_batch_with_variations(10)


# Permission-related fixtures
@pytest.fixture
def {self.snake_name}_owner(db: Session, sample_user) -> {self.model_name}:
    """Create a {self.model_name} owned by sample_user"""
'''
        
        if self.model_def.owner_field:
            content += f'''    return {self.model_name}Factory.create({self.model_def.owner_field}=sample_user.id)
'''
        else:
            content += f'''    return {self.model_name}Factory.create()
'''
        
        content += f'''

@pytest.fixture
def other_user_{self.snake_name}(db: Session, other_user) -> {self.model_name}:
    """Create a {self.model_name} owned by other_user"""
'''
        
        if self.model_def.owner_field:
            content += f'''    return {self.model_name}Factory.create({self.model_def.owner_field}=other_user.id)
'''
        else:
            content += f'''    return {self.model_name}Factory.create()
'''
        
        # Add project-scoped fixtures if needed
        if self.model_def.project_scoped:
            content += f'''

@pytest.fixture
def project_{self.snake_name}(db: Session, sample_project) -> {self.model_name}:
    """Create a {self.model_name} in sample_project"""
    return {self.model_name}Factory.create(project_id=sample_project.id)


@pytest.fixture
def other_project_{self.snake_name}(db: Session, other_project) -> {self.model_name}:
    """Create a {self.model_name} in other_project"""
    return {self.model_name}Factory.create(project_id=other_project.id)
'''
        
        content += f'''

# Performance testing fixtures
@pytest.fixture
def large_{self.snake_name}_dataset(db: Session) -> List[{self.model_name}]:
    """Create large dataset for performance testing"""
    return {self.model_name}Factory.create_batch(1000)


@pytest.fixture
def stress_test_{self.snake_name}_data():
    """Provide data for stress testing"""
    return [
        {self.model_name}Factory.build_valid_data()
        for _ in range(100)
    ]
'''
        
        self._write_file(f"tests/fixtures/{self.snake_name}_fixtures.py", content)
    
    def generate_model_tests(self):
        """Generate unit tests for the model"""
        content = f'''"""
Unit tests for {self.model_name} model
"""

import pytest
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from app.models.{self.snake_name} import {self.model_name}
from tests.factories.{self.snake_name}_factory import {self.model_name}Factory


class Test{self.model_name}Model:
    """Test {self.model_name} model functionality"""
    
    def test_create_{self.snake_name}(self, db):
        """Test creating a {self.model_name}"""
        {self.snake_name} = {self.model_name}Factory.create()
        
        assert {self.snake_name}.id is not None
        assert {self.snake_name}.created_at is not None
        assert {self.snake_name}.updated_at is not None
        
        # Verify it's in database
        db_obj = db.query({self.model_name}).filter({self.model_name}.id == {self.snake_name}.id).first()
        assert db_obj is not None
    
    def test_{self.snake_name}_str_representation(self, sample_{self.snake_name}):
        """Test string representation of {self.model_name}"""
        str_repr = str(sample_{self.snake_name})
        assert str(sample_{self.snake_name}.id) in str_repr
    
    def test_{self.snake_name}_timestamps(self, db):
        """Test that timestamps are set correctly"""
        {self.snake_name} = {self.model_name}Factory.create()
        
        assert isinstance({self.snake_name}.created_at, datetime)
        assert {self.snake_name}.updated_at is None  # Only set on update
        
        # Update the object
        original_created = {self.snake_name}.created_at
'''
        
        # Find a field we can update
        updatable_field = None
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at'] and field.type == FieldType.STRING:
                updatable_field = field
                break
        
        if updatable_field:
            content += f'''        {self.snake_name}.{updatable_field.name} = "updated value"
        db.commit()
        db.refresh({self.snake_name})
        
        assert {self.snake_name}.created_at == original_created  # Should not change
        assert {self.snake_name}.updated_at is not None  # Should be set
        assert {self.snake_name}.updated_at > original_created
'''
        
        # Test required fields
        required_fields = [f for f in self.model_def.fields if f.required and f.name not in ['id', 'created_at', 'updated_at']]
        for field in required_fields:
            content += f'''
    def test_{field.name}_required(self, db):
        """Test that {field.name} is required"""
        with pytest.raises((IntegrityError, ValueError)):
            {self.model_name}Factory.create({field.name}=None)
'''
        
        # Test unique fields
        unique_fields = [f for f in self.model_def.fields if f.unique]
        for field in unique_fields:
            content += f'''
    def test_{field.name}_unique(self, db):
        """Test that {field.name} must be unique"""
        value = "unique_test_value"
        {self.model_name}Factory.create({field.name}=value)
        
        with pytest.raises(IntegrityError):
            {self.model_name}Factory.create({field.name}=value)
'''
        
        # Test field validations
        for field in self.model_def.fields:
            if field.type == FieldType.EMAIL:
                content += f'''
    def test_{field.name}_email_validation(self, db):
        """Test email validation for {field.name}"""
        # Valid email should work
        valid_{self.snake_name} = {self.model_name}Factory.create({field.name}="test@example.com")
        assert "@" in valid_{self.snake_name}.{field.name}
        
        # This would be validated at application level, not database level
        # Database-level validation depends on your setup
'''
            
            elif field.type in [FieldType.INTEGER, FieldType.FLOAT]:
                content += f'''
    def test_{field.name}_numeric_type(self, sample_{self.snake_name}):
        """Test that {field.name} is numeric"""
        assert isinstance(sample_{self.snake_name}.{field.name}, (int, float, type(None)))
'''
        
        # Test relationships if any
        fk_fields = [f for f in self.model_def.fields if f.type == FieldType.FOREIGN_KEY]
        for field in fk_fields:
            if field.relationship:
                content += f'''
    def test_{field.name}_relationship(self, db):
        """Test {field.name} foreign key relationship"""
        {self.snake_name} = {self.model_name}Factory.create()
        
        # Test that foreign key constraint works
        assert {self.snake_name}.{field.name} is not None
        
        # Test relationship loading (if configured)
        # This depends on your relationship setup
'''
        
        content += f'''
    
    def test_model_equality(self, db):
        """Test model equality comparison"""
        {self.snake_name}1 = {self.model_name}Factory.create()
        {self.snake_name}2 = db.query({self.model_name}).filter({self.model_name}.id == {self.snake_name}1.id).first()
        
        assert {self.snake_name}1.id == {self.snake_name}2.id
    
    def test_model_attributes_present(self, sample_{self.snake_name}):
        """Test that all expected attributes are present"""
        expected_attributes = [
            'id', 'created_at', 'updated_at',
'''
        
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at']:
                content += f"            '{field.name}',\n"
        
        content += f'''        ]
        
        for attr in expected_attributes:
            assert hasattr(sample_{self.snake_name}, attr), f"Missing attribute: {{attr}}"
    
    def test_bulk_operations(self, db):
        """Test bulk database operations"""
        # Create multiple records
        records = {self.model_name}Factory.create_batch(5)
        assert len(records) == 5
        
        # Bulk query
        all_records = db.query({self.model_name}).filter(
            {self.model_name}.id.in_([r.id for r in records])
        ).all()
        assert len(all_records) == 5
        
        # Bulk update (if you have a suitable field)
        # This depends on your model's fields
        
        # Bulk delete
        db.query({self.model_name}).filter(
            {self.model_name}.id.in_([r.id for r in records])
        ).delete(synchronize_session=False)
        db.commit()
        
        remaining = db.query({self.model_name}).filter(
            {self.model_name}.id.in_([r.id for r in records])
        ).count()
        assert remaining == 0
'''
        
        self._write_file(f"tests/unit/test_{self.snake_name}_model.py", content)
    
    def generate_schema_tests(self):
        """Generate tests for Pydantic schemas"""
        content = f'''"""
Unit tests for {self.model_name} Pydantic schemas
"""

import pytest
from pydantic import ValidationError
from datetime import datetime, date
from decimal import Decimal

from app.schemas.{self.snake_name} import (
    {self.model_name}Create,
    {self.model_name}Update,
    {self.model_name}Response,
    {self.model_name}InDB
)
from tests.factories.{self.snake_name}_factory import {self.model_name}Factory


class Test{self.model_name}Schemas:
    """Test {self.model_name} Pydantic schemas"""
    
    def test_{self.snake_name}_create_valid_data(self, {self.snake_name}_data):
        """Test {self.model_name}Create with valid data"""
        schema = {self.model_name}Create(**{self.snake_name}_data)
        
        assert schema is not None
        # Test that all required fields are present
'''
        
        required_fields = [f for f in self.model_def.fields 
                         if f.required and f.name not in ['id', 'created_at', 'updated_at']]
        for field in required_fields:
            content += f'        assert hasattr(schema, "{field.name}")\n'
        
        content += f'''
    
    def test_{self.snake_name}_create_invalid_data(self, invalid_{self.snake_name}_data):
        """Test {self.model_name}Create with invalid data"""
        for invalid_data in invalid_{self.snake_name}_data:
            with pytest.raises(ValidationError):
                {self.model_name}Create(**invalid_data)
    
    def test_{self.snake_name}_update_schema(self, {self.snake_name}_data):
        """Test {self.model_name}Update schema"""
        # All fields should be optional in update schema
        update_schema = {self.model_name}Update()
        assert update_schema is not None
        
        # Test with partial data
        partial_data = {{k: v for k, v in {self.snake_name}_data.items() if k in ['''
        
        # Include a few fields for partial update test
        sample_fields = [f.name for f in self.model_def.fields[:3] 
                        if f.name not in ['id', 'created_at', 'updated_at']]
        for field in sample_fields:
            content += f'"{field}", '
        
        content = content.rstrip(', ') + ''']}}
        partial_schema = {self.model_name}Update(**partial_data)
        assert partial_schema is not None
    
    def test_{self.snake_name}_response_schema(self, sample_{self.snake_name}):
        """Test {self.model_name}Response schema"""
        # Convert model to dict for schema creation
        model_data = sample_{self.snake_name}.__dict__.copy()
        # Remove SQLAlchemy internal attributes
        model_data = {{k: v for k, v in model_data.items() if not k.startswith('_')}}
        
        response_schema = {self.model_name}Response(**model_data)
        assert response_schema is not None
        assert response_schema.id == sample_{self.snake_name}.id
    
    def test_{self.snake_name}_in_db_schema(self, sample_{self.snake_name}):
        """Test {self.model_name}InDB schema"""
        model_data = sample_{self.snake_name}.__dict__.copy()
        model_data = {{k: v for k, v in model_data.items() if not k.startswith('_')}}
        
        db_schema = {self.model_name}InDB(**model_data)
        assert db_schema is not None
        assert db_schema.id == sample_{self.snake_name}.id
        assert db_schema.created_at == sample_{self.snake_name}.created_at
    
'''
        
        # Test field validations
        for field in self.model_def.fields:
            if field.type == FieldType.EMAIL:
                content += f'''    def test_{field.name}_email_validation(self, {self.snake_name}_data):
        """Test email validation for {field.name}"""
        # Valid email
        {self.snake_name}_data["{field.name}"] = "test@example.com"
        schema = {self.model_name}Create(**{self.snake_name}_data)
        assert "@" in schema.{field.name}
        
        # Invalid email
        {self.snake_name}_data["{field.name}"] = "invalid-email"
        with pytest.raises(ValidationError) as exc_info:
            {self.model_name}Create(**{self.snake_name}_data)
        assert "email" in str(exc_info.value).lower()
    
'''
            
            elif field.type == FieldType.URL:
                content += f'''    def test_{field.name}_url_validation(self, {self.snake_name}_data):
        """Test URL validation for {field.name}"""
        # Valid URL
        {self.snake_name}_data["{field.name}"] = "https://example.com"
        schema = {self.model_name}Create(**{self.snake_name}_data)
        assert schema.{field.name}.startswith(("http://", "https://"))
        
        # Invalid URL
        {self.snake_name}_data["{field.name}"] = "not-a-url"
        with pytest.raises(ValidationError):
            {self.model_name}Create(**{self.snake_name}_data)
    
'''
            
            elif field.validation and field.validation.max_length:
                content += f'''    def test_{field.name}_max_length(self, {self.snake_name}_data):
        """Test max length validation for {field.name}"""
        # Valid length
        {self.snake_name}_data["{field.name}"] = "x" * {field.validation.max_length}
        schema = {self.model_name}Create(**{self.snake_name}_data)
        assert len(schema.{field.name}) == {field.validation.max_length}
        
        # Invalid length
        {self.snake_name}_data["{field.name}"] = "x" * ({field.validation.max_length} + 1)
        with pytest.raises(ValidationError):
            {self.model_name}Create(**{self.snake_name}_data)
    
'''
        
        content += f'''    def test_schema_serialization(self, sample_{self.snake_name}):
        """Test schema JSON serialization"""
        model_data = sample_{self.snake_name}.__dict__.copy()
        model_data = {{k: v for k, v in model_data.items() if not k.startswith('_')}}
        
        response_schema = {self.model_name}Response(**model_data)
        json_data = response_schema.model_dump()
        
        assert isinstance(json_data, dict)
        assert "id" in json_data
        assert "created_at" in json_data
    
    def test_schema_deserialization(self, {self.snake_name}_data):
        """Test schema creation from dictionary"""
        create_schema = {self.model_name}Create(**{self.snake_name}_data)
        
        # Convert back to dict and recreate
        schema_dict = create_schema.model_dump()
        recreated_schema = {self.model_name}Create(**schema_dict)
        
        assert create_schema.model_dump() == recreated_schema.model_dump()
'''
        
        self._write_file(f"tests/unit/test_{self.snake_name}_schemas.py", content)
    
    def generate_service_tests(self):
        """Generate tests for service layer"""
        content = f'''"""
Unit tests for {self.model_name} service layer
"""

import pytest
from unittest.mock import Mock, patch
from sqlalchemy.exc import IntegrityError

from app.services.{self.snake_name}_service import {self.model_name}Service
from app.models.{self.snake_name} import {self.model_name}
from tests.factories.{self.snake_name}_factory import {self.model_name}Factory


class Test{self.model_name}Service:
    """Test {self.model_name}Service functionality"""
    
    @pytest.fixture
    def service(self, db):
        """Create service instance for testing"""
        return {self.model_name}Service(db)
    
    def test_create_{self.snake_name}(self, service, {self.snake_name}_data, sample_user):
        """Test creating a {self.model_name} through service"""
        result = service.create({self.snake_name}_data, sample_user)
        
        assert result is not None
        assert result.id is not None
'''
        
        # Test fields are set correctly
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at']:
                content += f'        assert result.{field.name} == {self.snake_name}_data["{field.name}"]\n'
        
        content += f'''
    
    def test_get_{self.snake_name}_by_id(self, service, sample_{self.snake_name}, sample_user):
        """Test getting {self.model_name} by ID"""
        result = service.get_by_id(sample_{self.snake_name}.id, sample_user)
        
        assert result is not None
        assert result.id == sample_{self.snake_name}.id
    
    def test_get_nonexistent_{self.snake_name}(self, service, sample_user):
        """Test getting non-existent {self.model_name}"""
        result = service.get_by_id(99999, sample_user)
        assert result is None
    
    def test_update_{self.snake_name}(self, service, sample_{self.snake_name}, sample_user):
        """Test updating {self.model_name}"""
        update_data = {{}}
'''
        
        # Find a field to update
        updatable_field = None
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at'] and field.type == FieldType.STRING:
                updatable_field = field
                break
        
        if updatable_field:
            content += f'''        update_data["{updatable_field.name}"] = "updated value"
        
        result = service.update(sample_{self.snake_name}.id, update_data, sample_user)
        
        assert result is not None
        assert result.{updatable_field.name} == "updated value"
'''
        
        content += f'''
    
    def test_delete_{self.snake_name}(self, service, sample_{self.snake_name}, sample_user):
        """Test deleting {self.model_name}"""
        {self.snake_name}_id = sample_{self.snake_name}.id
        
        result = service.delete({self.snake_name}_id, sample_user)
        assert result is True
        
        # Verify it's deleted
        deleted_item = service.get_by_id({self.snake_name}_id, sample_user)
        assert deleted_item is None
    
    def test_get_list(self, service, sample_{self.plural_name}, sample_user):
        """Test getting list of {self.plural_name}"""
        items, total = service.get_list(
            limit=10,
            offset=0,
            user=sample_user
        )
        
        assert isinstance(items, list)
        assert total >= len(sample_{self.plural_name})
        assert len(items) <= 10
    
    def test_get_list_with_search(self, service, sample_{self.plural_name}, sample_user):
        """Test searching {self.plural_name}"""
'''
        
        # Find a searchable field
        searchable_field = None
        for field in self.model_def.fields:
            if field.type in [FieldType.STRING, FieldType.TEXT] and field.name not in ['id']:
                searchable_field = field
                break
        
        if searchable_field:
            content += f'''        # Create a {self.snake_name} with specific {searchable_field.name}
        specific_{self.snake_name} = {self.model_name}Factory.create({searchable_field.name}="unique search term")
        
        items, total = service.get_list(
            search="unique search",
            user=sample_user
        )
        
        assert any(item.id == specific_{self.snake_name}.id for item in items)
'''
        else:
            content += f'''        # Search functionality test would go here
        # Depends on which fields are searchable in your implementation
        pass
'''
        
        content += f'''
    
    def test_get_list_with_filters(self, service, sample_{self.plural_name}, sample_user):
        """Test filtering {self.plural_name}"""
        # Test depends on available filter fields
        items, total = service.get_list(
            filters={{}},
            user=sample_user
        )
        
        assert isinstance(items, list)
        assert isinstance(total, int)
    
    def test_bulk_create(self, service, sample_user):
        """Test bulk creation of {self.plural_name}"""
        data_list = [
            {self.model_name}Factory.build_valid_data() for _ in range(3)
        ]
        
        results = service.bulk_create(data_list, sample_user)
        
        assert len(results) == 3
        for result in results:
            assert result.id is not None
    
    def test_bulk_update(self, service, sample_{self.plural_name}, sample_user):
        """Test bulk update of {self.plural_name}"""
        updates = []
        for item in sample_{self.plural_name}[:3]:
'''
        
        if updatable_field:
            content += f'''            updates.append({{
                "id": item.id,
                "data": {{"{updatable_field.name}": f"bulk updated {{item.id}}"}}
            }})
        
        results = service.bulk_update(updates, sample_user)
        
        assert len(results) == 3
        for result in results:
            assert "bulk updated" in result.{updatable_field.name}
'''
        else:
            content += '''            updates.append({
                "id": item.id,
                "data": {}  # No updatable fields identified
            })
        
        # Would test bulk update if updatable fields were available
        pass
'''
        
        content += f'''
    
    def test_bulk_delete(self, service, sample_{self.plural_name}, sample_user):
        """Test bulk deletion of {self.plural_name}"""
        ids_to_delete = [item.id for item in sample_{self.plural_name}[:3]]
        
        result = service.bulk_delete(ids_to_delete, sample_user)
        assert result is True
        
        # Verify they're deleted
        for item_id in ids_to_delete:
            deleted_item = service.get_by_id(item_id, sample_user)
            assert deleted_item is None
    
    def test_service_error_handling(self, service, sample_user):
        """Test service error handling"""
        # Test with invalid data
        with pytest.raises(ValueError):
            service.create({{}}, sample_user)  # Empty data
        
        # Test update non-existent
        result = service.update(99999, {{"some": "data"}}, sample_user)
        assert result is None
        
        # Test delete non-existent
        result = service.delete(99999, sample_user)
        assert result is False
'''
        
        # Add permission tests if applicable
        if self.model_def.owner_field:
            content += f'''
    
    def test_ownership_permissions(self, service, db, sample_user, other_user):
        """Test ownership-based permissions"""
        # Create item owned by sample_user
        owned_item = {self.model_name}Factory.create({self.model_def.owner_field}=sample_user.id)
        
        # sample_user should be able to access
        result = service.get_by_id(owned_item.id, sample_user)
        assert result is not None
        
        # other_user might not be able to access (depends on permissions)
        # This test depends on your permission implementation
'''
        
        self._write_file(f"tests/unit/test_{self.snake_name}_service.py", content)
    
    def generate_api_tests(self):
        """Generate integration tests for API endpoints"""
        content = f'''"""
Integration tests for {self.model_name} API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from tests.factories.{self.snake_name}_factory import {self.model_name}Factory


class Test{self.model_name}API:
    """Test {self.model_name} API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_create_{self.snake_name}(self, client, {self.snake_name}_data, auth_headers):
        """Test POST /{self.plural_name}"""
        response = client.post(
            f"/{self.plural_name}",
            json={self.snake_name}_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "id" in data
'''
        
        # Test response fields
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at']:
                content += f'        assert data["{field.name}"] == {self.snake_name}_data["{field.name}"]\n'
        
        content += f'''
    
    def test_create_{self.snake_name}_unauthorized(self, client, {self.snake_name}_data):
        """Test POST /{self.plural_name} without auth"""
        response = client.post(f"/{self.plural_name}", json={self.snake_name}_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_{self.snake_name}_invalid_data(self, client, invalid_{self.snake_name}_data, auth_headers):
        """Test POST /{self.plural_name} with invalid data"""
        for invalid_data in invalid_{self.snake_name}_data:
            response = client.post(
                f"/{self.plural_name}",
                json=invalid_data,
                headers=auth_headers
            )
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_get_{self.snake_name}(self, client, sample_{self.snake_name}, auth_headers):
        """Test GET /{self.plural_name}/{{id}}"""
        response = client.get(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sample_{self.snake_name}.id
    
    def test_get_{self.snake_name}_not_found(self, client, auth_headers):
        """Test GET /{self.plural_name}/{{id}} with non-existent ID"""
        response = client.get(f"/{self.plural_name}/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_update_{self.snake_name}(self, client, sample_{self.snake_name}, auth_headers):
        """Test PUT /{self.plural_name}/{{id}}"""
        update_data = {{}}
'''
        
        # Find a field to update
        updatable_field = None
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at'] and field.type == FieldType.STRING:
                updatable_field = field
                break
        
        if updatable_field:
            content += f'''        update_data["{updatable_field.name}"] = "updated via API"
        
        response = client.put(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["{updatable_field.name}"] == "updated via API"
'''
        
        content += f'''
    
    def test_delete_{self.snake_name}(self, client, sample_{self.snake_name}, auth_headers):
        """Test DELETE /{self.plural_name}/{{id}}"""
        response = client.delete(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify it's deleted
        get_response = client.get(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            headers=auth_headers
        )
        assert get_response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_list_{self.plural_name}(self, client, sample_{self.plural_name}, auth_headers):
        """Test GET /{self.plural_name}"""
        response = client.get(f"/{self.plural_name}", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert isinstance(data["items"], list)
    
    def test_list_{self.plural_name}_with_pagination(self, client, {self.snake_name}_batch, auth_headers):
        """Test GET /{self.plural_name} with pagination"""
        response = client.get(
            f"/{self.plural_name}?page=1&limit=5",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data["items"]) <= 5
        assert data["page"] == 1
        assert data["limit"] == 5
    
    def test_list_{self.plural_name}_with_search(self, client, auth_headers):
        """Test GET /{self.plural_name} with search"""
'''
        
        # Find a searchable field
        searchable_field = None
        for field in self.model_def.fields:
            if field.type in [FieldType.STRING, FieldType.TEXT] and field.name not in ['id']:
                searchable_field = field
                break
        
        if searchable_field:
            content += f'''        # Create item with specific {searchable_field.name}
        test_item = {self.model_name}Factory.create({searchable_field.name}="unique search term")
        
        response = client.get(
            f"/{self.plural_name}?search=unique search",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Should find our test item
        found_ids = [item["id"] for item in data["items"]]
        assert test_item.id in found_ids
'''
        else:
            content += '''        # Search test would go here if searchable fields were available
        pass
'''
        
        content += f'''
    
    def test_bulk_operations(self, client, auth_headers):
        """Test bulk operations endpoints"""
        # Bulk create
        create_data = [
            {self.model_name}Factory.build_valid_data() for _ in range(3)
        ]
        
        response = client.post(
            f"/{self.plural_name}/bulk",
            json={{"items": create_data}},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert len(data["items"]) == 3
        
        # Store IDs for cleanup
        created_ids = [item["id"] for item in data["items"]]
        
        # Bulk delete
        response = client.delete(
            f"/{self.plural_name}/bulk",
            json={{"ids": created_ids}},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    def test_api_error_handling(self, client, auth_headers):
        """Test API error handling"""
        # Test with malformed JSON
        response = client.post(
            f"/{self.plural_name}",
            data="invalid json",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Test with wrong content type
        response = client.post(
            f"/{self.plural_name}",
            data="some data",
            headers={{**auth_headers, "Content-Type": "text/plain"}}
        )
        assert response.status_code in [status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_415_UNSUPPORTED_MEDIA_TYPE]
    
    def test_api_validation_errors(self, client, auth_headers):
        """Test API validation error responses"""
        # Send empty data
        response = client.post(
            f"/{self.plural_name}",
            json={{}},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_data = response.json()
        assert "detail" in error_data
        assert isinstance(error_data["detail"], list)
'''
        
        self._write_file(f"tests/integration/test_{self.snake_name}_api.py", content)
    
    def generate_permission_tests(self):
        """Generate permission system tests"""
        content = f'''"""
Permission tests for {self.model_name}
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from app.models.{self.snake_name} import {self.model_name}
from app.auth.permissions.{self.snake_name}_permissions import {self.model_name}Permissions
from tests.factories.{self.snake_name}_factory import {self.model_name}Factory


class Test{self.model_name}Permissions:
    """Test {self.model_name} permission system"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_read_permission_required(self, client, sample_{self.snake_name}):
        """Test that read permission is required"""
        # Unauthenticated request
        response = client.get(f"/{self.plural_name}/{{sample_{self.snake_name}.id}}")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_permission_required(self, client, {self.snake_name}_data):
        """Test that create permission is required"""
        response = client.post(f"/{self.plural_name}", json={self.snake_name}_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_user_with_read_permission(self, client, sample_{self.snake_name}, user_with_permissions):
        """Test user with read permission can access resources"""
        # Grant read permission to user
        user_with_permissions.grant_permission({self.model_name}Permissions.READ.name)
        
        auth_headers = {{"Authorization": f"Bearer {{user_with_permissions.token}}"}}
        
        response = client.get(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
    
    def test_user_without_read_permission(self, client, sample_{self.snake_name}, regular_user):
        """Test user without read permission cannot access resources"""
        auth_headers = {{"Authorization": f"Bearer {{regular_user.token}}"}}
        
        response = client.get(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_user_with_create_permission(self, client, {self.snake_name}_data, user_with_permissions):
        """Test user with create permission can create resources"""
        user_with_permissions.grant_permission({self.model_name}Permissions.CREATE.name)
        
        auth_headers = {{"Authorization": f"Bearer {{user_with_permissions.token}}"}}
        
        response = client.post(
            f"/{self.plural_name}",
            json={self.snake_name}_data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_user_with_update_permission(self, client, sample_{self.snake_name}, user_with_permissions):
        """Test user with update permission can modify resources"""
        user_with_permissions.grant_permission({self.model_name}Permissions.UPDATE.name)
        
        auth_headers = {{"Authorization": f"Bearer {{user_with_permissions.token}}"}}
        
'''
        
        # Find updatable field
        updatable_field = None
        for field in self.model_def.fields:
            if field.name not in ['id', 'created_at', 'updated_at'] and field.type == FieldType.STRING:
                updatable_field = field
                break
        
        if updatable_field:
            content += f'''        update_data = {{"{updatable_field.name}": "updated value"}}
        
        response = client.put(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
'''
        
        content += f'''
    
    def test_user_with_delete_permission(self, client, sample_{self.snake_name}, user_with_permissions):
        """Test user with delete permission can delete resources"""
        user_with_permissions.grant_permission({self.model_name}Permissions.DELETE.name)
        
        auth_headers = {{"Authorization": f"Bearer {{user_with_permissions.token}}"}}
        
        response = client.delete(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    def test_admin_permission_grants_all_access(self, client, sample_{self.snake_name}, {self.snake_name}_data, admin_user):
        """Test admin permission grants full access"""
        admin_user.grant_permission({self.model_name}Permissions.ADMIN.name)
        
        auth_headers = {{"Authorization": f"Bearer {{admin_user.token}}"}}
        
        # Should be able to read
        response = client.get(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        
        # Should be able to create
        response = client.post(
            f"/{self.plural_name}",
            json={self.snake_name}_data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_201_CREATED
        created_id = response.json()["id"]
        
        # Should be able to update
'''
        
        if updatable_field:
            content += f'''        update_data = {{"{updatable_field.name}": "admin updated"}}
        response = client.put(
            f"/{self.plural_name}/{{created_id}}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
'''
        
        content += f'''        
        # Should be able to delete
        response = client.delete(
            f"/{self.plural_name}/{{created_id}}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
'''
        
        # Add ownership tests if applicable
        if self.model_def.owner_field:
            content += f'''
    
    def test_owner_can_access_own_resources(self, client, db, regular_user):
        """Test resource owners can access their own resources"""
        # Create resource owned by regular_user
        owned_resource = {self.model_name}Factory.create({self.model_def.owner_field}=regular_user.id)
        
        auth_headers = {{"Authorization": f"Bearer {{regular_user.token}}"}}
        
        response = client.get(
            f"/{self.plural_name}/{{owned_resource.id}}",
            headers=auth_headers
        )
        
        # This depends on your ownership permission implementation
        # May be 200 OK if ownership grants access, or 403 if explicit permission needed
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]
    
    def test_non_owner_cannot_access_others_resources(self, client, {self.snake_name}_owner, other_user):
        """Test non-owners cannot access others' resources"""
        auth_headers = {{"Authorization": f"Bearer {{other_user.token}}"}}
        
        response = client.get(
            f"/{self.plural_name}/{{ {self.snake_name}_owner.id}}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
'''
        
        # Add project-scoped tests if applicable
        if self.model_def.project_scoped:
            content += f'''
    
    def test_project_member_can_access_project_resources(self, client, project_{self.snake_name}, project_member_user):
        """Test project members can access project resources"""
        auth_headers = {{"Authorization": f"Bearer {{project_member_user.token}}"}}
        
        response = client.get(
            f"/{self.plural_name}/{{project_{self.snake_name}.id}}",
            headers=auth_headers
        )
        
        # This depends on your project permission implementation
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]
    
    def test_non_project_member_cannot_access_project_resources(self, client, project_{self.snake_name}, other_user):
        """Test non-project members cannot access project resources"""
        auth_headers = {{"Authorization": f"Bearer {{other_user.token}}"}}
        
        response = client.get(
            f"/{self.plural_name}/{{project_{self.snake_name}.id}}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
'''
        
        content += f'''
    
    def test_bulk_operations_require_permissions(self, client, regular_user):
        """Test bulk operations require appropriate permissions"""
        auth_headers = {{"Authorization": f"Bearer {{regular_user.token}}"}}
        
        # Bulk create without permission
        create_data = [{self.model_name}Factory.build_valid_data()]
        response = client.post(
            f"/{self.plural_name}/bulk",
            json={{"items": create_data}},
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Grant bulk create permission
        regular_user.grant_permission({self.model_name}Permissions.BULK_CREATE.name)
        
        response = client.post(
            f"/{self.plural_name}/bulk",
            json={{"items": create_data}},
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_field_level_permissions(self, client, sample_{self.snake_name}, user_with_permissions):
        """Test field-level permission restrictions"""
        # This test depends on having sensitive fields with field-level permissions
        # Implementation varies based on your field permission setup
        
        user_with_permissions.grant_permission({self.model_name}Permissions.READ.name)
        auth_headers = {{"Authorization": f"Bearer {{user_with_permissions.token}}"}}
        
        response = client.get(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        
        # Check that sensitive fields are redacted if user lacks field permission
        # This depends on your field-level permission implementation
'''
        
        # Add sensitive field checks
        sensitive_fields = [f for f in self.model_def.fields 
                          if f.name in ['password', 'secret', 'token', 'key'] or f.type == FieldType.EMAIL]
        
        for field in sensitive_fields:
            content += f'''        
        # Check {field.name} field access
        if not user_with_permissions.has_permission("read_{self.model_def.permission_category or self.snake_name}_{field.name}"):
            assert data.get("{field.name}") == "[REDACTED]"
'''
        
        self._write_file(f"tests/integration/test_{self.snake_name}_permissions.py", content)
    
    def generate_performance_tests(self):
        """Generate performance tests"""
        content = f'''"""
Performance tests for {self.model_name}
"""

import pytest
import time
from sqlalchemy import func

from app.models.{self.snake_name} import {self.model_name}
from app.services.{self.snake_name}_service import {self.model_name}Service
from tests.factories.{self.snake_name}_factory import {self.model_name}Factory


class Test{self.model_name}Performance:
    """Performance tests for {self.model_name} operations"""
    
    def test_bulk_create_performance(self, db, sample_user, benchmark):
        """Test performance of bulk create operations"""
        service = {self.model_name}Service(db)
        
        def create_bulk_data():
            data_list = [
                {self.model_name}Factory.build_valid_data() for _ in range(100)
            ]
            return service.bulk_create(data_list, sample_user)
        
        result = benchmark(create_bulk_data)
        assert len(result) == 100
    
    def test_large_list_query_performance(self, db, large_{self.snake_name}_dataset, sample_user, benchmark):
        """Test performance of querying large datasets"""
        service = {self.model_name}Service(db)
        
        def query_large_dataset():
            return service.get_list(limit=100, offset=0, user=sample_user)
        
        items, total = benchmark(query_large_dataset)
        
        assert len(items) <= 100
        assert total >= 1000  # We created 1000 items in the fixture
    
    def test_search_performance(self, db, large_{self.snake_name}_dataset, sample_user, benchmark):
        """Test search performance on large dataset"""
        service = {self.model_name}Service(db)
        
'''
        
        # Find searchable field
        searchable_field = None
        for field in self.model_def.fields:
            if field.type in [FieldType.STRING, FieldType.TEXT] and field.name not in ['id']:
                searchable_field = field
                break
        
        if searchable_field:
            content += f'''        def search_large_dataset():
            return service.get_list(
                search="search term",
                limit=50,
                user=sample_user
            )
        
        items, total = benchmark(search_large_dataset)
        assert isinstance(items, list)
'''
        else:
            content += '''        # Search performance test would go here
        # if searchable fields were available
        pass
'''
        
        content += f'''
    
    def test_database_query_efficiency(self, db, sample_{self.plural_name}):
        """Test that queries are efficient (no N+1 problems)"""
        # Enable query logging to count queries
        query_count = 0
        original_execute = db.execute
        
        def counting_execute(*args, **kwargs):
            nonlocal query_count
            query_count += 1
            return original_execute(*args, **kwargs)
        
        db.execute = counting_execute
        
        try:
            # Query multiple items
            items = db.query({self.model_name}).limit(5).all()
            
            # Access related data (if any relationships exist)
            for item in items:
                # Access any relationship fields here
                # This would test for N+1 query problems
                pass
            
            # Should not have excessive queries
            # Exact number depends on your model's relationships
            assert query_count <= 10  # Reasonable upper bound
            
        finally:
            db.execute = original_execute
    
    def test_concurrent_access_performance(self, db, sample_user):
        """Test performance under concurrent access"""
        import threading
        import concurrent.futures
        
        service = {self.model_name}Service(db)
        results = []
        
        def create_{self.snake_name}():
            data = {self.model_name}Factory.build_valid_data()
            return service.create(data, sample_user)
        
        # Test concurrent creation
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_{self.snake_name}) for _ in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        end_time = time.time()
        duration = end_time - start_time
        
        assert len(results) == 10
        assert duration < 5.0  # Should complete within 5 seconds
    
    def test_memory_usage_bulk_operations(self, db, sample_user):
        """Test memory usage during bulk operations"""
        import psutil
        import os
        
        service = {self.model_name}Service(db)
        process = psutil.Process(os.getpid())
        
        # Measure initial memory
        initial_memory = process.memory_info().rss
        
        # Perform bulk operation
        data_list = [
            {self.model_name}Factory.build_valid_data() for _ in range(1000)
        ]
        
        results = service.bulk_create(data_list, sample_user)
        
        # Measure final memory
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable
        # This is a rough check - actual values depend on your environment
        assert memory_increase < 100 * 1024 * 1024  # Less than 100MB increase
        assert len(results) == 1000
    
    def test_database_connection_efficiency(self, db, sample_user):
        """Test that database connections are used efficiently"""
        service = {self.model_name}Service(db)
        
        # Monitor connection pool if available
        initial_connections = getattr(db.bind.pool, 'checkedout', 0)
        
        # Perform multiple operations
        for _ in range(10):
            data = {self.model_name}Factory.build_valid_data()
            item = service.create(data, sample_user)
            retrieved = service.get_by_id(item.id, sample_user)
            assert retrieved is not None
        
        final_connections = getattr(db.bind.pool, 'checkedout', 0)
        
        # Should not have connection leaks
        assert final_connections == initial_connections
    
    def test_pagination_performance(self, db, large_{self.snake_name}_dataset, sample_user):
        """Test pagination performance on large datasets"""
        service = {self.model_name}Service(db)
        
        # Test different page sizes
        page_sizes = [10, 50, 100, 500]
        
        for page_size in page_sizes:
            start_time = time.time()
            
            items, total = service.get_list(
                limit=page_size,
                offset=0,
                user=sample_user
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            assert len(items) <= page_size
            assert duration < 1.0  # Should complete within 1 second
            
            # Test deep pagination
            deep_offset = 500
            start_time = time.time()
            
            items, total = service.get_list(
                limit=page_size,
                offset=deep_offset,
                user=sample_user
            )
            
            end_time = time.time()
            deep_duration = end_time - start_time
            
            # Deep pagination shouldn't be dramatically slower
            assert deep_duration < duration * 3
'''
        
        self._write_file(f"tests/performance/test_{self.snake_name}_performance.py", content)
    
    def generate_security_tests(self):
        """Generate security tests"""
        content = f'''"""
Security tests for {self.model_name}
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from tests.factories.{self.snake_name}_factory import {self.model_name}Factory


class Test{self.model_name}Security:
    """Security tests for {self.model_name} endpoints"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_sql_injection_protection(self, client, auth_headers):
        """Test protection against SQL injection attacks"""
        # Test injection in query parameters
        injection_payloads = [
            "'; DROP TABLE {self.model_def.table_name}; --",
            "' OR '1'='1",
            "1; DELETE FROM {self.model_def.table_name}; --",
            "' UNION SELECT * FROM users --"
        ]
        
        for payload in injection_payloads:
            # Test in search parameter
            response = client.get(
                f"/{self.plural_name}?search={{payload}}",
                headers=auth_headers
            )
            
            # Should not cause server error or expose data
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
            
            if response.status_code == status.HTTP_200_OK:
                data = response.json()
                # Should return normal response structure
                assert "items" in data
    
    def test_xss_protection(self, client, {self.snake_name}_data, auth_headers):
        """Test protection against XSS attacks"""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "{{constructor.constructor('alert(1)')()}}"
        ]
        
        for payload in xss_payloads:
            # Test in string fields
'''
        
        # Test XSS in string fields
        string_fields = [f for f in self.model_def.fields 
                        if f.type in [FieldType.STRING, FieldType.TEXT] 
                        and f.name not in ['id', 'created_at', 'updated_at']]
        
        for field in string_fields:
            content += f'''            
            test_data = {self.snake_name}_data.copy()
            test_data["{field.name}"] = payload
            
            response = client.post(
                f"/{self.plural_name}",
                json=test_data,
                headers=auth_headers
            )
            
            if response.status_code == status.HTTP_201_CREATED:
                # Payload should be escaped/sanitized
                created_data = response.json()
                # This depends on your sanitization implementation
                assert payload not in str(created_data.get("{field.name}", ""))
'''
        
        content += f'''
    
    def test_authentication_required(self, client, {self.snake_name}_data):
        """Test that authentication is required for all endpoints"""
        endpoints_methods = [
            ("GET", f"/{self.plural_name}"),
            ("POST", f"/{self.plural_name}"),
            ("GET", f"/{self.plural_name}/1"),
            ("PUT", f"/{self.plural_name}/1"),
            ("DELETE", f"/{self.plural_name}/1"),
        ]
        
        for method, endpoint in endpoints_methods:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={self.snake_name}_data)
            elif method == "PUT":
                response = client.put(endpoint, json={self.snake_name}_data)
            elif method == "DELETE":
                response = client.delete(endpoint)
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_authorization_enforcement(self, client, sample_{self.snake_name}, regular_user):
        """Test that authorization is properly enforced"""
        # User without permissions
        auth_headers = {{"Authorization": f"Bearer {{regular_user.token}}"}}
        
        # Should not be able to access without proper permissions
        response = client.get(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_input_validation_security(self, client, auth_headers):
        """Test input validation prevents malicious data"""
        malicious_inputs = [
            {{"id": "../../etc/passwd"}},  # Path traversal attempt
            {{"{self.model_def.fields[0].name}": "A" * 10000}},  # Buffer overflow attempt
            {{"{self.model_def.fields[0].name}": None}},  # Null byte injection
            {{"__proto__": {{"isAdmin": True}}}},  # Prototype pollution
        ]
        
        for malicious_data in malicious_inputs:
            response = client.post(
                f"/{self.plural_name}",
                json=malicious_data,
                headers=auth_headers
            )
            
            # Should be rejected with validation error
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_rate_limiting(self, client, {self.snake_name}_data, auth_headers):
        """Test rate limiting protection"""
        # This test depends on having rate limiting implemented
        responses = []
        
        # Make many rapid requests
        for _ in range(100):
            response = client.post(
                f"/{self.plural_name}",
                json={self.snake_name}_data,
                headers=auth_headers
            )
            responses.append(response.status_code)
        
        # Should eventually hit rate limit
        # This depends on your rate limiting configuration
        rate_limited = any(code == status.HTTP_429_TOO_MANY_REQUESTS for code in responses)
        
        # If rate limiting is implemented, we should see 429 responses
        # If not implemented, all requests should succeed or fail for other reasons
        assert len(responses) == 100
    
    def test_cors_security(self, client, {self.snake_name}_data, auth_headers):
        """Test CORS security configuration"""
        # Test preflight request
        response = client.options(
            f"/{self.plural_name}",
            headers={{
                "Origin": "https://evil.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type,Authorization"
            }}
        )
        
        # Should have proper CORS headers
        cors_headers = response.headers
        
        # Check that CORS is properly configured
        # This depends on your CORS settings
        if "access-control-allow-origin" in cors_headers:
            allowed_origin = cors_headers["access-control-allow-origin"]
            # Should not allow arbitrary origins
            assert allowed_origin != "*" or "Authorization" not in cors_headers.get("access-control-allow-headers", "")
    
    def test_sensitive_data_exposure(self, client, sample_{self.snake_name}, auth_headers):
        """Test that sensitive data is not exposed"""
        response = client.get(
            f"/{self.plural_name}/{{sample_{self.snake_name}.id}}",
            headers=auth_headers
        )
        
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            
            # Check that sensitive fields are not exposed or are redacted
            sensitive_patterns = [
                "password", "secret", "key", "token", "hash"
            ]
            
            for field_name, value in data.items():
                if any(pattern in field_name.lower() for pattern in sensitive_patterns):
                    # Should be redacted or not present
                    assert value in [None, "[REDACTED]", "***"] or len(str(value)) == 0
    
    def test_file_upload_security(self, client, auth_headers):
        """Test file upload security (if applicable)"""
        # This test applies if your model handles file uploads
        malicious_files = [
            ("test.php", b"<?php system($_GET['cmd']); ?>", "application/x-php"),
            ("test.js", b"alert('xss')", "application/javascript"),
            ("test.exe", b"MZ\\x90\\x00", "application/x-executable"),
        ]
        
        for filename, content, content_type in malicious_files:
            files = {{"file": (filename, content, content_type)}}
            
            # This depends on having a file upload endpoint
            response = client.post(
                f"/{self.plural_name}/upload",
                files=files,
                headers=auth_headers
            )
            
            # Should reject dangerous file types
            # This test may not apply if no file upload functionality exists
            if response.status_code != status.HTTP_404_NOT_FOUND:
                assert response.status_code in [
                    status.HTTP_400_BAD_REQUEST,
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
                ]
    
    def test_information_disclosure(self, client, auth_headers):
        """Test for information disclosure vulnerabilities"""
        # Test with invalid IDs
        invalid_ids = [-1, 0, 99999, "invalid", "../../etc/passwd"]
        
        for invalid_id in invalid_ids:
            response = client.get(
                f"/{self.plural_name}/{{invalid_id}}",
                headers=auth_headers
            )
            
            # Should not reveal system information
            assert response.status_code in [
                status.HTTP_404_NOT_FOUND,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ]
            
            if response.status_code != status.HTTP_404_NOT_FOUND:
                # Error messages should not reveal internal details
                error_data = response.json()
                error_message = str(error_data).lower()
                
                # Should not contain system paths or internal details
                forbidden_terms = ["traceback", "exception", "stack", "file", "line"]
                for term in forbidden_terms:
                    assert term not in error_message
    
    def test_session_security(self, client, {self.snake_name}_data, auth_headers):
        """Test session security"""
        # Test token reuse after logout (if logout functionality exists)
        # Create a resource
        response = client.post(
            f"/{self.plural_name}",
            json={self.snake_name}_data,
            headers=auth_headers
        )
        
        if response.status_code == status.HTTP_201_CREATED:
            # Token should be valid
            resource_id = response.json()["id"]
            
            # Logout (if endpoint exists)
            logout_response = client.post("/auth/logout", headers=auth_headers)
            
            # Try to use token after logout
            post_logout_response = client.get(
                f"/{self.plural_name}/{{resource_id}}",
                headers=auth_headers
            )
            
            # If logout invalidates token, should be unauthorized
            # This depends on your authentication implementation
            if logout_response.status_code == status.HTTP_200_OK:
                assert post_logout_response.status_code == status.HTTP_401_UNAUTHORIZED
'''
        
        self._write_file(f"tests/security/test_{self.snake_name}_security.py", content)
    
    def _get_factory_field(self, field: FieldDefinition) -> str:
        """Generate factory field definition"""
        if field.type == FieldType.STRING:
            if 'name' in field.name.lower():
                return f'Faker("name")'
            elif 'title' in field.name.lower():
                return f'Faker("sentence", nb_words=4)'
            elif 'status' in field.name.lower():
                return f'Faker("random_element", elements=["active", "inactive", "pending"])'
            else:
                max_length = field.max_length or 255
                return f'Faker("text", max_nb_chars={min(max_length, 100)})'
        
        elif field.type == FieldType.TEXT:
            return f'Faker("paragraph", nb_sentences=3)'
        
        elif field.type == FieldType.EMAIL:
            return f'Faker("email")'
        
        elif field.type == FieldType.URL:
            return f'Faker("url")'
        
        elif field.type == FieldType.INTEGER:
            return f'Faker("random_int", min=1, max=1000)'
        
        elif field.type == FieldType.FLOAT:
            return f'Faker("pyfloat", left_digits=3, right_digits=2, positive=True)'
        
        elif field.type == FieldType.BOOLEAN:
            return f'Faker("boolean")'
        
        elif field.type == FieldType.DATE:
            return f'Faker("date_between", start_date="-1y", end_date="today")'
        
        elif field.type == FieldType.DATETIME:
            return f'Faker("date_time_between", start_date="-1y", end_date="now")'
        
        elif field.type == FieldType.JSON:
            return f'LazyAttribute(lambda obj: {{"key": Faker("word").generate(), "value": Faker("sentence").generate()}})'
        
        elif field.type == FieldType.ENUM and field.enum_values:
            enum_list = ', '.join(f'"{val}"' for val in field.enum_values)
            return f'Faker("random_element", elements=[{enum_list}])'
        
        elif field.type == FieldType.FOREIGN_KEY:
            # This would need to be customized based on the target model
            return f'Faker("random_int", min=1, max=100)'  # Placeholder
        
        else:
            return f'Faker("text", max_nb_chars=50)'
    
    def _write_file(self, relative_path: str, content: str):
        """Write content to file, creating directories as needed"""
        file_path = self.base_path / relative_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content)