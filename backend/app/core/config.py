"""Application configuration using Pydantic Settings"""

import secrets
from pathlib import Path
from typing import Any, List, Optional, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Default secret key that must be changed in production
_DEFAULT_SECRET_KEY = "your-super-secret-key-change-this-in-production"


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    PROJECT_NAME: str = "FastVue Framework"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = ""  # Must be set via environment variable in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database - PostgreSQL
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_USER: str = "fastvue"
    POSTGRES_PASSWORD: str = "fastvue123"
    POSTGRES_DB: str = "fastvue"
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_URL: Optional[str] = None

    # Cache
    CACHE_ENABLED: bool = True
    CACHE_DEFAULT_TTL: int = 300  # 5 minutes

    # CORS - stored as comma-separated string, parsed to list
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:5175,http://localhost:5176,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:5175,http://127.0.0.1:5176"
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: str = "GET,POST,PUT,DELETE,OPTIONS,PATCH"
    CORS_ALLOW_HEADERS: str = "Content-Type,Authorization,X-Requested-With,X-Company-ID,X-Request-ID"
    CORS_EXPOSE_HEADERS: str = "X-Request-ID,X-Rate-Limit-Remaining,X-Rate-Limit-Reset"
    CORS_MAX_AGE: int = 3600  # 1 hour

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        if not self.BACKEND_CORS_ORIGINS:
            return []
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]

    # OAuth2 Social Authentication
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_CLIENT_SECRET: Optional[str] = None
    OAUTH_REDIRECT_URL: str = "http://localhost:3000/auth/callback"

    # Two-Factor Authentication
    TWO_FACTOR_ISSUER: str = "FastVue"

    # Frontend URL (for email links)
    FRONTEND_URL: str = "http://localhost:5173"

    # Email/SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@fastvue.com"
    SMTP_FROM_NAME: str = "FastVue Framework"
    EMAILS_FROM_EMAIL: str = "noreply@fastvue.com"  # Alias for email service

    # Logging
    LOG_LEVEL: str = "INFO"
    ACTIVITY_LOGGING_ENABLED: bool = True
    AUDIT_TRAIL_ENABLED: bool = True

    # Enhanced Audit Trail Configuration
    MESSAGE_NOTIFICATIONS_ENABLED: bool = True
    AUDIT_TRAIL_MAX_ENTRIES: int = 1000
    LOG_SENSITIVE_CHANGES: bool = False
    SENSITIVE_FIELDS: str = "password,secret_key,api_key,token"
    AUTO_NOTIFY_USERS: bool = False
    DEFAULT_ACTIVITY_LEVEL: str = "INFO"
    DETAILED_CHANGE_TRACKING: bool = True

    # Performance Settings
    ENABLE_GZIP_COMPRESSION: bool = True
    GZIP_MINIMUM_SIZE: int = 1000
    MAX_CONCURRENT_CONNECTIONS: int = 100

    # File Storage
    STORAGE_BACKEND: str = "local"  # "local" or "s3"
    STORAGE_LOCAL_PATH: str = "./uploads"
    STORAGE_URL_PREFIX: str = "/uploads"

    # S3 Storage (when STORAGE_BACKEND=s3)
    S3_BUCKET: Optional[str] = None
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_ENDPOINT_URL: Optional[str] = None  # For S3-compatible services like MinIO

    # Attachment Limits
    ATTACHMENT_MAX_SIZE: int = 10 * 1024 * 1024  # 10MB
    ATTACHMENT_ALLOWED_TYPES: str = "image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,application/json,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    @property
    def allowed_attachment_types(self) -> list[str]:
        """Parse allowed attachment types from comma-separated string"""
        return [t.strip() for t in self.ATTACHMENT_ALLOWED_TYPES.split(",") if t.strip()]

    # Push Notifications (Web Push / VAPID)
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_CLAIMS_EMAIL: str = "mailto:admin@fastvue.com"
    PUSH_ENABLED: bool = False

    # Email Notifications
    EMAIL_NOTIFICATIONS_ENABLED: bool = True
    EMAIL_DIGEST_ENABLED: bool = True
    EMAIL_DIGEST_HOUR: int = 9  # Hour of day to send daily digest (0-23)

    # Notification Defaults
    NOTIFICATION_SOUND_ENABLED: bool = True
    NOTIFICATION_DESKTOP_ENABLED: bool = True

    # Performance
    WORKERS: int = 1
    MAX_CONNECTIONS: int = 1000

    # Database Connection Pool
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600  # Recycle connections after 1 hour

    # Module System
    MODULES_DIR: str = "modules"  # Built-in modules directory
    ADDONS_PATHS: str = ""  # Additional addon paths (comma-separated)
    INSTALLED_MODULES: str = "base"  # Active modules (comma-separated)
    AUTO_DISCOVER_MODULES: bool = True  # Auto-discover modules on startup
    MODULE_UPLOAD_DIR: str = "uploads/modules"  # Directory for uploaded module ZIPs
    MODULES_ENABLED: bool = True  # Enable/disable module system

    @property
    def addon_paths_list(self) -> List[str]:
        """Parse addon paths from comma-separated string"""
        paths = [self.MODULES_DIR]
        if self.ADDONS_PATHS:
            paths.extend([p.strip() for p in self.ADDONS_PATHS.split(",") if p.strip()])
        return paths

    @property
    def all_addon_paths(self) -> List[Path]:
        """Get all addon paths as Path objects"""
        return [Path(p) for p in self.addon_paths_list]

    @property
    def installed_modules_list(self) -> List[str]:
        """Parse installed modules from comma-separated string"""
        if not self.INSTALLED_MODULES:
            return ["base"]
        return [m.strip() for m in self.INSTALLED_MODULES.split(",") if m.strip()]

    @property
    def DATABASE_HOST(self) -> str:
        """Database host for display purposes"""
        return f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    def model_post_init(self, __context) -> None:
        """Build database and redis URLs from components, validate security settings"""
        # Enforce DEBUG=False in production
        if self.ENVIRONMENT == "production":
            object.__setattr__(self, 'DEBUG', False)

        # SECRET_KEY validation
        if self.ENVIRONMENT == "production":
            if not self.SECRET_KEY or self.SECRET_KEY == _DEFAULT_SECRET_KEY:
                raise ValueError(
                    "SECRET_KEY must be set to a secure value in production! "
                    "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
                )
        elif not self.SECRET_KEY:
            # Auto-generate secure key for development
            object.__setattr__(self, 'SECRET_KEY', secrets.token_urlsafe(32))

        if not self.SQLALCHEMY_DATABASE_URI:
            self.SQLALCHEMY_DATABASE_URI = (
                f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )

        if not self.REDIS_URL:
            if self.REDIS_PASSWORD:
                self.REDIS_URL = (
                    f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
                )
            else:
                self.REDIS_URL = f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
