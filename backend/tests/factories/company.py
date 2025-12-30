"""
Company Factory for FastVue Tests

Provides factories for creating Company instances with realistic test data.
"""

import factory
from faker import Faker

from app.models import Company
from tests.factories.base import BaseFactory

fake = Faker()


class CompanyFactory(BaseFactory):
    """Factory for creating Company instances."""

    class Meta:
        model = Company
        sqlalchemy_get_or_create = ("code",)

    name = factory.LazyAttribute(lambda _: fake.company())
    code = factory.LazyAttribute(lambda _: fake.unique.lexify(text="????").upper())
    description = factory.LazyAttribute(lambda _: fake.catch_phrase())
    website = factory.LazyAttribute(lambda _: fake.url())
    email = factory.LazyAttribute(lambda _: fake.company_email())
    phone = factory.LazyAttribute(lambda _: fake.phone_number()[:20])
    is_active = True


class InactiveCompanyFactory(CompanyFactory):
    """Factory for creating inactive Company instances."""

    is_active = False
