"""
Database Dependencies
FastAPI dependencies for database sessions
"""

from typing import Generator

from app.db.session import SessionLocal
from sqlalchemy.orm import Session


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session

    Yields:
        Session: Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Alias for backward compatibility
get_db_session = get_db
