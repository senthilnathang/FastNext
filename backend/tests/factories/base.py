"""
Base Factory configuration for SQLAlchemy models.
"""

import factory
from sqlalchemy.orm import Session


class SQLAlchemyModelFactory(factory.alchemy.SQLAlchemyModelFactory):
    """
    Base factory class for SQLAlchemy models.

    Usage:
        class UserFactory(SQLAlchemyModelFactory):
            class Meta:
                model = User

            email = factory.Faker('email')
    """

    class Meta:
        abstract = True
        # Session will be set in conftest.py
        sqlalchemy_session = None
        sqlalchemy_session_persistence = "commit"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override create to handle session properly."""
        # Get session from FactorySession singleton
        session = FactorySession.get_session()
        if session is None:
            raise ValueError(
                "SQLAlchemy session not set. "
                "Use FactorySession.set_session(db) in your test fixture."
            )
        # Set session on this factory class
        cls._meta.sqlalchemy_session = session
        return super()._create(model_class, *args, **kwargs)


class FactorySession:
    """
    Singleton to manage factory session.

    Usage in conftest.py:
        @pytest.fixture(autouse=True)
        def setup_factory_session(db):
            FactorySession.set_session(db)
            yield
            FactorySession.clear_session()
    """

    _session: Session | None = None

    @classmethod
    def set_session(cls, session: Session):
        """Set the SQLAlchemy session for all factories."""
        cls._session = session
        # Update all factory classes
        SQLAlchemyModelFactory._meta.sqlalchemy_session = session

    @classmethod
    def get_session(cls) -> Session | None:
        """Get the current session."""
        return cls._session

    @classmethod
    def clear_session(cls):
        """Clear the session."""
        cls._session = None
        SQLAlchemyModelFactory._meta.sqlalchemy_session = None
