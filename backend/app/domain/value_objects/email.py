"""
Email Value Object
Represents and validates email addresses
"""
import re
from dataclasses import dataclass
from typing import ClassVar


@dataclass(frozen=True)
class Email:
    """Value object for email addresses"""
    
    value: str
    
    # Email validation regex pattern
    EMAIL_PATTERN: ClassVar[re.Pattern] = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    
    def __post_init__(self):
        """Validate email format after initialization"""
        if not self.is_valid():
            raise ValueError(f"Invalid email format: {self.value}")
    
    def is_valid(self) -> bool:
        """Check if email format is valid"""
        return bool(self.EMAIL_PATTERN.match(self.value))
    
    def domain(self) -> str:
        """Get the domain part of the email"""
        return self.value.split('@')[1]
    
    def local_part(self) -> str:
        """Get the local part of the email (before @)"""
        return self.value.split('@')[0]
    
    def __str__(self) -> str:
        """String representation"""
        return self.value