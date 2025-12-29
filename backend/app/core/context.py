"""
Request context management for activity tracking.
Provides thread-safe access to request context (user, IP, etc.) in SQLAlchemy events.
"""

from contextvars import ContextVar
from dataclasses import dataclass
from typing import Optional


@dataclass
class RequestContext:
    """Current request context data"""
    user_id: Optional[int] = None
    company_id: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None


# Thread-safe context variable
_request_context: ContextVar[Optional[RequestContext]] = ContextVar(
    'request_context', default=None
)


def get_request_context() -> Optional[RequestContext]:
    """Get the current request context"""
    return _request_context.get()


def set_request_context(context: RequestContext) -> None:
    """Set the current request context"""
    _request_context.set(context)


def clear_request_context() -> None:
    """Clear the current request context"""
    _request_context.set(None)


def get_current_user_id() -> Optional[int]:
    """Get the current user ID from context"""
    ctx = get_request_context()
    return ctx.user_id if ctx else None


def get_current_company_id() -> Optional[int]:
    """Get the current company ID from context"""
    ctx = get_request_context()
    return ctx.company_id if ctx else None


class request_context:
    """Context manager for setting request context"""

    def __init__(
        self,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
    ):
        self.context = RequestContext(
            user_id=user_id,
            company_id=company_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
        )
        self._token = None

    def __enter__(self):
        self._token = _request_context.set(self.context)
        return self.context

    def __exit__(self, exc_type, exc_val, exc_tb):
        _request_context.reset(self._token)
        return False
