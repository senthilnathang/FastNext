from typing import Any, Dict, List, Optional, Union, Callable, Type
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from pydantic import BaseModel, ValidationError as PydanticValidationError
import re
import json
import logging
from datetime import datetime
import ipaddress
from urllib.parse import unquote

from app.core.logging import log_security_event
from app.services.validation_service import ValidationService

logger = logging.getLogger(__name__)

class ValidationMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive input validation middleware for FastAPI
    """
    
    def __init__(self, app, config: Optional[Dict[str, Any]] = None):
        super().__init__(app)
        self.config = config or {}
        self.setup_validation_rules()
    
    def setup_validation_rules(self):
        """Setup comprehensive validation rules"""
        
        # XSS patterns
        self.xss_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'vbscript:',
            r'onload\s*=',
            r'onerror\s*=',
            r'onclick\s*=',
            r'onmouseover\s*=',
            r'onfocus\s*=',
            r'onblur\s*=',
            r'<iframe[^>]*>',
            r'<object[^>]*>',
            r'<embed[^>]*>',
            r'<link[^>]*>',
            r'<meta[^>]*>',
            r'expression\(',
            r'url\(',
            r'@import',
            r'<svg[^>]*>.*?</svg>',
            r'<img[^>]*onerror[^>]*>',
            r'document\.cookie',
            r'document\.write',
            r'eval\(',
            r'setTimeout\(',
            r'setInterval\(',
            r'Function\(',
            r'alert\(',
            r'confirm\(',
            r'prompt\('
        ]
        
        # SQL injection patterns
        self.sql_patterns = [
            r'(\b(select|insert|update|delete|drop|create|alter|exec|execute|union|declare)\b)',
            r'(\b(or|and)\s+[\w\'"]+\s*=\s*[\w\'"]+)',
            r'([\'"]\s*(or|and)\s*[\'"]\s*[\w\'"])',
            r'(\bwhere\s+[\w\'"]+\s*=\s*[\w\'"]+)',
            r'(--|\#|\/\*|\*\/)',
            r'(\bxp_cmdshell\b)',
            r'(\bsp_executesql\b)',
            r'(\bdbms_pipe\b)',
            r'(\butl_file\b)',
            r'(\bload_file\b)',
            r'(\binto\s+outfile\b)',
            r'(\binto\s+dumpfile\b)',
            r'(\bwaitfor\s+delay\b)',
            r'(\bbenchmark\b)',
            r'(\bsleep\s*\()',
            r'(\bpg_sleep\b)',
            r'(\bconvert\s*\()',
            r'(\bcast\s*\()',
            r'(\bchar\s*\()',
            r'(\bascii\s*\()',
            r'(\border\s+by\b)',
            r'(\bgroup\s+by\b)',
            r'(\bhaving\b)',
            r'(\blimit\b)',
            r'(\boffset\b)'
        ]
        
        # Path traversal patterns
        self.path_traversal_patterns = [
            r'\.\./',
            r'\.\.\\',
            r'%2e%2e%2f',
            r'%2e%2e\\',
            r'%252e%252e%252f',
            r'%c0%af',
            r'%c1%9c',
            r'\/\.\.\/\.\.\/',
            r'\\\.\.\\\.\.\\',
            r'\.\.%2f',
            r'\.\.%5c'
        ]
        
        # Command injection patterns
        self.command_patterns = [
            r'[\s]*\|[\s]*',
            r'[\s]*;[\s]*',
            r'[\s]*&[\s]*',
            r'[\s]*\$\(',
            r'[\s]*`',
            r'\$\{[^}]*\}',
            r'<%[^%>]*%>',
            r'\${[^}]*}',
            r'exec\s*\(',
            r'system\s*\(',
            r'shell_exec\s*\(',
            r'passthru\s*\(',
            r'popen\s*\(',
            r'proc_open\s*\(',
            r'file_get_contents\s*\(',
            r'readfile\s*\(',
            r'include\s*\(',
            r'require\s*\(',
            r'nc\s+-',
            r'netcat\s+-',
            r'wget\s+',
            r'curl\s+',
            r'bash\s+-',
            r'sh\s+-',
            r'python\s+-',
            r'perl\s+-',
            r'ruby\s+-',
            r'php\s+-'
        ]
        
        # File upload validation
        self.dangerous_extensions = [
            'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
            'php', 'asp', 'aspx', 'jsp', 'py', 'pl', 'rb', 'sh', 'bash',
            'cgi', 'exe', 'msi', 'deb', 'rpm', 'dmg', 'app', 'zip', 'rar'
        ]
        
        # Maximum lengths for different input types
        self.max_lengths = {
            'email': 254,
            'url': 2048,
            'name': 100,
            'description': 1000,
            'text': 5000,
            'json': 10000,
            'query_param': 500,
            'header': 1000
        }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Main validation dispatcher"""
        
        try:
            # Skip validation for certain paths
            if self._should_skip_validation(request.url.path):
                return await call_next(request)
            
            # Validate request headers
            validation_result = await self._validate_headers(request)
            if not validation_result.is_valid:
                return self._create_validation_error_response(validation_result)
            
            # Validate query parameters
            validation_result = await self._validate_query_params(request)
            if not validation_result.is_valid:
                return self._create_validation_error_response(validation_result)
            
            # Validate request body for POST/PUT/PATCH requests
            if request.method in ["POST", "PUT", "PATCH"]:
                validation_result = await self._validate_request_body(request)
                if not validation_result.is_valid:
                    return self._create_validation_error_response(validation_result)
            
            # Validate file uploads
            if await self._has_file_upload(request):
                validation_result = await self._validate_file_upload(request)
                if not validation_result.is_valid:
                    return self._create_validation_error_response(validation_result)
            
            # All validations passed
            response = await call_next(request)
            
            # Validate response if needed
            await self._validate_response(response, request)
            
            return response
            
        except Exception as e:
            logger.error(f"Validation middleware error: {e}")
            await self._log_validation_error("middleware_error", str(e), request)
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "error": {
                        "code": "VALIDATION_SERVICE_ERROR",
                        "message": "Validation service temporarily unavailable",
                        "details": {}
                    }
                }
            )
    
    def _should_skip_validation(self, path: str) -> bool:
        """Check if path should skip validation"""
        skip_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico"
        ]
        return any(path.startswith(skip_path) for skip_path in skip_paths)
    
    async def _validate_headers(self, request: Request) -> 'ValidationResult':
        """Validate request headers"""
        try:
            # Check for suspicious headers
            for header_name, header_value in request.headers.items():
                # Validate header length
                if len(header_value) > self.max_lengths['header']:
                    await self._log_validation_error(
                        "header_too_long",
                        f"Header {header_name} exceeds maximum length",
                        request
                    )
                    return ValidationResult(False, f"Header {header_name} too long", "HEADER_TOO_LONG")
                
                # Check for malicious patterns in headers
                if self._contains_malicious_patterns(header_value):
                    await self._log_validation_error(
                        "malicious_header",
                        f"Malicious content in header {header_name}",
                        request
                    )
                    return ValidationResult(False, f"Invalid header content: {header_name}", "MALICIOUS_HEADER")
            
            # Validate User-Agent
            user_agent = request.headers.get("User-Agent", "")
            if not user_agent or len(user_agent) < 10:
                await self._log_validation_error(
                    "suspicious_user_agent",
                    f"Suspicious or missing User-Agent: {user_agent}",
                    request
                )
                # Don't block, just log for now
            
            # Validate Content-Type for POST/PUT requests
            if request.method in ["POST", "PUT", "PATCH"]:
                content_type = request.headers.get("Content-Type", "")
                if not content_type:
                    return ValidationResult(False, "Content-Type header required", "MISSING_CONTENT_TYPE")
            
            return ValidationResult(True)
            
        except Exception as e:
            logger.error(f"Header validation error: {e}")
            return ValidationResult(False, "Header validation failed", "HEADER_VALIDATION_ERROR")
    
    async def _validate_query_params(self, request: Request) -> 'ValidationResult':
        """Validate query parameters"""
        try:
            for param_name, param_value in request.query_params.items():
                # Validate parameter length
                if len(param_value) > self.max_lengths['query_param']:
                    await self._log_validation_error(
                        "query_param_too_long",
                        f"Query parameter {param_name} exceeds maximum length",
                        request
                    )
                    return ValidationResult(False, f"Query parameter {param_name} too long", "QUERY_PARAM_TOO_LONG")
                
                # URL decode and check for malicious patterns
                decoded_value = unquote(param_value)
                if self._contains_malicious_patterns(decoded_value):
                    await self._log_validation_error(
                        "malicious_query_param",
                        f"Malicious content in query parameter {param_name}: {decoded_value}",
                        request
                    )
                    return ValidationResult(False, f"Invalid query parameter: {param_name}", "MALICIOUS_QUERY_PARAM")
                
                # Check for SQL injection in ID parameters
                if param_name.lower() in ['id', 'user_id', 'project_id'] and not param_value.isdigit():
                    if len(param_value) > 50 or self._contains_sql_patterns(param_value):
                        await self._log_validation_error(
                            "suspicious_id_param",
                            f"Suspicious ID parameter {param_name}: {param_value}",
                            request
                        )
                        return ValidationResult(False, f"Invalid ID format: {param_name}", "INVALID_ID_FORMAT")
            
            return ValidationResult(True)
            
        except Exception as e:
            logger.error(f"Query parameter validation error: {e}")
            return ValidationResult(False, "Query parameter validation failed", "QUERY_VALIDATION_ERROR")
    
    async def _validate_request_body(self, request: Request) -> 'ValidationResult':
        """Validate request body"""
        try:
            # Get content type
            content_type = request.headers.get("Content-Type", "")
            
            # Skip binary content
            if any(ct in content_type for ct in ['image/', 'video/', 'audio/', 'application/octet-stream']):
                return ValidationResult(True)
            
            # Check content length
            content_length = int(request.headers.get("Content-Length", "0"))
            max_content_length = 50 * 1024 * 1024  # 50MB
            
            if content_length > max_content_length:
                await self._log_validation_error(
                    "content_too_large",
                    f"Content length {content_length} exceeds maximum",
                    request
                )
                return ValidationResult(False, "Request body too large", "CONTENT_TOO_LARGE")
            
            # For JSON content, validate the JSON structure and content
            if "application/json" in content_type:
                try:
                    body = await request.body()
                    if body:
                        body_str = body.decode('utf-8')
                        
                        # Check JSON length
                        if len(body_str) > self.max_lengths['json']:
                            return ValidationResult(False, "JSON payload too large", "JSON_TOO_LARGE")
                        
                        # Parse JSON to validate structure
                        json_data = json.loads(body_str)
                        
                        # Validate JSON content recursively
                        validation_result = self._validate_json_content(json_data)
                        if not validation_result.is_valid:
                            await self._log_validation_error(
                                "malicious_json_content",
                                validation_result.message,
                                request
                            )
                            return validation_result
                        
                except json.JSONDecodeError:
                    return ValidationResult(False, "Invalid JSON format", "INVALID_JSON")
                except UnicodeDecodeError:
                    return ValidationResult(False, "Invalid character encoding", "INVALID_ENCODING")
            
            return ValidationResult(True)
            
        except Exception as e:
            logger.error(f"Request body validation error: {e}")
            return ValidationResult(False, "Request body validation failed", "BODY_VALIDATION_ERROR")
    
    def _validate_json_content(self, data: Any, path: str = "") -> 'ValidationResult':
        """Recursively validate JSON content"""
        try:
            if isinstance(data, str):
                # Check string length
                if len(data) > self.max_lengths['text']:
                    return ValidationResult(False, f"String too long at {path}", "STRING_TOO_LONG")
                
                # Check for malicious patterns
                if self._contains_malicious_patterns(data):
                    return ValidationResult(False, f"Malicious content at {path}", "MALICIOUS_JSON_CONTENT")
            
            elif isinstance(data, dict):
                # Validate dictionary keys and values
                for key, value in data.items():
                    # Validate key
                    if not isinstance(key, str) or len(key) > 100:
                        return ValidationResult(False, f"Invalid key at {path}", "INVALID_JSON_KEY")
                    
                    # Recursively validate value
                    new_path = f"{path}.{key}" if path else key
                    result = self._validate_json_content(value, new_path)
                    if not result.is_valid:
                        return result
            
            elif isinstance(data, list):
                # Validate list items
                if len(data) > 1000:  # Maximum array size
                    return ValidationResult(False, f"Array too large at {path}", "ARRAY_TOO_LARGE")
                
                for i, item in enumerate(data):
                    new_path = f"{path}[{i}]" if path else f"[{i}]"
                    result = self._validate_json_content(item, new_path)
                    if not result.is_valid:
                        return result
            
            return ValidationResult(True)
            
        except Exception as e:
            logger.error(f"JSON content validation error: {e}")
            return ValidationResult(False, "JSON content validation failed", "JSON_VALIDATION_ERROR")
    
    async def _has_file_upload(self, request: Request) -> bool:
        """Check if request contains file upload"""
        content_type = request.headers.get("Content-Type", "")
        return "multipart/form-data" in content_type
    
    async def _validate_file_upload(self, request: Request) -> 'ValidationResult':
        """Validate file uploads"""
        try:
            # This is a basic implementation
            # In practice, you'd use python-multipart to parse the upload
            
            content_length = int(request.headers.get("Content-Length", "0"))
            max_file_size = 100 * 1024 * 1024  # 100MB
            
            if content_length > max_file_size:
                await self._log_validation_error(
                    "file_too_large",
                    f"File upload size {content_length} exceeds maximum",
                    request
                )
                return ValidationResult(False, "File too large", "FILE_TOO_LARGE")
            
            # TODO: Implement proper file upload validation
            # - Check file extensions
            # - Validate MIME types
            # - Scan for malware
            # - Check file headers
            
            return ValidationResult(True)
            
        except Exception as e:
            logger.error(f"File upload validation error: {e}")
            return ValidationResult(False, "File upload validation failed", "FILE_VALIDATION_ERROR")
    
    async def _validate_response(self, response: Response, request: Request):
        """Validate response (optional security check)"""
        try:
            # Check for information disclosure in error responses
            if response.status_code >= 500:
                # Log internal server errors for monitoring
                await self._log_validation_error(
                    "internal_server_error",
                    f"Internal server error on {request.url.path}",
                    request
                )
            
            # Add security headers if not present
            if "X-Content-Type-Options" not in response.headers:
                response.headers["X-Content-Type-Options"] = "nosniff"
            
            if "X-Frame-Options" not in response.headers:
                response.headers["X-Frame-Options"] = "DENY"
            
        except Exception as e:
            logger.error(f"Response validation error: {e}")
    
    def _contains_malicious_patterns(self, content: str) -> bool:
        """Check if content contains malicious patterns"""
        content_lower = content.lower()
        
        # Check XSS patterns
        for pattern in self.xss_patterns:
            if re.search(pattern, content_lower, re.IGNORECASE):
                return True
        
        # Check SQL injection patterns
        if self._contains_sql_patterns(content):
            return True
        
        # Check path traversal patterns
        for pattern in self.path_traversal_patterns:
            if re.search(pattern, content_lower, re.IGNORECASE):
                return True
        
        # Check command injection patterns
        for pattern in self.command_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return True
        
        return False
    
    def _contains_sql_patterns(self, content: str) -> bool:
        """Check for SQL injection patterns"""
        content_lower = content.lower()
        
        for pattern in self.sql_patterns:
            if re.search(pattern, content_lower, re.IGNORECASE):
                return True
        
        return False
    
    async def _log_validation_error(self, error_type: str, message: str, request: Request):
        """Log validation errors"""
        log_security_event(
            "VALIDATION_FAILED",
            None,
            request,
            severity="WARNING",
            details={
                "error_type": error_type,
                "message": message,
                "client_ip": self._get_client_ip(request),
                "user_agent": request.headers.get("User-Agent", "unknown"),
                "path": request.url.path,
                "method": request.method
            }
        )
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.headers.get("X-Real-IP", request.client.host if request.client else "unknown")
    
    def _create_validation_error_response(self, validation_result: 'ValidationResult') -> JSONResponse:
        """Create validation error response"""
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": {
                    "code": validation_result.error_code,
                    "message": validation_result.message,
                    "details": {"validation_type": "input_validation"}
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        )

