"""
Error Handling Middleware for FastVue Framework

Provides:
- Structured error responses
- Error logging with context
- Database error handling
- Validation error formatting
- User-friendly error messages
"""

import logging
import sys
import traceback
from typing import Callable, Optional

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError, OperationalError, DatabaseError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from app.core.config import settings

logger = logging.getLogger(__name__)


# Error code mapping for common errors
ERROR_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    422: "UNPROCESSABLE_ENTITY",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_SERVER_ERROR",
    502: "BAD_GATEWAY",
    503: "SERVICE_UNAVAILABLE",
}

# User-friendly error messages
USER_FRIENDLY_MESSAGES = {
    400: "The request was invalid. Please check your input and try again.",
    401: "Authentication required. Please log in to continue.",
    403: "You don't have permission to perform this action.",
    404: "The requested resource was not found.",
    405: "This operation is not allowed on this resource.",
    409: "A conflict occurred. The resource may already exist.",
    413: "The request is too large. Please reduce the size and try again.",
    422: "The request data is invalid. Please check your input.",
    429: "Too many requests. Please wait a moment and try again.",
    500: "An unexpected error occurred. Please try again later.",
    502: "The server received an invalid response. Please try again later.",
    503: "The service is temporarily unavailable. Please try again later.",
}


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive error handling middleware.
    """

    def __init__(
        self,
        app: ASGIApp,
        include_debug_info: bool = False,
        log_errors: bool = True,
    ):
        super().__init__(app)
        self.include_debug_info = include_debug_info or settings.DEBUG
        self.log_errors = log_errors

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Handle errors in request processing"""
        try:
            response = await call_next(request)
            return response

        except HTTPException as e:
            return self._handle_http_exception(e, request)

        except ValidationError as e:
            return self._handle_validation_error(e, request)

        except IntegrityError as e:
            return self._handle_integrity_error(e, request)

        except OperationalError as e:
            return self._handle_database_error(e, request)

        except DatabaseError as e:
            return self._handle_database_error(e, request)

        except Exception as e:
            return self._handle_unexpected_error(e, request)

    def _handle_http_exception(self, exc: HTTPException, request: Request) -> JSONResponse:
        """Handle FastAPI/Starlette HTTP exceptions"""
        if self.log_errors and exc.status_code >= 500:
            logger.error(
                f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}"
            )
        elif self.log_errors and exc.status_code >= 400:
            logger.warning(
                f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}"
            )

        return self._create_error_response(
            status_code=exc.status_code,
            detail=exc.detail,
            headers=getattr(exc, "headers", None),
        )

    def _handle_validation_error(self, exc: ValidationError, request: Request) -> JSONResponse:
        """Handle Pydantic validation errors"""
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"],
            })

        if self.log_errors:
            logger.warning(
                f"Validation error on {request.method} {request.url.path}: {errors}"
            )

        return self._create_error_response(
            status_code=422,
            detail="Validation failed",
            errors=errors,
        )

    def _handle_integrity_error(self, exc: IntegrityError, request: Request) -> JSONResponse:
        """Handle database integrity errors (duplicates, constraints)"""
        error_message = str(exc.orig) if hasattr(exc, "orig") else str(exc)

        # Parse common constraint violations
        if "unique" in error_message.lower() or "duplicate" in error_message.lower():
            detail = "A record with this value already exists"
            user_message = "This value is already in use. Please choose a different one."
        elif "foreign key" in error_message.lower():
            detail = "Referenced record does not exist"
            user_message = "The related record could not be found."
        elif "not null" in error_message.lower():
            detail = "Required field is missing"
            user_message = "A required field was not provided."
        else:
            detail = "Database constraint violation"
            user_message = "The operation could not be completed due to data constraints."

        if self.log_errors:
            logger.error(
                f"Integrity error on {request.method} {request.url.path}: {error_message}"
            )

        return self._create_error_response(
            status_code=409,
            detail=detail,
            message=user_message,
        )

    def _handle_database_error(self, exc: DatabaseError, request: Request) -> JSONResponse:
        """Handle general database errors"""
        if self.log_errors:
            logger.error(
                f"Database error on {request.method} {request.url.path}: {exc}",
                exc_info=True,
            )

        return self._create_error_response(
            status_code=503,
            detail="Database temporarily unavailable" if settings.DEBUG else "Service temporarily unavailable",
            message="We're experiencing technical difficulties. Please try again later.",
        )

    def _handle_unexpected_error(self, exc: Exception, request: Request) -> JSONResponse:
        """Handle unexpected exceptions"""
        # Get full traceback for logging
        tb = traceback.format_exc()

        logger.error(
            f"Unexpected error on {request.method} {request.url.path}: {exc}\n{tb}"
        )

        response_data = {
            "detail": "An unexpected error occurred" if not self.include_debug_info else str(exc),
            "message": USER_FRIENDLY_MESSAGES[500],
        }

        if self.include_debug_info:
            response_data["debug"] = {
                "exception": exc.__class__.__name__,
                "message": str(exc),
                "traceback": tb.split("\n"),
            }

        return self._create_error_response(
            status_code=500,
            **response_data,
        )

    def _create_error_response(
        self,
        status_code: int,
        detail: str,
        message: Optional[str] = None,
        errors: Optional[list] = None,
        headers: Optional[dict] = None,
        **kwargs,
    ) -> JSONResponse:
        """Create standardized error response"""
        response_data = {
            "success": False,
            "error": {
                "code": ERROR_CODES.get(status_code, "ERROR"),
                "status": status_code,
                "detail": detail,
                "message": message or USER_FRIENDLY_MESSAGES.get(status_code, detail),
            },
        }

        if errors:
            response_data["error"]["errors"] = errors

        # Add any additional data
        for key, value in kwargs.items():
            response_data["error"][key] = value

        return JSONResponse(
            status_code=status_code,
            content=response_data,
            headers=headers,
        )


class DatabaseHealthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to check database health and handle connection issues.
    """

    def __init__(
        self,
        app: ASGIApp,
        check_on_request: bool = False,
    ):
        super().__init__(app)
        self.check_on_request = check_on_request
        self._is_healthy = True

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Check database health if enabled"""
        if self.check_on_request and not request.url.path.startswith("/health"):
            # Optional: Add database health check here
            # This could ping the database on each request
            pass

        try:
            response = await call_next(request)
            self._is_healthy = True
            return response

        except OperationalError as e:
            self._is_healthy = False
            logger.critical(f"Database connection error: {e}")
            raise

    @property
    def is_healthy(self) -> bool:
        return self._is_healthy
