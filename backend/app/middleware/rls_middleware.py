"""
Row Level Security (RLS) Middleware

Provides middleware and decorators for automatic RLS enforcement
across the application.
"""

from typing import Callable, Optional, Any, Dict, List
from functools import wraps
import uuid
import time
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.row_level_security import RLSEntityType, RLSAction
from app.services.rls_service import RLSService

logger = get_logger(__name__)


class RLSMiddleware(BaseHTTPMiddleware):
    """
    Row Level Security Middleware
    
    Automatically creates and manages RLS context for authenticated requests.
    """
    
    def __init__(self, app, enable_audit: bool = True, exclude_paths: Optional[List[str]] = None):
        super().__init__(app)
        self.enable_audit = enable_audit
        self.exclude_paths = exclude_paths or [
            '/health', '/docs', '/redoc', '/openapi.json', 
            '/static/', '/_next/', '/favicon.ico'
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with RLS context"""
        start_time = time.time()
        
        # Skip excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Generate request ID for tracking
        request_id = f"rls_{int(time.time() * 1000000)}"
        request.state.rls_request_id = request_id
        
        try:
            # Check if user is authenticated
            if hasattr(request.state, 'user') and request.state.user:
                user = request.state.user
                await self._setup_rls_context(request, user)
            
            # Process request
            response = await call_next(request)
            
            # Log successful request if auditing enabled
            if self.enable_audit and hasattr(request.state, 'rls_context'):
                await self._log_request_success(request, response, start_time)
            
            return response
            
        except Exception as e:
            # Log error if auditing enabled
            if self.enable_audit:
                await self._log_request_error(request, e, start_time)
            raise
    
    async def _setup_rls_context(self, request: Request, user: User):
        """Setup RLS context for authenticated user"""
        try:
            # Get database session
            db = next(get_db())
            
            try:
                # Create RLS service
                rls_service = RLSService(db)
                
                # Generate or get session ID
                session_id = self._get_session_id(request)
                
                # Get or create RLS context
                context = rls_service.get_context(session_id)
                if not context:
                    context = rls_service.create_context(
                        user=user,
                        session_id=session_id,
                        request=request
                    )
                
                # Store context in request state
                request.state.rls_context = context
                request.state.rls_service = rls_service
                
                logger.debug(f"RLS context established for user {user.id}")
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to setup RLS context: {e}")
            # Don't fail the request, just log the error
    
    def _get_session_id(self, request: Request) -> str:
        """Get or generate session ID"""
        # Try to get session ID from various sources
        session_id = None
        
        # Check authorization header for JWT token hash
        auth_header = request.headers.get('authorization')
        if auth_header and auth_header.startswith('Bearer '):
            session_id = f"jwt_{hash(auth_header)}"
        
        # Check session cookie
        if not session_id:
            session_id = request.cookies.get('session_id')
        
        # Generate new session ID if none found
        if not session_id:
            session_id = f"session_{uuid.uuid4()}"
        
        return session_id
    
    async def _log_request_success(self, request: Request, response: Response, start_time: float):
        """Log successful request for audit purposes"""
        try:
            process_time = time.time() - start_time
            
            logger.info(
                f"RLS Request: {request.method} {request.url.path} - "
                f"Status: {response.status_code} - "
                f"Time: {process_time:.3f}s - "
                f"User: {getattr(request.state, 'user', {}).get('id', 'anonymous')}"
            )
            
        except Exception as e:
            logger.error(f"Failed to log request success: {e}")
    
    async def _log_request_error(self, request: Request, error: Exception, start_time: float):
        """Log request error for audit purposes"""
        try:
            process_time = time.time() - start_time
            
            logger.error(
                f"RLS Request Error: {request.method} {request.url.path} - "
                f"Error: {str(error)} - "
                f"Time: {process_time:.3f}s - "
                f"User: {getattr(request.state, 'user', {}).get('id', 'anonymous')}"
            )
            
        except Exception as e:
            logger.error(f"Failed to log request error: {e}")


# Decorators for RLS enforcement

def require_rls_access(
    entity_type: RLSEntityType,
    action: RLSAction,
    entity_id_param: Optional[str] = None,
    table_name: Optional[str] = None
):
    """
    Decorator to enforce RLS access control on endpoints
    
    Args:
        entity_type: Type of entity being accessed
        action: Action being performed
        entity_id_param: Parameter name containing entity ID
        table_name: Database table name (optional)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get request and current user from function arguments
            request = None
            current_user = None
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif isinstance(arg, User):
                    current_user = arg
            
            # Try to get from kwargs
            if not request:
                request = kwargs.get('request')
            if not current_user:
                current_user = kwargs.get('current_user')
            
            # Get entity ID if specified
            entity_id = None
            if entity_id_param and entity_id_param in kwargs:
                entity_id = kwargs[entity_id_param]
            
            # Perform access check
            if current_user and hasattr(request.state, 'rls_service'):
                rls_service = request.state.rls_service
                session_id = getattr(request.state, 'rls_context', {}).get('session_id')
                
                access_granted, denial_reason = rls_service.check_access(
                    user_id=current_user.id,
                    entity_type=entity_type,
                    action=action,
                    entity_id=entity_id,
                    table_name=table_name,
                    session_id=session_id,
                    request=request
                )
                
                if not access_granted:
                    logger.warning(
                        f"RLS access denied for user {current_user.id}: {denial_reason}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access denied: {denial_reason}"
                    )
            
            # Call original function
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def rls_filter_query(
    entity_type: RLSEntityType,
    action: RLSAction = RLSAction.SELECT
):
    """
    Decorator to automatically apply RLS filters to query results
    
    Args:
        entity_type: Type of entity being queried
        action: Action being performed (default: SELECT)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Call original function to get query
            result = await func(*args, **kwargs)
            
            # If result is a SQLAlchemy query, apply RLS filter
            if hasattr(result, 'filter'):  # It's a query object
                # Get request and user from function context
                request = None
                current_user = None
                
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                    elif isinstance(arg, User):
                        current_user = arg
                
                if not request:
                    request = kwargs.get('request')
                if not current_user:
                    current_user = kwargs.get('current_user')
                
                # Apply RLS filter if we have the necessary context
                if current_user and hasattr(request.state, 'rls_service'):
                    rls_service = request.state.rls_service
                    session_id = getattr(request.state, 'rls_context', {}).get('session_id')
                    
                    result = rls_service.apply_rls_filter(
                        query=result,
                        user_id=current_user.id,
                        entity_type=entity_type,
                        action=action,
                        session_id=session_id
                    )
            
            return result
        
        return wrapper
    return decorator


def rls_context_required(func):
    """
    Decorator to ensure RLS context is available
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Get request from function arguments
        request = None
        for arg in args:
            if isinstance(arg, Request):
                request = arg
                break
        
        if not request:
            request = kwargs.get('request')
        
        # Check if RLS context exists
        if not hasattr(request.state, 'rls_context'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="RLS context not available"
            )
        
        return await func(*args, **kwargs)
    
    return wrapper


def rls_audit_action(
    entity_type: RLSEntityType,
    action: RLSAction,
    description: Optional[str] = None
):
    """
    Decorator to audit RLS-controlled actions
    
    Args:
        entity_type: Type of entity being accessed
        action: Action being performed
        description: Optional description of the action
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            # Get request and user context
            request = None
            current_user = None
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif isinstance(arg, User):
                    current_user = arg
            
            if not request:
                request = kwargs.get('request')
            if not current_user:
                current_user = kwargs.get('current_user')
            
            try:
                # Call original function
                result = await func(*args, **kwargs)
                
                # Log successful action
                if current_user and hasattr(request.state, 'rls_service'):
                    logger.info(
                        f"RLS Action: User {current_user.id} performed {action.value} "
                        f"on {entity_type.value} - Success - "
                        f"Time: {time.time() - start_time:.3f}s"
                    )
                
                return result
                
            except Exception as e:
                # Log failed action
                if current_user:
                    logger.error(
                        f"RLS Action: User {current_user.id} failed {action.value} "
                        f"on {entity_type.value} - Error: {str(e)} - "
                        f"Time: {time.time() - start_time:.3f}s"
                    )
                raise
        
        return wrapper
    return decorator


# Utility functions

def get_rls_context(request: Request) -> Optional[Dict[str, Any]]:
    """Get RLS context from request state"""
    context = getattr(request.state, 'rls_context', None)
    if context:
        return {
            'user_id': context.user_id,
            'organization_id': context.organization_id,
            'tenant_id': context.tenant_id,
            'project_ids': context.project_ids,
            'roles': context.roles,
            'permissions': context.permissions,
            'session_id': context.session_id
        }
    return None


def get_rls_service(request: Request) -> Optional[RLSService]:
    """Get RLS service from request state"""
    return getattr(request.state, 'rls_service', None)


def check_rls_permission(
    request: Request,
    entity_type: RLSEntityType,
    action: RLSAction,
    entity_id: Optional[int] = None
) -> bool:
    """
    Check RLS permission for current request context
    
    Returns:
        bool: True if access is granted, False otherwise
    """
    try:
        rls_service = get_rls_service(request)
        context = get_rls_context(request)
        
        if not rls_service or not context:
            return False
        
        access_granted, _ = rls_service.check_access(
            user_id=context['user_id'],
            entity_type=entity_type,
            action=action,
            entity_id=entity_id,
            session_id=context['session_id'],
            request=request
        )
        
        return access_granted
        
    except Exception as e:
        logger.error(f"Error checking RLS permission: {e}")
        return False