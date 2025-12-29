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
    MODULES_ENABLED: bool = config("MODULES_ENABLED", default=True, cast=bool)
    AUTO_DISCOVER_MODULES: bool = config("AUTO_DISCOVER_MODULES", default=True, cast=bool)
    ADDON_PATHS: List[str] = config(
        "ADDON_PATHS", default="modules", cast=lambda v: [x.strip() for x in v.split(",")]
    )

    @property
    def all_addon_paths(self) -> List:
        """Get all addon paths as Path objects relative to backend directory."""
        from pathlib import Path
        base = Path(__file__).parent.parent.parent  # backend/
        return [base / p for p in self.ADDON_PATHS]

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
