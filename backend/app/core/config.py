import os
from typing import Any, Dict, List, Optional, Union

from decouple import config
from pydantic import AnyHttpUrl, PostgresDsn, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "FastNext Framework"
    VERSION: str = "1.2.0"
    API_V1_STR: str = "/api/v1"

    # Environment Configuration
    ENVIRONMENT: str = config("ENVIRONMENT", default="development")

    SECRET_KEY: str = config("SECRET_KEY", default="your-secret-key-change-this")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = config("REFRESH_TOKEN_EXPIRE_DAYS", default=30, cast=int)

    # Two-Factor Authentication
    TWO_FACTOR_ISSUER: str = config("TWO_FACTOR_ISSUER", default="FastNext")

    # Frontend URL (for email links)
    FRONTEND_URL: str = config("FRONTEND_URL", default="http://localhost:3000")

    # Database
    POSTGRES_SERVER: str = config("POSTGRES_SERVER", default="localhost")
    POSTGRES_USER: str = config("POSTGRES_USER", default="postgres")
    POSTGRES_PASSWORD: str = config("POSTGRES_PASSWORD", default="password")
    POSTGRES_DB: str = config("POSTGRES_DB", default="fastnext")
    POSTGRES_PORT: str = config("POSTGRES_PORT", default="5432")

    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    # Redis Configuration
    REDIS_HOST: str = config("REDIS_HOST", default="localhost")
    REDIS_PORT: int = config("REDIS_PORT", default=6379, cast=int)
    REDIS_PASSWORD: Optional[str] = config("REDIS_PASSWORD", default=None)
    REDIS_DB: int = config("REDIS_DB", default=0, cast=int)
    REDIS_URL: Optional[str] = None

    # Cache Configuration
    CACHE_ENABLED: bool = config("CACHE_ENABLED", default=True, cast=bool)
    CACHE_DEFAULT_TTL: int = config(
        "CACHE_DEFAULT_TTL", default=300, cast=int
    )  # 5 minutes

    # Enhanced Base Model Logging Configuration
    # Enable/disable automatic activity logging
    ACTIVITY_LOGGING_ENABLED: bool = config(
        "ACTIVITY_LOGGING_ENABLED", default=True, cast=bool
    )

    # Enable/disable automatic audit trail creation
    AUDIT_TRAIL_ENABLED: bool = config(
        "AUDIT_TRAIL_ENABLED", default=True, cast=bool
    )

    # Enable/disable automatic message notifications
    MESSAGE_NOTIFICATIONS_ENABLED: bool = config(
        "MESSAGE_NOTIFICATIONS_ENABLED", default=True, cast=bool
    )

    # Maximum number of audit trail entries to keep per entity
    AUDIT_TRAIL_MAX_ENTRIES: int = config(
        "AUDIT_TRAIL_MAX_ENTRIES", default=1000, cast=int
    )

    # Enable/disable logging of sensitive field changes
    LOG_SENSITIVE_CHANGES: bool = config(
        "LOG_SENSITIVE_CHANGES", default=False, cast=bool
    )

    # List of field names considered sensitive (comma-separated)
    SENSITIVE_FIELDS: List[str] = config(
        "SENSITIVE_FIELDS", default="password,secret_key,api_key,token", cast=lambda v: [x.strip() for x in v.split(",")]
    )

    # Enable/disable automatic user notifications on entity changes
    AUTO_NOTIFY_USERS: bool = config(
        "AUTO_NOTIFY_USERS", default=False, cast=bool
    )

    # Default notification level for activities
    DEFAULT_ACTIVITY_LEVEL: str = config(
        "DEFAULT_ACTIVITY_LEVEL", default="INFO"
    )

    # Enable/disable detailed change tracking in audit trails
    DETAILED_CHANGE_TRACKING: bool = config(
        "DETAILED_CHANGE_TRACKING", default=True, cast=bool
    )

    # Module System Configuration
    MODULES_DIR: str = config("MODULES_DIR", default="modules")  # Built-in modules directory
    MODULES_ENABLED: bool = config("MODULES_ENABLED", default=True, cast=bool)
    AUTO_DISCOVER_MODULES: bool = config("AUTO_DISCOVER_MODULES", default=True, cast=bool)
    ADDON_PATHS: List[str] = config(
        "ADDON_PATHS", default="modules", cast=lambda v: [x.strip() for x in v.split(",")]
    )
    INSTALLED_MODULES: str = config("INSTALLED_MODULES", default="base")  # Active modules (comma-separated)
    MODULE_UPLOAD_DIR: str = config("MODULE_UPLOAD_DIR", default="uploads/modules")  # Directory for uploaded module ZIPs

    @property
    def addon_paths_list(self) -> List[str]:
        """Parse addon paths from comma-separated string"""
        paths = [self.MODULES_DIR]
        if self.ADDON_PATHS:
            for p in self.ADDON_PATHS:
                if p.strip() and p.strip() != self.MODULES_DIR:
                    paths.append(p.strip())
        return paths

    @property
    def all_addon_paths(self) -> List:
        """Get all addon paths as Path objects relative to backend directory."""
        from pathlib import Path
        base = Path(__file__).parent.parent.parent  # backend/
        return [base / p for p in self.addon_paths_list]

    @property
    def installed_modules_list(self) -> List[str]:
        """Parse installed modules from comma-separated string"""
        if not self.INSTALLED_MODULES:
            return ["base"]
        return [m.strip() for m in self.INSTALLED_MODULES.split(",") if m.strip()]

    # Performance Settings
    ENABLE_GZIP_COMPRESSION: bool = config(
        "ENABLE_GZIP_COMPRESSION", default=True, cast=bool
    )
    GZIP_MINIMUM_SIZE: int = config("GZIP_MINIMUM_SIZE", default=1000, cast=int)

    # Uvicorn Settings
    WORKERS: int = config("WORKERS", default=1, cast=int)
    MAX_CONNECTIONS: int = config("MAX_CONNECTIONS", default=1000, cast=int)
    MAX_CONCURRENT_CONNECTIONS: int = config(
        "MAX_CONCURRENT_CONNECTIONS", default=100, cast=int
    )

    def model_post_init(self, __context) -> None:
        if not self.SQLALCHEMY_DATABASE_URI:
            self.SQLALCHEMY_DATABASE_URI = f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

        if not self.REDIS_URL:
            if self.REDIS_PASSWORD:
                self.REDIS_URL = f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
            else:
                self.REDIS_URL = (
                    f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
                )

    # SMTP Configuration for Email Notifications
    SMTP_HOST: str = config("SMTP_HOST", default="smtp.gmail.com")
    SMTP_PORT: int = config("SMTP_PORT", default=587, cast=int)
    SMTP_TLS: bool = config("SMTP_TLS", default=True, cast=bool)
    SMTP_SSL: bool = config("SMTP_SSL", default=False, cast=bool)
    SMTP_USER: Optional[str] = config("SMTP_USER", default=None)
    SMTP_PASSWORD: Optional[str] = config("SMTP_PASSWORD", default=None)
    SMTP_FROM_EMAIL: str = config("SMTP_FROM_EMAIL", default="noreply@fastnext.com")
    SMTP_FROM_NAME: str = config("SMTP_FROM_NAME", default="FastNext Framework")

    # OAuth2 Social Authentication
    GOOGLE_CLIENT_ID: Optional[str] = config("GOOGLE_CLIENT_ID", default=None)
    GOOGLE_CLIENT_SECRET: Optional[str] = config("GOOGLE_CLIENT_SECRET", default=None)
    GITHUB_CLIENT_ID: Optional[str] = config("GITHUB_CLIENT_ID", default=None)
    GITHUB_CLIENT_SECRET: Optional[str] = config("GITHUB_CLIENT_SECRET", default=None)
    MICROSOFT_CLIENT_ID: Optional[str] = config("MICROSOFT_CLIENT_ID", default=None)
    MICROSOFT_CLIENT_SECRET: Optional[str] = config(
        "MICROSOFT_CLIENT_SECRET", default=None
    )
    OAUTH_REDIRECT_URL: str = config("OAUTH_REDIRECT_URL", default="http://localhost:3000/auth/callback")

    # File Storage
    STORAGE_BACKEND: str = config("STORAGE_BACKEND", default="local")  # "local" or "s3"
    STORAGE_LOCAL_PATH: str = config("STORAGE_LOCAL_PATH", default="./uploads")
    STORAGE_URL_PREFIX: str = config("STORAGE_URL_PREFIX", default="/uploads")

    # S3 Storage (when STORAGE_BACKEND=s3)
    S3_BUCKET: Optional[str] = config("S3_BUCKET", default=None)
    S3_REGION: str = config("S3_REGION", default="us-east-1")
    S3_ACCESS_KEY: Optional[str] = config("S3_ACCESS_KEY", default=None)
    S3_SECRET_KEY: Optional[str] = config("S3_SECRET_KEY", default=None)
    S3_ENDPOINT_URL: Optional[str] = config("S3_ENDPOINT_URL", default=None)  # For S3-compatible services like MinIO

    # Attachment Limits
    ATTACHMENT_MAX_SIZE: int = config("ATTACHMENT_MAX_SIZE", default=10 * 1024 * 1024, cast=int)  # 10MB
    ATTACHMENT_ALLOWED_TYPES: str = config(
        "ATTACHMENT_ALLOWED_TYPES",
        default="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,application/json,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    @property
    def allowed_attachment_types(self) -> List[str]:
        """Parse allowed attachment types from comma-separated string"""
        return [t.strip() for t in self.ATTACHMENT_ALLOWED_TYPES.split(",") if t.strip()]

    # Push Notifications (Web Push / VAPID)
    VAPID_PUBLIC_KEY: Optional[str] = config("VAPID_PUBLIC_KEY", default=None)
    VAPID_PRIVATE_KEY: Optional[str] = config("VAPID_PRIVATE_KEY", default=None)
    VAPID_CLAIMS_EMAIL: str = config("VAPID_CLAIMS_EMAIL", default="mailto:admin@fastnext.com")
    PUSH_ENABLED: bool = config("PUSH_ENABLED", default=False, cast=bool)

    # Email Notifications
    EMAIL_NOTIFICATIONS_ENABLED: bool = config("EMAIL_NOTIFICATIONS_ENABLED", default=True, cast=bool)
    EMAIL_DIGEST_ENABLED: bool = config("EMAIL_DIGEST_ENABLED", default=True, cast=bool)
    EMAIL_DIGEST_HOUR: int = config("EMAIL_DIGEST_HOUR", default=9, cast=int)  # Hour of day to send daily digest (0-23)
    EMAILS_FROM_EMAIL: str = config("EMAILS_FROM_EMAIL", default="noreply@fastnext.com")  # Alias for email service

    # Notification Defaults
    NOTIFICATION_SOUND_ENABLED: bool = config("NOTIFICATION_SOUND_ENABLED", default=True, cast=bool)
    NOTIFICATION_DESKTOP_ENABLED: bool = config("NOTIFICATION_DESKTOP_ENABLED", default=True, cast=bool)

    # Database Connection Pool
    DB_POOL_SIZE: int = config("DB_POOL_SIZE", default=20, cast=int)
    DB_MAX_OVERFLOW: int = config("DB_MAX_OVERFLOW", default=40, cast=int)
    DB_POOL_TIMEOUT: int = config("DB_POOL_TIMEOUT", default=30, cast=int)
    DB_POOL_RECYCLE: int = config("DB_POOL_RECYCLE", default=3600, cast=int)  # Recycle connections after 1 hour

    # Logging
    LOG_LEVEL: str = config("LOG_LEVEL", default="INFO")

    # CORS origins - can be overridden by environment variable
    BACKEND_CORS_ORIGINS: List[str] = (
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:8080,http://127.0.0.1:8080,https://localhost:3000,https://127.0.0.1:3000"
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        raise ValueError(v)

    model_config = {"env_file": ".env"}


settings = Settings()
