"""
License Service

Handles license management, verification, and activation.
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from ..models.module import MarketplaceModule, ModuleVersion
from ..models.license import (
    License,
    LicenseActivation,
    Order,
    OrderItem,
    Cart,
    Coupon,
)


class LicenseService:
    """Service for managing licenses."""

    def __init__(self, db: Session):
        self.db = db

    # -------------------------------------------------------------------------
    # License Generation
    # -------------------------------------------------------------------------

    def generate_license_key(self) -> str:
        """Generate a unique license key."""
        # Format: XXXX-XXXX-XXXX-XXXX
        parts = [secrets.token_hex(2).upper() for _ in range(4)]
        return "-".join(parts)

    def create_license(
        self,
        user_id: int,
        module_id: int,
        license_type: str,
        order_id: Optional[int] = None,
        expires_at: Optional[datetime] = None,
        max_instances: int = 1,
        is_trial: bool = False,
        trial_days: Optional[int] = None,
    ) -> License:
        """
        Create a new license.

        Args:
            user_id: User receiving the license
            module_id: Module being licensed
            license_type: free, purchase, subscription, trial
            order_id: Associated order (for purchases)
            expires_at: License expiration date
            max_instances: Maximum activation instances
            is_trial: Whether this is a trial license
            trial_days: Trial period in days

        Returns:
            Created License instance
        """
        license_key = self.generate_license_key()

        # Ensure unique key
        while self.db.query(License).filter(License.license_key == license_key).first():
            license_key = self.generate_license_key()

        # Calculate trial expiration
        trial_ends_at = None
        if is_trial and trial_days:
            trial_ends_at = datetime.utcnow() + timedelta(days=trial_days)
            if not expires_at:
                expires_at = trial_ends_at

        license = License(
            license_key=license_key,
            user_id=user_id,
            module_id=module_id,
            license_type=license_type,
            order_id=order_id,
            status="active",
            issued_at=datetime.utcnow(),
            expires_at=expires_at,
            max_instances=max_instances,
            is_trial=is_trial,
            trial_ends_at=trial_ends_at,
        )

        self.db.add(license)
        self.db.commit()
        self.db.refresh(license)
        return license

    def create_free_license(self, user_id: int, module_id: int) -> License:
        """Create a free license for a user."""
        # Check if user already has a license
        existing = self.get_user_license(user_id, module_id)
        if existing:
            return existing

        return self.create_license(
            user_id=user_id,
            module_id=module_id,
            license_type="free",
            max_instances=999,  # Unlimited for free
        )

    def create_trial_license(self, user_id: int, module_id: int, days: int = 14) -> License:
        """Create a trial license for a user."""
        # Check if user already had a trial
        existing_trial = self.db.query(License).filter(
            and_(
                License.user_id == user_id,
                License.module_id == module_id,
                License.is_trial == True,
            )
        ).first()

        if existing_trial:
            raise ValueError("User already used trial for this module")

        return self.create_license(
            user_id=user_id,
            module_id=module_id,
            license_type="trial",
            is_trial=True,
            trial_days=days,
            max_instances=1,
        )

    # -------------------------------------------------------------------------
    # License Retrieval
    # -------------------------------------------------------------------------

    def get_license(self, license_id: int) -> Optional[License]:
        """Get license by ID."""
        return self.db.query(License).options(
            joinedload(License.module),
            joinedload(License.activations),
        ).filter(License.id == license_id).first()

    def get_license_by_key(self, license_key: str) -> Optional[License]:
        """Get license by key."""
        return self.db.query(License).options(
            joinedload(License.module),
            joinedload(License.activations),
        ).filter(License.license_key == license_key).first()

    def get_user_license(self, user_id: int, module_id: int) -> Optional[License]:
        """Get user's license for a specific module."""
        return self.db.query(License).filter(
            and_(
                License.user_id == user_id,
                License.module_id == module_id,
                License.status == "active",
            )
        ).first()

    def get_user_licenses(
        self,
        user_id: int,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[License]:
        """Get all licenses for a user."""
        query = self.db.query(License).filter(License.user_id == user_id)

        if status:
            query = query.filter(License.status == status)

        return query.options(
            joinedload(License.module)
        ).order_by(License.created_at.desc()).limit(limit).all()

    # -------------------------------------------------------------------------
    # License Verification
    # -------------------------------------------------------------------------

    def verify_license(
        self,
        license_key: str,
        instance_id: str,
        domain: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Verify a license key.

        Args:
            license_key: License key to verify
            instance_id: Instance/machine identifier
            domain: Optional domain for validation

        Returns:
            Verification result with status and details
        """
        license = self.get_license_by_key(license_key)

        if not license:
            return {
                "valid": False,
                "error": "invalid_license",
                "message": "License key not found",
            }

        # Check status
        if license.status != "active":
            return {
                "valid": False,
                "error": "license_inactive",
                "message": f"License is {license.status}",
            }

        # Check expiration
        if license.expires_at and datetime.utcnow() > license.expires_at:
            return {
                "valid": False,
                "error": "license_expired",
                "message": "License has expired",
                "expired_at": license.expires_at.isoformat(),
            }

        # Check domain restriction
        if license.instance_domains and domain:
            if domain not in license.instance_domains:
                return {
                    "valid": False,
                    "error": "domain_not_allowed",
                    "message": f"Domain {domain} not allowed",
                    "allowed_domains": license.instance_domains,
                }

        # Check instance activation
        activation = self.db.query(LicenseActivation).filter(
            and_(
                LicenseActivation.license_id == license.id,
                LicenseActivation.instance_id == instance_id,
                LicenseActivation.status == "active",
            )
        ).first()

        if not activation:
            # Check if can activate
            if license.active_instances >= license.max_instances:
                return {
                    "valid": False,
                    "error": "max_instances_reached",
                    "message": f"Maximum {license.max_instances} instances allowed",
                    "active_instances": license.active_instances,
                }

            # Auto-activate if not found
            activation = self.activate_license(license_key, instance_id, domain)

        # Update verification timestamp
        activation.last_check = datetime.utcnow()
        activation.check_count += 1
        license.last_verified_at = datetime.utcnow()
        self.db.commit()

        return {
            "valid": True,
            "license_type": license.license_type,
            "module_id": license.module_id,
            "module_name": license.module.technical_name if license.module else None,
            "expires_at": license.expires_at.isoformat() if license.expires_at else None,
            "is_trial": license.is_trial,
            "trial_ends_at": license.trial_ends_at.isoformat() if license.trial_ends_at else None,
            "features": {},  # Could include tier-specific features
            "instance_id": instance_id,
            "activation_id": activation.id,
        }

    # -------------------------------------------------------------------------
    # License Activation
    # -------------------------------------------------------------------------

    def activate_license(
        self,
        license_key: str,
        instance_id: str,
        domain: Optional[str] = None,
        instance_name: Optional[str] = None,
        ip_address: Optional[str] = None,
        server_info: Optional[Dict] = None,
    ) -> LicenseActivation:
        """
        Activate a license on an instance.

        Args:
            license_key: License key
            instance_id: Unique instance identifier
            domain: Domain where module is installed
            instance_name: Friendly name for instance
            ip_address: Server IP address
            server_info: Additional server information

        Returns:
            LicenseActivation instance
        """
        license = self.get_license_by_key(license_key)
        if not license:
            raise ValueError("License not found")

        if not license.can_activate:
            raise ValueError("License cannot accept new activations")

        # Check for existing activation
        existing = self.db.query(LicenseActivation).filter(
            and_(
                LicenseActivation.license_id == license.id,
                LicenseActivation.instance_id == instance_id,
            )
        ).first()

        if existing:
            if existing.status == "active":
                return existing
            # Reactivate
            existing.status = "active"
            existing.activated_at = datetime.utcnow()
            existing.deactivated_at = None
            self.db.commit()
            self.db.refresh(existing)
            return existing

        # Create new activation
        activation = LicenseActivation(
            license_id=license.id,
            instance_id=instance_id,
            instance_name=instance_name,
            domain=domain,
            ip_address=ip_address,
            server_info=server_info,
            status="active",
            activated_at=datetime.utcnow(),
        )

        self.db.add(activation)

        # Update license active count
        license.active_instances += 1
        if not license.activated_at:
            license.activated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(activation)
        return activation

    def deactivate_license(
        self,
        license_key: str,
        instance_id: str,
    ) -> bool:
        """Deactivate a license from an instance."""
        license = self.get_license_by_key(license_key)
        if not license:
            return False

        activation = self.db.query(LicenseActivation).filter(
            and_(
                LicenseActivation.license_id == license.id,
                LicenseActivation.instance_id == instance_id,
                LicenseActivation.status == "active",
            )
        ).first()

        if not activation:
            return False

        activation.status = "deactivated"
        activation.deactivated_at = datetime.utcnow()

        license.active_instances = max(0, license.active_instances - 1)

        self.db.commit()
        return True

    # -------------------------------------------------------------------------
    # License Management
    # -------------------------------------------------------------------------

    def cancel_license(self, license_id: int, reason: Optional[str] = None) -> License:
        """Cancel a license."""
        license = self.get_license(license_id)
        if not license:
            raise ValueError("License not found")

        license.status = "cancelled"
        license.cancelled_at = datetime.utcnow()
        if reason:
            license.internal_notes = reason

        # Deactivate all activations
        self.db.query(LicenseActivation).filter(
            and_(
                LicenseActivation.license_id == license.id,
                LicenseActivation.status == "active",
            )
        ).update({
            "status": "deactivated",
            "deactivated_at": datetime.utcnow(),
        })

        license.active_instances = 0

        self.db.commit()
        self.db.refresh(license)
        return license

    def extend_license(
        self,
        license_id: int,
        days: Optional[int] = None,
        new_expiry: Optional[datetime] = None,
    ) -> License:
        """Extend license expiration."""
        license = self.get_license(license_id)
        if not license:
            raise ValueError("License not found")

        if new_expiry:
            license.expires_at = new_expiry
        elif days:
            base = license.expires_at or datetime.utcnow()
            license.expires_at = base + timedelta(days=days)

        if license.status == "expired":
            license.status = "active"

        self.db.commit()
        self.db.refresh(license)
        return license

    def convert_trial(self, license_id: int, order_id: int) -> License:
        """Convert trial license to paid."""
        license = self.get_license(license_id)
        if not license:
            raise ValueError("License not found")

        if not license.is_trial:
            raise ValueError("License is not a trial")

        license.license_type = "purchase"
        license.is_trial = False
        license.converted_from_trial = True
        license.order_id = order_id
        license.expires_at = None  # Perpetual for one-time purchase

        self.db.commit()
        self.db.refresh(license)
        return license

    # -------------------------------------------------------------------------
    # Subscription Management
    # -------------------------------------------------------------------------

    def update_subscription(
        self,
        license_id: int,
        subscription_id: str,
        subscription_status: str,
        period_start: datetime,
        period_end: datetime,
    ) -> License:
        """Update subscription details."""
        license = self.get_license(license_id)
        if not license:
            raise ValueError("License not found")

        license.subscription_id = subscription_id
        license.subscription_status = subscription_status
        license.subscription_period_start = period_start
        license.subscription_period_end = period_end
        license.expires_at = period_end

        if subscription_status == "active":
            license.status = "active"
        elif subscription_status in ("cancelled", "unpaid"):
            license.status = "expired"

        self.db.commit()
        self.db.refresh(license)
        return license

    def cancel_subscription(self, license_id: int, at_period_end: bool = True) -> License:
        """Cancel subscription."""
        license = self.get_license(license_id)
        if not license:
            raise ValueError("License not found")

        license.subscription_cancelled_at = datetime.utcnow()
        license.subscription_cancel_at_period_end = at_period_end

        if not at_period_end:
            license.status = "cancelled"
            license.cancelled_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(license)
        return license

    # -------------------------------------------------------------------------
    # License Expiration
    # -------------------------------------------------------------------------

    def get_expiring_licenses(self, days: int = 7) -> List[License]:
        """Get licenses expiring within specified days."""
        threshold = datetime.utcnow() + timedelta(days=days)
        return self.db.query(License).filter(
            and_(
                License.status == "active",
                License.expires_at.isnot(None),
                License.expires_at <= threshold,
                License.expires_at > datetime.utcnow(),
            )
        ).all()

    def expire_licenses(self) -> int:
        """Expire all licenses past their expiration date."""
        count = self.db.query(License).filter(
            and_(
                License.status == "active",
                License.expires_at.isnot(None),
                License.expires_at < datetime.utcnow(),
            )
        ).update({"status": "expired"})

        self.db.commit()
        return count

    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------

    def get_license_stats(self, module_id: int) -> Dict[str, Any]:
        """Get license statistics for a module."""
        total = self.db.query(func.count(License.id)).filter(
            License.module_id == module_id
        ).scalar()

        active = self.db.query(func.count(License.id)).filter(
            and_(
                License.module_id == module_id,
                License.status == "active",
            )
        ).scalar()

        by_type = dict(
            self.db.query(
                License.license_type,
                func.count(License.id)
            ).filter(
                License.module_id == module_id
            ).group_by(License.license_type).all()
        )

        return {
            "total": total,
            "active": active,
            "by_type": by_type,
        }


def get_license_service(db: Session) -> LicenseService:
    """Get license service instance."""
    return LicenseService(db)
