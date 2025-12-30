"""FastVue Framework - Main Application Entry Point"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.core.config import settings
from app.middleware.security import SecurityMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware
from app.middleware.rate_limiting import RateLimitingMiddleware
from app.middleware.error_handling import ErrorHandlingMiddleware
from app.middleware.context import ContextMiddleware

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("logs/fastvue.log", mode="a"),
    ],
)

# Silence noisy loggers
logging.getLogger("watchfiles").setLevel(logging.WARNING)  # Hot-reload file watcher
logging.getLogger("watchfiles.main").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)  # Access logs (optional)
logging.getLogger("websockets").setLevel(logging.WARNING)  # WebSocket library

# Configure security logger
security_logger = logging.getLogger("security")
security_handler = logging.FileHandler("logs/security.log", mode="a")
security_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
security_logger.addHandler(security_handler)
security_logger.setLevel(logging.INFO)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"API prefix: {settings.API_V1_STR}")

    # Initialize database (optional - run migrations separately)
    # from app.db.init_db import init_db
    # from app.db.base import SessionLocal
    # db = SessionLocal()
    # init_db(db)
    # db.close()

    # Initialize module system
    if settings.MODULES_ENABLED:
        await _initialize_modules(app)

    yield

    # Shutdown
    logger.info("Shutting down...")

    # Trigger module shutdown hooks
    if settings.MODULES_ENABLED:
        try:
            from app.core.modules import ModuleRegistry
            registry = ModuleRegistry.get_registry()
            await registry.trigger_hook_async("shutdown")
        except Exception as e:
            logger.error(f"Error during module shutdown: {e}")

    from app.core.cache import cache
    cache.close()


async def _ensure_base_module_installed(loader):
    """Ensure the base module is installed in the database.

    This runs on every startup to ensure the base module record exists,
    even for databases that were created before the module system was added.
    """
    from app.db.base import SessionLocal

    try:
        from modules.base.models.module import InstalledModule, serialize_manifest

        db = SessionLocal()
        try:
            # Check if base module is already installed
            existing = db.query(InstalledModule).filter(
                InstalledModule.name == "base"
            ).first()

            if existing:
                logger.debug("Base module already installed in database")
                return

            # Load manifest and create record
            loader.discover_modules()
            module_path = loader.get_module_path("base")

            if not module_path:
                logger.warning("Base module not found in addon paths")
                return

            manifest = loader.load_manifest(module_path)

            base_module = InstalledModule(
                name="base",
                display_name=manifest.get("name", "Base"),
                version=manifest.get("version", "1.0.0"),
                summary=manifest.get("summary", "FastVue Base Module"),
                description=manifest.get("description", ""),
                author=manifest.get("author", "FastVue Team"),
                website=manifest.get("website", ""),
                category=manifest.get("category", "Technical"),
                license=manifest.get("license", "MIT"),
                application=manifest.get("application", False),
                state="installed",
                depends=[],
                manifest_cache=serialize_manifest(manifest),
                module_path=str(module_path),
                auto_install=True,
            )

            db.add(base_module)
            db.commit()
            logger.info("Base module installed in database")

        finally:
            db.close()

    except Exception as e:
        logger.warning(f"Could not ensure base module installation: {e}")


async def _initialize_modules(app: FastAPI):
    """Initialize the module system and load all modules."""
    from app.core.modules import ModuleRegistry, ModuleLoader

    logger.info("Initializing module system...")
    logger.info(f"Addon paths: {settings.addon_paths_list}")

    # Ensure module directories exist
    for addon_path in settings.all_addon_paths:
        addon_path.mkdir(parents=True, exist_ok=True)

    # Create registry and loader
    registry = ModuleRegistry.get_registry()
    loader = ModuleLoader(settings.all_addon_paths, registry)

    # Ensure base module is installed in database
    await _ensure_base_module_installed(loader)

    # Discover and load modules
    try:
        discovered = loader.discover_modules()
        logger.info(f"Discovered {len(discovered)} modules: {discovered}")

        if settings.AUTO_DISCOVER_MODULES:
            loaded = loader.load_all_modules()
            logger.info(f"Loaded {len(loaded)} modules")

            # Mount module routers and static files
            for module_info in loaded:
                # Mount API routers
                for router in module_info.routers:
                    prefix = f"{settings.API_V1_STR}/{module_info.name}"
                    app.include_router(
                        router,
                        prefix=prefix,
                        tags=[module_info.manifest.name],
                    )
                    logger.debug(f"Mounted router for {module_info.name} at {prefix}")

                # Mount static files
                static_path = module_info.path / "static"
                if static_path.exists() and static_path.is_dir():
                    mount_path = f"/modules/{module_info.name}/static"
                    app.mount(
                        mount_path,
                        StaticFiles(directory=static_path),
                        name=f"{module_info.name}_static",
                    )
                    logger.debug(f"Mounted static files for {module_info.name} at {mount_path}")

        # Trigger startup hooks
        await registry.trigger_hook_async("startup")
        logger.info("Module system initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize modules: {e}")
        if settings.DEBUG:
            raise


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="FastVue Framework - FastAPI + Vue.js Full-Stack Framework",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Add middlewares (order matters - last added is first executed)
# 1. GZip compression (last to execute, compresses final response)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 2. CORS (must be early in the chain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS.split(","),
    allow_headers=settings.CORS_ALLOW_HEADERS.split(","),
    expose_headers=settings.CORS_EXPOSE_HEADERS.split(","),
    max_age=settings.CORS_MAX_AGE,
)

# 3. Error handling (catches all exceptions)
app.add_middleware(
    ErrorHandlingMiddleware,
    include_debug_info=settings.DEBUG,
    log_errors=True,
)

# 4. Rate limiting
app.add_middleware(RateLimitingMiddleware)

# 5. Request logging
app.add_middleware(
    RequestLoggingMiddleware,
    log_request_body=settings.DEBUG,
    log_response_body=False,
    excluded_paths=[
        "/health", "/", "/api/v1/docs", "/api/v1/redoc", "/api/v1/openapi.json",
        "/api/v1/ws", "/ws",  # WebSocket endpoints - high frequency, skip logging
    ],
)

# 6. Security (first to execute, adds security headers)
app.add_middleware(
    SecurityMiddleware,
    enable_threat_detection=True,
    enable_csp=True,
    enable_hsts=settings.ENVIRONMENT == "production",
)

# 7. Context (sets user context for activity tracking)
app.add_middleware(ContextMiddleware)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        workers=settings.WORKERS,
    )