class ValidationResult:
    """Result of validation check"""
    
    def __init__(self, is_valid: bool, message: str = "", error_code: str = ""):
        self.is_valid = is_valid
        self.message = message
        self.error_code = error_code

# Input sanitization utilities
class InputSanitizer:
    """Utility class for input sanitization"""
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            return ""
        
        # Truncate if too long
        value = value[:max_length]
        
        # Remove null bytes
        value = value.replace('\x00', '')
        
        # Basic HTML encoding for display
        value = value.replace('<', '&lt;').replace('>', '&gt;')
        value = value.replace('"', '&quot;').replace("'", '&#x27;')
        
        return value.strip()
    
    @staticmethod
    def sanitize_email(email: str) -> str:
        """Sanitize email input"""
        if not isinstance(email, str):
            return ""
        
        email = email.strip().lower()
        
        # Basic email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return ""
        
        return email[:254]  # RFC maximum length
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename"""
        if not isinstance(filename, str):
            return ""
        
        # Remove path separators and dangerous characters
        filename = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', filename)
        
        # Remove leading/trailing dots and spaces
        filename = filename.strip('. ')
        
        # Truncate to reasonable length
        return filename[:255]
    
    @staticmethod
    def validate_ip_address(ip: str) -> bool:
        """Validate IP address"""
        try:
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False


# Enhanced validation utilities using ValidationService
class EnhancedRequestValidator:
    """Enhanced request validator using ValidationService"""
    
    @staticmethod
    def validate_json_body(
        body: bytes,
        schema_class: Type[BaseModel],
        strict: bool = True
    ) -> BaseModel:
        """Validate JSON request body against a Pydantic schema"""
        try:
            if not body:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Request body is required"
                )
            
            data = json.loads(body)
            
            # Use ValidationService for enhanced validation
            result = ValidationService.validate_pydantic_model(schema_class, data)
            
            if not result["is_valid"]:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "message": "Validation failed",
                        "errors": result["errors"]
                    }
                )
            
            return result["model"]
            
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON: {str(e)}"
            )
    
    @staticmethod
    def validate_email_field(email: str) -> str:
        """Validate email using enhanced validation"""
        result = ValidationService.validate_email(email)
        if not result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result["error"]
            )
        return result["normalized_email"]
    
    @staticmethod
    def validate_password_field(password: str) -> Dict[str, Any]:
        """Validate password using enhanced validation"""
        result = ValidationService.validate_password(password)
        if not result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Password validation failed",
                    "errors": result["errors"],
                    "strength": result.get("strength", "weak")
                }
            )
        return result
    
    @staticmethod
    def validate_file_upload_enhanced(
        file_size: int,
        file_name: str,
        file_type: str,
        max_size: int = 10 * 1024 * 1024,
        allowed_types: Optional[List[str]] = None,
        allowed_extensions: Optional[List[str]] = None
    ):
        """Enhanced file upload validation"""
        result = ValidationService.validate_file_upload(
            file_size=file_size,
            file_name=file_name,
            file_type=file_type,
            max_size=max_size,
            allowed_types=allowed_types,
            allowed_extensions=allowed_extensions
        )
        
        if not result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "File validation failed",
                    "error": result["error"]
                }
            )
    
    @staticmethod
    def sanitize_html_content(content: str) -> str:
        """Sanitize HTML content using ValidationService"""
        return ValidationService.sanitize_html(content)


# Validation decorators for API endpoints
class ZodValidationDecorators:
    """Decorators that provide Zod-like validation for FastAPI endpoints"""
    
    @staticmethod
    def validate_json_body(schema_class: Type[BaseModel]):
        """Decorator to validate JSON request body with enhanced validation"""
        def decorator(func: Callable):
            async def wrapper(*args, **kwargs):
                # Extract request from arguments
                request = None
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
                
                if request:
                    body = await request.body()
                    validated_data = EnhancedRequestValidator.validate_json_body(
                        body, schema_class
                    )
                    kwargs['validated_data'] = validated_data
                
                return await func(*args, **kwargs)
            return wrapper
        return decorator
    
    @staticmethod
    def validate_email_param(param_name: str = 'email'):
        """Decorator to validate email parameter"""
        def decorator(func: Callable):
            async def wrapper(*args, **kwargs):
                if param_name in kwargs:
                    kwargs[param_name] = EnhancedRequestValidator.validate_email_field(
                        kwargs[param_name]
                    )
                return await func(*args, **kwargs)
            return wrapper
        return decorator
    
    @staticmethod  
    def validate_password_strength():
        """Decorator to validate password strength"""
        def decorator(func: Callable):
            async def wrapper(*args, **kwargs):
                if 'validated_data' in kwargs:
                    data = kwargs['validated_data']
                    if hasattr(data, 'password'):
                        password_result = EnhancedRequestValidator.validate_password_field(
                            data.password
                        )
                        # Add password strength info to request context
                        kwargs['password_strength'] = password_result
                
                return await func(*args, **kwargs)
            return wrapper
        return decorator
    
    @staticmethod
    def sanitize_html_fields(html_fields: List[str]):
        """Decorator to sanitize HTML content in specified fields"""
        def decorator(func: Callable):
            async def wrapper(*args, **kwargs):
                if 'validated_data' in kwargs:
                    data = kwargs['validated_data']
                    for field in html_fields:
                        if hasattr(data, field):
                            sanitized_content = EnhancedRequestValidator.sanitize_html_content(
                                getattr(data, field)
                            )
                            setattr(data, field, sanitized_content)
                
                return await func(*args, **kwargs)
            return wrapper
        return decorator


# Enhanced validation response helpers
def create_validation_error_response(
    message: str,
    errors: Optional[List[Dict[str, Any]]] = None,
    error_code: str = "VALIDATION_ERROR"
) -> HTTPException:
    """Create standardized validation error response"""
    detail = {
        "message": message,
        "code": error_code,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if errors:
        detail["errors"] = errors
    
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=detail
    )


def create_success_response(
    data: Any,
    message: str = "Success"
) -> Dict[str, Any]:
    """Create standardized success response"""
    return {
        "success": True,
        "message": message,
        "data": data,
        "timestamp": datetime.utcnow().isoformat()
    }


# Utility functions for common validation patterns
async def validate_and_parse_request_body(
    request: Request,
    schema_class: Type[BaseModel]
) -> BaseModel:
    """Utility to validate and parse request body"""
    body = await request.body()
    return EnhancedRequestValidator.validate_json_body(body, schema_class)


def validate_uuid_param(uuid_str: str, param_name: str = "id") -> str:
    """Validate UUID parameter"""
    result = ValidationService.validate_uuid(uuid_str)
    if not result["is_valid"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid {param_name} format: {result['error']}"
        )
    return uuid_str


def validate_pagination_params_enhanced(
    page: int = 1,
    limit: int = 10,
    max_limit: int = 100,
    sort_by: Optional[str] = None,
    sort_order: str = "desc"
) -> Dict[str, Any]:
    """Enhanced pagination parameter validation"""
    
    # Validate page and limit
    if page < 1:
        raise create_validation_error_response(
            "Page must be greater than 0",
            error_code="INVALID_PAGE"
        )
    
    if limit < 1 or limit > max_limit:
        raise create_validation_error_response(
            f"Limit must be between 1 and {max_limit}",
            error_code="INVALID_LIMIT"
        )
    
    # Validate sort_order
    if sort_order not in ["asc", "desc"]:
        raise create_validation_error_response(
            "Sort order must be 'asc' or 'desc'",
            error_code="INVALID_SORT_ORDER"
        )
    
    return {
        "page": page,
        "limit": limit,
        "sort_by": sort_by,
        "sort_order": sort_order,
        "offset": (page - 1) * limit
    }


# Export enhanced components
__all__ = [
    # Original middleware components
    'ValidationMiddleware',
    'ValidationResult',
    'InputSanitizer',
    
    # Enhanced validation components
    'EnhancedRequestValidator',
    'ZodValidationDecorators',
    'validate_and_parse_request_body',
    'validate_uuid_param',
    'validate_pagination_params_enhanced',
    'create_validation_error_response',
    'create_success_response'
]