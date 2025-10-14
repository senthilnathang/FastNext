"""
Zero-Trust Security Architecture for FastNext Framework
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import hashlib
import secrets
import json

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.user import User
from app.core.config import settings


class TrustLevel(Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SecurityContext:
    """Security context for zero-trust evaluation"""
    user_id: str
    session_id: str
    ip_address: str
    user_agent: str
    device_fingerprint: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    risk_score: int = 0
    trust_level: TrustLevel = TrustLevel.NONE
    last_activity: Optional[datetime] = None
    authentication_factors: Optional[List[str]] = None
    permissions: Optional[List[str]] = None

    def __post_init__(self):
        if self.last_activity is None:
            self.last_activity = datetime.utcnow()
        if self.authentication_factors is None:
            self.authentication_factors = []
        if self.permissions is None:
            self.permissions = []


class ZeroTrustSecurity:
    """
    Zero-Trust Security Architecture implementation
    """

    # In-memory storage for security contexts (in production, use Redis/database)
    _security_contexts: Dict[str, SecurityContext] = {}
    _device_fingerprints: Dict[str, Dict[str, Any]] = {}
    _risk_indicators: Dict[str, List[Dict[str, Any]]] = {}

    @staticmethod
    def create_security_context(
        user: User,
        session_id: str,
        ip_address: str,
        user_agent: str,
        device_fingerprint: Optional[str] = None,
        location: Optional[Dict[str, Any]] = None
    ) -> SecurityContext:
        """
        Create a new security context for zero-trust evaluation
        """
        context = SecurityContext(
            user_id=str(user.id),
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
            location=location,
            trust_level=TrustLevel.LOW,  # Start with low trust
            authentication_factors=["password"]  # Basic auth
        )

        ZeroTrustSecurity._security_contexts[session_id] = context
        return context

    @staticmethod
    def evaluate_trust_level(context: SecurityContext, db: Session) -> TrustLevel:
        """
        Evaluate trust level based on multiple factors
        """
        score = 0
        max_score = 100

        # Factor 1: Authentication strength (30 points)
        auth_factors = context.authentication_factors or []
        auth_score = len(auth_factors) * 10
        if "mfa" in auth_factors:
            auth_score += 10
        if "biometric" in auth_factors:
            auth_score += 10
        score += min(auth_score, 30)

        # Factor 2: Device trust (20 points)
        if context.device_fingerprint:
            device_history = ZeroTrustSecurity._device_fingerprints.get(context.device_fingerprint, {})
            if device_history.get("trusted", False):
                score += 20
            elif device_history.get("suspicious", False):
                score -= 10

        # Factor 3: Location consistency (15 points)
        if context.location:
            # Check if location is consistent with user's known locations
            known_locations = ZeroTrustSecurity._get_user_known_locations(context.user_id, db)
            if ZeroTrustSecurity._is_location_consistent(context.location, known_locations):
                score += 15
            else:
                score -= 5

        # Factor 4: Behavioral patterns (15 points)
        behavior_score = ZeroTrustSecurity._evaluate_behavior(context)
        score += behavior_score

        # Factor 5: Time-based factors (10 points)
        if ZeroTrustSecurity._is_normal_hours(context):
            score += 10
        else:
            score -= 5

        # Factor 6: Risk indicators (10 points)
        risk_indicators = ZeroTrustSecurity._risk_indicators.get(context.user_id, [])
        active_risks = [r for r in risk_indicators if r.get("active", False)]
        risk_penalty = len(active_risks) * 2
        score -= min(risk_penalty, 10)

        # Determine trust level based on score
        if score >= 80:
            return TrustLevel.CRITICAL
        elif score >= 60:
            return TrustLevel.HIGH
        elif score >= 40:
            return TrustLevel.MEDIUM
        elif score >= 20:
            return TrustLevel.LOW
        else:
            return TrustLevel.NONE

    @staticmethod
    def check_least_privilege_access(
        context: SecurityContext,
        resource: str,
        action: str,
        db: Session
    ) -> bool:
        """
        Check if user has least-privilege access to perform action on resource
        """
        # Get user's permissions for this resource
        user_permissions = ZeroTrustSecurity._get_user_permissions(context.user_id, resource, db)

        # Check if action is allowed
        required_permission = f"{resource}:{action}"

        # Implement least privilege: only allow specific permissions
        if required_permission in user_permissions:
            # Log the access for audit
            ZeroTrustSecurity._log_access_attempt(context, resource, action, True)
            return True

        # Check for wildcard permissions (admin access)
        if f"{resource}:*" in user_permissions or "*:*" in user_permissions:
            ZeroTrustSecurity._log_access_attempt(context, resource, action, True)
            return True

        # Access denied
        ZeroTrustSecurity._log_access_attempt(context, resource, action, False)
        return False

    @staticmethod
    def continuous_authentication_check(context: SecurityContext) -> bool:
        """
        Perform continuous authentication validation
        """
        now = datetime.utcnow()

        # Check session timeout
        if context.last_activity and (now - context.last_activity) > timedelta(hours=8):
            return False

        # Check for suspicious behavior
        if ZeroTrustSecurity._detect_anomalous_behavior(context):
            return False

        # Update last activity
        context.last_activity = now
        return True

    @staticmethod
    def enforce_micro_segmentation(
        context: SecurityContext,
        target_resource: str,
        network_segment: str
    ) -> bool:
        """
        Enforce micro-segmentation network controls
        """
        # Check if the request is coming from an allowed network segment
        allowed_segments = ZeroTrustSecurity._get_allowed_segments(context.user_id, target_resource)

        if network_segment not in allowed_segments:
            ZeroTrustSecurity._log_security_event(
                "micro_segmentation_violation",
                context,
                {"target_resource": target_resource, "network_segment": network_segment}
            )
            return False

        return True

    @staticmethod
    def apply_security_policies(context: SecurityContext, db: Session) -> List[str]:
        """
        Apply security policies based on context
        """
        policies_applied = []

        # Policy 1: High-risk users get additional monitoring
        if context.risk_score > 70:
            policies_applied.append("enhanced_monitoring")
            ZeroTrustSecurity._enable_enhanced_monitoring(context)

        # Policy 2: Untrusted devices get step-up authentication
        if context.trust_level in [TrustLevel.NONE, TrustLevel.LOW]:
            policies_applied.append("step_up_authentication")
            ZeroTrustSecurity._require_step_up_auth(context)

        # Policy 3: Suspicious locations trigger additional verification
        if context.location and not ZeroTrustSecurity._is_location_trusted(context.location, context.user_id, db):
            policies_applied.append("location_verification")
            ZeroTrustSecurity._require_location_verification(context)

        # Policy 4: Time-based access controls
        if not ZeroTrustSecurity._is_access_allowed_by_time(context):
            policies_applied.append("time_based_restriction")

        return policies_applied

    @staticmethod
    def _get_user_known_locations(user_id: str, db: Session) -> List[Dict[str, Any]]:
        """Get user's known/approved locations"""
        # In production, query from user_locations table
        return []

    @staticmethod
    def _is_location_consistent(current_location: Dict[str, Any], known_locations: List[Dict[str, Any]]) -> bool:
        """Check if current location is consistent with known locations"""
        if not known_locations:
            return True  # No known locations, assume consistent

        current_country = current_location.get("country")
        for known in known_locations:
            if known.get("country") == current_country:
                return True
        return False

    @staticmethod
    def _evaluate_behavior(context: SecurityContext) -> int:
        """Evaluate user behavior patterns"""
        score = 0

        # Check login patterns
        # Check access patterns
        # Check resource usage patterns

        return min(score, 15)

    @staticmethod
    def _is_normal_hours(context: SecurityContext) -> bool:
        """Check if access is during normal business hours"""
        now = datetime.utcnow()
        hour = now.hour

        # Assume business hours are 6 AM to 10 PM UTC
        return 6 <= hour <= 22

    @staticmethod
    def _detect_anomalous_behavior(context: SecurityContext) -> bool:
        """Detect anomalous user behavior"""
        # Implement behavioral analytics
        # Check for unusual patterns
        return False

    @staticmethod
    def _get_user_permissions(user_id: str, resource: str, db: Session) -> List[str]:
        """Get user permissions for a specific resource"""
        # In production, query from user_permissions table
        return ["read"]  # Default permission

    @staticmethod
    def _log_access_attempt(context: SecurityContext, resource: str, action: str, allowed: bool):
        """Log access attempts for audit"""
        # In production, log to security audit table
        pass

    @staticmethod
    def _log_security_event(event_type: str, context: SecurityContext, details: Dict[str, Any]):
        """Log security events"""
        # In production, log to security_events table
        pass

    @staticmethod
    def _get_allowed_segments(user_id: str, resource: str) -> List[str]:
        """Get allowed network segments for user and resource"""
        # In production, query from network_policies table
        return ["internal", "trusted"]  # Default segments

    @staticmethod
    def _enable_enhanced_monitoring(context: SecurityContext):
        """Enable enhanced monitoring for high-risk users"""
        # Implement enhanced monitoring
        pass

    @staticmethod
    def _require_step_up_auth(context: SecurityContext):
        """Require step-up authentication"""
        # Implement step-up auth requirement
        pass

    @staticmethod
    def _require_location_verification(context: SecurityContext):
        """Require location verification"""
        # Implement location verification
        pass

    @staticmethod
    def _is_location_trusted(location: Dict[str, Any], user_id: str, db: Session) -> bool:
        """Check if location is trusted for user"""
        # In production, check against trusted locations
        return True

    @staticmethod
    def _is_access_allowed_by_time(context: SecurityContext) -> bool:
        """Check if access is allowed based on time policies"""
        # In production, check time-based access policies
        return True