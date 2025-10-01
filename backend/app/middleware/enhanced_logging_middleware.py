"""
Enhanced Logging Middleware integrating the new event logging system
Extends the existing logging middleware with comprehensive event tracking
"""

from typing import Dict, Any, Optional, Set
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import time
import uuid
from datetime import datetime

from app.core.config import settings
from app.core.logging import get_logger
from app.utils.enhanced_logger import enhanced_logger, log_api_call
from app.models.activity_log import ActivityLevel, ActivityAction, EventCategory
from app.db.session import get_db

logger = get_logger(__name__)

class EnhancedEventLoggingMiddleware(BaseHTTPMiddleware):
    """
    Enhanced middleware that integrates comprehensive event logging
    with the existing FastNext logging infrastructure
    """
    
    def __init__(
        self,
        app,
        enable_enhanced_logging: bool = True,
        exclude_paths: Set[str] = None,
        log_all_requests: bool = False,
        log_level_threshold: str = "INFO"
    ):
        super().__init__(app)
        self.enable_enhanced_logging = enable_enhanced_logging
        self.log_all_requests = log_all_requests
        self.log_level_threshold = getattr(ActivityLevel, log_level_threshold.upper(), ActivityLevel.INFO)
        
        # Paths to exclude from enhanced logging
        self.exclude_paths = exclude_paths or {
            '/health', '/metrics', '/favicon.ico', '/static/', '/_next/',
            '/docs', '/redoc', '/openapi.json', '/ping', '/version'
        }
        
        # Sensitive endpoints that should always be logged
        self.sensitive_endpoints = {
            '/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/auth/refresh',
            '/api/v1/users/', '/api/v1/roles/', '/api/v1/permissions/',
            '/api/v1/data/import', '/api/v1/data/export'
        }
        
        # Map HTTP methods to ActivityActions
        self.method_action_map = {
            'GET': ActivityAction.READ,
            'POST': ActivityAction.CREATE,
            'PUT': ActivityAction.UPDATE,
            'PATCH': ActivityAction.UPDATE,
            'DELETE': ActivityAction.DELETE
        }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Main middleware dispatcher with enhanced event logging"""
        
        # Skip if enhanced logging is disabled
        if not self.enable_enhanced_logging:
            return await call_next(request)
        
        # Check if we should skip this path
        if self._should_skip_logging(request.url.path):
            return await call_next(request)
        
        # Start timing
        start_time = time.time()
        
        # Generate request correlation data
        request_id = getattr(request.state, 'request_id', str(uuid.uuid4()))
        request.state.request_id = request_id
        
        # Extract user information
        user_info = self._extract_user_info(request)
        
        # Determine if this is a sensitive endpoint
        is_sensitive = self._is_sensitive_endpoint(request.url.path)
        
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        response_time_ms = int(processing_time * 1000)
        
        # Log the request with enhanced logger (async)
        if self.log_all_requests or is_sensitive or response.status_code >= 400:
            try:
                # Get database session for logging
                db = next(get_db())
                
                # Log API call using enhanced logger
                await self._log_enhanced_event(
                    db=db,
                    request=request,
                    response=response,
                    user_info=user_info,
                    response_time_ms=response_time_ms,
                    is_sensitive=is_sensitive
                )
                
                # Also use the convenience function for API calls
                log_api_call(
                    db=db,
                    request=request,
                    response_time_ms=response_time_ms,
                    status_code=response.status_code,
                    user_id=user_info.get('user_id'),
                    username=user_info.get('username')
                )
                
                db.close()
                
            except Exception as e:
                logger.error(f"Failed to log enhanced event: {str(e)}")
        
        return response
    
    def _should_skip_logging(self, path: str) -> bool:
        """Check if path should be excluded from enhanced logging"""
        return any(path.startswith(excluded) for excluded in self.exclude_paths)
    
    def _is_sensitive_endpoint(self, path: str) -> bool:
        """Check if endpoint is considered sensitive and should always be logged"""
        return any(path.startswith(sensitive) for sensitive in self.sensitive_endpoints)
    
    def _extract_user_info(self, request: Request) -> Dict[str, Any]:
        """Extract user information from request state"""
        
        user_info = {
            'user_id': None,
            'username': None,
            'user_roles': None,
            'is_authenticated': False
        }
        
        # Try to get user from request state (set by auth middleware)
        user = getattr(request.state, 'user', None)
        if user:
            if isinstance(user, dict):
                user_info.update({
                    'user_id': user.get('id') or user.get('user_id'),
                    'username': user.get('username'),
                    'user_roles': user.get('roles', []),
                    'is_authenticated': True
                })
            else:
                # If user is a model instance
                user_info.update({
                    'user_id': getattr(user, 'id', None),
                    'username': getattr(user, 'username', None),
                    'user_roles': getattr(user, 'roles', []),
                    'is_authenticated': True
                })
        
        return user_info
    
    async def _log_enhanced_event(
        self,
        db,
        request: Request,
        response: Response,
        user_info: Dict[str, Any],
        response_time_ms: int,
        is_sensitive: bool = False
    ):
        """Log event using the enhanced logger with comprehensive data"""
        
        # Determine event category based on endpoint
        category = self._determine_event_category(request.url.path)
        
        # Determine activity action based on method
        action = self.method_action_map.get(request.method, ActivityAction.API_CALL)
        
        # Determine log level based on response status and sensitivity
        level = self._determine_log_level(response.status_code, is_sensitive)
        
        # Calculate risk score
        risk_score = self._calculate_risk_score(request, response, user_info, is_sensitive)
        
        # Prepare entity information
        entity_type, entity_id, entity_name = self._extract_entity_info(request)
        
        # Prepare description
        description = self._generate_event_description(request, response, user_info)
        
        # Prepare metadata
        metadata = self._prepare_metadata(request, response, user_info)
        
        # Prepare tags
        tags = self._generate_tags(request, response, is_sensitive)
        
        # Log the event
        enhanced_logger.log_event(
            db=db,
            category=category,
            action=action,
            entity_type=entity_type,
            description=description,
            level=level,
            user_id=user_info.get('user_id'),
            username=user_info.get('username'),
            entity_id=entity_id,
            entity_name=entity_name,
            request=request,
            metadata=metadata,
            tags=tags,
            risk_score=risk_score,
            response_time_ms=response_time_ms
        )
    
    def _determine_event_category(self, path: str) -> EventCategory:
        """Determine event category based on endpoint path"""
        
        if '/auth/' in path:
            return EventCategory.AUTHENTICATION
        elif '/users/' in path or '/roles/' in path or '/permissions/' in path:
            if '/roles/' in path or '/permissions/' in path:
                return EventCategory.AUTHORIZATION
            return EventCategory.USER_MANAGEMENT
        elif '/data/' in path or '/import' in path or '/export' in path:
            return EventCategory.DATA_MANAGEMENT
        elif '/workflow' in path:
            return EventCategory.WORKFLOW
        elif '/config' in path or '/settings' in path:
            return EventCategory.CONFIGURATION
        elif '/admin/' in path:
            return EventCategory.SYSTEM_MANAGEMENT
        elif '/api/' in path:
            return EventCategory.API
        else:
            return EventCategory.API
    
    def _determine_log_level(self, status_code: int, is_sensitive: bool = False) -> ActivityLevel:
        """Determine appropriate log level based on status code and sensitivity"""
        
        if status_code >= 500:
            return ActivityLevel.ERROR
        elif status_code >= 400:
            return ActivityLevel.WARNING
        elif is_sensitive:
            return ActivityLevel.INFO
        else:
            return ActivityLevel.INFO
    
    def _calculate_risk_score(
        self, 
        request: Request, 
        response: Response, 
        user_info: Dict[str, Any], 
        is_sensitive: bool
    ) -> int:
        """Calculate risk score based on various factors"""
        
        risk_score = 0
        
        # Base risk for different status codes
        if response.status_code >= 500:
            risk_score += 30
        elif response.status_code >= 400:
            risk_score += 20
        
        # Higher risk for sensitive endpoints
        if is_sensitive:
            risk_score += 15
        
        # Higher risk for unauthenticated access to protected endpoints
        if not user_info.get('is_authenticated') and is_sensitive:
            risk_score += 25
        
        # Higher risk for admin operations
        if '/admin/' in request.url.path:
            risk_score += 10
        
        # Higher risk for authentication failures
        if '/auth/' in request.url.path and response.status_code >= 400:
            risk_score += 20
        
        # Higher risk for data modification operations
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            risk_score += 5
        
        # Cap at 100
        return min(risk_score, 100)
    
    def _extract_entity_info(self, request: Request) -> tuple:
        """Extract entity information from request path"""
        
        path = request.url.path
        path_parts = path.strip('/').split('/')
        
        # Default values
        entity_type = "api"
        entity_id = None
        entity_name = None
        
        try:
            if len(path_parts) >= 3:
                # Pattern: /api/v1/resource/id
                if path_parts[0] == 'api' and len(path_parts) >= 4:
                    entity_type = path_parts[3]  # e.g., "users", "projects"
                    if len(path_parts) >= 5 and path_parts[4].isdigit():
                        entity_id = path_parts[4]
                        entity_name = f"{entity_type}_{entity_id}"
                    elif len(path_parts) >= 5:
                        # UUID or string identifier
                        entity_id = path_parts[4]
                        entity_name = f"{entity_type}_{entity_id}"
                else:
                    entity_type = path_parts[1] if len(path_parts) > 1 else "unknown"
        except (IndexError, ValueError):
            pass
        
        return entity_type, entity_id, entity_name
    
    def _generate_event_description(
        self, 
        request: Request, 
        response: Response, 
        user_info: Dict[str, Any]
    ) -> str:
        """Generate human-readable event description"""
        
        method = request.method
        path = request.url.path
        status = response.status_code
        user = user_info.get('username', 'anonymous')
        
        # Create descriptive message
        action_desc = {
            'GET': 'accessed',
            'POST': 'created',
            'PUT': 'updated',
            'PATCH': 'modified',
            'DELETE': 'deleted'
        }.get(method, 'called')
        
        if status >= 500:
            return f"User {user} {action_desc} {path} - Server Error ({status})"
        elif status >= 400:
            return f"User {user} {action_desc} {path} - Client Error ({status})"
        else:
            return f"User {user} {action_desc} {path} - Success ({status})"
    
    def _prepare_metadata(
        self, 
        request: Request, 
        response: Response, 
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Prepare metadata for the event"""
        
        metadata = {
            'http_method': request.method,
            'endpoint': request.url.path,
            'query_params': dict(request.query_params) if request.query_params else None,
            'status_code': response.status_code,
            'user_authenticated': user_info.get('is_authenticated', False),
            'user_roles': user_info.get('user_roles', []),
            'content_type': request.headers.get('content-type'),
            'user_agent_type': self._classify_user_agent(request.headers.get('user-agent', '')),
            'request_id': getattr(request.state, 'request_id', None)
        }
        
        # Add query parameter count if present
        if request.query_params:
            metadata['query_param_count'] = len(request.query_params)
        
        # Add content length if available
        content_length = request.headers.get('content-length')
        if content_length:
            metadata['content_length'] = int(content_length)
        
        return metadata
    
    def _generate_tags(self, request: Request, response: Response, is_sensitive: bool) -> list:
        """Generate tags for categorizing the event"""
        
        tags = [
            f"method:{request.method.lower()}",
            f"status:{response.status_code // 100}xx"
        ]
        
        # Add endpoint-based tags
        path = request.url.path
        if '/api/' in path:
            tags.append('api')
        if '/admin/' in path:
            tags.append('admin')
        if '/auth/' in path:
            tags.append('auth')
        if '/data/' in path:
            tags.append('data')
        
        # Add status-based tags
        if response.status_code >= 500:
            tags.append('error')
        elif response.status_code >= 400:
            tags.append('client_error')
        else:
            tags.append('success')
        
        # Add sensitivity tag
        if is_sensitive:
            tags.append('sensitive')
        
        # Add request type tags
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            tags.append('modification')
        else:
            tags.append('read_only')
        
        return tags
    
    def _classify_user_agent(self, user_agent: str) -> str:
        """Classify user agent type"""
        
        user_agent_lower = user_agent.lower()
        
        if 'bot' in user_agent_lower or 'spider' in user_agent_lower or 'crawler' in user_agent_lower:
            return 'bot'
        elif 'mobile' in user_agent_lower or 'android' in user_agent_lower or 'iphone' in user_agent_lower:
            return 'mobile'
        elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
            return 'tablet'
        elif any(browser in user_agent_lower for browser in ['chrome', 'firefox', 'safari', 'edge', 'opera']):
            return 'browser'
        elif 'postman' in user_agent_lower or 'curl' in user_agent_lower or 'httpie' in user_agent_lower:
            return 'api_client'
        else:
            return 'unknown'


