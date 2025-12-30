"""Security utilities - JWT, password hashing, 2FA"""

import base64
import io
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import pyotp
import qrcode
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


# JWT Token handling
def create_access_token(
    user_id: int,
    company_id: Optional[int] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT access token"""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }

    if company_id:
        to_encode["company_id"] = company_id

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    user_id: int,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT refresh token"""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError:
        return None


def verify_token(token: str, token_type: str = "access") -> Optional[int]:
    """Verify a JWT token and return user_id"""
    payload = decode_token(token)
    if not payload:
        return None

    if payload.get("type") != token_type:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    return int(user_id)


# Two-Factor Authentication
def generate_totp_secret() -> str:
    """Generate a new TOTP secret"""
    return pyotp.random_base32()


def generate_totp_uri(secret: str, email: str) -> str:
    """Generate TOTP provisioning URI for authenticator apps"""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=settings.TWO_FACTOR_ISSUER)


def generate_qr_code(uri: str) -> str:
    """Generate QR code image as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return base64.b64encode(buffer.getvalue()).decode()


def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code"""
    totp = pyotp.TOTP(secret)
    return totp.verify(code)


def generate_backup_codes(count: int = 10) -> list:
    """Generate backup codes for 2FA recovery"""
    codes = []
    for _ in range(count):
        # Generate 8-character alphanumeric codes
        code = secrets.token_hex(4).upper()
        codes.append(code)
    return codes


def setup_2fa(email: str) -> Tuple[str, str, list]:
    """
    Set up 2FA for a user.
    Returns: (secret, qr_code_base64, backup_codes)
    """
    secret = generate_totp_secret()
    uri = generate_totp_uri(secret, email)
    qr_code = generate_qr_code(uri)
    backup_codes = generate_backup_codes()

    return secret, qr_code, backup_codes


# Password reset tokens
def create_password_reset_token(email: str) -> str:
    """Create a password reset token"""
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    to_encode = {
        "sub": email,
        "exp": expire,
        "type": "password_reset",
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_password_reset_token(token: str) -> Optional[str]:
    """Verify password reset token and return email"""
    payload = decode_token(token)
    if not payload:
        return None

    if payload.get("type") != "password_reset":
        return None

    return payload.get("sub")


# Email verification tokens
def create_email_verification_token(email: str) -> str:
    """Create an email verification token"""
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode = {
        "sub": email,
        "exp": expire,
        "type": "email_verification",
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_email_verification_token(token: str) -> Optional[str]:
    """Verify email verification token and return email"""
    payload = decode_token(token)
    if not payload:
        return None

    if payload.get("type") != "email_verification":
        return None

    return payload.get("sub")
