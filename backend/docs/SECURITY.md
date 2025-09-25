# FastNext Backend Security Guide

## Security Overview

The FastNext backend implements comprehensive security measures following industry best practices and security standards. This guide covers authentication, authorization, data protection, and security monitoring.

## Authentication & Authorization

### 1. **JWT Token Authentication**

#### Token Generation
```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

class AuthService:
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    
    def create_access_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> dict:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id: int = payload.get("sub")
            if user_id is None:
                raise JWTError("Invalid token")
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
```

#### Token Security Features
- **Expiration**: Configurable token lifetime (default: 30 minutes)
- **Refresh Tokens**: Long-lived refresh tokens for session management
- **Token Revocation**: Blacklist mechanism for immediate token invalidation
- **Secure Storage**: httpOnly cookies with secure and sameSite flags

### 2. **Password Security**

#### Password Hashing
```python
from passlib.context import CryptContext
from passlib.hash import bcrypt

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # High cost factor for security
)

class PasswordService:
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def validate_password_strength(password: str) -> bool:
        """
        Password requirements:
        - Minimum 8 characters
        - At least one uppercase letter
        - At least one lowercase letter  
        - At least one digit
        - At least one special character
        """
        import re
        return bool(re.match(
            r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$',
            password
        ))
```

#### Password Policies
- **Minimum Length**: 8 characters
- **Complexity**: Mixed case, numbers, special characters
- **History**: Prevent reuse of last 5 passwords
- **Expiration**: Optional password expiration (90 days)
- **Account Lockout**: Lock account after 5 failed attempts

### 3. **Role-Based Access Control (RBAC)**

#### Permission System
```python
from enum import Enum
from typing import List, Set

class PermissionAction(str, Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    MANAGE = "manage"

class Permission:
    def __init__(self, resource: str, action: PermissionAction, scope: str = "global"):
        self.resource = resource
        self.action = action
        self.scope = scope
    
    def __str__(self):
        return f"{self.resource}.{self.action}"

class RBACService:
    def __init__(self):
        self.user_permissions: Dict[int, Set[str]] = {}
    
    async def get_user_permissions(self, user_id: int) -> Set[str]:
        """Get all permissions for a user including role-based permissions"""
        if user_id not in self.user_permissions:
            user = await self.get_user_with_roles(user_id)
            permissions = set()
            
            for role in user.roles:
                for permission in role.permissions:
                    permissions.add(str(permission))
            
            self.user_permissions[user_id] = permissions
        
        return self.user_permissions[user_id]
    
    async def has_permission(self, user_id: int, required_permission: str) -> bool:
        user_permissions = await self.get_user_permissions(user_id)
        return required_permission in user_permissions
    
    async def require_permission(self, user_id: int, permission: str):
        if not await self.has_permission(user_id, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {permission}"
            )
```

#### Permission Decorators
```python
from functools import wraps
from fastapi import Depends, HTTPException, status

def require_permissions(*permissions: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current user from dependencies
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check permissions
            rbac = RBACService()
            for permission in permissions:
                await rbac.require_permission(current_user.id, permission)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Usage in endpoints
@router.get("/admin/users")
@require_permissions("user.read", "admin.access")
async def list_users(current_user: User = Depends(get_current_user)):
    return await user_service.list_users()
```

### 4. **Multi-Factor Authentication (MFA)**

#### TOTP Implementation
```python
import pyotp
import qrcode
from io import BytesIO
import base64

class MFAService:
    @staticmethod
    def generate_secret() -> str:
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(email: str, secret: str) -> str:
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=email,
            issuer_name="FastNext"
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return base64.b64encode(buffer.getvalue()).decode()
    
    @staticmethod
    def verify_totp(secret: str, token: str) -> bool:
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)  # Allow 30 second window
```

