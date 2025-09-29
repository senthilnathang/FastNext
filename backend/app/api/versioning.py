from typing import Dict, List, Optional, Any, Callable, Union
from fastapi import FastAPI, Request, Response, HTTPException, status, Depends
from fastapi.routing import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from enum import Enum
import re
import logging
from datetime import datetime, date
from packaging import version
import inspect

logger = logging.getLogger(__name__)

class VersioningStrategy(str, Enum):
    """API versioning strategies"""
    HEADER = "header"           # X-API-Version header
    URL_PATH = "url_path"       # /api/v1/users
    QUERY_PARAM = "query"       # ?version=1.0
    ACCEPT_HEADER = "accept"    # Accept: application/vnd.api+json;version=1
    SUBDOMAIN = "subdomain"     # v1.api.example.com

class APIVersionInfo(BaseModel):
    """API version information"""
    version: str
    release_date: date
    status: str  # "current", "deprecated", "sunset"
    sunset_date: Optional[date] = None
    changelog_url: Optional[str] = None
    migration_guide_url: Optional[str] = None
    breaking_changes: List[str] = []
    new_features: List[str] = []
    bug_fixes: List[str] = []

class VersionedAPIManager:
    """Manages API versioning and compatibility"""
    
    def __init__(
        self,
        app: FastAPI,
        strategy: VersioningStrategy = VersioningStrategy.URL_PATH,
        default_version: str = "1.0",
        supported_versions: List[str] = None,
        version_header: str = "X-API-Version"
    ):
        self.app = app
        self.strategy = strategy
        self.default_version = default_version
        self.supported_versions = supported_versions or ["1.0"]
        self.version_header = version_header
        
        # Version registry
        self.version_registry: Dict[str, APIVersionInfo] = {}
        self.version_routers: Dict[str, APIRouter] = {}
        self.endpoint_versions: Dict[str, Dict[str, Callable]] = {}
        
        # Deprecation warnings
        self.deprecation_warnings: Dict[str, str] = {}
        
        # Setup default versions
        self._setup_default_versions()
        
        # Add version detection middleware
        self._add_version_middleware()
    
    def _setup_default_versions(self):
        """Setup default version information"""
        for ver in self.supported_versions:
            self.register_version(
                ver,
                APIVersionInfo(
                    version=ver,
                    release_date=date.today(),
                    status="current" if ver == self.default_version else "supported"
                )
            )
    
    def _add_version_middleware(self):
        """Add middleware to handle version detection and routing"""
        @self.app.middleware("http")
        async def version_middleware(request: Request, call_next):
            try:
                # Detect version from request
                detected_version = self._detect_version(request)
                
                # Validate version
                if not self._is_version_supported(detected_version):
                    return self._create_version_error_response(
                        f"API version '{detected_version}' is not supported",
                        "UNSUPPORTED_VERSION",
                        detected_version
                    )
                
                # Check if version is deprecated
                version_info = self.version_registry.get(detected_version)
                if version_info and version_info.status == "deprecated":
                    # Add deprecation warning header
                    request.state.deprecation_warning = True
                    request.state.sunset_date = version_info.sunset_date
                
                # Check if version is sunset
                if version_info and version_info.status == "sunset":
                    return self._create_version_error_response(
                        f"API version '{detected_version}' has been sunset",
                        "SUNSET_VERSION",
                        detected_version
                    )
                
                # Store detected version in request state
                request.state.api_version = detected_version
                
                # Process request
                response = await call_next(request)
                
                # Add version headers to response
                self._add_version_headers(response, detected_version, request)
                
                return response
                
            except Exception as e:
                logger.error(f"Version middleware error: {e}")
                return await call_next(request)
    
    def _detect_version(self, request: Request) -> str:
        """Detect API version from request"""
        
        if self.strategy == VersioningStrategy.HEADER:
            return request.headers.get(self.version_header, self.default_version)
        
        elif self.strategy == VersioningStrategy.URL_PATH:
            # Extract version from URL path (e.g., /api/v1/users)
            path = request.url.path
            version_match = re.search(r'/v(\d+(?:\.\d+)?)', path)
            if version_match:
                return version_match.group(1)
            return self.default_version
        
        elif self.strategy == VersioningStrategy.QUERY_PARAM:
            return request.query_params.get("version", self.default_version)
        
        elif self.strategy == VersioningStrategy.ACCEPT_HEADER:
            accept_header = request.headers.get("Accept", "")
            version_match = re.search(r'version=(\d+(?:\.\d+)?)', accept_header)
            if version_match:
                return version_match.group(1)
            return self.default_version
        
        elif self.strategy == VersioningStrategy.SUBDOMAIN:
            host = request.headers.get("Host", "")
            version_match = re.search(r'^v(\d+(?:\.\d+)?)', host)
            if version_match:
                return version_match.group(1)
            return self.default_version
        
        return self.default_version
    
    def _is_version_supported(self, version_str: str) -> bool:
        """Check if version is supported"""
        return version_str in self.supported_versions
    
    def _add_version_headers(self, response: Response, detected_version: str, request: Request):
        """Add version-related headers to response"""
        
        response.headers["X-API-Version"] = detected_version
        response.headers["X-Supported-Versions"] = ",".join(self.supported_versions)
        
        # Add deprecation warning if applicable
        if hasattr(request.state, 'deprecation_warning') and request.state.deprecation_warning:
            response.headers["Deprecation"] = "true"
            if hasattr(request.state, 'sunset_date') and request.state.sunset_date:
                response.headers["Sunset"] = request.state.sunset_date.isoformat()
        
        # Add link headers for version discovery
        base_url = str(request.base_url).rstrip('/')
        for ver in self.supported_versions:
            if self.strategy == VersioningStrategy.URL_PATH:
                version_url = f"{base_url}/api/v{ver}"
                response.headers[f"Link-Version-{ver}"] = f"<{version_url}>; rel=\"version\""
    
    def _create_version_error_response(self, message: str, error_code: str, requested_version: str) -> JSONResponse:
        """Create version error response"""
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": {
                    "code": error_code,
                    "message": message,
                    "details": {
                        "requested_version": requested_version,
                        "supported_versions": self.supported_versions,
                        "default_version": self.default_version
                    }
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat()
                }
            },
            headers={
                "X-API-Version": self.default_version,
                "X-Supported-Versions": ",".join(self.supported_versions)
            }
        )
    
    def register_version(self, version_str: str, version_info: APIVersionInfo):
        """Register a new API version"""
        self.version_registry[version_str] = version_info
        if version_str not in self.supported_versions:
            self.supported_versions.append(version_str)
        
        # Sort versions
        self.supported_versions.sort(key=lambda v: version.parse(v), reverse=True)
    
    def create_versioned_router(self, version_str: str, **router_kwargs) -> APIRouter:
        """Create a router for a specific version"""
        if version_str not in self.version_routers:
            # Create router with version prefix if using URL path strategy
            if self.strategy == VersioningStrategy.URL_PATH:
                prefix = router_kwargs.get('prefix', '')
                version_prefix = f"/api/v{version_str}"
                if prefix and not prefix.startswith(version_prefix):
                    router_kwargs['prefix'] = version_prefix + prefix
                elif not prefix:
                    router_kwargs['prefix'] = version_prefix
            
            router = APIRouter(**router_kwargs)
            self.version_routers[version_str] = router
            
            # Add router to main app
            self.app.include_router(router)
        
        return self.version_routers[version_str]
    
    def deprecate_version(self, version_str: str, sunset_date: Optional[date] = None, reason: str = ""):
        """Mark a version as deprecated"""
        if version_str in self.version_registry:
            self.version_registry[version_str].status = "deprecated"
            self.version_registry[version_str].sunset_date = sunset_date
            self.deprecation_warnings[version_str] = reason
    
    def sunset_version(self, version_str: str):
        """Mark a version as sunset (no longer available)"""
        if version_str in self.version_registry:
            self.version_registry[version_str].status = "sunset"
            if version_str in self.supported_versions:
                self.supported_versions.remove(version_str)
    
    def get_version_info(self, version_str: str) -> Optional[APIVersionInfo]:
        """Get version information"""
        return self.version_registry.get(version_str)
    
    def list_versions(self) -> Dict[str, APIVersionInfo]:
        """List all registered versions"""
        return self.version_registry.copy()

