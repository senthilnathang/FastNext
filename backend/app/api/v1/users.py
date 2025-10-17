"""
User management API endpoints.

Provides CRUD operations for user management with proper authentication,
authorization, and input validation.
"""

from typing import Any, List

from app.auth.deps import get_current_active_user
from app.auth.permissions import require_admin
from app.core import security
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ListResponse
from app.schemas.user import AdminUserCreate
from app.schemas.user import User as UserSchema
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

# Constants for pagination and validation
DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 1000
MIN_SEARCH_LENGTH = 2

# Error messages for consistency
ERROR_USER_NOT_FOUND = "User not found"
ERROR_EMAIL_EXISTS = "The user with this email already exists in the system"
ERROR_USERNAME_EXISTS = "The user with this username already exists in the system"
ERROR_CANNOT_DELETE_SUPERUSER = "Cannot delete superuser"
ERROR_CANNOT_MODIFY_SUPERUSER = "Cannot modify superuser status"
ERROR_INVALID_PARAMETERS = "Invalid parameters provided"
ERROR_DATABASE_OPERATION = "Database operation failed"

router = APIRouter()


@router.get("", response_model=ListResponse[UserResponse])
@router.get("/", response_model=ListResponse[UserResponse])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    search: str | None = None,
    is_active: bool | None = None,
    current_user: User = Depends(require_admin),
) -> Any:
    """
    Retrieve paginated list of users with optional filtering.

    Requires admin privileges. Supports search across username, email, and full name,
    and filtering by active status.

    Args:
        skip: Number of records to skip (pagination offset)
        limit: Maximum number of records to return (max 1000)
        search: Search term for username, email, or full name (min 2 characters)
        is_active: Filter by active status (true/false)

    Returns:
        Paginated list of user responses

    Raises:
        HTTPException: If parameters are invalid or user lacks permissions
    """
    # Validate input parameters
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip parameter must be non-negative"
        )

    if limit < 1 or limit > MAX_PAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Limit must be between 1 and {MAX_PAGE_SIZE}"
        )

    if search and len(search.strip()) < MIN_SEARCH_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Search term must be at least {MIN_SEARCH_LENGTH} characters long"
        )

    try:
        query = db.query(User)

        # Apply search filter with proper sanitization
        if search and (search_term := search.strip()):
            search_pattern = f"%{search_term}%"
            query = query.filter(
                (User.username.ilike(search_pattern))
                | (User.email.ilike(search_pattern))
                | (User.full_name.ilike(search_pattern))
            )

        # Apply active status filter
        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        # Get total count for pagination
        total = query.count()

        # Get paginated results
        users = query.offset(skip).limit(limit).all()

        return ListResponse.paginate(items=users, total=total, skip=skip, limit=limit)

    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error retrieving users: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )


@router.post("", response_model=UserResponse)
@router.post("/", response_model=UserResponse)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: AdminUserCreate,
    current_user: User = Depends(require_admin),
) -> Any:
    """
    Create a new user account (admin only).

    Validates input data, checks for existing users, and creates the account
    with proper password hashing. Optionally sends invitation email.

    Args:
        user_in: User creation data including email, username, password, etc.
        current_user: Admin user performing the operation

    Returns:
        Created user response

    Raises:
        HTTPException: If email/username already exists or validation fails
    """
    try:
        # Validate input data
        if not user_in.email or not user_in.username or not user_in.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_INVALID_PARAMETERS
            )

        # Check for existing email
        existing_user = db.query(User).filter(User.email == user_in.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_EMAIL_EXISTS
            )

        # Check for existing username
        existing_user = db.query(User).filter(User.username == user_in.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_USERNAME_EXISTS
            )

        # Create user data excluding password and invitation flag
        user_data = user_in.dict(exclude={"password", "send_invitation"})
        hashed_password = security.get_password_hash(user_in.password)

        # Create new user
        user = User(**user_data, hashed_password=hashed_password)
        db.add(user)
        db.commit()
        db.refresh(user)

        # TODO: Implement invitation email sending if send_invitation is True
        if user_in.send_invitation:
            # Send invitation email logic here
            pass

        return user

    except HTTPException:
        raise
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error creating user: {type(e).__name__}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


