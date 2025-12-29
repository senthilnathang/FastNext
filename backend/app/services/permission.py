"""
Permission service with eager loading to fix N+1 query issues.
Provides optimized permission retrieval and Redis caching.
"""

import logging
from typing import List, Optional, Set

from sqlalchemy.orm import Session, selectinload, joinedload

from app.models import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.user_company_role import UserCompanyRole, RolePermission
from app.models.group import Group, UserGroup, GroupPermission
from app.core.cache import cache
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache key patterns
PERMISSION_CACHE_KEY = "user:{user_id}:company:{company_id}:permissions"
PERMISSION_CACHE_TTL = 3600  # 1 hour


class PermissionService:
    """
    Service for efficient permission checking with eager loading.

    This service fixes the N+1 query problem by using eager loading
    to fetch all related data in a single query.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_user_permissions(
        self,
        user_id: int,
        company_id: Optional[int] = None,
        use_cache: bool = True
    ) -> Set[str]:
        """
        Get all permission codenames for a user in a company.
        Uses Redis caching (1 hour TTL) and eager loading for optimal performance.

        Args:
            user_id: The user ID
            company_id: Optional company ID (uses user's current company if not provided)
            use_cache: Whether to use Redis cache (default: True)

        Returns:
            Set of permission codenames
        """
        cache_key = PERMISSION_CACHE_KEY.format(
            user_id=user_id,
            company_id=company_id or "all"
        )

        # Try to get from cache first
        if use_cache:
            cached = cache.get(cache_key)
            if cached is not None:
                logger.debug(f"Permission cache hit for user {user_id}")
                return set(cached)

        # Cache miss - fetch from database
        permissions = set()

        # Get permissions from company roles with eager loading
        role_permissions = self._get_permissions_from_roles(user_id, company_id)
        permissions.update(role_permissions)

        # Get permissions from groups with eager loading
        group_permissions = self._get_permissions_from_groups(user_id, company_id)
        permissions.update(group_permissions)

        # Store in cache
        if use_cache:
            cache.set(cache_key, list(permissions), ttl=PERMISSION_CACHE_TTL)
            logger.debug(f"Cached permissions for user {user_id}: {len(permissions)} perms")

        return permissions

    def _get_permissions_from_roles(
        self,
        user_id: int,
        company_id: Optional[int] = None
    ) -> Set[str]:
        """
        Get permissions from user's company roles.
        Single query with eager loading.
        """
        query = (
            self.db.query(Permission.codename)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .join(Role, Role.id == RolePermission.role_id)
            .join(UserCompanyRole, UserCompanyRole.role_id == Role.id)
            .filter(
                UserCompanyRole.user_id == user_id,
                UserCompanyRole.is_active == True,
                Permission.is_active == True,
            )
        )

        if company_id:
            query = query.filter(UserCompanyRole.company_id == company_id)

        results = query.distinct().all()
        return {r[0] for r in results}

    def _get_permissions_from_groups(
        self,
        user_id: int,
        company_id: Optional[int] = None
    ) -> Set[str]:
        """
        Get permissions from user's groups.
        Single query with eager loading.
        """
        query = (
            self.db.query(Permission.codename)
            .join(GroupPermission, GroupPermission.permission_id == Permission.id)
            .join(Group, Group.id == GroupPermission.group_id)
            .join(UserGroup, UserGroup.group_id == Group.id)
            .filter(
                UserGroup.user_id == user_id,
                UserGroup.is_active == True,
                Group.is_active == True,
                Permission.is_active == True,
            )
        )

        if company_id:
            query = query.filter(Group.company_id == company_id)

        results = query.distinct().all()
        return {r[0] for r in results}

    def has_permission(
        self,
        user_id: int,
        codename: str,
        company_id: Optional[int] = None,
        is_superuser: bool = False
    ) -> bool:
        """
        Check if a user has a specific permission.
        Optimized for single permission check.

        Args:
            user_id: The user ID
            codename: The permission codename to check
            company_id: Optional company ID
            is_superuser: If True, always returns True

        Returns:
            True if user has the permission
        """
        if is_superuser:
            return True

        # Check in roles first (more likely to find permission here)
        role_has = (
            self.db.query(Permission.id)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .join(Role, Role.id == RolePermission.role_id)
            .join(UserCompanyRole, UserCompanyRole.role_id == Role.id)
            .filter(
                UserCompanyRole.user_id == user_id,
                UserCompanyRole.is_active == True,
                Permission.codename == codename,
                Permission.is_active == True,
            )
        )

        if company_id:
            role_has = role_has.filter(UserCompanyRole.company_id == company_id)

        if role_has.first():
            return True

        # Check in groups
        group_has = (
            self.db.query(Permission.id)
            .join(GroupPermission, GroupPermission.permission_id == Permission.id)
            .join(Group, Group.id == GroupPermission.group_id)
            .join(UserGroup, UserGroup.group_id == Group.id)
            .filter(
                UserGroup.user_id == user_id,
                UserGroup.is_active == True,
                Group.is_active == True,
                Permission.codename == codename,
                Permission.is_active == True,
            )
        )

        if company_id:
            group_has = group_has.filter(Group.company_id == company_id)

        return group_has.first() is not None

    def get_user_with_permissions(
        self,
        user_id: int
    ) -> Optional[User]:
        """
        Load a user with all permission-related data eagerly loaded.

        This loads:
        - User
        - UserCompanyRoles → Role → RolePermissions → Permission
        - UserGroups → Group → GroupPermissions → Permission

        Returns a User object with all relationships pre-loaded.
        """
        return (
            self.db.query(User)
            .options(
                # Load company roles with role and permissions
                selectinload(User.company_roles)
                .selectinload(UserCompanyRole.role)
                .selectinload(Role.permissions)
                .selectinload(RolePermission.permission),
                # Load groups with permissions
                selectinload(User.groups)
                .selectinload(UserGroup.group)
                .selectinload(Group.permissions)
                .selectinload(GroupPermission.permission),
            )
            .filter(User.id == user_id)
            .first()
        )

    def get_role_permissions(self, role_id: int) -> Set[str]:
        """
        Get all permission codenames for a role.

        Args:
            role_id: The role ID

        Returns:
            Set of permission codenames
        """
        results = (
            self.db.query(Permission.codename)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .filter(
                RolePermission.role_id == role_id,
                Permission.is_active == True,
            )
            .all()
        )
        return {r[0] for r in results}

    def get_group_permissions(self, group_id: int) -> Set[str]:
        """
        Get all permission codenames for a group.

        Args:
            group_id: The group ID

        Returns:
            Set of permission codenames
        """
        results = (
            self.db.query(Permission.codename)
            .join(GroupPermission, GroupPermission.permission_id == Permission.id)
            .filter(
                GroupPermission.group_id == group_id,
                Permission.is_active == True,
            )
            .all()
        )
        return {r[0] for r in results}

    # =========================================================================
    # CACHE INVALIDATION METHODS
    # =========================================================================

    def invalidate_user_cache(
        self,
        user_id: int,
        company_id: Optional[int] = None
    ) -> bool:
        """
        Invalidate cached permissions for a user.
        Call this when:
        - User's role changes
        - User is added/removed from a group
        - User's company assignment changes

        Args:
            user_id: The user ID
            company_id: Optional specific company (if None, clears all companies)

        Returns:
            True if cache was cleared
        """
        if company_id:
            cache_key = PERMISSION_CACHE_KEY.format(
                user_id=user_id,
                company_id=company_id
            )
            return cache.delete(cache_key)
        else:
            # Clear all permission caches for this user
            pattern = f"user:{user_id}:company:*:permissions"
            count = cache.delete_pattern(pattern)
            logger.info(f"Cleared {count} permission cache entries for user {user_id}")
            return count > 0

    def invalidate_role_cache(self, role_id: int) -> int:
        """
        Invalidate cached permissions for all users with a specific role.
        Call this when:
        - Role's permissions change
        - Role is deactivated

        Args:
            role_id: The role ID

        Returns:
            Number of users whose cache was invalidated
        """
        # Find all users with this role
        user_ids = (
            self.db.query(UserCompanyRole.user_id)
            .filter(UserCompanyRole.role_id == role_id, UserCompanyRole.is_active == True)
            .distinct()
            .all()
        )

        count = 0
        for (user_id,) in user_ids:
            if self.invalidate_user_cache(user_id):
                count += 1

        logger.info(f"Invalidated cache for {count} users after role {role_id} change")
        return count

    def invalidate_group_cache(self, group_id: int) -> int:
        """
        Invalidate cached permissions for all users in a specific group.
        Call this when:
        - Group's permissions change
        - Group is deactivated

        Args:
            group_id: The group ID

        Returns:
            Number of users whose cache was invalidated
        """
        # Find all users in this group
        user_ids = (
            self.db.query(UserGroup.user_id)
            .filter(UserGroup.group_id == group_id, UserGroup.is_active == True)
            .distinct()
            .all()
        )

        count = 0
        for (user_id,) in user_ids:
            if self.invalidate_user_cache(user_id):
                count += 1

        logger.info(f"Invalidated cache for {count} users after group {group_id} change")
        return count

    @staticmethod
    def invalidate_all_permissions_cache() -> int:
        """
        Invalidate all permission caches.
        Use sparingly - only when permissions are globally changed.

        Returns:
            Number of cache entries cleared
        """
        pattern = "user:*:company:*:permissions"
        count = cache.delete_pattern(pattern)
        logger.warning(f"Cleared ALL permission caches ({count} entries)")
        return count