# Decorators for version-specific endpoints
def version_range(min_version: str, max_version: Optional[str] = None):
    """Decorator to specify version range for endpoint"""
    def decorator(func):
        func._version_range = (min_version, max_version)
        return func
    return decorator

def deprecated_in_version(version_str: str, reason: str = "", migration_guide: str = ""):
    """Decorator to mark endpoint as deprecated in specific version"""
    def decorator(func):
        func._deprecated_version = version_str
        func._deprecation_reason = reason
        func._migration_guide = migration_guide
        return func
    return decorator

def removed_in_version(version_str: str):
    """Decorator to mark endpoint as removed in specific version"""
    def decorator(func):
        func._removed_version = version_str
        return func
    return decorator

# Version-aware dependency
def get_api_version(request: Request) -> str:
    """Dependency to get current API version"""
    return getattr(request.state, 'api_version', '1.0')

def require_version(min_version: str, max_version: Optional[str] = None):
    """Dependency to require specific version range"""
    def version_checker(current_version: str = Depends(get_api_version)):
        current_ver = version.parse(current_version)
        min_ver = version.parse(min_version)
        
        if current_ver < min_ver:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This endpoint requires API version {min_version} or higher"
            )
        
        if max_version:
            max_ver = version.parse(max_version)
            if current_ver > max_ver:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"This endpoint is not available in API version {current_version}"
                )
        
        return current_version
    
    return version_checker

