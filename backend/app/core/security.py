"""
Security utilities for authentication, authorization, and password management.

This module provides secure password hashing, JWT token handling, and authentication
utilities with fallback mechanisms for enhanced security.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

from app.core.config import settings
from app.utils.security_utils import hash_password_secure, verify_password_secure
from jose import JWTError, jwt
from passlib.context import CryptContext

# Password hashing context with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(
    data: Optional[Dict[str, Any]] = None,
    subject: Optional[Union[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create JWT access token with enhanced data support

    Args:
        data: Dictionary of data to encode in token (preferred)
        subject: Subject for backward compatibility
        expires_delta: Custom expiration time
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Support both new data format and legacy subject format
    if data:
        to_encode = data.copy()
        to_encode.update({"exp": expire})
    else:
        to_encode = {"exp": expire, "sub": str(subject)}

    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.

    Uses enhanced security utilities first, with fallback to passlib bcrypt.
    This provides better security while maintaining backward compatibility.

    Args:
        plain_password: The plain text password to verify
        hashed_password: The hashed password to compare against

    Returns:
        True if the password matches, False otherwise
    """
    if not plain_password or not hashed_password:
        return False

    # Try enhanced verification first for better security
    try:
        return verify_password_secure(plain_password, hashed_password)
    except Exception as e:
        # Log the fallback but don't expose sensitive information
        print(f"Enhanced password verification failed, using fallback: {type(e).__name__}")
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using secure hashing algorithms.

    Uses enhanced security utilities first, with fallback to bcrypt.
    The enhanced utilities provide additional security features like
    peppering and memory-hard functions.

    Args:
        password: The plain text password to hash

    Returns:
        The hashed password string

    Raises:
        ValueError: If password is empty or None
    """
    if not password or not isinstance(password, str):
        raise ValueError("Password must be a non-empty string")

    # Try enhanced hashing first for better security
    try:
        return hash_password_secure(password)
    except Exception as e:
        # Log the fallback but don't expose sensitive information
        print(f"Enhanced password hashing failed, using fallback: {type(e).__name__}")
        try:
            return pwd_context.hash(password)
        except Exception as fallback_error:
            raise ValueError(f"Password hashing failed: {type(fallback_error).__name__}") from fallback_error


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode a JWT token.

    Args:
        token: The JWT token string to verify

    Returns:
        The decoded token payload as a dictionary, or None if invalid

    Note:
        This function does not check token expiration - use verify_token_with_expiry for that
    """
    if not token or not isinstance(token, str):
        return None

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        # Token is invalid (bad signature, malformed, etc.)
        return None
    except Exception:
        # Other unexpected errors
        return None


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode an access token and return its payload.

    This is an alias for verify_token for backward compatibility.
    For new code, prefer verify_token directly.

    Args:
        token: The JWT access token to decode

    Returns:
        The decoded token payload, or None if invalid
    """
    return verify_token(token)


def verify_token_with_expiry(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify a JWT token and check if it has expired.

    Args:
        token: The JWT token string to verify

    Returns:
        The decoded token payload if valid and not expired, None otherwise
    """
    payload = verify_token(token)
    if not payload:
        return None

    # Check if token has expired
    exp = payload.get('exp')
    if not exp:
        return None

    # Convert to datetime for comparison
    try:
        exp_datetime = datetime.fromtimestamp(exp)
        if exp_datetime < datetime.utcnow():
            return None
    except (ValueError, TypeError):
        return None

    return payload


def validate_password_strength(password: str) -> Dict[str, Any]:
    """
    Validate password strength and return detailed feedback.

    Args:
        password: The password to validate

    Returns:
        Dictionary with validation results and feedback
    """
    if not password:
        return {
            'valid': False,
            'score': 0,
            'feedback': ['Password cannot be empty']
        }

    issues = []
    score = 0

    # Length check
    if len(password) < 8:
        issues.append('Password must be at least 8 characters long')
    elif len(password) >= 12:
        score += 2
    elif len(password) >= 8:
        score += 1

    # Character variety checks
    has_lower = any(c.islower() for c in password)
    has_upper = any(c.isupper() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(not c.isalnum() for c in password)

    if not has_lower:
        issues.append('Password must contain at least one lowercase letter')
    else:
        score += 1

    if not has_upper:
        issues.append('Password must contain at least one uppercase letter')
    else:
        score += 1

    if not has_digit:
        issues.append('Password must contain at least one number')
    else:
        score += 1

    if not has_special:
        issues.append('Password should contain at least one special character')
    else:
        score += 1

    # Common password check (basic)
    common_passwords = ['password', '123456', 'qwerty', 'admin', 'letmein']
    if password.lower() in common_passwords:
        issues.append('Password is too common')
        score = max(0, score - 2)

    return {
        'valid': len(issues) == 0,
        'score': min(5, score),  # Max score of 5
        'strength': 'weak' if score < 2 else 'medium' if score < 4 else 'strong',
        'feedback': issues
    }


def sanitize_token_input(token: str) -> str:
    """
    Sanitize token input to prevent injection attacks.

    Args:
        token: Raw token string

    Returns:
        Sanitized token string
    """
    if not token or not isinstance(token, str):
        return ''

    # Remove any whitespace and control characters
    return ''.join(c for c in token.strip() if c.isprintable())
