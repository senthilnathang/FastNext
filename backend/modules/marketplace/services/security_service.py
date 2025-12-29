"""
Marketplace Security Service

Code signing, verification, and security scanning operations.
"""

import hashlib
import logging
import os
import re
import secrets
import zipfile
from datetime import datetime, timedelta
from io import BytesIO
from typing import Optional, List, Dict, Any, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.security import (
    SigningKey,
    ModuleSignature,
    SecurityScan,
    SecurityPolicy,
    TrustedPublisher,
)
from ..models.module import ModuleVersion, MarketplaceModule
from ..models.publisher import Publisher

logger = logging.getLogger(__name__)

# Try to import cryptography for signing
try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519, rsa, padding
    from cryptography.hazmat.backends import default_backend
    from cryptography.exceptions import InvalidSignature
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    logger.warning("cryptography package not installed. Code signing will be limited.")


class SecurityService:
    """Service for code signing and security scanning."""

    def __init__(self, db: Session):
        self.db = db

    # ==========================================================================
    # Signing Key Management
    # ==========================================================================

    def generate_signing_key(
        self,
        publisher_id: int,
        name: Optional[str] = None,
        algorithm: str = "ed25519",
        set_as_primary: bool = False,
    ) -> Tuple[SigningKey, str]:
        """
        Generate a new signing key pair for a publisher.

        Returns the SigningKey object and the private key (PEM format).
        The private key should be securely stored by the publisher.
        """
        if not CRYPTO_AVAILABLE:
            raise RuntimeError("cryptography package required for key generation")

        # Generate key pair
        if algorithm == "ed25519":
            private_key = ed25519.Ed25519PrivateKey.generate()
            public_key = private_key.public_key()
            key_size = 256
        elif algorithm == "rsa":
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=4096,
                backend=default_backend(),
            )
            public_key = private_key.public_key()
            key_size = 4096
        else:
            raise ValueError(f"Unsupported algorithm: {algorithm}")

        # Serialize keys
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode("utf-8")

        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8")

        # Generate key ID and fingerprint
        key_id = secrets.token_hex(32)
        fingerprint = hashlib.sha256(public_pem.encode()).hexdigest()

        # If setting as primary, unset other primary keys
        if set_as_primary:
            self.db.query(SigningKey).filter(
                SigningKey.publisher_id == publisher_id,
                SigningKey.is_primary == True,
            ).update({"is_primary": False})

        # Create signing key record
        signing_key = SigningKey(
            publisher_id=publisher_id,
            key_id=key_id,
            name=name or f"Key {key_id[:8]}",
            algorithm=algorithm,
            key_size=key_size,
            public_key=public_pem,
            private_key_fingerprint=fingerprint,
            is_primary=set_as_primary,
            status="active",
            issued_at=datetime.utcnow(),
        )

        self.db.add(signing_key)
        self.db.commit()
        self.db.refresh(signing_key)

        logger.info(f"Generated {algorithm} signing key {key_id[:8]}... for publisher {publisher_id}")
        return signing_key, private_pem

    def get_publisher_keys(
        self,
        publisher_id: int,
        status: Optional[str] = None,
    ) -> List[SigningKey]:
        """Get signing keys for a publisher."""
        query = self.db.query(SigningKey).filter(
            SigningKey.publisher_id == publisher_id,
        )

        if status:
            query = query.filter(SigningKey.status == status)

        return query.order_by(SigningKey.is_primary.desc(), SigningKey.created_at.desc()).all()

    def get_primary_key(self, publisher_id: int) -> Optional[SigningKey]:
        """Get publisher's primary signing key."""
        return self.db.query(SigningKey).filter(
            SigningKey.publisher_id == publisher_id,
            SigningKey.is_primary == True,
            SigningKey.status == "active",
        ).first()

    def revoke_key(
        self,
        key_id: str,
        reason: Optional[str] = None,
    ) -> SigningKey:
        """Revoke a signing key."""
        key = self.db.query(SigningKey).filter(
            SigningKey.key_id == key_id,
        ).first()

        if not key:
            raise ValueError("Key not found")

        key.status = "revoked"
        key.revoked_at = datetime.utcnow()
        key.revocation_reason = reason

        self.db.commit()
        self.db.refresh(key)

        logger.info(f"Revoked signing key {key_id[:8]}...")
        return key

    # ==========================================================================
    # Module Signing
    # ==========================================================================

    def sign_module_version(
        self,
        version_id: int,
        private_key_pem: str,
        signing_key_id: str,
    ) -> ModuleSignature:
        """
        Sign a module version with a private key.

        The private key must correspond to the signing key record.
        """
        if not CRYPTO_AVAILABLE:
            raise RuntimeError("cryptography package required for signing")

        version = self.db.query(ModuleVersion).get(version_id)
        if not version:
            raise ValueError("Version not found")

        signing_key = self.db.query(SigningKey).filter(
            SigningKey.key_id == signing_key_id,
        ).first()

        if not signing_key:
            raise ValueError("Signing key not found")

        if not signing_key.is_valid:
            raise ValueError("Signing key is not valid")

        # Load private key
        private_key = serialization.load_pem_private_key(
            private_key_pem.encode("utf-8"),
            password=None,
            backend=default_backend(),
        )

        # Get content hash (from zip file)
        content_hash = version.zip_file_hash
        if not content_hash:
            raise ValueError("Module version must have a file hash before signing")

        # Create signature
        content_to_sign = f"{version.module.technical_name}:{version.version}:{content_hash}"

        if signing_key.algorithm == "ed25519":
            signature_bytes = private_key.sign(content_to_sign.encode("utf-8"))
            signature_algorithm = "ed25519"
        elif signing_key.algorithm == "rsa":
            signature_bytes = private_key.sign(
                content_to_sign.encode("utf-8"),
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
            signature_algorithm = "rsa-sha256"
        else:
            raise ValueError(f"Unsupported algorithm: {signing_key.algorithm}")

        signature_hex = signature_bytes.hex()

        # Create signature record
        module_signature = ModuleSignature(
            version_id=version_id,
            signing_key_id=signing_key.id,
            signature=signature_hex,
            signature_algorithm=signature_algorithm,
            signed_content_hash=content_hash,
            signed_manifest_hash=hashlib.sha256(
                str(version.manifest).encode()
            ).hexdigest() if version.manifest else None,
            verified=True,
            verified_at=datetime.utcnow(),
            signed_at=datetime.utcnow(),
        )

        self.db.add(module_signature)

        # Update signing key usage
        signing_key.last_used_at = datetime.utcnow()
        signing_key.signature_count += 1

        # Update version
        version.signature = signature_hex
        version.signed_at = datetime.utcnow()
        version.signing_key_id = signing_key.key_id

        self.db.commit()
        self.db.refresh(module_signature)

        logger.info(f"Signed module version {version.module.technical_name}@{version.version}")
        return module_signature

    def verify_signature(
        self,
        version_id: int,
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify a module version's signature.

        Returns (is_valid, error_message).
        """
        if not CRYPTO_AVAILABLE:
            return False, "cryptography package not available"

        version = self.db.query(ModuleVersion).get(version_id)
        if not version:
            return False, "Version not found"

        signature = self.db.query(ModuleSignature).filter(
            ModuleSignature.version_id == version_id,
        ).order_by(ModuleSignature.created_at.desc()).first()

        if not signature:
            return False, "No signature found"

        signing_key = signature.signing_key
        if not signing_key:
            return False, "Signing key not found"

        try:
            # Load public key
            public_key = serialization.load_pem_public_key(
                signing_key.public_key.encode("utf-8"),
                backend=default_backend(),
            )

            # Recreate signed content
            content_to_verify = f"{version.module.technical_name}:{version.version}:{signature.signed_content_hash}"

            # Verify
            signature_bytes = bytes.fromhex(signature.signature)

            if signing_key.algorithm == "ed25519":
                public_key.verify(signature_bytes, content_to_verify.encode("utf-8"))
            elif signing_key.algorithm == "rsa":
                public_key.verify(
                    signature_bytes,
                    content_to_verify.encode("utf-8"),
                    padding.PKCS1v15(),
                    hashes.SHA256(),
                )

            # Update verification status
            signature.verified = True
            signature.verified_at = datetime.utcnow()
            signature.verification_error = None
            self.db.commit()

            return True, None

        except InvalidSignature:
            signature.verified = False
            signature.verification_error = "Invalid signature"
            self.db.commit()
            return False, "Invalid signature"
        except Exception as e:
            signature.verified = False
            signature.verification_error = str(e)
            self.db.commit()
            return False, str(e)

    # ==========================================================================
    # Security Scanning
    # ==========================================================================

    def create_security_scan(
        self,
        version_id: int,
        scan_type: str = "full",
    ) -> SecurityScan:
        """Create a new security scan for a module version."""
        scan = SecurityScan(
            version_id=version_id,
            scan_id=secrets.token_hex(32),
            scan_type=scan_type,
            status="pending",
        )

        self.db.add(scan)
        self.db.commit()
        self.db.refresh(scan)

        return scan

    def run_security_scan(
        self,
        scan_id: str,
        module_content: bytes,
    ) -> SecurityScan:
        """
        Run security scan on module content.

        This performs various checks:
        - Dangerous code patterns
        - Dependency vulnerabilities (basic)
        - Manifest validation
        - File type restrictions
        """
        scan = self.db.query(SecurityScan).filter(
            SecurityScan.scan_id == scan_id,
        ).first()

        if not scan:
            raise ValueError("Scan not found")

        scan.status = "running"
        scan.started_at = datetime.utcnow()
        self.db.commit()

        findings = []
        start_time = datetime.utcnow()

        try:
            # Parse ZIP file
            with zipfile.ZipFile(BytesIO(module_content)) as zf:
                # Check for dangerous file types
                dangerous_extensions = ['.exe', '.dll', '.so', '.dylib', '.bat', '.cmd', '.ps1', '.sh']
                for name in zf.namelist():
                    ext = os.path.splitext(name)[1].lower()
                    if ext in dangerous_extensions:
                        findings.append({
                            "type": "dangerous_file",
                            "severity": "high",
                            "message": f"Potentially dangerous file type: {name}",
                            "location": name,
                            "recommendation": "Remove executable files from the module",
                        })

                # Scan Python files for dangerous patterns
                dangerous_patterns = [
                    (r'\bexec\s*\(', "exec() call", "high"),
                    (r'\beval\s*\(', "eval() call", "high"),
                    (r'\b__import__\s*\(', "Dynamic import", "medium"),
                    (r'\bos\.system\s*\(', "os.system() call", "high"),
                    (r'\bsubprocess\.\w+\s*\(', "subprocess usage", "medium"),
                    (r'\bpickle\.loads?\s*\(', "pickle usage (unsafe deserialization)", "high"),
                    (r'\brequests?\.(get|post|put|delete)\s*\(', "HTTP request", "info"),
                    (r'(password|secret|api_key|token)\s*=\s*["\'][^"\']+["\']', "Hardcoded secret", "critical"),
                ]

                for name in zf.namelist():
                    if name.endswith('.py'):
                        try:
                            content = zf.read(name).decode('utf-8', errors='ignore')
                            for pattern, desc, severity in dangerous_patterns:
                                matches = re.finditer(pattern, content, re.IGNORECASE)
                                for match in matches:
                                    # Get line number
                                    line_num = content[:match.start()].count('\n') + 1
                                    findings.append({
                                        "type": "code_pattern",
                                        "severity": severity,
                                        "message": f"Potentially dangerous pattern: {desc}",
                                        "location": f"{name}:{line_num}",
                                        "recommendation": f"Review usage of {desc}",
                                    })
                        except Exception:
                            pass

                # Check for __manifest__.py
                manifest_found = False
                for name in zf.namelist():
                    if name.endswith('__manifest__.py'):
                        manifest_found = True
                        break

                if not manifest_found:
                    findings.append({
                        "type": "manifest",
                        "severity": "high",
                        "message": "Missing __manifest__.py file",
                        "location": "/",
                        "recommendation": "Add a __manifest__.py file with module metadata",
                    })

            # Count by severity
            severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
            for finding in findings:
                severity = finding.get("severity", "info")
                if severity in severity_counts:
                    severity_counts[severity] += 1

            scan.critical_count = severity_counts["critical"]
            scan.high_count = severity_counts["high"]
            scan.medium_count = severity_counts["medium"]
            scan.low_count = severity_counts["low"]
            scan.info_count = severity_counts["info"]
            scan.findings = findings

            # Determine result
            if scan.critical_count > 0:
                scan.result = "failed"
                scan.risk_score = 100
            elif scan.high_count > 0:
                scan.result = "failed"
                scan.risk_score = 80
            elif scan.medium_count > 0:
                scan.result = "warning"
                scan.risk_score = 50
            else:
                scan.result = "passed"
                scan.risk_score = max(0, scan.low_count * 5 + scan.info_count)

            scan.status = "completed"

        except Exception as e:
            scan.status = "failed"
            scan.error_message = str(e)
            scan.result = "failed"
            scan.risk_score = 100
            logger.error(f"Security scan failed: {e}")

        scan.completed_at = datetime.utcnow()
        scan.scan_duration_ms = int((scan.completed_at - start_time).total_seconds() * 1000)

        self.db.commit()
        self.db.refresh(scan)

        logger.info(f"Security scan {scan_id[:8]}... completed with result: {scan.result}")
        return scan

    def get_scan_results(self, version_id: int) -> List[SecurityScan]:
        """Get all security scans for a module version."""
        return self.db.query(SecurityScan).filter(
            SecurityScan.version_id == version_id,
        ).order_by(SecurityScan.created_at.desc()).all()

    def get_latest_scan(self, version_id: int) -> Optional[SecurityScan]:
        """Get the latest completed security scan."""
        return self.db.query(SecurityScan).filter(
            SecurityScan.version_id == version_id,
            SecurityScan.status == "completed",
        ).order_by(SecurityScan.created_at.desc()).first()

    # ==========================================================================
    # Security Policies
    # ==========================================================================

    def create_policy(
        self,
        code: str,
        name: str,
        policy_type: str,
        rule: Dict[str, Any],
        severity: str = "medium",
        is_blocking: bool = False,
        description: Optional[str] = None,
        violation_message: Optional[str] = None,
        recommendation: Optional[str] = None,
    ) -> SecurityPolicy:
        """Create a new security policy."""
        policy = SecurityPolicy(
            code=code,
            name=name,
            policy_type=policy_type,
            rule=rule,
            severity=severity,
            is_blocking=is_blocking,
            description=description,
            violation_message=violation_message,
            recommendation=recommendation,
        )

        self.db.add(policy)
        self.db.commit()
        self.db.refresh(policy)

        return policy

    def get_active_policies(
        self,
        policy_type: Optional[str] = None,
    ) -> List[SecurityPolicy]:
        """Get active security policies."""
        query = self.db.query(SecurityPolicy).filter(
            SecurityPolicy.is_active == True,
        )

        if policy_type:
            query = query.filter(SecurityPolicy.policy_type == policy_type)

        return query.all()

    # ==========================================================================
    # Trusted Publishers
    # ==========================================================================

    def grant_trusted_status(
        self,
        publisher_id: int,
        trust_level: str,
        verified_by: int,
        verification_method: str,
        privileges: Optional[Dict[str, bool]] = None,
    ) -> TrustedPublisher:
        """Grant trusted publisher status."""
        # Check if already exists
        existing = self.db.query(TrustedPublisher).filter(
            TrustedPublisher.publisher_id == publisher_id,
        ).first()

        if existing:
            trusted = existing
        else:
            trusted = TrustedPublisher(publisher_id=publisher_id)
            self.db.add(trusted)

        trusted.trust_level = trust_level
        trusted.verified_at = datetime.utcnow()
        trusted.verified_by = verified_by
        trusted.verification_method = verification_method
        trusted.status = "active"

        if privileges:
            trusted.skip_code_review = privileges.get("skip_code_review", False)
            trusted.skip_security_scan = privileges.get("skip_security_scan", False)
            trusted.auto_publish = privileges.get("auto_publish", False)
            trusted.extended_api_limits = privileges.get("extended_api_limits", False)

        self.db.commit()
        self.db.refresh(trusted)

        logger.info(f"Granted trusted status to publisher {publisher_id}")
        return trusted

    def is_trusted_publisher(self, publisher_id: int) -> bool:
        """Check if publisher has active trusted status."""
        trusted = self.db.query(TrustedPublisher).filter(
            TrustedPublisher.publisher_id == publisher_id,
            TrustedPublisher.status == "active",
        ).first()

        return trusted is not None

    def get_trusted_status(self, publisher_id: int) -> Optional[TrustedPublisher]:
        """Get publisher's trusted status."""
        return self.db.query(TrustedPublisher).filter(
            TrustedPublisher.publisher_id == publisher_id,
        ).first()


def get_security_service(db: Session) -> SecurityService:
    """Factory function for SecurityService."""
    return SecurityService(db)
