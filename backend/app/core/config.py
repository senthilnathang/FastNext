from typing import Any, Dict, List, Optional, Union
from pydantic import AnyHttpUrl, PostgresDsn, field_validator
from pydantic_settings import BaseSettings
from decouple import config


class Settings(BaseSettings):
    PROJECT_NAME: str = "FastNext Framework"
    VERSION: str = "1.0.0"
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
    CACHE_DEFAULT_TTL: int = config("CACHE_DEFAULT_TTL", default=300, cast=int)  # 5 minutes
    
    # Performance Settings
    ENABLE_GZIP_COMPRESSION: bool = config("ENABLE_GZIP_COMPRESSION", default=True, cast=bool)
    GZIP_MINIMUM_SIZE: int = config("GZIP_MINIMUM_SIZE", default=1000, cast=int)
    
    # Uvicorn Settings
    WORKERS: int = config("WORKERS", default=1, cast=int)
    MAX_CONNECTIONS: int = config("MAX_CONNECTIONS", default=1000, cast=int)
    MAX_CONCURRENT_CONNECTIONS: int = config("MAX_CONCURRENT_CONNECTIONS", default=100, cast=int)
    
    def model_post_init(self, __context) -> None:
        if not self.SQLALCHEMY_DATABASE_URI:
            self.SQLALCHEMY_DATABASE_URI = f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        
        if not self.REDIS_URL:
            if self.REDIS_PASSWORD:
                self.REDIS_URL = f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
            else:
                self.REDIS_URL = f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # CORS origins - can be overridden by environment variable
    BACKEND_CORS_ORIGINS: List[str] = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:8080,http://127.0.0.1:8080,https://localhost:3000,https://127.0.0.1:3000"
    
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