#### Backup Codes
```python
import secrets
import string

class BackupCodeService:
    @staticmethod
    def generate_backup_codes(count: int = 10) -> List[str]:
        codes = []
        for _ in range(count):
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) 
                          for _ in range(8))
            # Format as XXXX-XXXX
            formatted_code = f"{code[:4]}-{code[4:]}"
            codes.append(formatted_code)
        return codes
    
    @staticmethod
    def hash_backup_codes(codes: List[str]) -> List[str]:
        return [pwd_context.hash(code) for code in codes]
    
    @staticmethod
    def verify_backup_code(code: str, hashed_codes: List[str]) -> bool:
        for hashed_code in hashed_codes:
            if pwd_context.verify(code, hashed_code):
                return True
        return False
```

## Data Protection

### 1. **Input Validation & Sanitization**

#### Pydantic Validation
```python
from pydantic import BaseModel, validator, Field
from typing import Optional
import re

class UserCreateRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    
    @validator('email')
    def validate_email(cls, v):
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, v):
            raise ValueError('Invalid email format')
        return v.lower()
    
    @validator('full_name')
    def validate_full_name(cls, v):
        # Remove any HTML tags and special characters
        import html
        clean_name = html.escape(v.strip())
        if not re.match(r'^[a-zA-Z\s\-\.\']+$', clean_name):
            raise ValueError('Name contains invalid characters')
        return clean_name
    
    @validator('password')
    def validate_password(cls, v):
        if not PasswordService.validate_password_strength(v):
            raise ValueError('Password does not meet security requirements')
        return v
```

#### SQL Injection Prevention
```python
from sqlalchemy import text
from sqlalchemy.orm import Session

# NEVER DO THIS - Vulnerable to SQL injection
def bad_user_search(db: Session, search_term: str):
    query = f"SELECT * FROM users WHERE name LIKE '%{search_term}%'"
    return db.execute(text(query)).fetchall()

# CORRECT - Use parameterized queries
def safe_user_search(db: Session, search_term: str):
    query = text("SELECT * FROM users WHERE name ILIKE :search")
    return db.execute(query, {"search": f"%{search_term}%"}).fetchall()

# BETTER - Use SQLAlchemy ORM
def orm_user_search(db: Session, search_term: str):
    return db.query(User).filter(User.name.ilike(f"%{search_term}%")).all()
```

### 2. **Data Encryption**

#### Field-Level Encryption
```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

class EncryptionService:
    def __init__(self, password: str):
        salt = os.urandom(16)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        self.cipher_suite = Fernet(key)
    
    def encrypt(self, plaintext: str) -> str:
        return self.cipher_suite.encrypt(plaintext.encode()).decode()
    
    def decrypt(self, ciphertext: str) -> str:
        return self.cipher_suite.decrypt(ciphertext.encode()).decode()

# Usage in models
class SensitiveData(Base):
    __tablename__ = "sensitive_data"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    encrypted_ssn: Mapped[Optional[str]] = mapped_column(Text)
    encrypted_credit_card: Mapped[Optional[str]] = mapped_column(Text)
    
    def set_ssn(self, ssn: str):
        encryption_service = EncryptionService(settings.ENCRYPTION_KEY)
        self.encrypted_ssn = encryption_service.encrypt(ssn)
    
    def get_ssn(self) -> str:
        if self.encrypted_ssn:
            encryption_service = EncryptionService(settings.ENCRYPTION_KEY)
            return encryption_service.decrypt(self.encrypted_ssn)
        return ""
```

#### Database Encryption at Rest
```python
# PostgreSQL with encryption
DATABASE_URL = "postgresql://user:pass@host:5432/db?sslmode=require&sslcert=client.crt&sslkey=client.key&sslrootcert=ca.crt"

# Additional encryption options
engine = create_async_engine(
    DATABASE_URL,
    connect_args={
        "sslmode": "require",
        "sslcert": "/path/to/client.crt",
        "sslkey": "/path/to/client.key",
        "sslrootcert": "/path/to/ca.crt"
    }
)
```

### 3. **Secrets Management**

