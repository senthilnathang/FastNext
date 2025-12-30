"""
User Factory for FastVue Tests

Provides factories for creating User instances with realistic test data.
"""

import factory
from faker import Faker

from app.core.security import get_password_hash
from app.models import User
from tests.factories.base import BaseFactory

fake = Faker()


class UserFactory(BaseFactory):
    """Factory for creating regular User instances."""

    class Meta:
        model = User
        sqlalchemy_get_or_create = ("email",)

    email = factory.LazyAttribute(lambda _: fake.unique.email())
    username = factory.LazyAttribute(lambda _: fake.unique.user_name())
    full_name = factory.LazyAttribute(lambda _: fake.name())
    hashed_password = factory.LazyAttribute(
        lambda _: get_password_hash("TestPass123!")
    )
    is_active = True
    is_verified = True
    is_superuser = False
    phone = factory.LazyAttribute(lambda _: fake.phone_number()[:20])
    bio = factory.LazyAttribute(lambda _: fake.text(max_nb_chars=200))

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Reset faker's unique tracker to avoid collisions across tests."""
        return super()._create(model_class, *args, **kwargs)


class AdminUserFactory(UserFactory):
    """Factory for creating superuser/admin User instances."""

    is_superuser = True
    email = factory.LazyAttribute(lambda _: f"admin_{fake.unique.email()}")
    username = factory.LazyAttribute(lambda _: f"admin_{fake.unique.user_name()}")


class InactiveUserFactory(UserFactory):
    """Factory for creating inactive User instances."""

    is_active = False


class UnverifiedUserFactory(UserFactory):
    """Factory for creating unverified User instances."""

    is_verified = False


class LockedUserFactory(UserFactory):
    """Factory for creating locked User instances."""

    failed_login_attempts = 5

    @factory.lazy_attribute
    def locked_until(self):
        from datetime import datetime, timedelta, timezone
        return datetime.now(timezone.utc) + timedelta(hours=1)


class UserWithCompanyFactory(UserFactory):
    """Factory for creating User with company assignment."""

    @factory.post_generation
    def company(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A company was passed in
            self.current_company_id = extracted.id
