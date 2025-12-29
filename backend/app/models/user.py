"""User model with authentication and 2FA support"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.models.base import EnterpriseModel


class User(EnterpriseModel):
    """
    User model with full authentication support including:
    - Email/password authentication
    - Two-factor authentication (2FA)
    - OAuth social login
    - Multi-company with different roles per company
    """

    __tablename__ = "users"

    # Basic info
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)

    # Profile
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    timezone = Column(String(50), default="UTC")
    language = Column(String(10), default="en")

    # Status flags
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)

    # Current company context
    current_company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Security - Account lockout
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_login_ip = Column(String(45), nullable=True)

    # Security - Password
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    must_change_password = Column(Boolean, default=False, nullable=False)

    # Two-Factor Authentication
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String(255), nullable=True)  # Encrypted TOTP secret
    backup_codes = Column(JSON, default=list, nullable=False)  # Encrypted backup codes
    two_factor_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Email verification
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    email_verification_token = Column(String(255), nullable=True)

    # Relationships
    current_company = relationship(
        "Company",
        foreign_keys=[current_company_id],
        viewonly=True,
    )

    # Roles per company
    company_roles = relationship(
        "UserCompanyRole",
        foreign_keys="UserCompanyRole.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Groups
    groups = relationship(
        "UserGroup",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Social accounts
    social_accounts = relationship(
        "SocialAccount",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Notifications
    notifications = relationship(
        "Notification",
        foreign_keys="Notification.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(Notification.created_at)",
    )

    # Mentions (@mentions where this user was mentioned)
    mentions = relationship(
        "Mention",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(Mention.created_at)",
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', username='{self.username}')>"

    # Account lockout methods
    def is_locked(self) -> bool:
        """Check if account is currently locked"""
        if not self.locked_until:
            return False
        return datetime.now(timezone.utc) < self.locked_until

    def increment_failed_attempts(self, max_attempts: int = 5, lockout_minutes: int = 30):
        """Increment failed login attempts and lock if exceeded"""
        from datetime import timedelta
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= max_attempts:
            self.locked_until = datetime.now(timezone.utc) + timedelta(minutes=lockout_minutes)

    def reset_failed_attempts(self):
        """Reset failed login attempts and unlock account"""
        self.failed_login_attempts = 0
        self.locked_until = None

    def record_login(self, ip_address: str = None):
        """Record successful login"""
        self.last_login_at = datetime.now(timezone.utc)
        self.last_login_ip = ip_address
        self.reset_failed_attempts()

    # Two-factor authentication methods
    def enable_2fa(self, secret: str):
        """Enable two-factor authentication"""
        self.two_factor_secret = secret
        self.two_factor_enabled = True
        self.two_factor_verified_at = datetime.now(timezone.utc)

    def disable_2fa(self):
        """Disable two-factor authentication"""
        self.two_factor_secret = None
        self.two_factor_enabled = False
        self.two_factor_verified_at = None
        self.backup_codes = []

    def use_backup_code(self, code: str) -> bool:
        """Use a backup code and remove it from the list"""
        if code in self.backup_codes:
            self.backup_codes = [c for c in self.backup_codes if c != code]
            return True
        return False

    # Permission checking
    def get_permissions_for_company(self, company_id: int = None) -> set:
        """Get all permission codenames for user in a specific company"""
        target_company = company_id or self.current_company_id

        permissions = set()

        # Get permissions from company roles
        for ucr in self.company_roles:
            if ucr.company_id == target_company and ucr.is_active:
                for rp in ucr.role.permissions:
                    if rp.permission.is_active:
                        permissions.add(rp.permission.codename)

        # Get permissions from groups
        for ug in self.groups:
            if ug.is_active and ug.group.company_id == target_company:
                for gp in ug.group.permissions:
                    if gp.permission.is_active:
                        permissions.add(gp.permission.codename)

        return permissions

    def has_permission(self, codename: str, company_id: int = None) -> bool:
        """Check if user has a specific permission in a company"""
        if self.is_superuser:
            return True
        return codename in self.get_permissions_for_company(company_id)

    def get_role_for_company(self, company_id: int):
        """Get user's role for a specific company"""
        for ucr in self.company_roles:
            if ucr.company_id == company_id and ucr.is_active:
                return ucr.role
        return None

    @property
    def companies(self) -> list:
        """Get all companies the user belongs to"""
        return [ucr.company for ucr in self.company_roles if ucr.is_active]

    @property
    def default_company(self):
        """Get user's default company"""
        for ucr in self.company_roles:
            if ucr.is_default and ucr.is_active:
                return ucr.company
        # Return first active company if no default set
        for ucr in self.company_roles:
            if ucr.is_active:
                return ucr.company
        return None