#### Environment-Based Secrets
```python
from pydantic import BaseSettings, SecretStr

class Settings(BaseSettings):
    secret_key: SecretStr
    database_password: SecretStr
    jwt_secret: SecretStr
    encryption_key: SecretStr
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    def get_secret_value(self, secret_name: str) -> str:
        secret = getattr(self, secret_name, None)
        if isinstance(secret, SecretStr):
            return secret.get_secret_value()
        return secret

# Usage
settings = Settings()
db_password = settings.get_secret_value('database_password')
```

#### AWS Secrets Manager Integration
```python
import boto3
from botocore.exceptions import ClientError

class AWSSecretsManager:
    def __init__(self, region_name: str):
        self.session = boto3.Session()
        self.client = self.session.client(
            service_name='secretsmanager',
            region_name=region_name
        )
    
    def get_secret(self, secret_name: str) -> dict:
        try:
            response = self.client.get_secret_value(SecretId=secret_name)
            return json.loads(response['SecretString'])
        except ClientError as e:
            raise Exception(f"Failed to retrieve secret {secret_name}: {e}")
    
    def create_secret(self, secret_name: str, secret_value: dict):
        try:
            self.client.create_secret(
                Name=secret_name,
                SecretString=json.dumps(secret_value)
            )
        except ClientError as e:
            raise Exception(f"Failed to create secret {secret_name}: {e}")
```

## Security Middleware

### 1. **Security Headers Middleware**

```python
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        
        # Prevent XSS attacks
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Prevent content type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Force HTTPS
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'"
        )
        
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Feature policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=()"
        )
        
        return response
```

### 2. **Rate Limiting Middleware**

```python
import time
from collections import defaultdict
from fastapi import HTTPException, status

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = defaultdict(list)
    
    async def dispatch(self, request: Request, call_next):
        client_ip = self.get_client_ip(request)
        now = time.time()
        
        # Clean old entries
        self.clients[client_ip] = [
            timestamp for timestamp in self.clients[client_ip]
            if now - timestamp < self.period
        ]
        
        # Check rate limit
        if len(self.clients[client_ip]) >= self.calls:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
        
        # Record request
        self.clients[client_ip].append(now)
        
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.calls)
        response.headers["X-RateLimit-Remaining"] = str(
            self.calls - len(self.clients[client_ip])
        )
        response.headers["X-RateLimit-Reset"] = str(
            int(now + self.period)
        )
        
        return response
    
    def get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host
```

### 3. **Request Logging Middleware**

```python
import logging
import time
from uuid import uuid4

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid4())
        start_time = time.time()
        
        # Add request ID to request state
        request.state.request_id = request_id
        
        # Log request
        logger.info(
            "Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "client_ip": self.get_client_ip(request),
                "user_agent": request.headers.get("User-Agent", ""),
            }
        )
        
        try:
            response = await call_next(request)
            duration = time.time() - start_time
            
            # Log response
            logger.info(
                "Request completed",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "duration": duration,
                }
            )
            
            response.headers["X-Request-ID"] = request_id
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Log error
            logger.error(
                "Request failed",
                extra={
                    "request_id": request_id,
                    "error": str(e),
                    "duration": duration,
                }
            )
            raise
```

## Security Monitoring

### 1. **Audit Logging**

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import JSONB

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100))
    resource_type: Mapped[str] = mapped_column(String(50))
    resource_id: Mapped[Optional[str]] = mapped_column(String(100))
    old_values: Mapped[Optional[dict]] = mapped_column(JSON)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    timestamp: Mapped[datetime] = mapped_column(default=func.now())
    success: Mapped[bool] = mapped_column(default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text)

class AuditLogger:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        user_id: Optional[int],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error_message
        )
        db.add(audit_log)
        await db.commit()
```

### 2. **Security Event Detection**

```python
from typing import List, Dict
from datetime import datetime, timedelta

