"""
Enhanced Security Utilities - FastNext (Based on CodeSecAI)
Comprehensive security functions including threat detection, encryption, and monitoring
"""

import base64
import hashlib
import hmac
import ipaddress
import re
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from urllib.parse import urlparse

import bcrypt
from app.core.config import settings
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from email_validator import EmailNotValidError, validate_email
from fastapi import HTTPException, Request, status


class SecurityValidator:
    """Security validation utilities"""

    # Common malicious patterns
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe[^>]*>.*?</iframe>",
        r"<object[^>]*>.*?</object>",
        r"<embed[^>]*>.*?</embed>",
        r"<link[^>]*>",
        r"<meta[^>]*>",
        r"data:.*base64",
        r"vbscript:",
    ]

    SQL_INJECTION_PATTERNS = [
        r"union\s+select",
        r"drop\s+table",
        r"delete\s+from",
        r"insert\s+into",
        r"update\s+.*\s+set",
        r"exec\s*\(",
        r"sp_\w+",
        r"xp_\w+",
        r"--\s*$",
        r"/\*.*\*/",
        r";\s*--",
        r";\s*/\*",
    ]

    PATH_TRAVERSAL_PATTERNS = [
        r"\.\./.*\.\.",
        r"\.\.\\.*\.\.",
        r"%2e%2e%2f",
        r"%2e%2e\\",
        r"\.\.%2f",
        r"\.\.%5c",
    ]

    COMMAND_INJECTION_PATTERNS = [
        r";\s*\w+",
        r"\|\s*\w+",
        r"&&\s*\w+",
        r"\$\(\w+\)",
        r"`\w+`",
        r"eval\s*\(",
        r"exec\s*\(",
        r"system\s*\(",
        r"shell_exec\s*\(",
    ]

    def __init__(self):
        self.compiled_patterns = {
            "xss": [
                re.compile(pattern, re.IGNORECASE | re.DOTALL)
                for pattern in self.XSS_PATTERNS
            ],
            "sqli": [
                re.compile(pattern, re.IGNORECASE)
                for pattern in self.SQL_INJECTION_PATTERNS
            ],
            "path_traversal": [
                re.compile(pattern, re.IGNORECASE)
                for pattern in self.PATH_TRAVERSAL_PATTERNS
            ],
            "command_injection": [
                re.compile(pattern, re.IGNORECASE)
                for pattern in self.COMMAND_INJECTION_PATTERNS
            ],
        }

    def validate_input(
        self, input_string: str, check_types: List[str] = None
    ) -> Dict[str, bool]:
        """
        Validate input against various attack patterns

        Args:
            input_string: The string to validate
            check_types: List of check types ['xss', 'sqli', 'path_traversal', 'command_injection']

        Returns:
            Dict with validation results
        """
        # Ensure input_string is a string
        if isinstance(input_string, bytes):
            input_string = input_string.decode('utf-8', errors='ignore')

        if check_types is None:
            check_types = ["xss", "sqli", "path_traversal", "command_injection"]

        results = {}

        for check_type in check_types:
            if check_type in self.compiled_patterns:
                patterns = self.compiled_patterns[check_type]
                try:
                    results[check_type] = not any(
                        pattern.search(input_string) for pattern in patterns
                    )
                except (TypeError, AttributeError):
                    # If there's an issue with pattern matching, consider it safe
                    results[check_type] = True
            else:
                results[check_type] = True

        return results

    def is_safe_input(self, input_string: str, check_types: List[str] = None) -> bool:
        """Check if input is safe (no malicious patterns detected)"""
        # Ensure input_string is a string
        if isinstance(input_string, bytes):
            input_string = input_string.decode('utf-8', errors='ignore')

        results = self.validate_input(input_string, check_types)
        return all(results.values())

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and other attacks"""
        # Remove path components
        filename = filename.split("/")[-1].split("\\")[-1]

        # Remove dangerous characters
        filename = re.sub(r'[<>:"|?*]', "", filename)

        # Remove leading dots and spaces
        filename = filename.lstrip(". ")

        # Ensure filename is not empty and not too long
        if not filename or len(filename) > 255:
            filename = f"file_{secrets.token_hex(8)}"

        return filename

    def validate_url(self, url: str, allowed_schemes: Set[str] = None) -> bool:
        """Validate URL to prevent SSRF attacks"""
        if allowed_schemes is None:
            allowed_schemes = {"http", "https"}

        try:
            parsed = urlparse(url)

            # Check scheme
            if parsed.scheme not in allowed_schemes:
                return False

            # Check for localhost/private IPs
            if parsed.hostname:
                try:
                    ip = ipaddress.ip_address(parsed.hostname)
                    if ip.is_private or ip.is_loopback or ip.is_link_local:
                        return False
                except ValueError:
                    # Not an IP address, check for localhost
                    if parsed.hostname.lower() in ["localhost", "127.0.0.1", "::1"]:
                        return False

            return True
        except Exception:
            return False

    def generate_secure_token(self, length: int = 32) -> str:
        """Generate a cryptographically secure random token"""
        return secrets.token_urlsafe(length)

    def hash_sensitive_data(self, data: str, salt: str = None) -> str:
        """Hash sensitive data with optional salt"""
        if salt is None:
            salt = secrets.token_hex(16)

        combined = f"{salt}{data}"
        hashed = hashlib.sha256(combined.encode()).hexdigest()
        return f"{salt}:{hashed}"

    def verify_hashed_data(self, data: str, hashed_data: str) -> bool:
        """Verify data against its hash"""
        try:
            salt, expected_hash = hashed_data.split(":", 1)
            combined = f"{salt}{data}"
            actual_hash = hashlib.sha256(combined.encode()).hexdigest()
            return actual_hash == expected_hash
        except ValueError:
            return False


class SecurityError(Exception):
    """Base security exception"""

    pass


class ValidationError(SecurityError):
    """Input validation error"""

    pass


class CryptographyError(SecurityError):
    """Cryptographic operation error"""

    pass


def generate_secure_password(length: int = 16, include_symbols: bool = True) -> str:
    """
    Generate cryptographically secure random password

    Args:
        length: Password length (minimum 8)
        include_symbols: Whether to include special characters

    Returns:
        Generated password string
    """
    if length < 8:
        raise ValueError("Password length must be at least 8 characters")

    lowercase = "abcdefghijklmnopqrstuvwxyz"
    uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    digits = "0123456789"
    symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?" if include_symbols else ""

    all_chars = lowercase + uppercase + digits + symbols

    # Ensure at least one character from each required set
    password = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
    ]

    if include_symbols:
        password.append(secrets.choice(symbols))

    # Fill remaining length with random characters
    for _ in range(length - len(password)):
        password.append(secrets.choice(all_chars))

    # Shuffle the password
    secrets.SystemRandom().shuffle(password)
    return "".join(password)


def calculate_password_strength(password: str) -> Dict[str, Any]:
    """
    Calculate password strength score and analysis

    Args:
        password: Password to analyze

    Returns:
        Dictionary with strength analysis
    """
    if not password:
        return {
            "score": 0,
            "strength": "very_weak",
            "feedback": ["Password is required"],
        }

    score = 0
    feedback = []
    requirements_met = []

    # Length scoring
    length = len(password)
    if length >= 8:
        score += 20
        requirements_met.append("minimum_length")
    else:
        feedback.append("Password should be at least 8 characters long")

    if length >= 12:
        score += 10
        requirements_met.append("recommended_length")

    # Character variety scoring
    if re.search(r"[a-z]", password):
        score += 10
        requirements_met.append("lowercase")
    else:
        feedback.append("Add lowercase letters")

    if re.search(r"[A-Z]", password):
        score += 10
        requirements_met.append("uppercase")
    else:
        feedback.append("Add uppercase letters")

    if re.search(r"\d", password):
        score += 10
        requirements_met.append("numbers")
    else:
        feedback.append("Add numbers")

    if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        score += 15
        requirements_met.append("special_characters")
    else:
        feedback.append("Add special characters")

    # Pattern analysis
    if not re.search(r"(.)\1{2,}", password):
        score += 5
        requirements_met.append("no_repetition")
    else:
        feedback.append("Avoid repeated characters")

    # Common pattern detection
    common_patterns = ["123", "abc", "qwerty", "password", "admin"]
    if not any(pattern.lower() in password.lower() for pattern in common_patterns):
        score += 10
        requirements_met.append("no_common_patterns")
    else:
        feedback.append("Avoid common patterns")

    # Determine strength level
    if score < 30:
        strength = "very_weak"
    elif score < 50:
        strength = "weak"
    elif score < 70:
        strength = "fair"
    elif score < 85:
        strength = "strong"
    else:
        strength = "very_strong"

    return {
        "score": min(score, 100),
        "strength": strength,
        "feedback": feedback,
        "requirements_met": requirements_met,
        "length": length,
    }


def hash_password_secure(password: str) -> str:
    """Hash password using bcrypt with secure salt"""
    salt = bcrypt.gensalt(
        rounds=12
    )  # Use 12 rounds for good security/performance balance
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password_secure(password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash"""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def validate_email_address(email: str) -> Tuple[bool, Optional[str]]:
    """
    Validate email address format and security

    Args:
        email: Email address to validate

    Returns:
        Tuple of (is_valid, normalized_email)
    """
    try:
        validated_email = validate_email(email)
        normalized_email = validated_email.email

        # Additional security checks
        suspicious_patterns = [
            r".*\+.*\+.*@",  # Multiple plus signs
            r".*\.{2,}.*@",  # Multiple consecutive dots
            r"^.*[<>].*@",  # Angle brackets
        ]

        for pattern in suspicious_patterns:
            if re.match(pattern, normalized_email):
                return False, None

        return True, normalized_email
    except EmailNotValidError:
        return False, None