@router.get("/me", response_model=UserResponse)
def read_user_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve the current authenticated user's profile information.

    Returns the full user object for the currently logged-in user.

    Args:
        current_user: The authenticated user from the request

    Returns:
        Current user's profile data
    """
    return current_user


@router.put("/me", response_model=UserResponse)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update the current authenticated user's profile information.

    Allows users to modify their own profile data including password changes.
    Passwords are automatically hashed before storage.

    Args:
        user_in: Updated user data (only provided fields will be updated)
        current_user: The authenticated user performing the update

    Returns:
        Updated user profile data

    Raises:
        HTTPException: If database operation fails
    """
    try:
        update_data = user_in.dict(exclude_unset=True)

        # Handle password update separately
        if "password" in update_data:
            new_password = update_data.pop("password")
            if new_password:
                update_data["hashed_password"] = security.get_password_hash(new_password)

        # Apply updates to user object
        for field, value in update_data.items():
            setattr(current_user, field, value)

        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return current_user

    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error updating user profile: {type(e).__name__}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """
    Retrieve a specific user by their ID (admin only).

    Args:
        user_id: The unique identifier of the user to retrieve
        current_user: Admin user performing the operation

    Returns:
        User profile data

    Raises:
        HTTPException: If user not found (404)
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ERROR_USER_NOT_FOUND
            )
        return user

    except HTTPException:
        raise
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error retrieving user {user_id}: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(require_admin),
) -> Any:
    """
    Update a specific user's information (admin only).

    Allows admins to modify any user's profile data including password changes.
    Cannot modify superuser accounts.

    Args:
        user_id: The unique identifier of the user to update
        user_in: Updated user data (only provided fields will be updated)
        current_user: Admin user performing the operation

    Returns:
        Updated user profile data

    Raises:
        HTTPException: If user not found or operation fails
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ERROR_USER_NOT_FOUND
            )

        # Prevent modification of superuser accounts
        if user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_CANNOT_MODIFY_SUPERUSER
            )

        update_data = user_in.dict(exclude_unset=True)

        # Handle password update separately
        if "password" in update_data:
            new_password = update_data.pop("password")
            if new_password:
                update_data["hashed_password"] = security.get_password_hash(new_password)

        # Apply updates to user object
        for field, value in update_data.items():
            setattr(user, field, value)

        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    except HTTPException:
        raise
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error updating user {user_id}: {type(e).__name__}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


@router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """
    Soft delete a user by deactivating their account (admin only).

    Sets the user's is_active flag to False instead of hard deletion.
    Cannot delete superuser accounts.

    Args:
        user_id: The unique identifier of the user to delete
        current_user: Admin user performing the operation

    Returns:
        Success message

    Raises:
        HTTPException: If user not found or cannot be deleted
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ERROR_USER_NOT_FOUND
            )

        if user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_CANNOT_DELETE_SUPERUSER
            )

        user.is_active = False
        db.add(user)
        db.commit()
        return {"message": "User deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error deleting user {user_id}: {type(e).__name__}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )


@router.patch("/{user_id}/toggle-status", response_model=UserResponse)
def toggle_user_status(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """
    Toggle a user's active status (admin only).

    Switches the user's is_active flag between true and false.
    Cannot modify superuser accounts.

    Args:
        user_id: The unique identifier of the user to toggle
        current_user: Admin user performing the operation

    Returns:
        Updated user data with new status

    Raises:
        HTTPException: If user not found or cannot be modified
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ERROR_USER_NOT_FOUND
            )

        if user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_CANNOT_MODIFY_SUPERUSER
            )

        user.is_active = not user.is_active
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    except HTTPException:
        raise
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Error toggling user status {user_id}: {type(e).__name__}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_DATABASE_OPERATION
        )
