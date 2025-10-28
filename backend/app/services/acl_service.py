"""
Access Control List (ACL) Service for Dynamic Per-Record Permissions

This service implements ServiceNow-style ACLs with:
- Dynamic permission evaluation based on conditions
- Record-level and field-level security
- Role-based and user-specific permissions
- Context-aware permission checking
"""

import ast
import operator
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.workflow import AccessControlList, RecordPermission
from app.services.permission_service import PermissionService


class ACLEvaluationError(Exception):
    """Raised when ACL evaluation fails"""
    pass


class ACLService:
    """
    Service for evaluating Access Control Lists and managing dynamic permissions
    """

    # Supported operators for condition evaluation
    OPERATORS = {
        '==': operator.eq,
        '!=': operator.ne,
        '<': operator.lt,
        '<=': operator.le,
        '>': operator.gt,
        '>=': operator.ge,
        'in': lambda x, y: x in y,
        'not_in': lambda x, y: x not in y,
        'contains': lambda x, y: y in x if isinstance(x, (str, list)) else False,
        'not_contains': lambda x, y: y not in x if isinstance(x, (str, list)) else True,
    }

    @staticmethod
    def evaluate_condition(condition_script: str, context: Dict[str, Any]) -> bool:
        """
        Evaluate a condition script with the given context

        Args:
            condition_script: Python expression to evaluate
            context: Dictionary of variables available in the condition

        Returns:
            bool: Result of the condition evaluation

        Raises:
            ACLEvaluationError: If condition evaluation fails
        """
        if not condition_script or not condition_script.strip():
            return True

        try:
            # Parse the condition as an AST for safety
            tree = ast.parse(condition_script, mode='eval')

            # Create a safe evaluation environment
            safe_globals = {
                '__builtins__': {
                    'True': True,
                    'False': False,
                    'None': None,
                    'str': str,
                    'int': int,
                    'float': float,
                    'bool': bool,
                    'len': len,
                    'sum': sum,
                    'min': min,
                    'max': max,
                    'abs': abs,
                    'round': round,
                }
            }

            # Add context variables
            safe_locals = context.copy()

            # Evaluate the condition
            result = eval(compile(tree, '<string>', 'eval'), safe_globals, safe_locals)

            return bool(result)

        except Exception as e:
            raise ACLEvaluationError(f"Failed to evaluate condition '{condition_script}': {str(e)}")

    @staticmethod
    def get_applicable_acls(db: Session, entity_type: str, operation: str,
                           field_name: Optional[str] = None) -> List[AccessControlList]:
        """
        Get all applicable ACLs for a given entity type, operation, and optional field

        Args:
            db: Database session
            entity_type: Type of entity (e.g., 'order', 'invoice')
            operation: Operation being performed (e.g., 'read', 'write')
            field_name: Optional field name for field-level permissions

        Returns:
            List of applicable ACLs sorted by priority
        """
        query = db.query(AccessControlList).filter(
            AccessControlList.entity_type == entity_type,
            AccessControlList.operation == operation,
            AccessControlList.is_active == True
        )

        if field_name:
            # For field-level permissions, include both general and specific field ACLs
            query = query.filter(
                (AccessControlList.field_name.is_(None)) |
                (AccessControlList.field_name == field_name)
            )
        else:
            # For record-level permissions, only include ACLs without field_name
            query = query.filter(AccessControlList.field_name.is_(None))

        return query.order_by(AccessControlList.priority.desc()).all()

    @staticmethod
    def evaluate_acl(db: Session, acl: AccessControlList, user: User,
                    entity_data: Optional[Dict[str, Any]] = None,
                    context: Optional[Dict[str, Any]] = None) -> Tuple[bool, str]:
        """
        Evaluate a single ACL rule

        Args:
            db: Database session
            acl: ACL rule to evaluate
            user: User performing the operation
            entity_data: Data of the entity being accessed
            context: Additional context variables

        Returns:
            Tuple of (is_allowed, reason)
        """
        # Build evaluation context
        eval_context = {
            'user': user,
            'user_id': user.id,
            'entity_data': entity_data or {},
            'context': context or {},
        }

        # Add user roles to context
        user_roles = PermissionService.get_user_roles(db, user.id)
        eval_context['user_roles'] = [role.name for role in user_roles]
        eval_context['user_role_names'] = [role.name for role in user_roles]

        # Evaluate condition if present
        if acl.condition_script:
            try:
                condition_met = ACLService.evaluate_condition(acl.condition_script, eval_context)
                if not condition_met:
                    return False, f"ACL condition not met: {acl.condition_script}"
            except ACLEvaluationError as e:
                return False, f"ACL evaluation error: {str(e)}"

        # Check denied roles first (deny takes precedence)
        if acl.denied_roles:
            user_role_names = [role.name for role in user_roles]
            denied_intersection = set(user_role_names) & set(acl.denied_roles)
            if denied_intersection:
                return False, f"User role(s) {list(denied_intersection)} are denied by ACL"

        # Check denied users
        if acl.denied_users and user.id in acl.denied_users:
            return False, f"User {user.id} is explicitly denied by ACL"

        # Check allowed roles
        if acl.allowed_roles:
            user_role_names = [role.name for role in user_roles]
            allowed_intersection = set(user_role_names) & set(acl.allowed_roles)
            if not allowed_intersection:
                return False, f"User does not have any of the required roles: {acl.allowed_roles}"

        # Check allowed users
        if acl.allowed_users and user.id not in acl.allowed_users:
            return False, f"User {user.id} is not in the allowed users list"

        return True, "ACL allows access"

    @staticmethod
    def check_record_access(db: Session, user: User, entity_type: str,
                           entity_id: str, operation: str,
                           entity_data: Optional[Dict[str, Any]] = None) -> Tuple[bool, str]:
        """
        Check if user has access to perform an operation on a specific record

        Args:
            db: Database session
            user: User performing the operation
            entity_type: Type of entity
            entity_id: ID of the specific entity
            operation: Operation to check ('read', 'write', 'delete', 'approve')
            entity_data: Optional entity data for condition evaluation

        Returns:
            Tuple of (has_access, reason)
        """
        # First check record-specific permissions
        record_permissions = db.query(RecordPermission).filter(
            RecordPermission.entity_type == entity_type,
            RecordPermission.entity_id == entity_id,
            RecordPermission.is_active == True,
            RecordPermission.operation == operation
        ).all()

        # Check for explicit record permissions
        for perm in record_permissions:
            if perm.user_id == user.id:
                if perm.expires_at and perm.expires_at < datetime.utcnow():
                    continue  # Expired permission
                return True, f"Explicit record permission granted to user {user.id}"

            if perm.role_id:
                user_roles = PermissionService.get_user_roles(db, user.id)
                if any(role.id == perm.role_id for role in user_roles):
                    if perm.expires_at and perm.expires_at < datetime.utcnow():
                        continue  # Expired permission
                    return True, f"Record permission granted via role {perm.role_id}"

        # If no explicit record permissions, check ACLs
        applicable_acls = ACLService.get_applicable_acls(db, entity_type, operation)

        if not applicable_acls:
            # No ACLs defined, fall back to general permissions
            has_general_perm = PermissionService.check_permission(db, user.id, operation, entity_type)
            if has_general_perm:
                return True, f"General permission for {operation} on {entity_type}"
            else:
                return False, f"No ACLs defined and no general permission for {operation} on {entity_type}"

        # Evaluate ACLs in priority order
        for acl in applicable_acls:
            allowed, reason = ACLService.evaluate_acl(db, acl, user, entity_data)
            if allowed:
                return True, f"ACL '{acl.name}' allows access: {reason}"

        return False, "No ACLs granted access"

    @staticmethod
    def check_field_access(db: Session, user: User, entity_type: str,
                          field_name: str, operation: str,
                          entity_data: Optional[Dict[str, Any]] = None) -> Tuple[bool, str]:
        """
        Check if user has access to perform an operation on a specific field

        Args:
            db: Database session
            user: User performing the operation
            entity_type: Type of entity
            field_name: Name of the field
            operation: Operation to check ('read', 'write')
            entity_data: Optional entity data for condition evaluation

        Returns:
            Tuple of (has_access, reason)
        """
        applicable_acls = ACLService.get_applicable_acls(db, entity_type, operation, field_name)

        if not applicable_acls:
            # No field-specific ACLs, fall back to record-level access
            return ACLService.check_record_access(db, user, entity_type, "", operation, entity_data)

        # Evaluate field ACLs in priority order
        for acl in applicable_acls:
            allowed, reason = ACLService.evaluate_acl(db, acl, user, entity_data)
            if allowed:
                return True, f"Field ACL '{acl.name}' allows access: {reason}"

        return False, f"No field ACLs granted access to {field_name}"

    @staticmethod
    def grant_record_permission(db: Session, entity_type: str, entity_id: str,
                               user_id: Optional[int], role_id: Optional[int],
                               operation: str, granted_by: int,
                               expires_at: Optional[datetime] = None,
                               conditions: Optional[Dict[str, Any]] = None) -> RecordPermission:
        """
        Grant a specific permission on a record to a user or role

        Args:
            db: Database session
            entity_type: Type of entity
            entity_id: ID of the entity
            user_id: User ID to grant permission to (optional if role_id provided)
            role_id: Role ID to grant permission to (optional if user_id provided)
            operation: Operation being granted
            granted_by: User ID granting the permission
            expires_at: Optional expiration date
            conditions: Optional additional conditions

        Returns:
            Created RecordPermission object
        """
        if not user_id and not role_id:
            raise ValueError("Either user_id or role_id must be provided")

        permission = RecordPermission(
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            role_id=role_id,
            operation=operation,
            granted_by=granted_by,
            expires_at=expires_at,
            conditions=conditions or {},
            is_active=True
        )

        db.add(permission)
        db.commit()
        db.refresh(permission)

        return permission

    @staticmethod
    def revoke_record_permission(db: Session, permission_id: int, revoked_by: int) -> bool:
        """
        Revoke a specific record permission

        Args:
            db: Database session
            permission_id: ID of the permission to revoke
            revoked_by: User ID revoking the permission

        Returns:
            True if permission was revoked, False if not found
        """
        permission = db.query(RecordPermission).filter(RecordPermission.id == permission_id).first()

        if not permission:
            return False

        permission.is_active = False
        permission.revoked_by = revoked_by
        permission.revoked_at = datetime.utcnow()

        db.commit()
        return True

    @staticmethod
    def get_user_record_permissions(db: Session, user_id: int, entity_type: Optional[str] = None,
                                   entity_id: Optional[str] = None) -> List[RecordPermission]:
        """
        Get all record permissions for a user

        Args:
            db: Database session
            user_id: User ID
            entity_type: Optional entity type filter
            entity_id: Optional entity ID filter

        Returns:
            List of active record permissions
        """
        query = db.query(RecordPermission).filter(
            RecordPermission.is_active == True,
            (RecordPermission.user_id == user_id) |
            (RecordPermission.role_id.in_(
                db.query(UserRole.role_id).filter(UserRole.user_id == user_id, UserRole.is_active == True)
            ))
        )

        if entity_type:
            query = query.filter(RecordPermission.entity_type == entity_type)

        if entity_id:
            query = query.filter(RecordPermission.entity_id == entity_id)

        return query.all()


# Import here to avoid circular imports
from app.models.user_role import UserRole