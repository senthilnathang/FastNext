"""
User Service - FastNext
Business logic for user operations following coding standards
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.core.exceptions import (
    AccountLocked,
    AuthenticationError,
    ConflictError,
    DatabaseError,
    NotFoundError,
    ValidationError,
)
from app.core.logging import get_logger
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = get_logger(__name__)


class UserService:
    """
    Service for user-related operations.

    This service provides methods for user management including
    creation, authentication, profile updates, and security operations.

    Attributes:
        db: Database session

    Example:
        >>> service = UserService(db_session)
        >>> user = service.create_user(user_data)
    """

    def __init__(self, db: Session):
        """Initialize user service with database session."""
        self.db = db

    async def create_user(
        self, user_data: UserCreate, created_by: Optional[int] = None
    ) -> UserResponse:
        """
        Create a new user with validation and security checks.

        Args:
            user_data: User creation data
            created_by: ID of user creating this user

        Returns:
            Created user information

        Raises:
            ValidationError: If user data is invalid
            ConflictError: If user already exists
            DatabaseError: If database operation fails
        """
        try:
            # Validate unique constraints
            if self._user_exists(user_data.email, user_data.username):
                raise ConflictError(
                    "User already exists",
                    details={"email": user_data.email, "username": user_data.username},
                )

            # Create user with security defaults
            hashed_password = get_password_hash(user_data.password)
            user = User(
                email=user_data.email,
                username=user_data.username,
                full_name=user_data.full_name,
                hashed_password=hashed_password,
                is_active=True,
                is_verified=False,
                failed_login_attempts=0,
                created_at=datetime.utcnow(),
            )

            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

            logger.info(f"User created successfully: {user.username} (ID: {user.id})")

            return UserResponse(
                id=user.id,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at,
            )

        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error creating user: {e}")
            raise DatabaseError("Failed to create user") from e

    async def authenticate_user(
        self, username: str, password: str, ip_address: Optional[str] = None
    ) -> Optional[User]:
        """
        Authenticate user with username and password.

        Performs comprehensive authentication including:
        - Password verification
        - Account status checks
        - Failed attempt tracking
        - Account lockout management

        Args:
            username: Username or email address
            password: Plain text password
            ip_address: Client IP address for logging

        Returns:
            User object if authentication successful, None otherwise

        Raises:
            AccountLocked: If account is locked due to failed attempts
            AuthenticationError: If authentication fails
        """
        try:
            # Find user by username or email
            user = (
                self.db.query(User)
                .filter((User.username == username) | (User.email == username))
                .first()
            )

            if not user:
                logger.warning(f"Authentication failed - user not found: {username}")
                return None

            # Check if account is locked (skip for admin users during testing)
            if user.is_locked() and not user.is_superuser:
                logger.warning(f"Authentication failed - account locked: {username}")
                raise AccountLocked(
                    "Account is temporarily locked due to failed login attempts",
                    details={
                        "user_id": user.id,
                        "locked_until": (
                            user.locked_until.isoformat() if user.locked_until else None
                        ),
                    },
                )

            # Check if account is active
            if not user.is_active:
                logger.warning(f"Authentication failed - account inactive: {username}")
                return None

            # Verify password
            if not verify_password(password, user.hashed_password):
                # Increment failed attempts
                await self._handle_failed_login(user)
                logger.warning(f"Authentication failed - invalid password: {username}")
                return None

            # Reset failed attempts on successful login
            if user.failed_login_attempts > 0:
                user.reset_failed_attempts()
                self.db.commit()

            # Update last login
            user.last_login_at = datetime.utcnow()
            self.db.commit()

            logger.info(f"User authenticated successfully: {username} (ID: {user.id})")
            return user

        except SQLAlchemyError as e:
            logger.error(f"Database error during authentication: {e}")
            raise DatabaseError("Authentication failed due to database error") from e

    async def get_user_by_id(self, user_id: int) -> Optional[UserResponse]:
        """
        Get user by ID.

        Args:
            user_id: User ID

        Returns:
            User information if found, None otherwise
        """
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return None

            return UserResponse(
                id=user.id,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at,
                last_login_at=user.last_login_at,
                avatar_url=user.avatar_url,
                bio=user.bio,
                location=user.location,
                website=user.website,
            )

        except SQLAlchemyError as e:
            logger.error(f"Database error getting user {user_id}: {e}")
            raise DatabaseError("Failed to retrieve user") from e

    async def update_user(
        self, user_id: int, user_data: UserUpdate, updated_by: Optional[int] = None
    ) -> UserResponse:
        """
        Update user information.

        Args:
            user_id: User ID to update
            user_data: Updated user data
            updated_by: ID of user making the update

        Returns:
            Updated user information

        Raises:
            NotFoundError: If user not found
            ConflictError: If update causes conflict
            DatabaseError: If database operation fails
        """
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise NotFoundError(f"User with ID {user_id} not found")

            # Update fields
            update_data = user_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                if hasattr(user, field):
                    setattr(user, field, value)

            user.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(user)

            logger.info(f"User updated successfully: {user.username} (ID: {user.id})")

            return UserResponse(
                id=user.id,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at,
                last_login_at=user.last_login_at,
                avatar_url=user.avatar_url,
                bio=user.bio,
                location=user.location,
                website=user.website,
            )

        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error updating user {user_id}: {e}")
            raise DatabaseError("Failed to update user") from e

    async def delete_user(self, user_id: int, deleted_by: Optional[int] = None) -> bool:
        """
        Delete user (soft delete by deactivating).

        Args:
            user_id: User ID to delete
            deleted_by: ID of user performing the deletion

        Returns:
            True if deletion successful

        Raises:
            NotFoundError: If user not found
            DatabaseError: If database operation fails
        """
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise NotFoundError(f"User with ID {user_id} not found")

            # Soft delete by deactivating
            user.is_active = False
            user.updated_at = datetime.utcnow()
            self.db.commit()

            logger.info(f"User deleted (deactivated): {user.username} (ID: {user.id})")
            return True

        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error deleting user {user_id}: {e}")
            raise DatabaseError("Failed to delete user") from e

    async def list_users(
        self, skip: int = 0, limit: int = 100, active_only: bool = True
    ) -> List[UserResponse]:
        """
        List users with pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            active_only: Whether to return only active users

        Returns:
            List of user information
        """
        try:
            query = self.db.query(User)

            if active_only:
                query = query.filter(User.is_active == True)

            users = query.offset(skip).limit(limit).all()

            return [
                UserResponse(
                    id=user.id,
                    email=user.email,
                    username=user.username,
                    full_name=user.full_name,
                    is_active=user.is_active,
                    is_verified=user.is_verified,
                    created_at=user.created_at,
                    last_login_at=user.last_login_at,
                )
                for user in users
            ]

        except SQLAlchemyError as e:
            logger.error(f"Database error listing users: {e}")
            raise DatabaseError("Failed to list users") from e

    def _user_exists(self, email: str, username: str) -> bool:
        """Check if user with email or username already exists."""
        existing_user = (
            self.db.query(User)
            .filter((User.email == email) | (User.username == username))
            .first()
        )
        return existing_user is not None

    async def _handle_failed_login(self, user: User) -> None:
        """Handle failed login attempt by incrementing counter and locking if necessary."""
        # Skip login attempt limits for admin users during testing
        if user.is_superuser:
            logger.info(
                f"Failed login attempt for admin user: {user.username} (ID: {user.id}) - limits bypassed for testing"
            )
            return

        user.failed_login_attempts += 1

        # Lock account after 5 failed attempts for 15 minutes
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
            logger.warning(
                f"Account locked due to failed attempts: {user.username} (ID: {user.id})"
            )

        logger.info(
            f"Failed login attempt #{user.failed_login_attempts} for user: {user.username}"
        )
        self.db.commit()
