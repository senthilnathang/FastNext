"""SQLAlchemy database engine and base configuration"""

import logging

from sqlalchemy import create_engine, event, pool
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)


# SQLAlchemy 2.x engine with optimized connection pooling
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,  # Enable connection health checks
    echo=settings.DEBUG,  # SQL query logging in debug mode
    # Configurable connection pool settings
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    poolclass=pool.QueuePool,
    execution_options={"isolation_level": "READ COMMITTED"},
)


# Connection pool event listeners for monitoring
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Event fired when new connection is created"""
    logger.debug(f"New database connection established: {id(dbapi_conn)}")


@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Event fired when connection is retrieved from pool"""
    logger.debug(f"Connection retrieved from pool: {id(dbapi_conn)}")


# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Modern SQLAlchemy 2.x declarative base"""

    # Allow unmapped annotations for backwards compatibility with legacy-style relationships
    __allow_unmapped__ = True


# Setup activity tracking for automatic CRUD logging
# This must be done after SessionLocal is created
def _setup_activity_tracking():
    """Initialize activity tracking events on the session"""
    try:
        from app.models.base import setup_activity_tracking
        setup_activity_tracking(SessionLocal)
        logger.info("Activity tracking initialized successfully")
    except ImportError:
        logger.debug("Activity tracking not available (models not loaded yet)")
    except Exception as e:
        logger.warning(f"Failed to setup activity tracking: {e}")


# Delay initialization to avoid circular imports
# Activity tracking will be set up when models are first imported
_activity_tracking_initialized = False


def ensure_activity_tracking():
    """Ensure activity tracking is initialized (call once models are loaded)"""
    global _activity_tracking_initialized
    if not _activity_tracking_initialized:
        _setup_activity_tracking()
        _activity_tracking_initialized = True
