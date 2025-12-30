"""
Logging utilities for the FastVue Framework.

Provides centralized logging configuration with:
- Named loggers for different components
- Security event logging
- Structured logging support
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional


# Configure default logging format
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger instance.

    Args:
        name: Logger name, typically __name__ of the calling module

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(LOG_FORMAT))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


# Pre-configured security logger
security_logger = get_logger("security")


def log_security_event(
    event_type: str,
    severity: str = "INFO",
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    message: Optional[str] = None,
) -> None:
    """
    Log a security event for monitoring and audit purposes.

    Args:
        event_type: Type of security event (e.g., "auth_failure", "rate_limit")
        severity: Log severity (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        user_id: ID of the user involved (if any)
        ip_address: Client IP address
        user_agent: Client user agent string
        details: Additional event details
        message: Optional custom message
    """
    event = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        "severity": severity,
        "user_id": user_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "details": details or {},
    }

    log_message = message or f"Security Event: {event_type}"
    formatted = f"{log_message} - {json.dumps(event)}"

    severity_upper = severity.upper()
    if severity_upper == "CRITICAL":
        security_logger.critical(formatted)
    elif severity_upper == "ERROR":
        security_logger.error(formatted)
    elif severity_upper == "WARNING":
        security_logger.warning(formatted)
    elif severity_upper == "DEBUG":
        security_logger.debug(formatted)
    else:
        security_logger.info(formatted)