# Version compatibility checker
class VersionCompatibilityChecker:
    """Check compatibility between API versions"""
    
    def __init__(self):
        self.breaking_changes: Dict[str, List[str]] = {}
        self.field_mappings: Dict[str, Dict[str, str]] = {}
    
    def register_breaking_change(self, from_version: str, to_version: str, changes: List[str]):
        """Register breaking changes between versions"""
        key = f"{from_version}->{to_version}"
        self.breaking_changes[key] = changes
    
    def register_field_mapping(self, from_version: str, to_version: str, field_map: Dict[str, str]):
        """Register field name mappings between versions"""
        key = f"{from_version}->{to_version}"
        self.field_mappings[key] = field_map
    
    def get_breaking_changes(self, from_version: str, to_version: str) -> List[str]:
        """Get breaking changes between versions"""
        key = f"{from_version}->{to_version}"
        return self.breaking_changes.get(key, [])
    
    def transform_data(self, data: Dict[str, Any], from_version: str, to_version: str) -> Dict[str, Any]:
        """Transform data between versions"""
        key = f"{from_version}->{to_version}"
        field_map = self.field_mappings.get(key, {})
        
        if not field_map:
            return data
        
        transformed = {}
        for old_field, new_field in field_map.items():
            if old_field in data:
                transformed[new_field] = data[old_field]
            else:
                transformed[old_field] = data.get(old_field)
        
        # Copy unmapped fields
        for field, value in data.items():
            if field not in field_map and field not in transformed:
                transformed[field] = value
        
        return transformed

# Version migration utilities
class VersionMigrator:
    """Handle data migration between API versions"""
    
    def __init__(self):
        self.migrators: Dict[str, Callable] = {}
    
    def register_migrator(self, from_version: str, to_version: str, migrator: Callable):
        """Register a migration function"""
        key = f"{from_version}->{to_version}"
        self.migrators[key] = migrator
    
    def migrate(self, data: Any, from_version: str, to_version: str) -> Any:
        """Migrate data between versions"""
        key = f"{from_version}->{to_version}"
        migrator = self.migrators.get(key)
        
        if migrator:
            return migrator(data)
        
        return data

# Content negotiation for versions
class VersionedContentNegotiator:
    """Handle content negotiation for different API versions"""
    
    def __init__(self):
        self.serializers: Dict[str, Dict[str, Callable]] = {}
    
    def register_serializer(self, version: str, content_type: str, serializer: Callable):
        """Register a serializer for specific version and content type"""
        if version not in self.serializers:
            self.serializers[version] = {}
        self.serializers[version][content_type] = serializer
    
    def serialize(self, data: Any, version: str, content_type: str) -> Any:
        """Serialize data for specific version and content type"""
        if version in self.serializers and content_type in self.serializers[version]:
            serializer = self.serializers[version][content_type]
            return serializer(data)
        
        return data

# Version documentation generator
class VersionDocumentationGenerator:
    """Generate documentation for different API versions"""
    
    def __init__(self, version_manager: VersionedAPIManager):
        self.version_manager = version_manager
    
    def generate_changelog(self) -> Dict[str, Any]:
        """Generate changelog for all versions"""
        changelog = {}
        
        for version_str, version_info in self.version_manager.version_registry.items():
            changelog[version_str] = {
                "version": version_info.version,
                "release_date": version_info.release_date.isoformat(),
                "status": version_info.status,
                "breaking_changes": version_info.breaking_changes,
                "new_features": version_info.new_features,
                "bug_fixes": version_info.bug_fixes,
                "sunset_date": version_info.sunset_date.isoformat() if version_info.sunset_date else None
            }
        
        return changelog
    
    def generate_migration_guide(self, from_version: str, to_version: str) -> Dict[str, Any]:
        """Generate migration guide between versions"""
        from_info = self.version_manager.get_version_info(from_version)
        to_info = self.version_manager.get_version_info(to_version)
        
        if not from_info or not to_info:
            return {}
        
        return {
            "from_version": from_version,
            "to_version": to_version,
            "breaking_changes": to_info.breaking_changes,
            "migration_steps": [],  # Would be populated with specific migration steps
            "examples": {},  # Would contain before/after examples
            "migration_guide_url": to_info.migration_guide_url
        }

# Factory function to create versioned API
def create_versioned_api(
    strategy: VersioningStrategy = VersioningStrategy.URL_PATH,
    default_version: str = "1.0",
    supported_versions: List[str] = None
) -> VersionedAPIManager:
    """Factory function to create a versioned API manager"""
    
    # Create FastAPI app if needed
    from fastapi import FastAPI
    app = FastAPI()
    
    return VersionedAPIManager(
        app=app,
        strategy=strategy,
        default_version=default_version,
        supported_versions=supported_versions or ["1.0", "1.1", "2.0"]
    )