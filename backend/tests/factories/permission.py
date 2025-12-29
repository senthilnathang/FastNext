"""
Permission factories for testing.
"""

import factory
from factory import Sequence

from app.models.permission import Permission
from app.models.user_role import RolePermission
from tests.factories.base import SQLAlchemyModelFactory


class PermissionFactory(SQLAlchemyModelFactory):
    """Factory for creating Permission instances."""

    class Meta:
        model = Permission

    name = Sequence(lambda n: f"test_permission_{n}")
    description = factory.Faker("sentence")
    action = factory.Iterator(["create", "read", "update", "delete", "manage"])
    resource = factory.Faker("word")
    category = factory.Faker("word")
    is_system_permission = False


class RolePermissionFactory(SQLAlchemyModelFactory):
    """Factory for creating RolePermission associations."""

    class Meta:
        model = RolePermission

    role_id = None  # Must be provided
    permission_id = None  # Must be provided
