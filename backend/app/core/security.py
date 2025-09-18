from datetime import datetime, timedelta
from typing import Any, Union, Dict, Optional
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings
from app.utils.security_utils import hash_password_secure, verify_password_secure

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(
    data: Dict[str, Any] = None, 
    subject: Union[str, Any] = None, 
    expires_delta: timedelta = None
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
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using enhanced security utilities"""
    # Try enhanced verification first, fallback to passlib
    try:
        return verify_password_secure(plain_password, hashed_password)
    except:
        return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash password using enhanced security utilities"""
    # Use enhanced hashing for new passwords
    try:
        return hash_password_secure(password)
    except:
        return pwd_context.hash(password)


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.JWTError:
        return None


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode access token and return payload"""
    return verify_token(token)