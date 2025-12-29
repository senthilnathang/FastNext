"""
Publisher Service

Handles publisher registration, profile management, and analytics.
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from ..models.publisher import Publisher, PublisherStats, PublisherPayout, PublisherInvitation
from ..models.module import MarketplaceModule
from ..models.license import Order


class PublisherService:
    """Service for managing publishers."""

    def __init__(self, db: Session):
        self.db = db

    # -------------------------------------------------------------------------
    # Publisher Registration
    # -------------------------------------------------------------------------

    def register_publisher(
        self,
        user_id: int,
        display_name: str,
        company_name: Optional[str] = None,
        bio: Optional[str] = None,
        website: Optional[str] = None,
        support_email: Optional[str] = None,
    ) -> Publisher:
        """
        Register a new publisher.

        Args:
            user_id: User to register as publisher
            display_name: Public display name
            company_name: Optional company name
            bio: Optional biography
            website: Optional website URL
            support_email: Optional support email

        Returns:
            Created Publisher instance
        """
        # Check if already a publisher
        existing = self.db.query(Publisher).filter(Publisher.user_id == user_id).first()
        if existing:
            raise ValueError("User is already a publisher")

        # Generate unique slug
        slug = self._generate_slug(display_name)

        publisher = Publisher(
            user_id=user_id,
            display_name=display_name,
            slug=slug,
            company_name=company_name,
            bio=bio,
            website=website,
            support_email=support_email,
            status="pending",
        )

        self.db.add(publisher)
        self.db.commit()
        self.db.refresh(publisher)

        # Initialize stats
        self._initialize_stats(publisher.id)

        return publisher

    def _generate_slug(self, name: str) -> str:
        """Generate unique slug from name."""
        import re
        base_slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

        slug = base_slug
        counter = 1

        while self.db.query(Publisher).filter(Publisher.slug == slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        return slug

    def _initialize_stats(self, publisher_id: int) -> None:
        """Initialize stats records for a new publisher."""
        stats = PublisherStats(
            publisher_id=publisher_id,
            period="all",
            calculated_at=datetime.utcnow(),
        )
        self.db.add(stats)
        self.db.commit()

    # -------------------------------------------------------------------------
    # Publisher Profile
    # -------------------------------------------------------------------------

    def get_publisher(self, publisher_id: int) -> Optional[Publisher]:
        """Get publisher by ID."""
        return self.db.query(Publisher).filter(Publisher.id == publisher_id).first()

    def get_publisher_by_slug(self, slug: str) -> Optional[Publisher]:
        """Get publisher by slug."""
        return self.db.query(Publisher).filter(Publisher.slug == slug).first()

    def get_publisher_by_user(self, user_id: int) -> Optional[Publisher]:
        """Get publisher by user ID."""
        return self.db.query(Publisher).filter(Publisher.user_id == user_id).first()

    def update_publisher(
        self,
        publisher_id: int,
        **kwargs,
    ) -> Optional[Publisher]:
        """Update publisher profile."""
        publisher = self.get_publisher(publisher_id)
        if not publisher:
            return None

        allowed_fields = {
            "display_name", "company_name", "bio", "website",
            "support_email", "support_url", "logo_url", "banner_url",
            "primary_color", "social_links", "notification_settings",
        }

        for key, value in kwargs.items():
            if key in allowed_fields:
                setattr(publisher, key, value)

        self.db.commit()
        self.db.refresh(publisher)
        return publisher

    # -------------------------------------------------------------------------
    # Verification
    # -------------------------------------------------------------------------

    def request_verification(self, publisher_id: int, verification_type: str) -> Dict[str, Any]:
        """Request publisher verification."""
        publisher = self.get_publisher(publisher_id)
        if not publisher:
            raise ValueError("Publisher not found")

        if publisher.verified:
            return {"status": "already_verified"}

        # In production, this would trigger a verification workflow
        return {
            "status": "pending",
            "message": "Verification request submitted",
            "verification_type": verification_type,
        }

    def verify_publisher(
        self,
        publisher_id: int,
        verification_type: str,
        verified_by: int,
    ) -> Publisher:
        """Mark publisher as verified (admin action)."""
        publisher = self.get_publisher(publisher_id)
        if not publisher:
            raise ValueError("Publisher not found")

        publisher.verified = True
        publisher.verification_date = datetime.utcnow()
        publisher.verification_type = verification_type

        self.db.commit()
        self.db.refresh(publisher)
        return publisher

    # -------------------------------------------------------------------------
    # Status Management
    # -------------------------------------------------------------------------

    def activate_publisher(self, publisher_id: int) -> Publisher:
        """Activate a pending publisher."""
        publisher = self.get_publisher(publisher_id)
        if not publisher:
            raise ValueError("Publisher not found")

        publisher.status = "active"
        publisher.status_reason = None
        publisher.suspended_at = None

        self.db.commit()
        self.db.refresh(publisher)
        return publisher

    def suspend_publisher(self, publisher_id: int, reason: str) -> Publisher:
        """Suspend a publisher."""
        publisher = self.get_publisher(publisher_id)
        if not publisher:
            raise ValueError("Publisher not found")

        publisher.status = "suspended"
        publisher.status_reason = reason
        publisher.suspended_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(publisher)
        return publisher

    # -------------------------------------------------------------------------
    # API Key
    # -------------------------------------------------------------------------

    def generate_api_key(self, publisher_id: int) -> str:
        """Generate new API key for publisher."""
        publisher = self.get_publisher(publisher_id)
        if not publisher:
            raise ValueError("Publisher not found")

        api_key = secrets.token_urlsafe(32)
        publisher.api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()

        self.db.commit()
        return api_key

    def verify_api_key(self, api_key: str) -> Optional[Publisher]:
        """Verify API key and return publisher."""
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        return self.db.query(Publisher).filter(Publisher.api_key_hash == key_hash).first()

    # -------------------------------------------------------------------------
    # Payment Settings
    # -------------------------------------------------------------------------

    def update_payout_settings(
        self,
        publisher_id: int,
        payout_method: str,
        stripe_account_id: Optional[str] = None,
        paypal_email: Optional[str] = None,
        payout_threshold: Optional[Decimal] = None,
    ) -> Publisher:
        """Update payout settings."""
        publisher = self.get_publisher(publisher_id)
        if not publisher:
            raise ValueError("Publisher not found")

        publisher.payout_method = payout_method

        if stripe_account_id:
            publisher.stripe_account_id = stripe_account_id
        if paypal_email:
            publisher.paypal_email = paypal_email
        if payout_threshold:
            publisher.payout_threshold = payout_threshold

        self.db.commit()
        self.db.refresh(publisher)
        return publisher

    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------

    def get_stats(self, publisher_id: int, period: str = "all") -> Optional[PublisherStats]:
        """Get publisher statistics."""
        return self.db.query(PublisherStats).filter(
            and_(
                PublisherStats.publisher_id == publisher_id,
                PublisherStats.period == period,
            )
        ).first()

    def recalculate_stats(self, publisher_id: int) -> PublisherStats:
        """Recalculate all statistics for a publisher."""
        from ..models.review import ModuleReview
        from ..models.analytics import ModuleDownload

        # Get counts
        total_modules = self.db.query(func.count(MarketplaceModule.id)).filter(
            MarketplaceModule.publisher_id == publisher_id
        ).scalar()

        published_modules = self.db.query(func.count(MarketplaceModule.id)).filter(
            and_(
                MarketplaceModule.publisher_id == publisher_id,
                MarketplaceModule.status == "published",
            )
        ).scalar()

        total_downloads = self.db.query(func.sum(MarketplaceModule.download_count)).filter(
            MarketplaceModule.publisher_id == publisher_id
        ).scalar() or 0

        # Get revenue from orders
        from sqlalchemy import text
        revenue_query = """
            SELECT COALESCE(SUM(oi.total_price), 0)
            FROM marketplace_order_items oi
            JOIN marketplace_orders o ON o.id = oi.order_id
            JOIN marketplace_modules m ON m.id = oi.module_id
            WHERE m.publisher_id = :publisher_id
            AND o.payment_status = 'completed'
        """
        total_revenue = self.db.execute(
            text(revenue_query),
            {"publisher_id": publisher_id}
        ).scalar() or Decimal("0.00")

        # Get average rating
        avg_rating = self.db.query(func.avg(MarketplaceModule.average_rating)).filter(
            and_(
                MarketplaceModule.publisher_id == publisher_id,
                MarketplaceModule.average_rating.isnot(None),
            )
        ).scalar()

        total_reviews = self.db.query(func.sum(MarketplaceModule.rating_count)).filter(
            MarketplaceModule.publisher_id == publisher_id
        ).scalar() or 0

        # Update or create stats
        stats = self.get_stats(publisher_id, "all")
        if not stats:
            stats = PublisherStats(publisher_id=publisher_id, period="all")
            self.db.add(stats)

        stats.total_modules = total_modules
        stats.published_modules = published_modules
        stats.total_downloads = total_downloads
        stats.total_revenue = total_revenue
        stats.average_rating = avg_rating
        stats.total_reviews = total_reviews
        stats.calculated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(stats)
        return stats

    # -------------------------------------------------------------------------
    # Payouts
    # -------------------------------------------------------------------------

    def get_pending_earnings(self, publisher_id: int) -> Decimal:
        """Calculate pending earnings for a publisher."""
        publisher = self.get_publisher(publisher_id)
        if not publisher:
            return Decimal("0.00")

        # Get completed orders not yet paid out
        # This is a simplified version
        stats = self.get_stats(publisher_id)
        if not stats:
            return Decimal("0.00")

        return stats.pending_earnings

    def create_payout(
        self,
        publisher_id: int,
        period_start: datetime,
        period_end: datetime,
    ) -> PublisherPayout:
        """Create a payout for a publisher."""
        publisher = self.get_publisher(publisher_id)
        if not publisher:
            raise ValueError("Publisher not found")

        # Calculate earnings for the period
        gross_amount = self.get_pending_earnings(publisher_id)
        platform_fee = gross_amount * (publisher.commission_rate / 100)
        net_amount = gross_amount - platform_fee

        payout = PublisherPayout(
            publisher_id=publisher_id,
            payout_number=f"PO-{secrets.token_hex(8).upper()}",
            gross_amount=gross_amount,
            platform_fee=platform_fee,
            net_amount=net_amount,
            period_start=period_start,
            period_end=period_end,
            status="pending",
            payout_method=publisher.payout_method,
        )

        self.db.add(payout)
        self.db.commit()
        self.db.refresh(payout)
        return payout

    def get_payouts(
        self,
        publisher_id: int,
        status: Optional[str] = None,
        limit: int = 20,
    ) -> List[PublisherPayout]:
        """Get payout history for a publisher."""
        query = self.db.query(PublisherPayout).filter(
            PublisherPayout.publisher_id == publisher_id
        )

        if status:
            query = query.filter(PublisherPayout.status == status)

        return query.order_by(PublisherPayout.created_at.desc()).limit(limit).all()

    # -------------------------------------------------------------------------
    # Listing
    # -------------------------------------------------------------------------

    def list_publishers(
        self,
        status: Optional[str] = None,
        verified: Optional[bool] = None,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Publisher]:
        """List publishers with filters."""
        query = self.db.query(Publisher)

        if status:
            query = query.filter(Publisher.status == status)
        if verified is not None:
            query = query.filter(Publisher.verified == verified)
        if search:
            query = query.filter(
                or_(
                    Publisher.display_name.ilike(f"%{search}%"),
                    Publisher.company_name.ilike(f"%{search}%"),
                )
            )

        return query.order_by(Publisher.created_at.desc()).offset(offset).limit(limit).all()

    def get_top_publishers(self, limit: int = 10) -> List[Publisher]:
        """Get top publishers by downloads."""
        return self.db.query(Publisher).join(
            PublisherStats,
            and_(
                PublisherStats.publisher_id == Publisher.id,
                PublisherStats.period == "all",
            )
        ).filter(
            Publisher.status == "active"
        ).order_by(
            PublisherStats.total_downloads.desc()
        ).limit(limit).all()


def get_publisher_service(db: Session) -> PublisherService:
    """Get publisher service instance."""
    return PublisherService(db)
