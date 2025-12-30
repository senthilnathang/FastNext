"""
FastVue Test Factories

Provides Factory Boy factories for generating test data.

Usage:
    from tests.factories import UserFactory, CompanyFactory

    user = UserFactory()
    admin = AdminUserFactory()
    company = CompanyFactory()
"""

from tests.factories.base import (
    BaseFactory,
    fake,
    set_session,
    get_session,
)
from tests.factories.user import (
    UserFactory,
    AdminUserFactory,
    InactiveUserFactory,
    UnverifiedUserFactory,
    LockedUserFactory,
    UserWithCompanyFactory,
)
from tests.factories.company import (
    CompanyFactory,
    InactiveCompanyFactory,
)
from tests.factories.role import (
    RoleFactory,
    SystemRoleFactory,
    AdminRoleFactory,
    PermissionFactory,
)

__all__ = [
    # Base
    "BaseFactory",
    "fake",
    "set_session",
    "get_session",
    # Users
    "UserFactory",
    "AdminUserFactory",
    "InactiveUserFactory",
    "UnverifiedUserFactory",
    "LockedUserFactory",
    "UserWithCompanyFactory",
    # Companies
    "CompanyFactory",
    "InactiveCompanyFactory",
    # Roles & Permissions
    "RoleFactory",
    "SystemRoleFactory",
    "AdminRoleFactory",
    "PermissionFactory",
]
