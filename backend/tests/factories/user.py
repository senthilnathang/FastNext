"""
User factories for testing.
"""

import factory
from factory import LazyAttribute, Sequence, SubFactory

from app.core.security import get_password_hash
from app.models.user import User
from tests.factories.base import SQLAlchemyModelFactory


class UserFactory(SQLAlchemyModelFactory):
    """Factory for creating User instances."""

    class Meta:
        model = User

    email = Sequence(lambda n: f"user{n}@test.com")
    username = Sequence(lambda n: f"user{n}")
    full_name = factory.Faker("name")
    hashed_password = LazyAttribute(lambda _: get_password_hash("testpassword123"))
    is_active = True
    is_verified = True
    is_superuser = False
    failed_login_attempts = 0
    avatar_url = factory.Faker("image_url")
    bio = factory.Faker("text", max_nb_chars=200)
    location = factory.Faker("city")
    website = factory.Faker("url")

    class Params:
        """Traits for common user configurations."""

        with_profile = factory.Trait(
            avatar_url=factory.Faker("image_url"),
            bio=factory.Faker("text", max_nb_chars=200),
            location=factory.Faker("city"),
            website=factory.Faker("url"),
        )
        locked = factory.Trait(
            failed_login_attempts=5,
            locked_until=factory.Faker(
                "future_datetime", end_date="+1h", tzinfo=None
            ),
        )


class AdminUserFactory(UserFactory):
    """Factory for creating admin users."""

    email = Sequence(lambda n: f"admin{n}@test.com")
    username = Sequence(lambda n: f"admin{n}")
    full_name = factory.Faker("name")
    is_superuser = True
    is_verified = True


class RegularUserFactory(UserFactory):
    """Factory for creating regular users."""

    is_superuser = False
    is_verified = True


class InactiveUserFactory(UserFactory):
    """Factory for creating inactive users."""

    is_active = False
    is_verified = False
