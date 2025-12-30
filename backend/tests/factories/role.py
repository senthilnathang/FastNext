"""
Role Factory for FastVue Tests

Provides factories for creating Role and Permission instances.
"""

import factory
from faker import Faker

from app.models import Role, Permission
from tests.factories.base import BaseFactory

fake = Faker()


class PermissionFactory(BaseFactory):
    """Factory for creating Permission instances."""

    class Meta:
        model = Permission
        sqlalchemy_get_or_create = ("codename",)

    name = factory.LazyAttribute(lambda _: fake.sentence(nb_words=3))
    codename = factory.LazyAttribute(
        lambda _: f"{fake.word()}.{fake.random_element(['read', 'write', 'delete', 'create'])}"
    )
    description = factory.LazyAttribute(lambda _: fake.text(max_nb_chars=100))


class RoleFactory(BaseFactory):
    """Factory for creating Role instances."""

    class Meta:
        model = Role
        sqlalchemy_get_or_create = ("codename",)

    name = factory.LazyAttribute(lambda _: fake.job())
    codename = factory.LazyAttribute(lambda _: fake.unique.slug())
    description = factory.LazyAttribute(lambda _: fake.text(max_nb_chars=100))
    is_system_role = False
    is_active = True

    @factory.post_generation
    def permissions(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of permissions was passed in
            for permission in extracted:
                self.permissions.append(permission)


class SystemRoleFactory(RoleFactory):
    """Factory for creating system Role instances (cannot be deleted)."""

    is_system_role = True


class AdminRoleFactory(RoleFactory):
    """Factory for creating an admin role with common admin permissions."""

    name = "Administrator"
    codename = factory.LazyAttribute(lambda _: f"admin_{fake.unique.slug()}")
    is_system_role = True
