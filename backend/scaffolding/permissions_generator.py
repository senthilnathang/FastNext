"""
Advanced Permission System Integration for Backend Scaffolding

Generates sophisticated RBAC permission systems including:
- Resource-level permissions
- Field-level access control
- Dynamic permission rules
- Owner-based access patterns
- Multi-tenant support
"""

from typing import Dict, List, Optional, Any
from pathlib import Path
from .backend_generator import ModelDefinition, FieldDefinition, FieldType


class PermissionLevel:
    """Permission levels for granular access control"""
    NONE = "none"
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"


class PermissionGenerator:
    """Generate advanced permission system integration"""
    
    def __init__(self, model_def: ModelDefinition, base_path: str = "."):
        self.model_def = model_def
        self.base_path = Path(base_path)
        self.model_name = model_def.name
        self.snake_name = model_def.name.lower()
        self.permission_category = model_def.permission_category or self.snake_name
        
    def generate_permissions(self):
        """Generate complete permission system"""
        print(f"🔐 Generating advanced permissions for {self.model_name}...")
        
        # Generate permission definitions
        self.generate_permission_definitions()
        
        # Generate permission middleware
        self.generate_permission_middleware()
        
        # Generate field-level access control
        self.generate_field_permissions()
        
        # Generate owner-based permissions
        if self.model_def.owner_field:
            self.generate_owner_permissions()
        
        # Generate multi-tenant permissions
        if self.model_def.project_scoped:
            self.generate_tenant_permissions()
        
        print(f"✅ Advanced permissions generated for {self.model_name}")
    
    def generate_permission_definitions(self):
        """Generate permission definitions and registration"""
        content = f'''"""
Auto-generated permission definitions for {self.model_name}
These permissions integrate with the FastNext RBAC system
"""

from app.auth.permissions import Permission, PermissionCategory
from app.models.permission import Permission as PermissionModel
from sqlalchemy.orm import Session


class {self.model_name}Permissions:
    """Permission definitions for {self.model_name} operations"""
    
    # Basic CRUD permissions
    READ = Permission(
        name="read_{self.permission_category}",
        description=f"Can view {self.model_name} records",
        category="{self.permission_category}"
    )
    
    CREATE = Permission(
        name="create_{self.permission_category}",
        description=f"Can create new {self.model_name} records",
        category="{self.permission_category}"
    )
    
    UPDATE = Permission(
        name="update_{self.permission_category}",
        description=f"Can modify {self.model_name} records",
        category="{self.permission_category}"
    )
    
    DELETE = Permission(
        name="delete_{self.permission_category}",
        description=f"Can delete {self.model_name} records",
        category="{self.permission_category}"
    )
    
    # Bulk operation permissions
    BULK_CREATE = Permission(
        name="bulk_create_{self.permission_category}",
        description=f"Can bulk create {self.model_name} records",
        category="{self.permission_category}"
    )
    
    BULK_UPDATE = Permission(
        name="bulk_update_{self.permission_category}",
        description=f"Can bulk update {self.model_name} records",
        category="{self.permission_category}"
    )
    
    BULK_DELETE = Permission(
        name="bulk_delete_{self.permission_category}",
        description=f"Can bulk delete {self.model_name} records",
        category="{self.permission_category}"
    )
    
    # Export/Import permissions
    EXPORT = Permission(
        name="export_{self.permission_category}",
        description=f"Can export {self.model_name} data",
        category="{self.permission_category}"
    )
    
    IMPORT = Permission(
        name="import_{self.permission_category}",
        description=f"Can import {self.model_name} data",
        category="{self.permission_category}"
    )
    
    # Admin permissions
    ADMIN = Permission(
        name="admin_{self.permission_category}",
        description=f"Full administrative access to {self.model_name}",
        category="{self.permission_category}"
    )
    
    @classmethod
    def get_all_permissions(cls) -> List[Permission]:
        """Get all permissions for this model"""
        return [
            cls.READ, cls.CREATE, cls.UPDATE, cls.DELETE,
            cls.BULK_CREATE, cls.BULK_UPDATE, cls.BULK_DELETE,
            cls.EXPORT, cls.IMPORT, cls.ADMIN
        ]
    
    @classmethod
    def register_permissions(cls, db: Session):
        """Register all permissions in the database"""
        for permission in cls.get_all_permissions():
            # Check if permission already exists
            existing = db.query(PermissionModel).filter(
                PermissionModel.name == permission.name
            ).first()
            
            if not existing:
                db_permission = PermissionModel(
                    name=permission.name,
                    description=permission.description,
                    category=permission.category
                )
                db.add(db_permission)
        
        db.commit()


class {self.model_name}FieldPermissions:
    """Field-level permission definitions"""
    
'''

        # Generate field-specific permissions
        sensitive_fields = []
        for field in self.model_def.fields:
            if field.name in ['password', 'secret', 'token', 'key']:
                sensitive_fields.append(field)
            elif field.type == FieldType.EMAIL:
                sensitive_fields.append(field)
        
        for field in sensitive_fields:
            field_name = field.name.upper()
            content += f'''    # Sensitive field: {field.name}
    READ_{field_name} = Permission(
        name="read_{self.permission_category}_{field.name}",
        description=f"Can view {field.name} field in {self.model_name}",
        category="{self.permission_category}"
    )
    
    UPDATE_{field_name} = Permission(
        name="update_{self.permission_category}_{field.name}",
        description=f"Can modify {field.name} field in {self.model_name}",
        category="{self.permission_category}"
    )
    
'''
        
        content += f'''    @classmethod
    def get_field_permissions(cls) -> List[Permission]:
        """Get all field-level permissions"""
        return [
'''
        
        for field in sensitive_fields:
            field_name = field.name.upper()
            content += f"            cls.READ_{field_name}, cls.UPDATE_{field_name},\n"
        
        content += '''        ]


# Permission validation functions
def has_field_permission(user, field_name: str, operation: str = "read") -> bool:
    """Check if user has permission to access specific field"""
    permission_name = f"{operation}_{field_name}"
    return user.has_permission(permission_name)


def filter_fields_by_permission(user, fields: Dict[str, Any]) -> Dict[str, Any]:
    """Filter fields based on user permissions"""
    filtered_fields = {}
    
    for field_name, value in fields.items():
        if has_field_permission(user, field_name, "read"):
            filtered_fields[field_name] = value
        else:
            # Redact sensitive field
            filtered_fields[field_name] = "[REDACTED]"
    
    return filtered_fields
'''
        
        self._write_file(f"app/auth/permissions/{self.snake_name}_permissions.py", content)
    
    def generate_permission_middleware(self):
        """Generate permission middleware decorators"""
        content = f'''"""
Permission middleware decorators for {self.model_name} API endpoints
"""

from functools import wraps
from typing import Optional, Callable, Any
from fastapi import HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, get_db
from app.models.user import User
from app.models.{self.snake_name} import {self.model_name}
from app.auth.permissions.{self.snake_name}_permissions import {self.model_name}Permissions


def require_{self.snake_name}_permission(permission_name: str, resource_check: bool = False):
    """
    Decorator to require specific {self.model_name} permission
    
    Args:
        permission_name: Name of the required permission
        resource_check: Whether to check resource-specific permissions
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user and db from dependencies
            user = None
            db = None
            resource_id = None
            
            # Get user from function parameters
            for arg in args:
                if isinstance(arg, User):
                    user = arg
                elif hasattr(arg, 'query'):  # SQLAlchemy session
                    db = arg
            
            # Get from kwargs
            if not user:
                user = kwargs.get('current_user')
            if not db:
                db = kwargs.get('db')
            
            # Get resource ID for resource-specific checks
            if resource_check:
                resource_id = kwargs.get('id') or kwargs.get(f'{self.snake_name}_id')
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check basic permission
            if not user.has_permission(permission_name):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission_name}' required"
                )
            
            # Resource-specific permission check
            if resource_check and resource_id and db:
                resource = db.query({self.model_name}).filter({self.model_name}.id == resource_id).first()
                if resource and not can_access_resource(user, resource):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Insufficient permissions for this resource"
                    )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def can_access_resource(user: User, resource: {self.model_name}) -> bool:
    """
    Check if user can access specific {self.model_name} resource
    Implements owner-based and project-based access control
    """
    # Admin users have full access
    if user.has_permission({self.model_name}Permissions.ADMIN.name):
        return True
    
'''
        
        # Add owner-based access control
        if self.model_def.owner_field:
            content += f'''    # Owner-based access
    if hasattr(resource, '{self.model_def.owner_field}'):
        if getattr(resource, '{self.model_def.owner_field}') == user.id:
            return True
    
'''
        
        # Add project-based access control
        if self.model_def.project_scoped:
            content += f'''    # Project-based access
    if hasattr(resource, 'project_id') and hasattr(user, 'project_memberships'):
        user_project_ids = [m.project_id for m in user.project_memberships]
        if resource.project_id in user_project_ids:
            return True
    
'''
        
        content += '''    return False


def get_accessible_resources_query(user: User, db: Session, base_query):
    """
    Filter query to only return resources accessible to user
    """
    # Admin users see everything
    if user.has_permission({model_name}Permissions.ADMIN.name):
        return base_query
    
    # Apply owner-based filtering
'''.format(model_name=self.model_name)
        
        if self.model_def.owner_field:
            content += f'''    if hasattr({self.model_name}, '{self.model_def.owner_field}'):
        base_query = base_query.filter(
            {self.model_name}.{self.model_def.owner_field} == user.id
        )
    '''
        
        # Add project-based filtering
        if self.model_def.project_scoped:
            content += f'''    
    # Apply project-based filtering
    if hasattr({self.model_name}, 'project_id'):
        user_project_ids = [m.project_id for m in user.project_memberships]
        base_query = base_query.filter(
            {self.model_name}.project_id.in_(user_project_ids)
        )
    '''
        
        content += '''
    
    return base_query


# Commonly used permission decorators
def require_read_permission(func):
    return require_{snake_name}_permission({model_name}Permissions.READ.name)(func)


def require_create_permission(func):
    return require_{snake_name}_permission({model_name}Permissions.CREATE.name)(func)


def require_update_permission(func):
    return require_{snake_name}_permission({model_name}Permissions.UPDATE.name, resource_check=True)(func)


def require_delete_permission(func):
    return require_{snake_name}_permission({model_name}Permissions.DELETE.name, resource_check=True)(func)


def require_admin_permission(func):
    return require_{snake_name}_permission({model_name}Permissions.ADMIN.name)(func)
'''.format(snake_name=self.snake_name, model_name=self.model_name)
        
        self._write_file(f"app/auth/middleware/{self.snake_name}_middleware.py", content)
    
    def generate_field_permissions(self):
        """Generate field-level access control"""
        content = f'''"""
Field-level access control for {self.model_name}
Provides granular control over which fields users can read/write
"""

from typing import Dict, List, Any, Optional
from app.models.user import User
from app.models.{self.snake_name} import {self.model_name}
from app.auth.permissions.{self.snake_name}_permissions import {self.model_name}FieldPermissions


class {self.model_name}FieldAccessControl:
    """Manages field-level access permissions"""
    
    # Define sensitive fields that require special permissions
    SENSITIVE_FIELDS = {{
'''
        
        # Add sensitive fields configuration
        for field in self.model_def.fields:
            if field.name in ['password', 'secret', 'token', 'key'] or field.type == FieldType.EMAIL:
                content += f'        "{field.name}": {{\n'
                content += f'            "read_permission": "read_{self.permission_category}_{field.name}",\n'
                content += f'            "write_permission": "update_{self.permission_category}_{field.name}",\n'
                content += f'            "redacted_value": "[REDACTED]"\n'
                content += f'        }},\n'
        
        content += '''    }
    
    @classmethod
    def filter_readable_fields(cls, user: User, data: Dict[str, Any]) -> Dict[str, Any]:
        """Filter fields based on user's read permissions"""
        filtered_data = {}
        
        for field_name, value in data.items():
            if field_name in cls.SENSITIVE_FIELDS:
                field_config = cls.SENSITIVE_FIELDS[field_name]
                if user.has_permission(field_config["read_permission"]):
                    filtered_data[field_name] = value
                else:
                    filtered_data[field_name] = field_config["redacted_value"]
            else:
                filtered_data[field_name] = value
        
        return filtered_data
    
    @classmethod
    def filter_writable_fields(cls, user: User, data: Dict[str, Any]) -> Dict[str, Any]:
        """Filter fields based on user's write permissions"""
        filtered_data = {}
        
        for field_name, value in data.items():
            if field_name in cls.SENSITIVE_FIELDS:
                field_config = cls.SENSITIVE_FIELDS[field_name]
                if user.has_permission(field_config["write_permission"]):
                    filtered_data[field_name] = value
                # Silently ignore fields user can't write
            else:
                filtered_data[field_name] = value
        
        return filtered_data
    
    @classmethod
    def get_readable_fields(cls, user: User) -> List[str]:
        """Get list of fields user can read"""
        readable_fields = []
        
        # All users can read basic fields
        basic_fields = [field.name for field in cls.get_basic_fields()]
        readable_fields.extend(basic_fields)
        
        # Check sensitive fields
        for field_name, config in cls.SENSITIVE_FIELDS.items():
            if user.has_permission(config["read_permission"]):
                readable_fields.append(field_name)
        
        return readable_fields
    
    @classmethod
    def get_writable_fields(cls, user: User) -> List[str]:
        """Get list of fields user can write"""
        writable_fields = []
        
        # All users can write basic fields (if they have general write permission)
        basic_fields = [field.name for field in cls.get_basic_fields()]
        writable_fields.extend(basic_fields)
        
        # Check sensitive fields
        for field_name, config in cls.SENSITIVE_FIELDS.items():
            if user.has_permission(config["write_permission"]):
                writable_fields.append(field_name)
        
        return writable_fields
    
    @classmethod
    def get_basic_fields(cls) -> List[str]:
        """Get list of basic (non-sensitive) fields"""
        all_field_names = ['''

        # Add all field names except sensitive ones
        for field in self.model_def.fields:
            if field.name not in ['password', 'secret', 'token', 'key'] and field.type != FieldType.EMAIL:
                content += f'"{field.name}", '
        
        content += ''']
        return [name for name in all_field_names if name not in cls.SENSITIVE_FIELDS]
'''
        
        self._write_file(f"app/auth/field_access/{self.snake_name}_field_access.py", content)
    
    def generate_owner_permissions(self):
        """Generate owner-based permission system"""
        content = f'''"""
Owner-based permission system for {self.model_name}
Allows resource owners special access to their own records
"""

from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.{self.snake_name} import {self.model_name}
from app.auth.permissions.{self.snake_name}_permissions import {self.model_name}Permissions


class {self.model_name}OwnershipManager:
    """Manages ownership-based access control"""
    
    @staticmethod
    def is_owner(user: User, resource: {self.model_name}) -> bool:
        """Check if user owns the resource"""
        return getattr(resource, '{self.model_def.owner_field}', None) == user.id
    
    @staticmethod
    def can_read_as_owner(user: User, resource: {self.model_name}) -> bool:
        """Check if user can read resource as owner"""
        if {self.model_name}OwnershipManager.is_owner(user, resource):
            return True
        
        # Check if user has general read permission
        return user.has_permission({self.model_name}Permissions.READ.name)
    
    @staticmethod
    def can_update_as_owner(user: User, resource: {self.model_name}) -> bool:
        """Check if user can update resource as owner"""
        if {self.model_name}OwnershipManager.is_owner(user, resource):
            return True
        
        # Check if user has general update permission
        return user.has_permission({self.model_name}Permissions.UPDATE.name)
    
    @staticmethod
    def can_delete_as_owner(user: User, resource: {self.model_name}) -> bool:
        """Check if user can delete resource as owner"""
        if {self.model_name}OwnershipManager.is_owner(user, resource):
            return True
        
        # Check if user has general delete permission
        return user.has_permission({self.model_name}Permissions.DELETE.name)
    
    @staticmethod
    def filter_owned_resources(user: User, db: Session, base_query):
        """Filter query to show only owned resources + permitted resources"""
        # Users with admin permission see everything
        if user.has_permission({self.model_name}Permissions.ADMIN.name):
            return base_query
        
        # Users with general read permission see everything
        if user.has_permission({self.model_name}Permissions.READ.name):
            return base_query
        
        # Otherwise, only show owned resources
        return base_query.filter(
            getattr({self.model_name}, '{self.model_def.owner_field}') == user.id
        )
    
    @staticmethod
    def assign_owner(resource: {self.model_name}, user: User) -> {self.model_name}:
        """Assign ownership of resource to user"""
        setattr(resource, '{self.model_def.owner_field}', user.id)
        return resource
'''
        
        self._write_file(f"app/auth/ownership/{self.snake_name}_ownership.py", content)
    
    def generate_tenant_permissions(self):
        """Generate multi-tenant permission system"""
        content = f'''"""
Multi-tenant permission system for {self.model_name}
Provides project/tenant-based isolation and access control
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.{self.snake_name} import {self.model_name}
from app.models.project import Project
from app.auth.permissions.{self.snake_name}_permissions import {self.model_name}Permissions


class {self.model_name}TenantManager:
    """Manages tenant-based access control"""
    
    @staticmethod
    def get_user_tenant_ids(user: User) -> List[int]:
        """Get list of project/tenant IDs user has access to"""
        if hasattr(user, 'project_memberships'):
            return [membership.project_id for membership in user.project_memberships]
        return []
    
    @staticmethod
    def can_access_tenant_resource(user: User, resource: {self.model_name}) -> bool:
        """Check if user can access resource in tenant context"""
        # Admin users bypass tenant restrictions
        if user.has_permission({self.model_name}Permissions.ADMIN.name):
            return True
        
        # Check if resource belongs to user's accessible tenants
        user_tenant_ids = {self.model_name}TenantManager.get_user_tenant_ids(user)
        resource_tenant_id = getattr(resource, 'project_id', None)
        
        if resource_tenant_id and resource_tenant_id in user_tenant_ids:
            return True
        
        return False
    
    @staticmethod
    def filter_tenant_resources(user: User, db: Session, base_query):
        """Filter query to show only tenant-accessible resources"""
        # Admin users see everything
        if user.has_permission({self.model_name}Permissions.ADMIN.name):
            return base_query
        
        # Filter by user's accessible tenants
        user_tenant_ids = {self.model_name}TenantManager.get_user_tenant_ids(user)
        
        if user_tenant_ids:
            return base_query.filter(
                {self.model_name}.project_id.in_(user_tenant_ids)
            )
        
        # User has no tenant access, return empty query
        return base_query.filter(False)
    
    @staticmethod
    def assign_tenant(resource: {self.model_name}, project_id: int, user: User) -> {self.model_name}:
        """Assign resource to tenant/project"""
        # Verify user has access to this tenant
        user_tenant_ids = {self.model_name}TenantManager.get_user_tenant_ids(user)
        
        if project_id not in user_tenant_ids:
            raise ValueError("User does not have access to specified tenant")
        
        resource.project_id = project_id
        return resource
    
    @staticmethod
    def get_tenant_stats(user: User, db: Session) -> dict:
        """Get statistics about resources across user's tenants"""
        user_tenant_ids = {self.model_name}TenantManager.get_user_tenant_ids(user)
        
        stats = {{}}
        for tenant_id in user_tenant_ids:
            count = db.query({self.model_name}).filter(
                {self.model_name}.project_id == tenant_id
            ).count()
            
            stats[tenant_id] = {{
                'count': count,
                'tenant_id': tenant_id
            }}
        
        return stats
'''
        
        self._write_file(f"app/auth/tenant/{self.snake_name}_tenant.py", content)
    
    def _write_file(self, relative_path: str, content: str):
        """Write content to file, creating directories as needed"""
        file_path = self.base_path / relative_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content)