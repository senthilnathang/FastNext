"""
Project factories for testing.
"""

import factory
from factory import Sequence, SubFactory, LazyAttribute

from app.models.project import Project
from app.models.project_member import ProjectMember
from tests.factories.base import SQLAlchemyModelFactory


class ProjectFactory(SQLAlchemyModelFactory):
    """Factory for creating Project instances."""

    class Meta:
        model = Project

    name = Sequence(lambda n: f"Test Project {n}")
    description = factory.Faker("paragraph")
    user_id = None  # Must be provided or use SubFactory
    is_public = False
    settings = factory.LazyFunction(dict)

    class Params:
        """Traits for project configurations."""

        public = factory.Trait(is_public=True)
        with_settings = factory.Trait(
            settings=factory.LazyFunction(
                lambda: {
                    "theme": "default",
                    "notifications_enabled": True,
                    "max_members": 10,
                }
            )
        )


class ProjectMemberFactory(SQLAlchemyModelFactory):
    """Factory for creating ProjectMember instances."""

    class Meta:
        model = ProjectMember

    project_id = None  # Must be provided
    user_id = None  # Must be provided
    role_id = None  # Optional
