from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.auth.deps import get_current_user
from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import User as UserSchema

router = APIRouter()

class LoginRequest(BaseModel):
    """Login request for Swagger UI compatibility"""
    username: str
    password: str
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "username": "admin",
                "password": "password123"
            }
        }
    }


@router.post("/login/access-token", response_model=Token, 
           summary="🔐 Login with Form Data",
           description="Login using OAuth2 form data (for OAuth2 compatibility)")
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """OAuth2 compatible login endpoint"""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/login", response_model=Token,
           summary="🔑 Login with JSON",
           description="Login using JSON data (recommended for API clients and Swagger UI testing)")
def login_json(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    JSON-based login endpoint for better Swagger UI experience
    
    Use this endpoint for testing in Swagger UI:
    1. Click "Try it out"
    2. Enter your username and password
    3. Execute to get your JWT token
    4. Copy the access_token value
    5. Click "Authorize" at the top and paste: Bearer <your_token>
    """
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not security.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
        "message": "Login successful! Copy the access_token and use 'Authorize' button with: Bearer <token>"
    }


@router.post("/test-token", response_model=UserSchema,
           summary="🧪 Test Authentication",
           description="Test your JWT token - requires authentication")
def test_token(current_user: User = Depends(get_current_user)) -> Any:
    """
    Test authentication endpoint
    
    This endpoint requires authentication. Use it to:
    1. Verify your JWT token is working
    2. Get your current user information
    3. Test the authentication flow
    """
    return current_user

@router.get("/me", response_model=UserSchema,
          summary="👤 Get Current User",
          description="Get current authenticated user information")
def get_current_user_info(current_user: User = Depends(get_current_user)) -> Any:
    """
    Get current user information
    
    Returns detailed information about the currently authenticated user.
    Requires a valid JWT token in the Authorization header.
    """
    return current_user