"""
Marketplace Module Models

Module listings, versions, and categories.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Index,
    BigInteger,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, backref

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin

if TYPE_CHECKING:
    from .publisher import Publisher
    from .review import ModuleReview
    from .license import License


class MarketplaceCategory(Base, TimestampMixin):
    """
    Module categories for organization and browsing.

    Supports hierarchical categories (parent/child).
    """
    __tablename__ = "marketplace_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Display
    icon = Column(String(50), nullable=True)  # Icon name (e.g., "mdi-shopping")
    color = Column(String(7), nullable=True)  # Hex color
    image_url = Column(String(500), nullable=True)

    # Hierarchy
    parent_id = Column(Integer, ForeignKey("marketplace_categories.id"), nullable=True)
    level = Column(Integer, default=0)  # 0 = root
    path = Column(String(500), nullable=True)  # Materialized path: /1/5/12/

    # Ordering
    order = Column(Integer, default=0)

    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    # Stats (cached)
    module_count = Column(Integer, default=0)

    # Relationships
    parent = relationship(
        "MarketplaceCategory",
        remote_side=[id],
        backref=backref("children", lazy="dynamic")
    )
    modules: List["MarketplaceModule"] = relationship(
        "MarketplaceModule",
        back_populates="category"
    )

    __table_args__ = (
        Index("ix_categories_parent", "parent_id"),
        Index("ix_categories_active", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Category {self.name} ({self.slug})>"


class MarketplaceModule(Base, TimestampMixin, AuditMixin):
    """
    Module listing in marketplace.

    Core entity representing a published module.
    """
    __tablename__ = "marketplace_modules"

    id = Column(Integer, primary_key=True, index=True)
    publisher_id = Column(
        Integer,
        ForeignKey("marketplace_publishers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    category_id = Column(
        Integer,
        ForeignKey("marketplace_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Identification
    technical_name = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)

    # Description
    short_description = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)  # Markdown supported
    description_html = Column(Text, nullable=True)  # Pre-rendered HTML

    # Pricing
    license_type = Column(String(20), default="free", index=True)  # free, paid, subscription, freemium
    price = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="USD")

    # Subscription options
    subscription_monthly_price = Column(Numeric(10, 2), nullable=True)
    subscription_yearly_price = Column(Numeric(10, 2), nullable=True)
    subscription_yearly_discount = Column(Integer, nullable=True)  # Percentage off

    # Trial
    has_trial = Column(Boolean, default=False)
    trial_days = Column(Integer, nullable=True)

    # Media
    icon_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    screenshots = Column(JSONB, default=list)  # [{url, caption, order, thumbnail_url}]
    video_url = Column(String(500), nullable=True)
    video_type = Column(String(20), nullable=True)  # youtube, vimeo, mp4

    # Discovery
    tags = Column(JSONB, default=list)  # ["accounting", "inventory"]
    keywords = Column(JSONB, default=list)  # For search
    search_vector = Column(Text, nullable=True)  # Full-text search

    # Compatibility
    fastvue_versions = Column(JSONB, default=list)  # ["1.0", "1.1", "2.0"]
    python_versions = Column(JSONB, default=list)  # ["3.9", "3.10", "3.11"]
    database_support = Column(JSONB, default=list)  # ["postgresql", "mysql"]

    # Dependencies
    dependencies = Column(JSONB, default=list)  # Required FastVue modules
    optional_dependencies = Column(JSONB, default=list)
    conflicts_with = Column(JSONB, default=list)  # Incompatible modules
    external_dependencies = Column(JSONB, default=dict)  # {"python": ["pandas"], "system": ["wkhtmltopdf"]}

    # Status
    status = Column(String(20), default="draft", index=True)  # draft, pending, published, rejected, archived
    rejection_reason = Column(Text, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    # Visibility
    visibility = Column(String(20), default="public")  # public, private, unlisted
    requires_approval = Column(Boolean, default=False)  # Manual approval for access

    # Featured
    featured = Column(Boolean, default=False, index=True)
    featured_order = Column(Integer, nullable=True)
    featured_until = Column(DateTime(timezone=True), nullable=True)
    featured_reason = Column(String(200), nullable=True)

    # Stats (cached for performance)
    download_count = Column(BigInteger, default=0)
    install_count = Column(BigInteger, default=0)
    view_count = Column(BigInteger, default=0)
    purchase_count = Column(Integer, default=0)
    active_installs = Column(Integer, default=0)

    # Reviews (cached)
    average_rating = Column(Numeric(3, 2), nullable=True)
    rating_count = Column(Integer, default=0)
    rating_distribution = Column(JSONB, default=dict)  # {"5": 100, "4": 50, ...}

    # Additional Info
    documentation_url = Column(String(500), nullable=True)
    changelog_url = Column(String(500), nullable=True)
    source_code_url = Column(String(500), nullable=True)
    demo_url = Column(String(500), nullable=True)
    support_url = Column(String(500), nullable=True)

    # Settings
    auto_update_enabled = Column(Boolean, default=True)
    show_download_count = Column(Boolean, default=True)

    # Relationships
    publisher: "Publisher" = relationship("Publisher", back_populates="modules")
    category: Optional["MarketplaceCategory"] = relationship("MarketplaceCategory", back_populates="modules")
    versions: List["ModuleVersion"] = relationship(
        "ModuleVersion",
        back_populates="module",
        order_by="desc(ModuleVersion.created_at)",
        cascade="all, delete-orphan"
    )
    reviews: List["ModuleReview"] = relationship(
        "ModuleReview",
        back_populates="module",
        cascade="all, delete-orphan"
    )
    licenses: List["License"] = relationship(
        "License",
        back_populates="module",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_modules_status_published", "status", "published_at"),
        Index("ix_modules_featured", "featured", "featured_order"),
        Index("ix_modules_license_type", "license_type"),
        Index("ix_modules_download_count", "download_count"),
    )

    def __repr__(self) -> str:
        return f"<Module {self.technical_name} ({self.display_name})>"

    @property
    def is_free(self) -> bool:
        return self.license_type == "free"

    @property
    def is_published(self) -> bool:
        return self.status == "published"

    @property
    def latest_version(self) -> Optional["ModuleVersion"]:
        """Get latest published version."""
        for version in self.versions:
            if version.is_latest:
                return version
        return self.versions[0] if self.versions else None


class ModuleVersion(Base, TimestampMixin):
    """
    Module version with downloadable assets.

    Each module can have multiple versions.
    """
    __tablename__ = "marketplace_module_versions"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Version Info
    version = Column(String(50), nullable=False)
    semver_major = Column(Integer, nullable=True)
    semver_minor = Column(Integer, nullable=True)
    semver_patch = Column(Integer, nullable=True)
    semver_prerelease = Column(String(50), nullable=True)  # alpha, beta, rc1

    # Files
    zip_file_url = Column(String(500), nullable=False)
    zip_file_path = Column(String(500), nullable=True)  # Internal storage path
    zip_file_size = Column(BigInteger, nullable=True)
    zip_file_hash = Column(String(64), nullable=True)  # SHA-256

    # Code Signing
    signature = Column(Text, nullable=True)  # ECDSA signature
    signed_at = Column(DateTime(timezone=True), nullable=True)
    signing_key_id = Column(String(64), nullable=True)

    # Manifest (cached from __manifest__.py)
    manifest = Column(JSONB, default=dict)

    # Changelog
    changelog = Column(Text, nullable=True)  # Markdown
    release_notes = Column(Text, nullable=True)

    # Compatibility
    min_fastvue_version = Column(String(20), nullable=True)
    max_fastvue_version = Column(String(20), nullable=True)
    min_python_version = Column(String(10), nullable=True)

    # Dependencies (from manifest)
    dependencies = Column(JSONB, default=list)
    external_dependencies = Column(JSONB, default=dict)

    # Status
    status = Column(String(20), default="draft", index=True)  # draft, pending, published, deprecated, yanked
    is_latest = Column(Boolean, default=False, index=True)
    is_prerelease = Column(Boolean, default=False)
    is_security_update = Column(Boolean, default=False)

    # Review (for paid modules)
    review_status = Column(String(20), nullable=True)  # pending, approved, rejected
    review_notes = Column(Text, nullable=True)
    reviewed_by = Column(Integer, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Publishing
    published_at = Column(DateTime(timezone=True), nullable=True)
    published_by = Column(Integer, nullable=True)
    deprecated_at = Column(DateTime(timezone=True), nullable=True)
    deprecation_message = Column(Text, nullable=True)

    # Stats
    download_count = Column(BigInteger, default=0)
    install_count = Column(BigInteger, default=0)

    # Relationships
    module: "MarketplaceModule" = relationship("MarketplaceModule", back_populates="versions")

    __table_args__ = (
        UniqueConstraint("module_id", "version", name="uq_module_version"),
        Index("ix_versions_status", "status"),
        Index("ix_versions_latest", "is_latest"),
        Index("ix_versions_published", "published_at"),
    )

    def __repr__(self) -> str:
        return f"<Version {self.module.technical_name if self.module else '?'}@{self.version}>"

    @classmethod
    def parse_semver(cls, version_string: str) -> tuple:
        """Parse semantic version string."""
        import re
        match = re.match(r"^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$", version_string)
        if match:
            return (
                int(match.group(1)),
                int(match.group(2)),
                int(match.group(3)),
                match.group(4),
            )
        return (0, 0, 0, None)


class ModuleTag(Base, TimestampMixin):
    """
    Predefined tags for modules.

    Normalized tag storage for filtering.
    """
    __tablename__ = "marketplace_tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(200), nullable=True)

    # Stats
    module_count = Column(Integer, default=0)

    # Display
    color = Column(String(7), nullable=True)
    icon = Column(String(50), nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)


class ModuleScreenshot(Base, TimestampMixin):
    """
    Module screenshots with metadata.

    Separate table for better querying and ordering.
    """
    __tablename__ = "marketplace_screenshots"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Image
    url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)

    # Metadata
    caption = Column(String(200), nullable=True)
    alt_text = Column(String(200), nullable=True)
    order = Column(Integer, default=0)

    # Type
    screenshot_type = Column(String(20), default="desktop")  # desktop, mobile, tablet

    # Relationships
    module = relationship("MarketplaceModule", backref="screenshot_list")

    __table_args__ = (
        Index("ix_screenshots_order", "module_id", "order"),
    )


class ModuleDependency(Base, TimestampMixin):
    """
    Module dependency relationships.

    Tracks which modules depend on which.
    """
    __tablename__ = "marketplace_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    depends_on_id = Column(
        Integer,
        ForeignKey("marketplace_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Version constraints
    min_version = Column(String(50), nullable=True)
    max_version = Column(String(50), nullable=True)
    version_constraint = Column(String(100), nullable=True)  # e.g., ">=1.0,<2.0"

    # Type
    dependency_type = Column(String(20), default="required")  # required, optional, dev

    # Relationships
    module = relationship(
        "MarketplaceModule",
        foreign_keys=[module_id],
        backref="dependency_list"
    )
    depends_on = relationship(
        "MarketplaceModule",
        foreign_keys=[depends_on_id],
        backref="dependents"
    )

    __table_args__ = (
        UniqueConstraint("module_id", "depends_on_id", name="uq_module_dependency"),
    )
