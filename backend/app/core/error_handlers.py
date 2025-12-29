"""
Error handling utilities for FastVue
Provides centralized error handling with proper logging and response formatting
"""

import logging
from typing import Any, Dict, Optional

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("fastvue.errors")


class AppException(Exception):
    """Base application exception"""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or "INTERNAL_ERROR"
        self.details = details or {}
        super().__init__(self.message)


class ValidationException(AppException):
    """Validation error exception"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class NotFoundException(AppException):
    """Resource not found exception"""

    def __init__(self, resource: str = "Resource", resource_id: Any = None):
        message = f"{resource} not found"
        if resource_id:
            message = f"{resource} with ID {resource_id} not found"
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            details={"resource": resource, "resource_id": resource_id},
        )


class PermissionDeniedException(AppException):
    """Permission denied exception"""

    def __init__(self, message: str = "Permission denied", permission: Optional[str] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="PERMISSION_DENIED",
            details={"required_permission": permission} if permission else {},
        )


class AuthenticationException(AppException):
    """Authentication error exception"""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_ERROR",
        )


class RateLimitException(AppException):
    """Rate limit exceeded exception"""

    def __init__(self, message: str = "Too many requests", retry_after: int = 60):
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            details={"retry_after": retry_after},
        )


class ConflictException(AppException):
    """Resource conflict exception"""

    def __init__(self, message: str = "Resource conflict"):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
        )


class BusinessLogicException(AppException):
    """Business logic error exception"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="BUSINESS_LOGIC_ERROR",
            details=details,
        )


class ExternalServiceException(AppException):
    """External service error exception"""

    def __init__(self, service: str, message: str = "External service error"):
        super().__init__(
            message=f"{service}: {message}",
            status_code=status.HTTP_502_BAD_GATEWAY,
            error_code="EXTERNAL_SERVICE_ERROR",
            details={"service": service},
        )


class ErrorHandler:
    """Centralized error handling utility"""

    @staticmethod
    def handle_database_error(error: Exception, operation: str = "database operation") -> Dict[str, Any]:
        """Handle database errors with proper logging"""
        logger.error(f"Database error during {operation}: {str(error)}")
        return {"error": f"Database operation failed", "detail": str(error), "status": 500}

    @staticmethod
    def handle_validation_error(error: Exception, operation: str = "validation") -> Dict[str, Any]:
        """Handle validation errors"""
        logger.warning(f"Validation error during {operation}: {str(error)}")
        return {"error": "Validation failed", "detail": str(error), "status": 400}

    @staticmethod
    def handle_permission_error(error: Exception, operation: str = "permission check") -> Dict[str, Any]:
        """Handle permission errors"""
        logger.warning(f"Permission error during {operation}: {str(error)}")
        return {"error": "Permission denied", "status": 403}

    @staticmethod
    def handle_not_found_error(resource: str = "Resource", operation: str = "retrieval") -> Dict[str, Any]:
        """Handle not found errors"""
        logger.info(f"{resource} not found during {operation}")
        return {"error": f"{resource} not found", "status": 404}

    @staticmethod
    def handle_authentication_error(error: Exception, operation: str = "authentication") -> Dict[str, Any]:
        """Handle authentication errors"""
        logger.warning(f"Authentication error during {operation}: {str(error)}")
        return {"error": "Authentication failed", "status": 401}

    @staticmethod
    def handle_rate_limit_error(error: Exception, operation: str = "request") -> Dict[str, Any]:
        """Handle rate limiting errors"""
        logger.warning(f"Rate limit exceeded during {operation}: {str(error)}")
        return {"error": "Too many requests. Please try again later.", "status": 429}

    @staticmethod
    def handle_file_error(error: Exception, operation: str = "file operation") -> Dict[str, Any]:
        """Handle file-related errors"""
        logger.error(f"File error during {operation}: {str(error)}")
        return {"error": "File operation failed", "detail": str(error), "status": 500}

    @staticmethod
    def handle_api_error(error: Exception, operation: str = "API call") -> Dict[str, Any]:
        """Handle external API errors"""
        logger.error(f"API error during {operation}: {str(error)}")
        return {"error": "External service error", "detail": str(error), "status": 502}

    @staticmethod
    def handle_business_logic_error(error: Exception, operation: str = "business operation") -> Dict[str, Any]:
        """Handle business logic errors"""
        logger.warning(f"Business logic error during {operation}: {str(error)}")
        return {"error": "Operation not allowed", "detail": str(error), "status": 422}

    @staticmethod
    def handle_critical_error(error: Exception, operation: str = "critical operation") -> Dict[str, Any]:
        """Handle critical system errors"""
        logger.critical(f"Critical error during {operation}: {str(error)}")
        return {"error": "Internal server error", "status": 500}

    @staticmethod
    def handle_timeout_error(error: Exception, operation: str = "operation") -> Dict[str, Any]:
        """Handle timeout errors"""
        logger.warning(f"Timeout during {operation}: {str(error)}")
        return {"error": "Operation timed out", "status": 408}

    @staticmethod
    def handle_export_error(error: Exception, operation: str = "data export") -> Dict[str, Any]:
        """Handle data export errors"""
        logger.error(f"Export error during {operation}: {str(error)}")
        return {"error": "Data export failed", "detail": str(error), "status": 500}

    @staticmethod
    def handle_import_error(error: Exception, operation: str = "data import") -> Dict[str, Any]:
        """Handle data import errors"""
        logger.error(f"Import error during {operation}: {str(error)}")
        return {"error": "Data import failed", "detail": str(error), "status": 400}

    @staticmethod
    def handle_generic_error(error: Exception, operation: str = "operation", status_code: int = 500) -> Dict[str, Any]:
        """Handle generic errors"""
        logger.error(f"Error during {operation}: {str(error)}")
        return {"error": "Operation failed", "detail": str(error), "status": status_code}


