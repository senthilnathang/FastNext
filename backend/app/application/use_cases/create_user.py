"""
Create User Use Case
Business logic for creating a new user
"""
from dataclasses import dataclass
from typing import Optional
from app.domain.entities.user import User
from app.domain.value_objects.email import Email
from app.domain.repositories.user_repository import UserRepository


@dataclass
class CreateUserCommand:
    """Command for creating a new user"""
    email: str
    full_name: str
    password: str


class CreateUserUseCase:
    """Use case for creating a new user"""
    
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
    
    async def execute(self, command: CreateUserCommand) -> User:
        """
        Execute the create user use case
        
        Args:
            command: Create user command
            
        Returns:
            User: Created user
            
        Raises:
            ValueError: If email already exists or invalid data
        """
        # Create email value object (validates format)
        email = Email(command.email)
        
        # Check if user already exists
        existing_user = await self.user_repository.get_by_email(email)
        if existing_user:
            raise ValueError(f"User with email {email} already exists")
        
        # Validate full name
        if not command.full_name.strip():
            raise ValueError("Full name is required")
        
        # Create user entity
        user = User(
            id=None,  # Will be set by repository
            email=email,
            full_name=command.full_name.strip(),
            is_active=True,
            is_verified=False
        )
        
        # Save user through repository
        created_user = await self.user_repository.create(user)
        
        # TODO: Send welcome email event
        # TODO: Log user creation event
        
        return created_user