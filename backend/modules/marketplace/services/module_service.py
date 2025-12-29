"""
Module Listing Service

Handles module CRUD, versioning, and search.
"""

import hashlib
import re
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from decimal import Decimal

from sqlalchemy import and_, func, or_, desc
from sqlalchemy.orm import Session, joinedload

from ..models.publisher import Publisher
from ..models.module import (
    MarketplaceCategory,
    MarketplaceModule,
    ModuleVersion,
    ModuleTag,
    ModuleScreenshot,
    ModuleDependency,
)
from ..models.review import RatingSummary


class ModuleService:
    """Service for managing marketplace modules."""

    def __init__(self, db: Session):
        self.db = db

    # -------------------------------------------------------------------------
    # Module CRUD
    # -------------------------------------------------------------------------

    def create_module(
        self,
        publisher_id: int,
        technical_name: str,
        display_name: str,
        short_description: str,
        description: Optional[str] = None,
        category_id: Optional[int] = None,
        license_type: str = "free",
        price: Optional[Decimal] = None,
        tags: Optional[List[str]] = None,
        **kwargs,
    ) -> MarketplaceModule:
        """
        Create a new module listing.

        Args:
            publisher_id: Publisher creating the module
            technical_name: Technical module name (e.g., "sale_management")
            display_name: Display name (e.g., "Sale Management")
            short_description: Short description (max 500 chars)
            description: Full description (Markdown)
            category_id: Optional category ID
            license_type: free, paid, subscription, freemium
            price: Price for paid modules
            tags: List of tag names

        Returns:
            Created MarketplaceModule instance
        """
        # Validate publisher
        publisher = self.db.query(Publisher).filter(Publisher.id == publisher_id).first()
        if not publisher or not publisher.can_publish:
            raise ValueError("Publisher cannot publish modules")

        # Check technical name uniqueness
        if self.db.query(MarketplaceModule).filter(
            MarketplaceModule.technical_name == technical_name
        ).first():
            raise ValueError(f"Module '{technical_name}' already exists")

        # Generate slug
        slug = self._generate_slug(display_name)

        # Parse description to HTML
        description_html = self._render_markdown(description) if description else None

        module = MarketplaceModule(
            publisher_id=publisher_id,
            technical_name=technical_name,
            display_name=display_name,
            slug=slug,
            short_description=short_description,
            description=description,
            description_html=description_html,
            category_id=category_id,
            license_type=license_type,
            price=price,
            status="draft",
            tags=tags or [],
            **{k: v for k, v in kwargs.items() if hasattr(MarketplaceModule, k)},
        )

        self.db.add(module)
        self.db.commit()
        self.db.refresh(module)

        # Initialize rating summary
        self._initialize_rating_summary(module.id)

        return module

    def _generate_slug(self, name: str) -> str:
        """Generate unique slug from name."""
        base_slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

        slug = base_slug
        counter = 1

        while self.db.query(MarketplaceModule).filter(MarketplaceModule.slug == slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        return slug

    def _render_markdown(self, markdown: str) -> str:
        """Render Markdown to HTML."""
        try:
            import markdown as md
            return md.markdown(
                markdown,
                extensions=["fenced_code", "tables", "toc", "nl2br"]
            )
        except ImportError:
            return markdown

    def _initialize_rating_summary(self, module_id: int) -> None:
        """Initialize rating summary for a module."""
        summary = RatingSummary(
            module_id=module_id,
            recalculated_at=datetime.utcnow(),
        )
        self.db.add(summary)
        self.db.commit()

    def get_module(self, module_id: int) -> Optional[MarketplaceModule]:
        """Get module by ID."""
        return self.db.query(MarketplaceModule).options(
            joinedload(MarketplaceModule.publisher),
            joinedload(MarketplaceModule.category),
            joinedload(MarketplaceModule.versions),
        ).filter(MarketplaceModule.id == module_id).first()

    def get_module_by_slug(self, slug: str) -> Optional[MarketplaceModule]:
        """Get module by slug."""
        return self.db.query(MarketplaceModule).options(
            joinedload(MarketplaceModule.publisher),
            joinedload(MarketplaceModule.category),
            joinedload(MarketplaceModule.versions),
        ).filter(MarketplaceModule.slug == slug).first()

    def get_module_by_technical_name(self, technical_name: str) -> Optional[MarketplaceModule]:
        """Get module by technical name."""
        return self.db.query(MarketplaceModule).filter(
            MarketplaceModule.technical_name == technical_name
        ).first()

    def update_module(
        self,
        module_id: int,
        publisher_id: int,
        **kwargs,
    ) -> Optional[MarketplaceModule]:
        """Update module details."""
        module = self.get_module(module_id)
        if not module or module.publisher_id != publisher_id:
            return None

        allowed_fields = {
            "display_name", "short_description", "description",
            "category_id", "license_type", "price", "currency",
            "subscription_monthly_price", "subscription_yearly_price",
            "has_trial", "trial_days", "icon_url", "banner_url",
            "screenshots", "video_url", "tags", "keywords",
            "fastvue_versions", "python_versions", "dependencies",
            "documentation_url", "demo_url", "support_url",
            "visibility", "auto_update_enabled", "show_download_count",
        }

        for key, value in kwargs.items():
            if key in allowed_fields:
                setattr(module, key, value)

        # Re-render description if changed
        if "description" in kwargs and kwargs["description"]:
            module.description_html = self._render_markdown(kwargs["description"])

        module.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(module)
        return module

    def delete_module(self, module_id: int, publisher_id: int) -> bool:
        """Delete (archive) a module."""
        module = self.get_module(module_id)
        if not module or module.publisher_id != publisher_id:
            return False

        # Soft delete by archiving
        module.status = "archived"
        module.archived_at = datetime.utcnow()

        self.db.commit()
        return True

    # -------------------------------------------------------------------------
    # Publishing
    # -------------------------------------------------------------------------

    def submit_for_review(self, module_id: int, publisher_id: int) -> MarketplaceModule:
        """Submit module for review before publishing."""
        module = self.get_module(module_id)
        if not module or module.publisher_id != publisher_id:
            raise ValueError("Module not found")

        if module.status not in ("draft", "rejected"):
            raise ValueError(f"Cannot submit module with status '{module.status}'")

        # Validate module has at least one version
        if not module.versions:
            raise ValueError("Module must have at least one version")

        module.status = "pending"
        self.db.commit()
        self.db.refresh(module)
        return module

    def approve_module(self, module_id: int, reviewer_id: int) -> MarketplaceModule:
        """Approve a pending module (admin action)."""
        module = self.get_module(module_id)
        if not module:
            raise ValueError("Module not found")

        if module.status != "pending":
            raise ValueError(f"Cannot approve module with status '{module.status}'")

        module.status = "published"
        module.published_at = datetime.utcnow()

        # Also publish the latest version
        latest_version = module.versions[0] if module.versions else None
        if latest_version and latest_version.status == "draft":
            latest_version.status = "published"
            latest_version.is_latest = True
            latest_version.published_at = datetime.utcnow()
            latest_version.published_by = reviewer_id

        self.db.commit()
        self.db.refresh(module)
        return module

    def reject_module(
        self,
        module_id: int,
        reviewer_id: int,
        reason: str,
    ) -> MarketplaceModule:
        """Reject a pending module (admin action)."""
        module = self.get_module(module_id)
        if not module:
            raise ValueError("Module not found")

        module.status = "rejected"
        module.rejection_reason = reason

        self.db.commit()
        self.db.refresh(module)
        return module

    def publish_module(self, module_id: int, publisher_id: int) -> MarketplaceModule:
        """Directly publish a free module (auto-approve)."""
        module = self.get_module(module_id)
        if not module or module.publisher_id != publisher_id:
            raise ValueError("Module not found")

        # Only free modules can be auto-published
        if module.license_type != "free":
            raise ValueError("Paid modules require review")

        if not module.versions:
            raise ValueError("Module must have at least one version")

        module.status = "published"
        module.published_at = datetime.utcnow()

        # Publish latest version
        latest_version = module.versions[0] if module.versions else None
        if latest_version and latest_version.status == "draft":
            latest_version.status = "published"
            latest_version.is_latest = True
            latest_version.published_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(module)
        return module

    # -------------------------------------------------------------------------
    # Versions
    # -------------------------------------------------------------------------

    def create_version(
        self,
        module_id: int,
        publisher_id: int,
        version: str,
        zip_file_url: str,
        zip_file_size: Optional[int] = None,
        zip_file_hash: Optional[str] = None,
        changelog: Optional[str] = None,
        manifest: Optional[Dict] = None,
        min_fastvue_version: Optional[str] = None,
        is_prerelease: bool = False,
    ) -> ModuleVersion:
        """
        Create a new module version.

        Args:
            module_id: Module ID
            publisher_id: Publisher ID (for authorization)
            version: Version string (e.g., "1.0.0")
            zip_file_url: URL to uploaded ZIP file
            zip_file_size: File size in bytes
            zip_file_hash: SHA-256 hash
            changelog: Version changelog
            manifest: Parsed manifest data
            min_fastvue_version: Minimum FastVue version required
            is_prerelease: Whether this is a pre-release

        Returns:
            Created ModuleVersion instance
        """
        module = self.get_module(module_id)
        if not module or module.publisher_id != publisher_id:
            raise ValueError("Module not found")

        # Check version uniqueness
        existing = self.db.query(ModuleVersion).filter(
            and_(
                ModuleVersion.module_id == module_id,
                ModuleVersion.version == version,
            )
        ).first()

        if existing:
            raise ValueError(f"Version {version} already exists")

        # Parse semver
        major, minor, patch, prerelease = ModuleVersion.parse_semver(version)

        module_version = ModuleVersion(
            module_id=module_id,
            version=version,
            semver_major=major,
            semver_minor=minor,
            semver_patch=patch,
            semver_prerelease=prerelease,
            zip_file_url=zip_file_url,
            zip_file_size=zip_file_size,
            zip_file_hash=zip_file_hash,
            changelog=changelog,
            manifest=manifest or {},
            min_fastvue_version=min_fastvue_version,
            dependencies=manifest.get("depends", []) if manifest else [],
            external_dependencies=manifest.get("external_dependencies", {}) if manifest else {},
            is_prerelease=is_prerelease,
            status="draft",
        )

        self.db.add(module_version)
        self.db.commit()
        self.db.refresh(module_version)

        return module_version

    def get_version(
        self,
        module_id: int,
        version: str,
    ) -> Optional[ModuleVersion]:
        """Get specific version of a module."""
        return self.db.query(ModuleVersion).filter(
            and_(
                ModuleVersion.module_id == module_id,
                ModuleVersion.version == version,
            )
        ).first()

    def get_latest_version(self, module_id: int) -> Optional[ModuleVersion]:
        """Get latest published version of a module."""
        return self.db.query(ModuleVersion).filter(
            and_(
                ModuleVersion.module_id == module_id,
                ModuleVersion.status == "published",
                ModuleVersion.is_latest == True,
            )
        ).first()

    def publish_version(
        self,
        module_id: int,
        version: str,
        publisher_id: int,
    ) -> ModuleVersion:
        """Publish a version."""
        module = self.get_module(module_id)
        if not module or module.publisher_id != publisher_id:
            raise ValueError("Module not found")

        module_version = self.get_version(module_id, version)
        if not module_version:
            raise ValueError("Version not found")

        # Unset current latest
        self.db.query(ModuleVersion).filter(
            and_(
                ModuleVersion.module_id == module_id,
                ModuleVersion.is_latest == True,
            )
        ).update({"is_latest": False})

        # Publish new version
        module_version.status = "published"
        module_version.is_latest = True
        module_version.published_at = datetime.utcnow()
        module_version.published_by = publisher_id

        self.db.commit()
        self.db.refresh(module_version)
        return module_version

    def deprecate_version(
        self,
        module_id: int,
        version: str,
        publisher_id: int,
        message: Optional[str] = None,
    ) -> ModuleVersion:
        """Deprecate a version."""
        module = self.get_module(module_id)
        if not module or module.publisher_id != publisher_id:
            raise ValueError("Module not found")

        module_version = self.get_version(module_id, version)
        if not module_version:
            raise ValueError("Version not found")

        module_version.status = "deprecated"
        module_version.deprecated_at = datetime.utcnow()
        module_version.deprecation_message = message

        self.db.commit()
        self.db.refresh(module_version)
        return module_version

    # -------------------------------------------------------------------------
    # Search & Discovery
    # -------------------------------------------------------------------------

    def search_modules(
        self,
        query: Optional[str] = None,
        category_id: Optional[int] = None,
        license_type: Optional[str] = None,
        publisher_id: Optional[int] = None,
        tags: Optional[List[str]] = None,
        min_rating: Optional[float] = None,
        min_downloads: Optional[int] = None,
        fastvue_version: Optional[str] = None,
        sort_by: str = "relevance",
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[MarketplaceModule], int]:
        """
        Search and filter modules.

        Returns:
            Tuple of (modules, total_count)
        """
        base_query = self.db.query(MarketplaceModule).filter(
            MarketplaceModule.status == "published"
        )

        # Text search
        if query:
            search_filter = or_(
                MarketplaceModule.display_name.ilike(f"%{query}%"),
                MarketplaceModule.short_description.ilike(f"%{query}%"),
                MarketplaceModule.technical_name.ilike(f"%{query}%"),
            )
            base_query = base_query.filter(search_filter)

        # Filters
        if category_id:
            base_query = base_query.filter(MarketplaceModule.category_id == category_id)

        if license_type:
            base_query = base_query.filter(MarketplaceModule.license_type == license_type)

        if publisher_id:
            base_query = base_query.filter(MarketplaceModule.publisher_id == publisher_id)

        if tags:
            # Module must have all specified tags
            for tag in tags:
                base_query = base_query.filter(
                    MarketplaceModule.tags.contains([tag])
                )

        if min_rating:
            base_query = base_query.filter(
                MarketplaceModule.average_rating >= min_rating
            )

        if min_downloads:
            base_query = base_query.filter(
                MarketplaceModule.download_count >= min_downloads
            )

        if fastvue_version:
            base_query = base_query.filter(
                MarketplaceModule.fastvue_versions.contains([fastvue_version])
            )

        # Count total
        total = base_query.count()

        # Sorting
        if sort_by == "downloads":
            base_query = base_query.order_by(desc(MarketplaceModule.download_count))
        elif sort_by == "rating":
            base_query = base_query.order_by(desc(MarketplaceModule.average_rating))
        elif sort_by == "newest":
            base_query = base_query.order_by(desc(MarketplaceModule.published_at))
        elif sort_by == "updated":
            base_query = base_query.order_by(desc(MarketplaceModule.updated_at))
        elif sort_by == "name":
            base_query = base_query.order_by(MarketplaceModule.display_name)
        else:
            # Default: relevance (by downloads and rating)
            base_query = base_query.order_by(
                desc(MarketplaceModule.download_count + MarketplaceModule.rating_count * 10)
            )

        # Pagination
        modules = base_query.options(
            joinedload(MarketplaceModule.publisher),
            joinedload(MarketplaceModule.category),
        ).offset(offset).limit(limit).all()

        return modules, total

    def get_featured_modules(self, limit: int = 10) -> List[MarketplaceModule]:
        """Get featured modules."""
        return self.db.query(MarketplaceModule).filter(
            and_(
                MarketplaceModule.status == "published",
                MarketplaceModule.featured == True,
                or_(
                    MarketplaceModule.featured_until.is_(None),
                    MarketplaceModule.featured_until > datetime.utcnow(),
                ),
            )
        ).order_by(
            MarketplaceModule.featured_order
        ).limit(limit).all()

    def get_trending_modules(
        self,
        period: str = "week",
        limit: int = 10,
    ) -> List[MarketplaceModule]:
        """Get trending modules based on recent downloads."""
        # Simplified: just order by downloads
        # In production, would calculate trending score based on recent activity
        return self.db.query(MarketplaceModule).filter(
            MarketplaceModule.status == "published"
        ).order_by(
            desc(MarketplaceModule.download_count)
        ).limit(limit).all()

    def get_new_modules(self, limit: int = 10) -> List[MarketplaceModule]:
        """Get recently published modules."""
        return self.db.query(MarketplaceModule).filter(
            MarketplaceModule.status == "published"
        ).order_by(
            desc(MarketplaceModule.published_at)
        ).limit(limit).all()

    # -------------------------------------------------------------------------
    # Categories
    # -------------------------------------------------------------------------

    def get_categories(self, parent_id: Optional[int] = None) -> List[MarketplaceCategory]:
        """Get categories, optionally filtered by parent."""
        query = self.db.query(MarketplaceCategory).filter(
            MarketplaceCategory.is_active == True
        )

        if parent_id is not None:
            query = query.filter(MarketplaceCategory.parent_id == parent_id)
        else:
            query = query.filter(MarketplaceCategory.parent_id.is_(None))

        return query.order_by(MarketplaceCategory.order).all()

    def create_category(
        self,
        name: str,
        description: Optional[str] = None,
        parent_id: Optional[int] = None,
        icon: Optional[str] = None,
    ) -> MarketplaceCategory:
        """Create a new category."""
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

        level = 0
        path = "/"
        if parent_id:
            parent = self.db.query(MarketplaceCategory).filter(
                MarketplaceCategory.id == parent_id
            ).first()
            if parent:
                level = parent.level + 1
                path = f"{parent.path}{parent.id}/"

        category = MarketplaceCategory(
            name=name,
            slug=slug,
            description=description,
            parent_id=parent_id,
            level=level,
            path=path,
            icon=icon,
        )

        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------

    def increment_view_count(self, module_id: int) -> None:
        """Increment module view count."""
        self.db.query(MarketplaceModule).filter(
            MarketplaceModule.id == module_id
        ).update({MarketplaceModule.view_count: MarketplaceModule.view_count + 1})
        self.db.commit()

    def increment_download_count(self, module_id: int, version_id: Optional[int] = None) -> None:
        """Increment module and version download count."""
        self.db.query(MarketplaceModule).filter(
            MarketplaceModule.id == module_id
        ).update({MarketplaceModule.download_count: MarketplaceModule.download_count + 1})

        if version_id:
            self.db.query(ModuleVersion).filter(
                ModuleVersion.id == version_id
            ).update({ModuleVersion.download_count: ModuleVersion.download_count + 1})

        self.db.commit()


def get_module_service(db: Session) -> ModuleService:
    """Get module service instance."""
    return ModuleService(db)