def create_error_response(
    error: Exception,
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    error_code: str = "INTERNAL_ERROR",
    include_detail: bool = True,
) -> JSONResponse:
    """Create a standardized error response"""
    content = {
        "success": False,
        "error": {
            "code": error_code,
            "message": str(error),
        },
    }

    if include_detail and hasattr(error, "details"):
        content["error"]["details"] = error.details

    return JSONResponse(status_code=status_code, content=content)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware for centralized error handling"""

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response

        except AppException as e:
            logger.warning(f"Application error: {e.error_code} - {e.message}")
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "success": False,
                    "error": {
                        "code": e.error_code,
                        "message": e.message,
                        "details": e.details,
                    },
                },
            )

        except PydanticValidationError as e:
            logger.warning(f"Validation error: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Validation failed",
                        "details": e.errors(),
                    },
                },
            )

        except IntegrityError as e:
            logger.error(f"Database integrity error: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={
                    "success": False,
                    "error": {
                        "code": "INTEGRITY_ERROR",
                        "message": "Database constraint violation",
                    },
                },
            )

        except SQLAlchemyError as e:
            logger.error(f"Database error: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "error": {
                        "code": "DATABASE_ERROR",
                        "message": "Database operation failed",
                    },
                },
            )

        except HTTPException:
            # Re-raise FastAPI HTTP exceptions
            raise

        except Exception as e:
            logger.exception(f"Unhandled error: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "An unexpected error occurred",
                    },
                },
            )


def handle_exception(
    exception: Exception,
    operation: str = "operation",
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Generic exception handler that routes to appropriate error handler

    Args:
        exception: The exception to handle
        operation: Description of the operation being performed
        context: Additional context information

    Returns:
        Dictionary with error message and status code
    """
    error_handler = ErrorHandler()

    # Log context if provided
    if context:
        logger.info(f"Error context for {operation}: {context}")

    # Route to appropriate handler based on exception type
    if isinstance(exception, AppException):
        return {
            "error": exception.message,
            "code": exception.error_code,
            "status": exception.status_code,
            "details": exception.details,
        }
    elif isinstance(exception, PydanticValidationError):
        return error_handler.handle_validation_error(exception, operation)
    elif isinstance(exception, IntegrityError):
        return error_handler.handle_database_error(exception, operation)
    elif isinstance(exception, SQLAlchemyError):
        return error_handler.handle_database_error(exception, operation)
    else:
        return error_handler.handle_generic_error(exception, operation)