class AuthenticationEventMiddleware(BaseHTTPMiddleware):
    """
    Specialized middleware for detailed authentication event logging
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.auth_endpoints = {
            '/api/v1/auth/login',
            '/api/v1/auth/logout', 
            '/api/v1/auth/refresh',
            '/api/v1/auth/register'
        }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Log detailed authentication events"""
        
        # Only process auth endpoints
        if not any(request.url.path.startswith(endpoint) for endpoint in self.auth_endpoints):
            return await call_next(request)
        
        start_time = time.time()
        
        # Extract request information before processing
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get('User-Agent', '')
        
        # Process request
        response = await call_next(request)
        
        # Log authentication event
        try:
            db = next(get_db())
            
            # Determine success/failure
            success = 200 <= response.status_code < 300
            
            # Extract username from request if available
            username = await self._extract_username_from_request(request)
            
            # Log the authentication event using enhanced logger
            from app.utils.enhanced_logger import log_authentication_event
            
            action = self._map_endpoint_to_action(request.url.path)
            
            log_authentication_event(
                db=db,
                action=action,
                user_id=None,  # Will be filled if available
                username=username or 'unknown',
                success=success,
                request=request,
                metadata={
                    'client_ip': client_ip,
                    'user_agent': user_agent,
                    'endpoint': request.url.path,
                    'response_time_ms': int((time.time() - start_time) * 1000)
                }
            )
            
            db.close()
            
        except Exception as e:
            logger.error(f"Failed to log authentication event: {str(e)}")
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    async def _extract_username_from_request(self, request: Request) -> Optional[str]:
        """Try to extract username from request body"""
        try:
            if request.method == 'POST' and 'application/json' in request.headers.get('content-type', ''):
                # Note: This consumes the request body, so it should be done carefully
                # In practice, you might want to extract this from the processed response
                pass
        except:
            pass
        return None
    
    def _map_endpoint_to_action(self, path: str) -> ActivityAction:
        """Map authentication endpoint to action"""
        if 'login' in path:
            return ActivityAction.LOGIN
        elif 'logout' in path:
            return ActivityAction.LOGOUT
        elif 'register' in path:
            return ActivityAction.CREATE
        else:
            return ActivityAction.API_CALL


# Factory function to create configured middleware
def create_enhanced_logging_middleware(
    enable_enhanced_logging: bool = True,
    log_all_requests: bool = False,
    exclude_paths: Set[str] = None
):
    """Factory function to create configured enhanced logging middleware"""
    
    def middleware_factory(app):
        return EnhancedEventLoggingMiddleware(
            app=app,
            enable_enhanced_logging=enable_enhanced_logging,
            log_all_requests=log_all_requests,
            exclude_paths=exclude_paths
        )
    
    return middleware_factory


def create_auth_event_middleware():
    """Factory function to create authentication event middleware"""
    
    def middleware_factory(app):
        return AuthenticationEventMiddleware(app)
    
    return middleware_factory