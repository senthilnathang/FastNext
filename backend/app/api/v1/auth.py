"""
Authentication API endpoints.

Provides login, token validation, and user authentication functionality
with proper security measures and error handling.
"""

from datetime import timedelta
from typing import Any

from app.auth.deps import get_current_user
from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import User as UserSchema
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter()

# Error messages for consistency
ERROR_INVALID_CREDENTIALS = "Incorrect username or password"
ERROR_INACTIVE_USER = "Inactive user"
ERROR_TOKEN_EXPIRED = "Token has expired"
ERROR_INVALID_TOKEN = "Invalid authentication token"


class LoginRequest(BaseModel):
    """Login request for Swagger UI compatibility"""

    username: str
    password: str

    model_config = {
        "json_schema_extra": {
            "example": {"username": "admin", "password": "password123"}
        }
    }


@router.post(
    "/login/access-token",
    response_model=Token,
    summary="🔐 Login with Form Data",
    description="Login using OAuth2 form data (for OAuth2 compatibility)",
)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible login endpoint using form data.

    Authenticates user credentials and returns JWT access token.
    Use this endpoint for OAuth2 client compatibility.

    Args:
        form_data: OAuth2 password request form containing username and password

    Returns:
        Access token and token type

    Raises:
        HTTPException: If credentials are invalid or user is inactive
    """
    try:
        # Validate input
        if not form_data.username or not form_data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username and password are required"
            )

        # Find user and verify credentials
        user = db.query(User).filter(User.username == form_data.username).first()
        if not user or not security.verify_password(
            form_data.password, user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ERROR_INVALID_CREDENTIALS,
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ERROR_INACTIVE_USER
            )

        # Generate access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return {
            "access_token": security.create_access_token(
                user.id, expires_delta=access_token_expires
            ),
            "token_type": "bearer",
        }

    except HTTPException:
        raise
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error during OAuth2 login: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service temporarily unavailable"
        )


@router.post(
    "/login",
    response_model=Token,
    summary="🔑 Login with JSON",
    description="Login using JSON data (recommended for API clients and Swagger UI testing)",
)
def login_json(login_data: LoginRequest, db: Session = Depends(get_db)) -> Any:
    """
    JSON-based login endpoint for better API client and Swagger UI experience.

    Authenticates user credentials and returns JWT access token with additional
    metadata for easier testing and integration.

    Use this endpoint for testing in Swagger UI:
    1. Click "Try it out"
    2. Enter your username and password
    3. Execute to get your JWT token
    4. Copy the access_token value
    5. Click "Authorize" at the top and paste: Bearer <your_token>

    Args:
        login_data: Login request containing username and password

    Returns:
        Access token with metadata including expiration time

    Raises:
        HTTPException: If credentials are invalid or user is inactive
    """
    try:
        # Validate input
        if not login_data.username or not login_data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username and password are required"
            )

        # Find user and verify credentials
        user = db.query(User).filter(User.username == login_data.username).first()
        if not user or not security.verify_password(
            login_data.password, user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ERROR_INVALID_CREDENTIALS,
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ERROR_INACTIVE_USER
            )

        # Generate access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return {
            "access_token": security.create_access_token(
                user.id, expires_delta=access_token_expires
            ),
            "token_type": "bearer",
            "expires_in": int(access_token_expires.total_seconds()),
            "message": "Login successful! Copy the access_token and use 'Authorize' button with: Bearer <token>",
        }

    except HTTPException:
        raise
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error during JSON login: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service temporarily unavailable"
        )


@router.post(
    "/test-token",
    response_model=UserSchema,
    summary="🧪 Test Authentication",
    description="Test your JWT token - requires authentication",
)
def test_token(current_user: User = Depends(get_current_user)) -> Any:
    """
    Test authentication endpoint to verify JWT token validity.

    This endpoint requires authentication. Use it to:
    1. Verify your JWT token is working correctly
    2. Get your current user information
    3. Test the authentication flow
    4. Debug authentication issues

    Args:
        current_user: The authenticated user from the JWT token

    Returns:
        Current user information if token is valid

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        return current_user
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error testing token: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_INVALID_TOKEN
        )


@router.get(
    "/me",
    response_model=UserSchema,
    summary="👤 Get Current User",
    description="Get current authenticated user information",
)
def get_current_user_info(current_user: User = Depends(get_current_user)) -> Any:
    """
    Retrieve information about the currently authenticated user.

    Returns detailed information about the currently authenticated user
    including profile data and permissions. Requires a valid JWT token
    in the Authorization header.

    Args:
        current_user: The authenticated user from the JWT token

    Returns:
        Complete user profile information

    Raises:
        HTTPException: If token is invalid or user not found
    """
    try:
        return current_user
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error getting current user info: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_INVALID_TOKEN
        )
