"""
Base Factory for FastVue Tests

Provides base classes and utilities for Factory Boy factories.
"""

from typing import Optional

import factory
from factory.alchemy import SQLAlchemyModelFactory
from faker import Faker
from sqlalchemy.orm import Session

# Global faker instance
fake = Faker()

# Session holder - will be set by conftest.py
_session: Optional[Session] = None


def set_session(session: Session) -> None:
    """Set the SQLAlchemy session for all factories."""
    global _session
    _session = session


def get_session() -> Session:
    """Get the current SQLAlchemy session."""
    if _session is None:
        raise RuntimeError("Factory session not set. Use set_session() first.")
    return _session


class BaseFactory(SQLAlchemyModelFactory):
    """
    Base factory for all SQLAlchemy models.

    Uses a dynamic session getter to ensure each test gets its own
    isolated database session.
    """

    class Meta:
        abstract = True
        sqlalchemy_session_persistence = "commit"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override to use dynamic session."""
        session = get_session()
        cls._meta.sqlalchemy_session = session
        return super()._create(model_class, *args, **kwargs)
