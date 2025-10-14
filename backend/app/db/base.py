import logging

from app.core.config import settings
from sqlalchemy import create_engine, event, pool
from sqlalchemy.orm import DeclarativeBase, sessionmaker

logger = logging.getLogger(__name__)

# SQLAlchemy 2.x modern patterns with optimized connection pooling
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,  # Enable connection health checks
    echo=False,  # Set to True for SQL query logging
    # Optimized connection pool settings for production scale
    pool_size=20,  # Number of permanent connections (default: 5)
    max_overflow=40,  # Additional connections when pool is full (default: 10)
    pool_timeout=30,  # Timeout for getting connection from pool (seconds)
    pool_recycle=3600,  # Recycle connections after 1 hour (prevents stale connections)
    # Performance optimizations
    poolclass=pool.QueuePool,  # Use QueuePool for production
    echo_pool=False,  # Set to True to debug pool behavior
    # Execution options
    execution_options={"isolation_level": "READ COMMITTED"},  # Default isolation level
)


# Connection pool event listeners for monitoring
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Event fired when new connection is created"""
    logger.debug(f"New database connection established: {id(dbapi_conn)}")


@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    """Event fired when connection is returned to pool"""
    logger.debug(f"Connection returned to pool: {id(dbapi_conn)}")


@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Event fired when connection is retrieved from pool"""
    logger.debug(f"Connection retrieved from pool: {id(dbapi_conn)}")


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Modern SQLAlchemy 2.x declarative base"""

    pass
