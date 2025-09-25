"""
User Domain Entity
Pure business object representing a user
"""
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime
from app.domain.value_objects.email import Email


@dataclass
class User:
    """Domain entity representing a user"""
    id: Optional[int]
    email: Email
    full_name: str
    is_active: bool = True
    is_verified: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def activate(self) -> None:
        """Activate the user"""
        self.is_active = True
    
    def deactivate(self) -> None:
        """Deactivate the user"""
        self.is_active = False
        
    def verify_email(self) -> None:
        """Mark user email as verified"""
        self.is_verified = True
    
    def can_access_admin(self) -> bool:
        """Business rule: determine if user can access admin features"""
        return self.is_active and self.is_verified
    
    def update_profile(self, full_name: str, email: Email) -> None:
        """Update user profile information"""
        if not self.is_active:
            raise ValueError("Cannot update inactive user profile")
        
        self.full_name = full_name
        self.email = email
        self.updated_at = datetime.utcnow()