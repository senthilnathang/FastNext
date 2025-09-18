"""
FastNext Logging Configuration
Comprehensive logging setup following coding standards
"""

import logging
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import Request

from app.core.config import settings


class SecurityLogFilter(logging.Filter):
    """Filter for security-related log records."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        return hasattr(record, 'security_event') and record.security_event


class PerformanceLogFilter(logging.Filter):
    """Filter for performance-related log records."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        return hasattr(record, 'performance_metric') and record.performance_metric


def setup_logging() -> None:
    """Setup comprehensive logging configuration."""
    
    # Root logger configuration
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('logs/fastnext.log', mode='a')
        ]
    )
    
    # Security logger
    security_logger = logging.getLogger('security')
    security_handler = logging.FileHandler('logs/security.log', mode='a')
    security_handler.addFilter(SecurityLogFilter())
    security_handler.setFormatter(
        logging.Formatter('%(asctime)s - SECURITY - %(levelname)s - %(message)s')
    )
    security_logger.addHandler(security_handler)
    security_logger.setLevel(logging.WARNING)
    
    # Performance logger
    performance_logger = logging.getLogger('performance')
    performance_handler = logging.FileHandler('logs/performance.log', mode='a')
    performance_handler.addFilter(PerformanceLogFilter())
    performance_handler.setFormatter(
        logging.Formatter('%(asctime)s - PERFORMANCE - %(message)s')
    )
    performance_logger.addHandler(performance_handler)
    performance_logger.setLevel(logging.INFO)


def log_security_event(
    event_type: str,
    user_id: Optional[int],
    request: Request,
    severity: str = "MEDIUM",
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log security events with comprehensive details.
    
    Args:
        event_type: Type of security event (e.g., LOGIN_FAILED, SUSPICIOUS_ACTIVITY)
        user_id: ID of the user involved (if any)
        request: FastAPI request object
        severity: Severity level (LOW, MEDIUM, HIGH, CRITICAL)
        details: Additional event details
    """
    logger = logging.getLogger('security')
    
    # Extract request details
    client_ip = get_client_ip(request)
    user_agent = request.headers.get('user-agent', 'Unknown')
    endpoint = request.url.path
    method = request.method
    
    # Create log message
    log_data = {
        'event_type': event_type,
        'severity': severity,
        'user_id': user_id,
        'ip_address': client_ip,
        'user_agent': user_agent,
        'endpoint': endpoint,
        'method': method,
        'timestamp': datetime.utcnow().isoformat(),
        'details': details or {}
    }
    
    message = f"Security Event: {event_type} | User: {user_id} | IP: {client_ip} | Endpoint: {endpoint}"
    
    # Log with appropriate level based on severity
    if severity == "CRITICAL":
        logger.critical(message, extra={'security_event': True, **log_data})
    elif severity == "HIGH":
        logger.error(message, extra={'security_event': True, **log_data})
    elif severity == "MEDIUM":
        logger.warning(message, extra={'security_event': True, **log_data})
    else:
        logger.info(message, extra={'security_event': True, **log_data})


def log_performance_metric(
    operation: str,
    duration: float,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log performance metrics.
    
    Args:
        operation: Name of the operation
        duration: Time taken in seconds
        details: Additional performance details
    """
    logger = logging.getLogger('performance')
    
    log_data = {
        'operation': operation,
        'duration': duration,
        'timestamp': datetime.utcnow().isoformat(),
        'details': details or {}
    }
    
    message = f"Performance: {operation} took {duration:.4f}s"
    
    # Log slow operations as warnings
    if duration > 2.0:
        logger.warning(message, extra={'performance_metric': True, **log_data})
    else:
        logger.info(message, extra={'performance_metric': True, **log_data})


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    # Check for forwarded headers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"


def get_logger(name: str) -> logging.Logger:
    """Get a configured logger instance."""
    return logging.getLogger(name)