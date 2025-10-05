"""
GraphQL Authentication and Authorization
"""
import strawberry
from typing import List, Optional
from fastapi import HTTPException, status
from app.graphql.context import GraphQLContext
from app.models.user import User
from app.core.exceptions import AuthenticationError, SecurityError


def require_auth(info: strawberry.Info[GraphQLContext]) -> User:
    """
    Require authentication for GraphQL operation
    
    Args:
        info: GraphQL info object with context
        
    Returns:
        User: Current authenticated user
        
    Raises:
        AuthenticationError: If user is not authenticated
    """
    if not info.context.user:
        raise AuthenticationError(
            message="Authentication required",
            details={"operation": "graphql_query"},
            error_code="AUTHENTICATION_REQUIRED"
        )
    return info.context.user


def require_active_user(info: strawberry.Info[GraphQLContext]) -> User:
    """
    Require active authenticated user for GraphQL operation
    
    Args:
        info: GraphQL info object with context
        
    Returns:
        User: Current authenticated active user
        
    Raises:
        AuthenticationError: If user is not authenticated or not active
    """
    user = require_auth(info)
    if not user.is_active:
        raise SecurityError(
            message="Account is inactive",
            details={"user_id": user.id, "operation": "graphql_query"},
            error_code="INACTIVE_USER"
        )
    return user


def require_superuser(info: strawberry.Info[GraphQLContext]) -> User:
    """
    Require superuser access for GraphQL operation
    
    Args:
        info: GraphQL info object with context
        
    Returns:
        User: Current authenticated superuser
        
    Raises:
        AuthenticationError: If user is not authenticated
        SecurityError: If user is not a superuser
    """
    user = require_active_user(info)
    if not user.is_superuser:
        raise SecurityError(
            message="Superuser access required",
            details={"user_id": user.id, "operation": "graphql_query"},
            error_code="INSUFFICIENT_PERMISSIONS"
        )
    return user


def require_project_access(
    info: strawberry.Info[GraphQLContext], 
    project_id: int, 
    required_roles: Optional[List[str]] = None
) -> User:
    """
    Require project access for GraphQL operation
    
    Args:
        info: GraphQL info object with context
        project_id: ID of the project to check access for
        required_roles: List of required roles (e.g., ['owner', 'admin', 'editor'])
        
    Returns:
        User: Current authenticated user with project access
        
    Raises:
        AuthenticationError: If user is not authenticated
        SecurityError: If user doesn't have access to the project
    """
    user = require_active_user(info)
    
    # Superusers have access to all projects
    if user.is_superuser:
        return user
    
    # TODO: Implement project access check logic
    # This would typically check:
    # 1. If user is the project owner
    # 2. If user is a project member with required roles
    # 3. If project is public and user has read access
    
    # For now, we'll do a basic check - this should be expanded
    # based on your project member model and role system
    
    return user


def can_access_user_data(
    info: strawberry.Info[GraphQLContext], 
    target_user_id: int
) -> bool:
    """
    Check if current user can access data for target user
    
    Args:
        info: GraphQL info object with context
        target_user_id: ID of the user whose data is being accessed
        
    Returns:
        bool: True if access is allowed, False otherwise
    """
    current_user = info.context.user
    
    # Not authenticated
    if not current_user:
        return False
    
    # User can access their own data
    if current_user.id == target_user_id:
        return True
    
    # Superusers can access any user data
    if current_user.is_superuser:
        return True
    
    # TODO: Add more complex authorization logic here
    # For example, organization admins accessing their members' data
    
    return False


def filter_user_fields_for_privacy(
    user: User, 
    viewing_user: Optional[User] = None
) -> dict:
    """
    Filter user fields based on privacy settings and viewer permissions
    
    Args:
        user: User whose data is being viewed
        viewing_user: User who is viewing the data
        
    Returns:
        dict: Filtered user data
    """
    # Base public fields
    public_fields = {
        'id': user.id,
        'username': user.username,
        'full_name': user.full_name,
        'avatar_url': user.avatar_url,
        'created_at': user.created_at,
    }
    
    # If no viewing user, return only public fields
    if not viewing_user:
        return public_fields
    
    # If viewing own profile or superuser, return all fields
    if viewing_user.id == user.id or viewing_user.is_superuser:
        return {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'full_name': user.full_name,
            'is_active': user.is_active,
            'is_verified': user.is_verified,
            'avatar_url': user.avatar_url,
            'bio': user.bio,
            'location': user.location,
            'website': user.website,
            'created_at': user.created_at,
            'updated_at': user.updated_at,
            'last_login_at': user.last_login_at,
        }
    
    # For other authenticated users, return extended public fields
    return {
        **public_fields,
        'bio': user.bio,
        'location': user.location,
        'website': user.website,
    }


class GraphQLPermissions:
    """GraphQL permission decorators and utilities"""
    
    @staticmethod
    def authenticated(func):
        """Decorator to require authentication"""
        def wrapper(*args, **kwargs):
            # The first argument after self should be info
            if len(args) >= 2:
                info = args[1]  # Usually args[0] is self, args[1] is info
                require_auth(info)
            return func(*args, **kwargs)
        return wrapper
    
    @staticmethod
    def active_user(func):
        """Decorator to require active user"""
        def wrapper(*args, **kwargs):
            if len(args) >= 2:
                info = args[1]
                require_active_user(info)
            return func(*args, **kwargs)
        return wrapper
    
    @staticmethod
    def superuser(func):
        """Decorator to require superuser"""
        def wrapper(*args, **kwargs):
            if len(args) >= 2:
                info = args[1]
                require_superuser(info)
            return func(*args, **kwargs)
        return wrapper