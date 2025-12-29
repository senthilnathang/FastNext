"""
Marketplace Security Models

Code signing, security scanning, and integrity verification.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional, List

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from .publisher import Publisher
    from .module import ModuleVersion


class SigningKey(Base, TimestampMixin):
    """
    Publisher signing keys for module integrity verification.

    Each publisher can have multiple keys (for rotation).
    """
    __tablename__ = "marketplace_signing_keys"

    id = Column(Integer, primary_key=True, index=True)
    publisher_id = Column(
        Integer,
        ForeignKey("marketplace_publishers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Key identification
    key_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)

    # Key type and algorithm
    algorithm = Column(String(20), default="ed25519")  # ed25519, rsa, ecdsa
    key_size = Column(Integer, nullable=True)  # For RSA

    # Public key (stored in PEM format)
    public_key = Column(Text, nullable=False)

    # Private key fingerprint (for verification, actual key stored securely)
    private_key_fingerprint = Column(String(64), nullable=True)

    # Key status
    status = Column(String(20), default="active", index=True)  # active, revoked, expired
    is_primary = Column(Boolean, default=False)

    # Validity
    issued_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revocation_reason = Column(Text, nullable=True)

    # Usage tracking
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    signature_count = Column(Integer, default=0)

    # Relationships
    publisher = relationship("Publisher", backref="signing_keys")

    __table_args__ = (
        Index("ix_signing_keys_publisher_status", "publisher_id", "status"),
        Index("ix_signing_keys_primary", "publisher_id", "is_primary"),
    )

    def __repr__(self) -> str:
        return f"<SigningKey {self.key_id[:8]}... ({self.algorithm})>"

    @property
    def is_valid(self) -> bool:
        """Check if key is currently valid."""
        if self.status != "active":
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True


class ModuleSignature(Base, TimestampMixin):
    """
    Cryptographic signature for a module version.

    Provides integrity verification and non-repudiation.
    """
    __tablename__ = "marketplace_module_signatures"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(
        Integer,
        ForeignKey("marketplace_module_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    signing_key_id = Column(
        Integer,
        ForeignKey("marketplace_signing_keys.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Signature data
    signature = Column(Text, nullable=False)
    signature_algorithm = Column(String(50), nullable=False)  # ed25519, rsa-sha256, ecdsa-sha256

    # What was signed
    signed_content_hash = Column(String(64), nullable=False)  # SHA-256 of content
    signed_manifest_hash = Column(String(64), nullable=True)  # SHA-256 of manifest

    # Verification status
    verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_error = Column(Text, nullable=True)

    # Timestamp
    signed_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    signed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Timestamping authority (optional)
    tsa_timestamp = Column(Text, nullable=True)
    tsa_response = Column(JSONB, nullable=True)

    # Relationships
    version = relationship("ModuleVersion", backref="signatures")
    signing_key = relationship("SigningKey")

    __table_args__ = (
        Index("ix_signatures_version", "version_id"),
        Index("ix_signatures_verified", "verified"),
    )


class SecurityScan(Base, TimestampMixin):
    """
    Security scan results for module versions.

    Automated scanning for vulnerabilities and policy violations.
    """
    __tablename__ = "marketplace_security_scans"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(
        Integer,
        ForeignKey("marketplace_module_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Scan identification
    scan_id = Column(String(64), unique=True, nullable=False, index=True)
    scan_type = Column(String(50), nullable=False)  # full, quick, dependency, code

    # Status
    status = Column(String(20), default="pending", index=True)  # pending, running, completed, failed
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Results summary
    result = Column(String(20), nullable=True)  # passed, warning, failed
    risk_score = Column(Integer, nullable=True)  # 0-100

    # Issue counts
    critical_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)
    info_count = Column(Integer, default=0)

    # Detailed findings
    findings = Column(JSONB, default=list)  # [{type, severity, message, location, recommendation}]

    # Dependency scan results
    dependency_vulnerabilities = Column(JSONB, default=list)  # CVE findings
    outdated_dependencies = Column(JSONB, default=list)

    # Code analysis results
    code_issues = Column(JSONB, default=list)  # Linting, security patterns

    # Policy violations
    policy_violations = Column(JSONB, default=list)  # Marketplace policy checks

    # Scanner info
    scanner_version = Column(String(50), nullable=True)
    scan_duration_ms = Column(Integer, nullable=True)

    # Error handling
    error_message = Column(Text, nullable=True)
    error_details = Column(JSONB, nullable=True)

    # Relationships
    version = relationship("ModuleVersion", backref="security_scans")

    __table_args__ = (
        Index("ix_scans_version_status", "version_id", "status"),
        Index("ix_scans_result", "result"),
    )

    def __repr__(self) -> str:
        return f"<SecurityScan {self.scan_id[:8]}... - {self.result}>"

    @property
    def has_blocking_issues(self) -> bool:
        """Check if scan has issues that should block publishing."""
        return self.critical_count > 0 or self.high_count > 0


class SecurityPolicy(Base, TimestampMixin):
    """
    Security policies for marketplace modules.

    Defines rules that modules must comply with.
    """
    __tablename__ = "marketplace_security_policies"

    id = Column(Integer, primary_key=True, index=True)

    # Policy identification
    code = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Policy type
    policy_type = Column(String(50), nullable=False)  # code, dependency, manifest, content

    # Rule definition
    rule = Column(JSONB, nullable=False)  # Policy-specific rule definition

    # Severity
    severity = Column(String(20), default="medium")  # critical, high, medium, low, info

    # Enforcement
    is_active = Column(Boolean, default=True)
    is_blocking = Column(Boolean, default=False)  # Blocks publishing if violated

    # Applicability
    applies_to_free = Column(Boolean, default=True)
    applies_to_paid = Column(Boolean, default=True)

    # Message
    violation_message = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_policies_type", "policy_type"),
        Index("ix_policies_active", "is_active"),
    )


class TrustedPublisher(Base, TimestampMixin):
    """
    Trusted publishers with enhanced privileges.

    Verified publishers may skip certain checks.
    """
    __tablename__ = "marketplace_trusted_publishers"

    id = Column(Integer, primary_key=True, index=True)
    publisher_id = Column(
        Integer,
        ForeignKey("marketplace_publishers.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    # Trust level
    trust_level = Column(String(20), default="basic")  # basic, verified, partner

    # Privileges
    skip_code_review = Column(Boolean, default=False)
    skip_security_scan = Column(Boolean, default=False)
    auto_publish = Column(Boolean, default=False)
    extended_api_limits = Column(Boolean, default=False)

    # Verification
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verification_method = Column(String(50), nullable=True)  # identity, organization, partner
    verification_docs = Column(JSONB, default=list)

    # Status
    status = Column(String(20), default="active")  # active, suspended, revoked
    suspended_at = Column(DateTime(timezone=True), nullable=True)
    suspension_reason = Column(Text, nullable=True)

    # Notes
    internal_notes = Column(Text, nullable=True)

    # Relationships
    publisher = relationship("Publisher", backref="trusted_status")

    __table_args__ = (
        Index("ix_trusted_status", "status"),
        Index("ix_trusted_level", "trust_level"),
    )