class SecurityEventDetector:
    def __init__(self):
        self.failed_login_attempts = defaultdict(list)
        self.suspicious_ips = set()
    
    async def detect_brute_force(self, ip_address: str, user_email: str) -> bool:
        """Detect brute force login attempts"""
        now = datetime.utcnow()
        key = f"{ip_address}:{user_email}"
        
        # Clean old attempts (last 15 minutes)
        self.failed_login_attempts[key] = [
            attempt for attempt in self.failed_login_attempts[key]
            if now - attempt < timedelta(minutes=15)
        ]
        
        # Add current attempt
        self.failed_login_attempts[key].append(now)
        
        # Check if threshold exceeded (5 attempts in 15 minutes)
        if len(self.failed_login_attempts[key]) >= 5:
            await self.alert_security_team("brute_force", {
                "ip_address": ip_address,
                "user_email": user_email,
                "attempts": len(self.failed_login_attempts[key])
            })
            return True
        
        return False
    
    async def detect_unusual_login_location(self, user_id: int, ip_address: str) -> bool:
        """Detect logins from unusual locations"""
        # Get user's login history
        recent_logins = await self.get_recent_logins(user_id, days=30)
        known_locations = {login.country for login in recent_logins}
        
        # Get current location
        current_location = await self.get_ip_location(ip_address)
        
        if current_location not in known_locations:
            await self.alert_security_team("unusual_location", {
                "user_id": user_id,
                "ip_address": ip_address,
                "location": current_location,
                "known_locations": list(known_locations)
            })
            return True
        
        return False
    
    async def detect_privilege_escalation(self, user_id: int, requested_permission: str) -> bool:
        """Detect potential privilege escalation attempts"""
        user_permissions = await self.get_user_permissions(user_id)
        
        # Check if user is requesting permissions they don't have
        if requested_permission not in user_permissions:
            # Check if it's a significant privilege escalation
            admin_permissions = ["admin.manage", "user.delete", "system.configure"]
            if requested_permission in admin_permissions:
                await self.alert_security_team("privilege_escalation", {
                    "user_id": user_id,
                    "requested_permission": requested_permission,
                    "current_permissions": list(user_permissions)
                })
                return True
        
        return False
    
    async def alert_security_team(self, event_type: str, details: dict):
        """Send alert to security team"""
        alert = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "severity": "HIGH",
            "details": details
        }
        
        # Send to monitoring system (e.g., Sentry, Slack, email)
        logger.critical("Security Alert", extra=alert)
        
        # Store in database for investigation
        await self.store_security_alert(alert)
```

### 3. **Intrusion Detection**

```python
import re
from typing import Set

class IntrusionDetectionSystem:
    def __init__(self):
        self.sql_injection_patterns = [
            r"(\bunion\b.*\bselect\b)",
            r"(\bor\b\s+\d+\s*=\s*\d+)",
            r"(\bdrop\b\s+\btable\b)",
            r"(\binsert\b\s+\binto\b)",
            r"(\bdelete\b\s+\bfrom\b)",
            r"(--|\#|\/\*)",
            r"(\bexec\b|\bexecute\b)"
        ]
        
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>",
            r"<object[^>]*>",
            r"<embed[^>]*>"
        ]
        
        self.command_injection_patterns = [
            r"(;|\||&|\$\(|\`)",
            r"(bash|sh|cmd|powershell)",
            r"(wget|curl|nc|netcat)"
        ]
    
    def detect_sql_injection(self, input_data: str) -> bool:
        """Detect potential SQL injection attempts"""
        input_lower = input_data.lower()
        for pattern in self.sql_injection_patterns:
            if re.search(pattern, input_lower, re.IGNORECASE):
                return True
        return False
    
    def detect_xss(self, input_data: str) -> bool:
        """Detect potential XSS attempts"""
        for pattern in self.xss_patterns:
            if re.search(pattern, input_data, re.IGNORECASE):
                return True
        return False
    
    def detect_command_injection(self, input_data: str) -> bool:
        """Detect potential command injection attempts"""
        for pattern in self.command_injection_patterns:
            if re.search(pattern, input_data, re.IGNORECASE):
                return True
        return False
    
    async def analyze_request(self, request_data: dict) -> List[str]:
        """Analyze request for security threats"""
        threats = []
        
        # Check all string values in the request
        for key, value in request_data.items():
            if isinstance(value, str):
                if self.detect_sql_injection(value):
                    threats.append(f"SQL injection detected in {key}")
                
                if self.detect_xss(value):
                    threats.append(f"XSS attempt detected in {key}")
                
                if self.detect_command_injection(value):
                    threats.append(f"Command injection detected in {key}")
        
        return threats
