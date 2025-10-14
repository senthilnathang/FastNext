"""
User Repository Interface
Abstract interface for user data access
"""

from abc import ABC, abstractmethod
from typing import List, Optional

from app.domain.entities.user import User
from app.domain.value_objects.email import Email


class UserRepository(ABC):
    """Abstract repository interface for user data access"""

    @abstractmethod
    async def get_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        pass

    @abstractmethod
    async def get_by_email(self, email: Email) -> Optional[User]:
        """Get user by email"""
        pass

    @abstractmethod
    async def create(self, user: User) -> User:
        """Create a new user"""
        pass

    @abstractmethod
    async def update(self, user: User) -> User:
        """Update an existing user"""
        pass

    @abstractmethod
    async def delete(self, user_id: int) -> bool:
        """Delete a user"""
        pass

    @abstractmethod
    async def list_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        """List all users with pagination"""
        pass

    @abstractmethod
    async def count_active(self) -> int:
        """Count active users"""
        pass
