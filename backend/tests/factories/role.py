"""
Role factories for testing.
"""

import factory
from factory import Sequence, SubFactory

from app.models.role import Role
from app.models.user_role import UserRole
from tests.factories.base import SQLAlchemyModelFactory


class RoleFactory(SQLAlchemyModelFactory):
    """Factory for creating Role instances."""

    class Meta:
        model = Role

    name = Sequence(lambda n: f"test_role_{n}")
    description = factory.Faker("sentence")
    is_system_role = False
    is_active = True


class SystemRoleFactory(RoleFactory):
    """Factory for creating system roles."""

    name = Sequence(lambda n: f"system_role_{n}")
    is_system_role = True


class UserRoleFactory(SQLAlchemyModelFactory):
    """Factory for creating UserRole (user-role association)."""

    class Meta:
        model = UserRole

    user_id = None  # Must be provided
    role_id = None  # Must be provided