```

## Compliance & Standards

### 1. **GDPR Compliance**

```python
class GDPRCompliance:
    @staticmethod
    async def export_user_data(user_id: int) -> dict:
        """Export all user data for GDPR compliance"""
        db = get_db()
        
        # Get user data
        user = await db.get(User, user_id)
        profile = await db.get(UserProfile, user_id)
        activities = await db.execute(
            select(ActivityLog).where(ActivityLog.user_id == user_id)
        )
        
        return {
            "user_info": {
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None
            },
            "profile": {
                "bio": profile.bio if profile else None,
                "location": profile.location if profile else None,
                "website": profile.website_url if profile else None
            },
            "activities": [
                {
                    "action": activity.action,
                    "timestamp": activity.timestamp.isoformat(),
                    "ip_address": activity.ip_address
                }
                for activity in activities.scalars()
            ]
        }
    
    @staticmethod
    async def anonymize_user_data(user_id: int):
        """Anonymize user data while preserving analytics"""
        db = get_db()
        
        # Anonymize user record
        await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                email=f"deleted_user_{user_id}@anonymized.local",
                full_name="[Deleted User]",
                is_active=False
            )
        )
        
        # Anonymize activity logs
        await db.execute(
            update(ActivityLog)
            .where(ActivityLog.user_id == user_id)
            .values(ip_address="0.0.0.0", user_agent="[Anonymized]")
        )
        
        await db.commit()
    
    @staticmethod
    async def delete_user_data(user_id: int):
        """Complete data deletion for right to be forgotten"""
        db = get_db()
        
        # Delete related data
        await db.execute(delete(ActivityLog).where(ActivityLog.user_id == user_id))
        await db.execute(delete(UserProfile).where(UserProfile.user_id == user_id))
        await db.execute(delete(UserRole).where(UserRole.user_id == user_id))
        
        # Delete user
        await db.execute(delete(User).where(User.id == user_id))
        await db.commit()
