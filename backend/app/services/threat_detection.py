"""
Advanced Threat Detection Service for FastNext Framework
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import re
import hashlib
import json

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from app.models.user import User
from app.services.zero_trust_security import SecurityContext, RiskLevel


class ThreatType(Enum):
    BRUTE_FORCE = "brute_force"
    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    CSRF = "csrf"
    DOS = "dos"
    MALWARE = "malware"
    PHISHING = "phishing"
    INSIDER_THREAT = "insider_threat"
    ANOMALOUS_BEHAVIOR = "anomalous_behavior"
    DATA_EXFILTRATION = "data_exfiltration"


class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ThreatIndicator:
    """Represents a detected threat indicator"""
    threat_type: ThreatType
    severity: AlertSeverity
    confidence: float  # 0.0 to 1.0
    description: str
    indicators: Dict[str, Any]
    timestamp: datetime
    source_ip: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None


@dataclass
class SecurityAlert:
    """Represents a security alert"""
    alert_id: str
    threat_indicators: List[ThreatIndicator]
    overall_severity: AlertSeverity
    description: str
    recommended_actions: List[str]
    timestamp: datetime
    status: str = "active"  # active, resolved, false_positive


class ThreatDetection:
    """
    Advanced Threat Detection Service
    """

    # In-memory storage for threat patterns (in production, use database)
    _threat_patterns: Dict[str, Dict[str, Any]] = {}
    _alerts: Dict[str, SecurityAlert] = {}
    _behavior_baselines: Dict[str, Dict[str, Any]] = {}

    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r"(\%27)|(\')|(\-\-)|(\%23)|(#)",  # Basic SQL injection
        r"(\%22)|(\")",  # Double quotes
        r"((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))",  # Union-based
        r"((\%27)|(\'))(\s)*((\%6F)|o|(\%4F))((\%72)|r|(\%52))",  # OR statements
        r"((\%27)|(\'))union",  # Union select
    ]

    # XSS patterns
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",  # Script tags
        r"javascript:",  # JavaScript protocol
        r"on\w+\s*=",  # Event handlers
        r"<iframe[^>]*>",  # Iframes
        r"<object[^>]*>",  # Objects
    ]

    @staticmethod
    def analyze_request(
        request_data: Dict[str, Any],
        context: SecurityContext,
        db: Session
    ) -> List[ThreatIndicator]:
        """
        Analyze request for potential threats
        """
        indicators = []

        # Check for SQL injection
        sql_indicators = ThreatDetection._detect_sql_injection(request_data)
        indicators.extend(sql_indicators)

        # Check for XSS
        xss_indicators = ThreatDetection._detect_xss(request_data)
        indicators.extend(xss_indicators)

        # Check for brute force attempts
        brute_force_indicators = ThreatDetection._detect_brute_force(context, db)
        indicators.extend(brute_force_indicators)

        # Check for DoS patterns
        dos_indicators = ThreatDetection._detect_dos_patterns(context, db)
        indicators.extend(dos_indicators)

        # Behavioral analysis
        behavior_indicators = ThreatDetection._analyze_behavior(context, db)
        indicators.extend(behavior_indicators)

        # Data exfiltration detection
        exfiltration_indicators = ThreatDetection._detect_data_exfiltration(request_data, context)
        indicators.extend(exfiltration_indicators)

        return indicators

    @staticmethod
    def _detect_sql_injection(request_data: Dict[str, Any]) -> List[ThreatIndicator]:
        """Detect SQL injection attempts"""
        indicators = []

        # Check query parameters, body, and headers
        text_to_check = json.dumps(request_data, default=str)

        for pattern in ThreatDetection.SQL_INJECTION_PATTERNS:
            matches = re.findall(pattern, text_to_check, re.IGNORECASE)
            if matches:
                confidence = min(len(matches) * 0.3, 0.9)  # Higher confidence with more matches

                indicator = ThreatIndicator(
                    threat_type=ThreatType.SQL_INJECTION,
                    severity=AlertSeverity.HIGH if confidence > 0.7 else AlertSeverity.MEDIUM,
                    confidence=confidence,
                    description=f"Potential SQL injection detected with pattern: {pattern}",
                    indicators={"pattern": pattern, "matches": len(matches)},
                    timestamp=datetime.utcnow(),
                    source_ip=request_data.get("ip_address", "unknown")
                )
                indicators.append(indicator)

        return indicators

    @staticmethod
    def _detect_xss(request_data: Dict[str, Any]) -> List[ThreatIndicator]:
        """Detect XSS attempts"""
        indicators = []

        text_to_check = json.dumps(request_data, default=str)

        for pattern in ThreatDetection.XSS_PATTERNS:
            matches = re.findall(pattern, text_to_check, re.IGNORECASE)
            if matches:
                confidence = min(len(matches) * 0.4, 0.95)

                indicator = ThreatIndicator(
                    threat_type=ThreatType.XSS,
                    severity=AlertSeverity.HIGH if confidence > 0.8 else AlertSeverity.MEDIUM,
                    confidence=confidence,
                    description=f"Potential XSS attack detected with pattern: {pattern}",
                    indicators={"pattern": pattern, "matches": len(matches)},
                    timestamp=datetime.utcnow(),
                    source_ip=request_data.get("ip_address", "unknown")
                )
                indicators.append(indicator)

        return indicators

    @staticmethod
    def _detect_brute_force(context: SecurityContext, db: Session) -> List[ThreatIndicator]:
        """Detect brute force authentication attempts"""
        indicators = []

        # Check recent failed login attempts from same IP
        # In production, query from failed_login_attempts table
        recent_failures = ThreatDetection._get_recent_failed_logins(context.ip_address, db)

        if recent_failures >= 5:  # Threshold for brute force detection
            confidence = min(recent_failures / 10, 0.95)  # Higher confidence with more failures

            indicator = ThreatIndicator(
                threat_type=ThreatType.BRUTE_FORCE,
                severity=AlertSeverity.HIGH if recent_failures >= 10 else AlertSeverity.MEDIUM,
                confidence=confidence,
                description=f"Brute force attack detected: {recent_failures} failed attempts",
                indicators={"failed_attempts": recent_failures, "time_window": "1_hour"},
                timestamp=datetime.utcnow(),
                source_ip=context.ip_address,
                user_id=context.user_id
            )
            indicators.append(indicator)

        return indicators

    @staticmethod
    def _detect_dos_patterns(context: SecurityContext, db: Session) -> List[ThreatIndicator]:
        """Detect DoS attack patterns"""
        indicators = []

        # Check request frequency from same IP
        request_count = ThreatDetection._get_request_count(context.ip_address, db)

        if request_count >= 100:  # Threshold for DoS detection (requests per minute)
            confidence = min(request_count / 200, 0.95)

            indicator = ThreatIndicator(
                threat_type=ThreatType.DOS,
                severity=AlertSeverity.CRITICAL if request_count >= 500 else AlertSeverity.HIGH,
                confidence=confidence,
                description=f"Potential DoS attack: {request_count} requests per minute",
                indicators={"request_count": request_count, "time_window": "1_minute"},
                timestamp=datetime.utcnow(),
                source_ip=context.ip_address
            )
            indicators.append(indicator)

        return indicators

    @staticmethod
    def _analyze_behavior(context: SecurityContext, db: Session) -> List[ThreatIndicator]:
        """Analyze user behavior for anomalies"""
        indicators = []

        user_baseline = ThreatDetection._get_user_baseline(context.user_id, db)

        # Check login time anomaly
        if user_baseline and not ThreatDetection._is_normal_login_time(context, user_baseline):
            indicator = ThreatIndicator(
                threat_type=ThreatType.ANOMALOUS_BEHAVIOR,
                severity=AlertSeverity.MEDIUM,
                confidence=0.7,
                description="Anomalous login time detected",
                indicators={"expected_hours": user_baseline.get("login_hours", [])},
                timestamp=datetime.utcnow(),
                source_ip=context.ip_address,
                user_id=context.user_id
            )
            indicators.append(indicator)

        # Check location anomaly
        if context.location and user_baseline and not ThreatDetection._is_normal_location(context, user_baseline):
            indicator = ThreatIndicator(
                threat_type=ThreatType.ANOMALOUS_BEHAVIOR,
                severity=AlertSeverity.HIGH,
                confidence=0.8,
                description="Login from unusual location",
                indicators={"location": context.location},
                timestamp=datetime.utcnow(),
                source_ip=context.ip_address,
                user_id=context.user_id
            )
            indicators.append(indicator)

        # Check device anomaly
        if not ThreatDetection._is_trusted_device(context):
            indicator = ThreatIndicator(
                threat_type=ThreatType.ANOMALOUS_BEHAVIOR,
                severity=AlertSeverity.MEDIUM,
                confidence=0.6,
                description="Login from unrecognized device",
                indicators={"user_agent": context.user_agent},
                timestamp=datetime.utcnow(),
                source_ip=context.ip_address,
                user_id=context.user_id
            )
            indicators.append(indicator)

        return indicators

    @staticmethod
    def _detect_data_exfiltration(request_data: Dict[str, Any], context: SecurityContext) -> List[ThreatIndicator]:
        """Detect potential data exfiltration attempts"""
        indicators = []

        # Check for large data exports
        if request_data.get("action") == "export" and request_data.get("record_count", 0) > 10000:
            indicator = ThreatIndicator(
                threat_type=ThreatType.DATA_EXFILTRATION,
                severity=AlertSeverity.HIGH,
                confidence=0.8,
                description="Large data export detected - potential exfiltration",
                indicators={"record_count": request_data.get("record_count")},
                timestamp=datetime.utcnow(),
                source_ip=context.ip_address,
                user_id=context.user_id
            )
            indicators.append(indicator)

        # Check for unusual API usage patterns
        unusual_patterns = ThreatDetection._detect_unusual_api_usage(context, request_data)
        if unusual_patterns:
            indicator = ThreatIndicator(
                threat_type=ThreatType.DATA_EXFILTRATION,
                severity=AlertSeverity.MEDIUM,
                confidence=0.6,
                description="Unusual API usage pattern detected",
                indicators={"patterns": unusual_patterns},
                timestamp=datetime.utcnow(),
                source_ip=context.ip_address,
                user_id=context.user_id
            )
            indicators.append(indicator)

        return indicators

    @staticmethod
    def generate_alert(threat_indicators: List[ThreatIndicator]) -> Optional[SecurityAlert]:
        """
        Generate security alert from threat indicators
        """
        if not threat_indicators:
            return None

        # Determine overall severity
        severity_levels = [indicator.severity for indicator in threat_indicators]
        max_severity = max(severity_levels, key=lambda x: ["low", "medium", "high", "critical"].index(x.value))
        avg_confidence = sum(indicator.confidence for indicator in threat_indicators) / len(threat_indicators)

        # Generate alert ID
        alert_id = f"alert_{int(datetime.utcnow().timestamp())}_{hash(str(threat_indicators))}"

        # Generate recommended actions
        actions = ThreatDetection._generate_recommended_actions(threat_indicators, max_severity)

        alert = SecurityAlert(
            alert_id=alert_id,
            threat_indicators=threat_indicators,
            overall_severity=max_severity,
            description=ThreatDetection._generate_alert_description(threat_indicators),
            recommended_actions=actions,
            timestamp=datetime.utcnow()
        )

        ThreatDetection._alerts[alert_id] = alert
        return alert

    @staticmethod
    def _generate_recommended_actions(threat_indicators: List[ThreatIndicator], severity: AlertSeverity) -> List[str]:
        """Generate recommended actions based on threats"""
        actions = []

        threat_types = set(indicator.threat_type for indicator in threat_indicators)

        if ThreatType.SQL_INJECTION in threat_types:
            actions.extend([
                "Block the requesting IP address",
                "Review and sanitize input validation",
                "Enable SQL injection protection middleware"
            ])

        if ThreatType.BRUTE_FORCE in threat_types:
            actions.extend([
                "Implement rate limiting for authentication endpoints",
                "Enable account lockout after failed attempts",
                "Require CAPTCHA for suspicious login attempts"
            ])

        if ThreatType.DOS in threat_types:
            actions.extend([
                "Enable DDoS protection",
                "Implement request throttling",
                "Scale up infrastructure resources"
            ])

        if ThreatType.ANOMALOUS_BEHAVIOR in threat_types:
            actions.extend([
                "Require additional authentication factors",
                "Review user account for compromise",
                "Monitor user activity closely"
            ])

        if severity == AlertSeverity.CRITICAL:
            actions.insert(0, "IMMEDIATE: Isolate affected systems")
            actions.insert(1, "URGENT: Notify security team")

        return actions

    @staticmethod
    def _generate_alert_description(threat_indicators: List[ThreatIndicator]) -> str:
        """Generate human-readable alert description"""
        threat_types = [indicator.threat_type.value for indicator in threat_indicators]
        unique_threats = list(set(threat_types))

        if len(unique_threats) == 1:
            return f"Detected {unique_threats[0].replace('_', ' ')} attack pattern"
        else:
            return f"Multiple threat types detected: {', '.join(unique_threats)}"

    @staticmethod
    def get_active_alerts() -> List[SecurityAlert]:
        """Get all active security alerts"""
        return [alert for alert in ThreatDetection._alerts.values() if alert.status == "active"]

    @staticmethod
    def resolve_alert(alert_id: str, resolution: str):
        """Resolve a security alert"""
        if alert_id in ThreatDetection._alerts:
            ThreatDetection._alerts[alert_id].status = "resolved"
            # In production, log resolution details

    # Helper methods (would be implemented with database queries in production)

    @staticmethod
    def _get_recent_failed_logins(ip_address: str, db: Session) -> int:
        """Get count of recent failed logins from IP"""
        # In production: query failed_login_attempts table
        return 0

    @staticmethod
    def _get_request_count(ip_address: str, db: Session) -> int:
        """Get request count from IP in last minute"""
        # In production: query request_logs table
        return 0

    @staticmethod
    def _get_user_baseline(user_id: str, db: Session) -> Optional[Dict[str, Any]]:
        """Get user's behavioral baseline"""
        return ThreatDetection._behavior_baselines.get(user_id)

    @staticmethod
    def _is_normal_login_time(context: SecurityContext, baseline: Dict[str, Any]) -> bool:
        """Check if login time is normal for user"""
        # Simple check - in production, use ML models
        return True

    @staticmethod
    def _is_normal_location(context: SecurityContext, baseline: Dict[str, Any]) -> bool:
        """Check if location is normal for user"""
        # Simple check - in production, use ML models
        return True

    @staticmethod
    def _is_trusted_device(context: SecurityContext) -> bool:
        """Check if device is trusted"""
        # Simple check - in production, maintain device registry
        return True

    @staticmethod
    def _detect_unusual_api_usage(context: SecurityContext, request_data: Dict[str, Any]) -> List[str]:
        """Detect unusual API usage patterns"""
        # Simple check - in production, use ML models
        return []