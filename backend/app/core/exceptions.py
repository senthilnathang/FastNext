"""
FastNext Core Exceptions
Custom exception classes following coding standards
"""

from typing import Any, Dict, Optional


class FastNextException(Exception):
    """Base exception for FastNext application."""
    
    def __init__(
        self, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None
    ):
        self.message = message
        self.details = details or {}
        self.error_code = error_code or self.__class__.__name__.upper()
        super().__init__(self.message)


class ValidationError(FastNextException):
    """Raised when input validation fails."""
    pass


class AuthenticationError(FastNextException):
    """Raised when authentication fails."""
    pass


class AuthorizationError(FastNextException):
    """Raised when authorization fails."""
    pass


class SecurityError(FastNextException):
    """Base security exception."""
    pass


class RateLimitExceeded(SecurityError):
    """Raised when rate limit is exceeded."""
    pass


class SuspiciousActivity(SecurityError):
    """Raised when suspicious activity is detected."""
    pass


class AccountLocked(AuthenticationError):
    """Raised when user account is locked."""
    pass


class TokenExpired(AuthenticationError):
    """Raised when JWT token is expired."""
    pass


class ConflictError(FastNextException):
    """Raised when a conflict occurs (e.g., duplicate resource)."""
    pass


class NotFoundError(FastNextException):
    """Raised when a resource is not found."""
    pass


class DatabaseError(FastNextException):
    """Raised when database operation fails."""
    pass


class ExternalServiceError(FastNextException):
    """Raised when external service call fails."""
    pass


class ConfigurationError(FastNextException):
    """Raised when configuration is invalid."""
    pass


class BusinessLogicError(FastNextException):
    """Raised when business logic validation fails."""
    pass