```

### 2. **SOX Compliance (Financial Data)**

```python
class SOXCompliance:
    @staticmethod
    async def create_immutable_record(
        user_id: int,
        transaction_type: str,
        amount: Decimal,
        details: dict
    ):
        """Create immutable financial record for SOX compliance"""
        db = get_db()
        
        # Create hash of record for integrity
        record_data = {
            "user_id": user_id,
            "transaction_type": transaction_type,
            "amount": str(amount),
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        record_hash = hashlib.sha256(
            json.dumps(record_data, sort_keys=True).encode()
        ).hexdigest()
        
        financial_record = FinancialRecord(
            user_id=user_id,
            transaction_type=transaction_type,
            amount=amount,
            details=details,
            record_hash=record_hash
        )
        
        db.add(financial_record)
        await db.commit()
        
        return financial_record
    
    @staticmethod
    async def verify_record_integrity(record_id: int) -> bool:
        """Verify financial record hasn't been tampered with"""
        db = get_db()
        record = await db.get(FinancialRecord, record_id)
        
        # Recreate hash
        record_data = {
            "user_id": record.user_id,
            "transaction_type": record.transaction_type,
            "amount": str(record.amount),
            "details": record.details,
            "timestamp": record.created_at.isoformat()
        }
        
        expected_hash = hashlib.sha256(
            json.dumps(record_data, sort_keys=True).encode()
        ).hexdigest()
        
        return record.record_hash == expected_hash
```

## Security Testing

### 1. **Automated Security Tests**

```python
import pytest
from fastapi.testclient import TestClient

class TestSecurity:
    def test_sql_injection_protection(self, client: TestClient):
        """Test SQL injection protection"""
        malicious_inputs = [
            "1' OR '1'='1",
            "1; DROP TABLE users; --",
            "' UNION SELECT * FROM users --"
        ]
        
        for malicious_input in malicious_inputs:
            response = client.get(f"/users/?search={malicious_input}")
            # Should not return sensitive data or error
            assert response.status_code in [200, 400, 422]
            if response.status_code == 200:
                assert "DROP" not in response.text.upper()
    
    def test_xss_protection(self, client: TestClient):
        """Test XSS protection"""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>"
        ]
        
        for payload in xss_payloads:
            response = client.post("/users/", json={
                "email": "test@example.com",
                "full_name": payload,
                "password": "TestPass123!"
            })
            # Should reject or sanitize
            assert response.status_code in [400, 422]
    
    def test_rate_limiting(self, client: TestClient):
        """Test rate limiting"""
        # Make rapid requests
        for i in range(150):  # Exceed rate limit
            response = client.get("/")
            if response.status_code == 429:
                break
        
        # Should be rate limited
        assert response.status_code == 429
        assert "rate limit" in response.json()["detail"].lower()
    
    def test_authentication_required(self, client: TestClient):
        """Test authentication is required for protected endpoints"""
        response = client.get("/users/me")
        assert response.status_code == 401
    
    def test_authorization_enforcement(self, client: TestClient, regular_user_token):
        """Test authorization is enforced"""
        headers = {"Authorization": f"Bearer {regular_user_token}"}
        response = client.get("/admin/users", headers=headers)
        assert response.status_code == 403
```

### 2. **Penetration Testing Checklist**

#### Automated Tools
- **OWASP ZAP**: Web application security scanner
- **Bandit**: Python security linter
- **Safety**: Dependency vulnerability scanner
- **SQLMap**: SQL injection testing tool

#### Manual Testing Areas
- **Authentication bypass**
- **Session management**
- **Input validation**
- **Access control**
- **Business logic flaws**
- **Information disclosure**

## Incident Response

### 1. **Security Incident Response Plan**

```python
class SecurityIncidentResponse:
    @staticmethod
    async def handle_data_breach(incident_details: dict):
        """Handle data breach incident"""
        # 1. Immediate containment
        await SecurityIncidentResponse.contain_breach()
        
        # 2. Assessment
        impact = await SecurityIncidentResponse.assess_impact(incident_details)
        
        # 3. Notification
        if impact["severity"] == "HIGH":
            await SecurityIncidentResponse.notify_authorities()
            await SecurityIncidentResponse.notify_affected_users(impact["affected_users"])
        
        # 4. Documentation
        await SecurityIncidentResponse.document_incident(incident_details, impact)
        
        # 5. Recovery
        await SecurityIncidentResponse.initiate_recovery_plan()
    
    @staticmethod
    async def contain_breach():
        """Immediate breach containment actions"""
        # Revoke all active sessions
        await SessionManager.revoke_all_sessions()
        
        # Enable maintenance mode
        await MaintenanceMode.enable()
        
        # Alert security team
        await SecurityTeam.alert_immediate()
    
    @staticmethod
    async def assess_impact(incident_details: dict) -> dict:
        """Assess the impact of security incident"""
        return {
            "severity": "HIGH",  # LOW, MEDIUM, HIGH, CRITICAL
            "affected_users": [],
            "compromised_data": [],
            "potential_damage": "Data exposure"
        }
```

This comprehensive security guide covers the major security aspects of the FastNext backend. Regularly review and update security measures based on emerging threats and industry best practices.