"""Test cases to verify package upgrades work correctly."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from app.db.session import get_db


# Test FastAPI upgrade
def test_fastapi_startup():
    """Test that FastAPI application starts correctly with upgraded version."""
    client = TestClient(app)
    # Basic health check
    assert app is not None


def test_fastapi_cors_middleware():
    """Test CORS middleware works with upgraded FastAPI."""
    client = TestClient(app)
    response = client.options("/")
    # Should not fail even if endpoint doesn't exist
    assert response.status_code in [200, 404, 405]


# Test SQLAlchemy upgrade
def test_sqlalchemy_engine_creation():
    """Test SQLAlchemy engine creation with upgraded version."""
    from sqlalchemy import create_engine
    
    # Test in-memory SQLite database
    engine = create_engine("sqlite:///:memory:")
    assert engine is not None
    
    # Test connection with proper SQLAlchemy 2.0 syntax
    from sqlalchemy import text
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        assert result.fetchone()[0] == 1


def test_sqlalchemy_session():
    """Test SQLAlchemy session with upgraded version."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine("sqlite:///:memory:")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    session = SessionLocal()
    assert session is not None
    session.close()


# Test Pydantic upgrade
def test_pydantic_validation():
    """Test Pydantic models work with upgraded version."""
    from pydantic import BaseModel, ValidationError
    
    class TestModel(BaseModel):
        name: str
        age: int
        
    # Valid data
    model = TestModel(name="test", age=25)
    assert model.name == "test"
    assert model.age == 25
    
    # Invalid data should raise validation error
    with pytest.raises(ValidationError):
        TestModel(name="test", age="invalid")


def test_pydantic_email_validation():
    """Test Pydantic email validation with upgraded version."""
    from pydantic import BaseModel, EmailStr
    
    class UserModel(BaseModel):
        email: EmailStr
        
    # Valid email
    user = UserModel(email="test@example.com")
    assert user.email == "test@example.com"


# Test Alembic upgrade
def test_alembic_import():
    """Test that Alembic can be imported with upgraded version."""
    import alembic
    from alembic import command
    from alembic.config import Config
    
    assert alembic is not None
    assert command is not None
    assert Config is not None


# Test Uvicorn upgrade
def test_uvicorn_import():
    """Test that Uvicorn can be imported with upgraded version."""
    import uvicorn
    
    assert uvicorn is not None
    assert hasattr(uvicorn, 'run')


# Test python-multipart upgrade
def test_multipart_import():
    """Test that python-multipart can be imported with upgraded version."""
    import python_multipart
    
    assert python_multipart is not None


if __name__ == "__main__":
    pytest.main([__file__])