def validate_username_secure(username: str) -> Tuple[bool, List[str]]:
    """
    Validate username format and security

    Args:
        username: Username to validate

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []

    if not username:
        errors.append("Username is required")
        return False, errors

    if len(username) < 3:
        errors.append("Username must be at least 3 characters")

    if len(username) > 50:
        errors.append("Username must not exceed 50 characters")

    if not re.match(r"^[a-zA-Z0-9_-]+$", username):
        errors.append(
            "Username can only contain letters, numbers, underscores, and hyphens"
        )

    if username.lower() in ["admin", "administrator", "root", "system", "test", "user"]:
        errors.append("Username is reserved")

    if re.search(r"^[_-]|[_-]$", username):
        errors.append("Username cannot start or end with underscore or hyphen")

    return len(errors) == 0, errors


class EncryptionManager:
    """Manager for encryption and decryption operations"""

    def __init__(self, key: Optional[bytes] = None):
        if key is None:
            key = Fernet.generate_key()
        self.key = key
        self.fernet = Fernet(key)

    @classmethod
    def from_password(cls, password: str, salt: bytes = None) -> "EncryptionManager":
        """Create encryption manager from password"""
        if salt is None:
            salt = secrets.token_bytes(16)

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return cls(key)

    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext string"""
        try:
            encrypted = self.fernet.encrypt(plaintext.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            raise CryptographyError(f"Encryption failed: {e}")

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt ciphertext string"""
        try:
            encrypted = base64.urlsafe_b64decode(ciphertext.encode())
            decrypted = self.fernet.decrypt(encrypted)
            return decrypted.decode()
        except Exception as e:
            raise CryptographyError(f"Decryption failed: {e}")


def generate_csrf_token() -> str:
    """Generate CSRF token"""
    timestamp = str(int(datetime.utcnow().timestamp()))
    random_part = secrets.token_urlsafe(16)
    token_data = f"{timestamp}:{random_part}"

    signature = hmac.new(
        settings.SECRET_KEY.encode(), token_data.encode(), hashlib.sha256
    ).hexdigest()[:16]

    return f"{token_data}:{signature}"


def verify_csrf_token(token: str, max_age: int = 3600) -> bool:
    """Verify CSRF token validity"""
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return False

        timestamp, random_part, signature = parts
        token_data = f"{timestamp}:{random_part}"
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode(), token_data.encode(), hashlib.sha256
        ).hexdigest()[:16]

        if not hmac.compare_digest(signature, expected_signature):
            return False

        token_time = datetime.fromtimestamp(int(timestamp))
        if datetime.utcnow() - token_time > timedelta(seconds=max_age):
            return False

        return True
    except (ValueError, TypeError):
        return False


def get_client_ip_enhanced(request: Request) -> str:
    """Extract client IP with enhanced proxy support"""
    headers = request.headers

    # Check forwarded headers in order of preference
    forwarded_headers = [
        "x-forwarded-for",
        "x-real-ip",
        "x-client-ip",
        "cf-connecting-ip",
    ]

    for header in forwarded_headers:
        ip = headers.get(header)
        if ip:
            ip = ip.split(",")[0].strip()
            if is_valid_ip_address(ip):
                return ip

    return request.client.host if request.client else "unknown"


def is_valid_ip_address(ip_string: str) -> bool:
    """Validate IP address format"""
    try:
        ipaddress.ip_address(ip_string)
        return True
    except ValueError:
        return False


def calculate_ip_risk_score(ip_address: str, geo_data: Optional[Dict] = None) -> int:
    """Calculate risk score for IP address"""
    risk_score = 0

    try:
        ip = ipaddress.ip_address(ip_address)
        if not ip.is_private:
            risk_score += 10
    except ValueError:
        risk_score += 50  # Invalid IP format

    if geo_data:
        high_risk_countries = ["CN", "RU", "KP", "IR"]
        if geo_data.get("country_code") in high_risk_countries:
            risk_score += 30

        if geo_data.get("is_anonymous_proxy"):
            risk_score += 25

        if geo_data.get("is_satellite_provider"):
            risk_score += 15

    return min(risk_score, 100)


def detect_suspicious_patterns(content: str) -> List[str]:
    """Detect suspicious patterns in content"""
    suspicious_indicators = []

    # Excessive special characters
    if len(re.findall(r'[<>&"\\\']', content)) > 10:
        suspicious_indicators.append("excessive_special_chars")

    # Very long parameter values
    if any(
        len(param.split("=")[1]) > 1000 for param in content.split("&") if "=" in param
    ):
        suspicious_indicators.append("long_parameters")

    # Multiple encoded characters
    if content.count("%") > 20:
        suspicious_indicators.append("excessive_encoding")

    # Suspicious file extensions
    if any(ext in content.lower() for ext in [".asp", ".jsp", ".php", ".cgi"]):
        suspicious_indicators.append("suspicious_extensions")

    # Base64 patterns (potential payload)
    if len(re.findall(r"[A-Za-z0-9+/]{50,}={0,2}", content)) > 0:
        suspicious_indicators.append("base64_payload")

    return suspicious_indicators


def mask_sensitive_data(data: str, mask_char: str = "*", visible_chars: int = 4) -> str:
    """Mask sensitive data for logging"""
    if len(data) <= visible_chars:
        return mask_char * len(data)

    visible = data[: visible_chars // 2] + data[-(visible_chars // 2) :]
    masked_length = len(data) - visible_chars

    return (
        data[: visible_chars // 2]
        + mask_char * masked_length
        + data[-(visible_chars // 2) :]
    )


def secure_compare(a: str, b: str) -> bool:
    """Secure string comparison to prevent timing attacks"""
    return hmac.compare_digest(a.encode(), b.encode())


def generate_api_key(prefix: str = "fn") -> str:
    """Generate API key with prefix"""
    random_part = secrets.token_urlsafe(32)
    return f"{prefix}_{random_part}"


def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token"""
    return secrets.token_urlsafe(length)


class RateLimitTracker:
    """In-memory rate limit tracker"""

    def __init__(self):
        self.counters = {}
        self.windows = {}

    def is_allowed(self, identifier: str, limit: int, window: int) -> Tuple[bool, int]:
        """Check if request is allowed under rate limit"""
        now = datetime.utcnow().timestamp()

        # Clean old entries
        if identifier in self.windows:
            self.windows[identifier] = [
                timestamp
                for timestamp in self.windows[identifier]
                if now - timestamp < window
            ]
        else:
            self.windows[identifier] = []

        current_count = len(self.windows[identifier])

        if current_count >= limit:
            return False, 0

        # Add current request
        self.windows[identifier].append(now)
        return True, limit - current_count - 1


def validate_request_security(request: Request, check_types: List[str] = None) -> bool:
    """Validate request for security issues"""
    security_validator = SecurityValidator()

    # Check query parameters
    for key, value in request.query_params.items():
        if not security_validator.is_safe_input(value, check_types):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid input detected in parameter: {key}",
            )

    # Check path parameters
    path = str(request.url.path)
    if not security_validator.is_safe_input(path, ["path_traversal"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path detected"
        )

    return True


def get_client_fingerprint(request: Request) -> str:
    """Generate a client fingerprint for session validation"""
    ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "")
    accept_language = request.headers.get("accept-language", "")

    fingerprint_data = f"{ip}:{user_agent}:{accept_language}"
    return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:16]


# Global instances
security_validator = SecurityValidator()
rate_limit_tracker = RateLimitTracker()

# Export main components
__all__ = [
    "SecurityValidator",
    "SecurityError",
    "ValidationError",
    "CryptographyError",
    "EncryptionManager",
    "generate_secure_password",
    "calculate_password_strength",
    "hash_password_secure",
    "verify_password_secure",
    "validate_email_address",
    "validate_username_secure",
    "generate_csrf_token",
    "verify_csrf_token",
    "get_client_ip_enhanced",
    "is_valid_ip_address",
    "calculate_ip_risk_score",
    "detect_suspicious_patterns",
    "mask_sensitive_data",
    "secure_compare",
    "generate_api_key",
    "generate_secure_token",
    "RateLimitTracker",
    "validate_request_security",
    "get_client_fingerprint",
    "security_validator",
    "rate_limit_tracker",
]
