"""
Row Level Security (RLS) Service

Provides comprehensive row-level security enforcement for the application.
Handles policy evaluation, context management, and access control.
"""

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from app.core.config import settings
from app.core.logging import get_logger
from app.models.role import Role
from app.models.row_level_security import (
    Organization,
    OrganizationMember,
    RLSAction,
    RLSAuditLog,
    RLSContext,
    RLSEntityType,
    RLSPolicy,
    RLSRuleAssignment,
    RowLevelSecurityPolicy,
)
from app.models.user import User
from app.models.user_role import UserRole
from fastapi import Request
from sqlalchemy import and_, or_, select, text
from sqlalchemy.orm import Query, Session
from sqlalchemy.sql import Select

logger = get_logger(__name__)


class RLSService:
    """
    Row Level Security Service

    Handles all RLS operations including policy enforcement,
    context management, and access control validation.
    """

    def __init__(self, db: Session):
        self.db = db
        self._context_cache: Dict[str, RLSContext] = {}

    # Context Management

    def create_context(
        self,
        user: User,
        session_id: str,
        request: Optional[Request] = None,
        organization_id: Optional[int] = None,
        tenant_id: Optional[str] = None,
    ) -> RLSContext:
        """Create RLS context for a user session"""
        try:
            # Get user roles and permissions
            user_roles = self._get_user_roles(user.id)
            user_permissions = self._get_user_permissions(user.id)
            project_ids = self._get_accessible_project_ids(user.id, organization_id)

            # Extract request metadata
            ip_address = None
            user_agent = None
            if request:
                ip_address = (
                    getattr(request.client, "host", None) if request.client else None
                )
                user_agent = request.headers.get("user-agent")

            # Create context
            context = RLSContext(
                session_id=session_id,
                user_id=user.id,
                organization_id=organization_id,
                tenant_id=tenant_id,
                project_ids=project_ids,
                roles=user_roles,
                permissions=user_permissions,
                context_data={
                    "username": user.username,
                    "is_superuser": user.is_superuser,
                    "is_active": user.is_active,
                },
                ip_address=ip_address,
                user_agent=user_agent,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            )

            self.db.add(context)
            self.db.commit()
            self.db.refresh(context)

            # Cache context
            self._context_cache[session_id] = context

            logger.info(f"Created RLS context for user {user.id}, session {session_id}")
            return context

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create RLS context: {e}")
            raise

    def get_context(self, session_id: str) -> Optional[RLSContext]:
        """Get RLS context by session ID"""
        # Check cache first
        if session_id in self._context_cache:
            context = self._context_cache[session_id]
            if context.expires_at and context.expires_at > datetime.now(timezone.utc):
                return context
            else:
                # Remove expired context
                del self._context_cache[session_id]

        # Query database
        context = (
            self.db.query(RLSContext)
            .filter(
                RLSContext.session_id == session_id,
                or_(
                    RLSContext.expires_at.is_(None),
                    RLSContext.expires_at > datetime.now(timezone.utc),
                ),
            )
            .first()
        )

        if context:
            self._context_cache[session_id] = context

        return context

    def update_context(self, session_id: str, **updates) -> Optional[RLSContext]:
        """Update RLS context"""
        context = self.get_context(session_id)
        if not context:
            return None

        for key, value in updates.items():
            if hasattr(context, key):
                setattr(context, key, value)

        self.db.commit()
        self.db.refresh(context)

        # Update cache
        self._context_cache[session_id] = context

        return context

    def invalidate_context(self, session_id: str) -> bool:
        """Invalidate RLS context"""
        context = self.get_context(session_id)
        if context:
            context.expires_at = datetime.now(timezone.utc)
            self.db.commit()

            # Remove from cache
            if session_id in self._context_cache:
                del self._context_cache[session_id]

            return True
        return False

    # Policy Management

    def create_policy(
        self,
        name: str,
        entity_type: RLSEntityType,
        table_name: str,
        policy_type: RLSPolicy,
        action: RLSAction,
        created_by: int,
        **kwargs,
    ) -> RowLevelSecurityPolicy:
        """Create a new RLS policy"""
        try:
            policy = RowLevelSecurityPolicy(
                name=name,
                entity_type=entity_type,
                table_name=table_name,
                policy_type=policy_type,
                action=action,
                created_by=created_by,
                **kwargs,
            )

            self.db.add(policy)
            self.db.commit()
            self.db.refresh(policy)

            logger.info(f"Created RLS policy: {name} for {entity_type.value}")
            return policy

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create RLS policy: {e}")
            raise

    def get_applicable_policies(
        self,
        entity_type: RLSEntityType,
        action: RLSAction,
        table_name: Optional[str] = None,
        user_id: Optional[int] = None,
        organization_id: Optional[int] = None,
    ) -> List[RowLevelSecurityPolicy]:
        """Get applicable RLS policies for an entity and action"""
        query = self.db.query(RowLevelSecurityPolicy).filter(
            RowLevelSecurityPolicy.is_active.is_(True),
            RowLevelSecurityPolicy.entity_type == entity_type,
            or_(
                RowLevelSecurityPolicy.action == action,
                RowLevelSecurityPolicy.action == RLSAction.ALL,
            ),
        )

        if table_name:
            query = query.filter(RowLevelSecurityPolicy.table_name == table_name)

        if organization_id:
            query = query.filter(
                or_(
                    RowLevelSecurityPolicy.organization_id == organization_id,
                    RowLevelSecurityPolicy.organization_id.is_(None),
                )
            )

        policies = query.order_by(RowLevelSecurityPolicy.priority.desc()).all()

        # Filter by rule assignments if user specified
        if user_id:
            filtered_policies = []
            for policy in policies:
                if self._policy_applies_to_user(policy, user_id):
                    filtered_policies.append(policy)
            return filtered_policies

        return policies

    # Access Control

    def check_access(
        self,
        user_id: int,
        entity_type: RLSEntityType,
        action: RLSAction,
        entity_id: Optional[int] = None,
        table_name: Optional[str] = None,
        session_id: Optional[str] = None,
        request: Optional[Request] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if user has access to perform action on entity

        Returns:
            Tuple[bool, Optional[str]]: (access_granted, denial_reason)
        """
        try:
            # Get user context
            context = None
            if session_id:
                context = self.get_context(session_id)

            if not context:
                # Create temporary context
                user = self.db.query(User).filter(User.id == user_id).first()
                if not user:
                    return False, "User not found"
                context = self._create_temp_context(user)

            # Get applicable policies
            policies = self.get_applicable_policies(
                entity_type=entity_type,
                action=action,
                table_name=table_name,
                user_id=user_id,
                organization_id=context.organization_id,
            )

            # If no policies, allow access (default behavior)
            if not policies:
                access_granted = True
                denial_reason = None
            else:
                # Evaluate policies
                access_granted, denial_reason = self._evaluate_policies(
                    policies, context, entity_id, action
                )

            # Log access attempt
            self._log_access_attempt(
                user_id=user_id,
                entity_type=entity_type,
                action=action,
                entity_id=entity_id,
                access_granted=access_granted,
                denial_reason=denial_reason,
                policies=policies,
                context=context,
                request=request,
            )

            return access_granted, denial_reason

        except Exception as e:
            logger.error(f"Error checking access: {e}")
            return False, f"Access check failed: {str(e)}"

    def apply_rls_filter(
        self,
        query: Query,
        user_id: int,
        entity_type: RLSEntityType,
        action: RLSAction = RLSAction.SELECT,
        session_id: Optional[str] = None,
    ) -> Query:
        """Apply RLS filters to a SQLAlchemy query"""
        try:
            # Get user context
            context = None
            if session_id:
                context = self.get_context(session_id)

            if not context:
                user = self.db.query(User).filter(User.id == user_id).first()
                if not user:
                    # Return empty query if user not found
                    return query.filter(text("1=0"))
                context = self._create_temp_context(user)

            # Get applicable policies
            policies = self.get_applicable_policies(
                entity_type=entity_type,
                action=action,
                user_id=user_id,
                organization_id=context.organization_id,
            )

            # Apply policy filters
            for policy in policies:
                query = self._apply_policy_filter(query, policy, context)

            return query

        except Exception as e:
            logger.error(f"Error applying RLS filter: {e}")
            # Return restrictive query on error
            return query.filter(text("1=0"))

    # Internal Methods

    def _get_user_roles(self, user_id: int) -> List[str]:
        """Get user roles"""
        roles = (
            self.db.query(Role.name)
            .join(UserRole)
            .filter(
                UserRole.user_id == user_id,
                UserRole.is_active.is_(True),
                Role.is_active.is_(True),
            )
            .all()
        )
        return [role.name for role in roles]

    def _get_user_permissions(self, user_id: int) -> List[str]:
        """Get user permissions"""
        from app.models.permission import Permission
        from app.models.user_company_role import RolePermission

        permissions = (
            self.db.query(Permission.name)
            .join(RolePermission)
            .join(Role)
            .join(UserRole)
            .filter(
                UserRole.user_id == user_id,
                UserRole.is_active.is_(True),
                Role.is_active.is_(True),
            )
            .distinct()
            .all()
        )

        return [perm.name for perm in permissions]

    def _get_accessible_project_ids(
        self, user_id: int, organization_id: Optional[int] = None
    ) -> List[int]:
        """Get project IDs accessible to user.

        Note: Project and ProjectMember models are not yet implemented.
        This method returns an empty list until those models are added.
        """
        # TODO: Implement when Project and ProjectMember models are added
        return []

    def _create_temp_context(self, user: User) -> RLSContext:
        """Create temporary context for access checks"""
        return RLSContext(
            session_id=f"temp_{uuid.uuid4()}",
            user_id=user.id,
            roles=self._get_user_roles(user.id),
            permissions=self._get_user_permissions(user.id),
            project_ids=self._get_accessible_project_ids(user.id),
            context_data={
                "username": user.username,
                "is_superuser": user.is_superuser,
                "is_active": user.is_active,
            },
        )

    def _policy_applies_to_user(
        self, policy: RowLevelSecurityPolicy, user_id: int
    ) -> bool:
        """Check if policy applies to specific user"""
        assignments = (
            self.db.query(RLSRuleAssignment)
            .filter(
                RLSRuleAssignment.policy_id == policy.id,
                RLSRuleAssignment.is_active.is_(True),
                or_(
                    RLSRuleAssignment.user_id == user_id,
                    RLSRuleAssignment.user_id.is_(None),  # Global assignment
                    RLSRuleAssignment.role_id.in_(  # Role-based assignment
                        select(UserRole.role_id).where(
                            UserRole.user_id == user_id, UserRole.is_active.is_(True)
                        )
                    ),
                ),
            )
            .first()
        )

        return assignments is not None

    def _evaluate_policies(
        self,
        policies: List[RowLevelSecurityPolicy],
        context: RLSContext,
        entity_id: Optional[int],
        action: RLSAction,
    ) -> Tuple[bool, Optional[str]]:
        """Evaluate RLS policies for access decision"""
        for policy in policies:
            granted, reason = self._evaluate_single_policy(
                policy, context, entity_id, action
            )
            if not granted:
                return False, reason

        return True, None

    def _evaluate_single_policy(
        self,
        policy: RowLevelSecurityPolicy,
        context: RLSContext,
        entity_id: Optional[int],
        action: RLSAction,
    ) -> Tuple[bool, Optional[str]]:
        """Evaluate a single RLS policy"""
        try:
            if policy.policy_type == RLSPolicy.PUBLIC:
                return True, None

            elif policy.policy_type == RLSPolicy.OWNER_ONLY:
                return self._check_ownership(policy, context, entity_id)

            elif policy.policy_type == RLSPolicy.ORGANIZATION_MEMBER:
                return self._check_organization_membership(policy, context)

            elif policy.policy_type == RLSPolicy.PROJECT_MEMBER:
                return self._check_project_membership(policy, context, entity_id)

            elif policy.policy_type == RLSPolicy.ROLE_BASED:
                return self._check_role_requirements(policy, context)

            elif policy.policy_type == RLSPolicy.CONDITIONAL:
                return self._check_custom_condition(policy, context, entity_id)

            elif policy.policy_type == RLSPolicy.TENANT_ISOLATED:
                return self._check_tenant_isolation(policy, context, entity_id)

            else:
                return False, f"Unknown policy type: {policy.policy_type}"

        except Exception as e:
            logger.error(f"Error evaluating policy {policy.id}: {e}")
            return False, f"Policy evaluation error: {str(e)}"

    def _check_ownership(
        self,
        policy: RowLevelSecurityPolicy,
        context: RLSContext,
        entity_id: Optional[int],
    ) -> Tuple[bool, Optional[str]]:
        """Check if user owns the entity"""
        if not entity_id:
            return True, None  # No specific entity to check

        # Query the entity to check ownership
        table_name = policy.table_name
        condition_column = policy.condition_column or "user_id"

        try:
            result = self.db.execute(
                text(
                    f"SELECT {condition_column} FROM {table_name} WHERE id = :entity_id"
                ),
                {"entity_id": entity_id},
            ).first()

            if result and result[0] == context.user_id:
                return True, None
            else:
                return False, "Access denied: not owner"

        except Exception as e:
            logger.error(f"Error checking ownership: {e}")
            return False, "Ownership check failed"

    def _check_organization_membership(
        self, policy: RowLevelSecurityPolicy, context: RLSContext
    ) -> Tuple[bool, Optional[str]]:
        """Check organization membership"""
        if not context.organization_id:
            return False, "No organization context"

        member = (
            self.db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == context.organization_id,
                OrganizationMember.user_id == context.user_id,
                OrganizationMember.is_active.is_(True),
            )
            .first()
        )

        if member:
            return True, None
        else:
            return False, "Not an organization member"

    def _check_project_membership(
        self,
        policy: RowLevelSecurityPolicy,
        context: RLSContext,
        entity_id: Optional[int],
    ) -> Tuple[bool, Optional[str]]:
        """Check project membership"""
        if not entity_id:
            return True, None

        # Check if entity belongs to user's accessible projects
        if context.project_ids and entity_id in context.project_ids:
            return True, None
        else:
            return False, "Not a project member"

    def _check_role_requirements(
        self, policy: RowLevelSecurityPolicy, context: RLSContext
    ) -> Tuple[bool, Optional[str]]:
        """Check role requirements"""
        required_roles = policy.required_roles or []
        required_permissions = policy.required_permissions or []

        # Check roles
        if required_roles:
            user_roles = set(context.roles or [])
            if not set(required_roles).intersection(user_roles):
                return False, f"Required roles: {required_roles}"

        # Check permissions
        if required_permissions:
            user_permissions = set(context.permissions or [])
            if not set(required_permissions).intersection(user_permissions):
                return False, f"Required permissions: {required_permissions}"

        return True, None

    def _check_custom_condition(
        self,
        policy: RowLevelSecurityPolicy,
        context: RLSContext,
        entity_id: Optional[int],
    ) -> Tuple[bool, Optional[str]]:
        """Check custom SQL condition"""
        if not policy.custom_condition:
            return True, None

        try:
            # Replace placeholders in condition
            condition = policy.custom_condition
            condition = condition.replace(":user_id", str(context.user_id))
            condition = condition.replace(
                ":organization_id", str(context.organization_id or 0)
            )
            if entity_id:
                condition = condition.replace(":entity_id", str(entity_id))

            # Execute condition
            result = self.db.execute(text(f"SELECT ({condition}) as allowed")).first()

            if result and result.allowed:
                return True, None
            else:
                return False, "Custom condition not met"

        except Exception as e:
            logger.error(f"Error evaluating custom condition: {e}")
            return False, "Custom condition evaluation failed"

    def _check_tenant_isolation(
        self,
        policy: RowLevelSecurityPolicy,
        context: RLSContext,
        entity_id: Optional[int],
    ) -> Tuple[bool, Optional[str]]:
        """Check tenant isolation"""
        if not context.tenant_id:
            return False, "No tenant context"

        # Implementation depends on your tenant isolation strategy
        return True, None

    def _apply_policy_filter(
        self, query: Query, policy: RowLevelSecurityPolicy, context: RLSContext
    ) -> Query:
        """Apply policy filter to query"""
        try:
            if policy.policy_type == RLSPolicy.PUBLIC:
                return query  # No filter needed

            elif policy.policy_type == RLSPolicy.OWNER_ONLY:
                condition_column = policy.condition_column or "user_id"
                return query.filter(text(f"{condition_column} = {context.user_id}"))

            elif policy.policy_type == RLSPolicy.PROJECT_MEMBER:
                if context.project_ids:
                    project_ids_str = ",".join(map(str, context.project_ids))
                    return query.filter(text(f"id IN ({project_ids_str})"))
                else:
                    return query.filter(text("1=0"))  # No accessible projects

            # Add more policy type filters as needed

            return query

        except Exception as e:
            logger.error(f"Error applying policy filter: {e}")
            return query.filter(text("1=0"))  # Restrictive on error

    def _log_access_attempt(
        self,
        user_id: int,
        entity_type: RLSEntityType,
        action: RLSAction,
        access_granted: bool,
        entity_id: Optional[int] = None,
        denial_reason: Optional[str] = None,
        policies: Optional[List[RowLevelSecurityPolicy]] = None,
        context: Optional[RLSContext] = None,
        request: Optional[Request] = None,
    ):
        """Log RLS access attempt"""
        try:
            # Extract request metadata
            request_id = None
            session_id = None
            ip_address = None
            user_agent = None
            request_method = None
            request_path = None

            if request:
                request_id = getattr(request.state, "request_id", None)
                ip_address = (
                    getattr(request.client, "host", None) if request.client else None
                )
                user_agent = request.headers.get("user-agent")
                request_method = request.method
                request_path = str(request.url.path)

            if context:
                session_id = context.session_id

            # Create audit log entry
            audit_log = RLSAuditLog(
                request_id=request_id,
                session_id=session_id,
                user_id=user_id,
                policy_id=policies[0].id if policies else None,
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                access_granted=access_granted,
                denial_reason=denial_reason,
                applied_conditions={
                    "policies_evaluated": len(policies) if policies else 0,
                    "context_data": context.context_data if context else None,
                },
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_path=request_path,
            )

            self.db.add(audit_log)
            self.db.commit()

        except Exception as e:
            logger.error(f"Failed to log RLS access attempt: {e}")
            # Don't fail the main operation due to logging errors


# Utility functions


def get_rls_service(db: Session) -> RLSService:
    """Get RLS service instance"""
    return RLSService(db)


def create_default_policies(db: Session, created_by: int):
    """Create default RLS policies"""
    rls_service = RLSService(db)

    default_policies = [
        {
            "name": "Project Owner Access",
            "entity_type": RLSEntityType.PROJECT,
            "table_name": "projects",
            "policy_type": RLSPolicy.OWNER_ONLY,
            "action": RLSAction.ALL,
            "description": "Project owners have full access to their projects",
            "condition_column": "user_id",
        },
        {
            "name": "Public Project Read Access",
            "entity_type": RLSEntityType.PROJECT,
            "table_name": "projects",
            "policy_type": RLSPolicy.CONDITIONAL,
            "action": RLSAction.SELECT,
            "description": "Public projects are readable by all users",
            "custom_condition": "is_public = true",
        },
        {
            "name": "User Profile Access",
            "entity_type": RLSEntityType.USER,
            "table_name": "users",
            "policy_type": RLSPolicy.OWNER_ONLY,
            "action": RLSAction.UPDATE,
            "description": "Users can only update their own profiles",
            "condition_column": "id",
        },
    ]

    for policy_data in default_policies:
        try:
            rls_service.create_policy(created_by=created_by, **policy_data)
            logger.info(f"Created default RLS policy: {policy_data['name']}")
        except Exception as e:
            logger.error(f"Failed to create default policy {policy_data['name']}: {e}")
