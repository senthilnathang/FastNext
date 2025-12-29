"""
Record Rule Service

Provides record-level security by applying domain filters based on rules.
Similar to Odoo's ir.rule functionality.
"""

import logging
from typing import Any, Dict, List, Optional, Type, TypeVar

from sqlalchemy import and_, or_
from sqlalchemy.orm import Query, Session

from app.models.user import User

from ..models.record_rule import RecordRule, RuleOperation, RuleScope

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RecordRuleService:
    """
    Service for applying record-level security rules.

    Usage:
        service = RecordRuleService(db)
        query = service.apply_rules(query, MyModel, user, "read")
    """

    def __init__(self, db: Session):
        self.db = db
        self._rules_cache: Dict[str, List[RecordRule]] = {}

    def get_rules_for_model(
        self,
        model_name: str,
        operation: str,
        user: Optional[User] = None,
    ) -> List[RecordRule]:
        """
        Get all applicable rules for a model and operation.

        Args:
            model_name: The model name (e.g., 'demo.DemoItem')
            operation: The operation (read, write, create, delete)
            user: The current user (for role-based filtering)

        Returns:
            List of applicable RecordRule objects
        """
        cache_key = f"{model_name}:{operation}"

        # Query rules
        query = (
            self.db.query(RecordRule)
            .filter(RecordRule.model_name == model_name)
            .filter(RecordRule.is_active == True)
            .order_by(RecordRule.sequence)
        )

        rules = query.all()

        # Filter by operation
        applicable = []
        for rule in rules:
            if not rule.applies_to_operation(operation):
                continue

            # Check role restriction
            if rule.role_id and user:
                user_role_ids = [ucr.role_id for ucr in user.company_roles]
                if rule.role_id not in user_role_ids:
                    continue

            applicable.append(rule)

        return applicable

    def apply_rules(
        self,
        query: Query,
        model_class: Type[T],
        user: User,
        operation: str = "read",
    ) -> Query:
        """
        Apply record rules to a SQLAlchemy query.

        Args:
            query: The base SQLAlchemy query
            model_class: The model class being queried
            user: The current user
            operation: The operation type (read, write, create, delete)

        Returns:
            Modified query with rule filters applied
        """
        # Superusers bypass rules (if configured)
        if user.is_superuser:
            return query

        # Get model name
        model_name = self._get_model_name(model_class)

        # Get applicable rules
        rules = self.get_rules_for_model(model_name, operation, user)

        if not rules:
            return query

        # Build filters from rules
        filters = []
        for rule in rules:
            rule_filter = self._build_filter(rule, model_class, user)
            if rule_filter is not None:
                filters.append(rule_filter)

        # Apply filters (AND logic between rules)
        if filters:
            query = query.filter(and_(*filters))

        return query

    def check_access(
        self,
        record: Any,
        user: User,
        operation: str,
    ) -> bool:
        """
        Check if a user has access to a specific record.

        Args:
            record: The record to check access for
            user: The current user
            operation: The operation type

        Returns:
            True if access is allowed, False otherwise
        """
        if user.is_superuser:
            return True

        model_name = self._get_model_name(type(record))
        rules = self.get_rules_for_model(model_name, operation, user)

        if not rules:
            return True  # No rules = full access

        # All rules must pass
        for rule in rules:
            if rule.is_superuser_bypass and user.is_superuser:
                continue

            conditions = rule.evaluate_domain(user, record)
            if not self._check_conditions(record, conditions):
                logger.debug(f"Access denied by rule '{rule.name}' for {model_name}")
                return False

        return True

    def _get_model_name(self, model_class: Type) -> str:
        """Get the full model name for a class."""
        module = model_class.__module__
        # Extract module name from path like 'modules.demo.models.demo_item'
        parts = module.split(".")
        if "modules" in parts:
            idx = parts.index("modules")
            if idx + 1 < len(parts):
                return f"{parts[idx + 1]}.{model_class.__name__}"

        return model_class.__name__

    def _build_filter(
        self,
        rule: RecordRule,
        model_class: Type,
        user: User,
    ) -> Any:
        """Build a SQLAlchemy filter from a rule."""
        conditions = rule.evaluate_domain(user)

        filters = []
        for field, cond in conditions.items():
            if not hasattr(model_class, field):
                logger.warning(f"Field '{field}' not found on {model_class.__name__}")
                continue

            column = getattr(model_class, field)
            operator = cond.get("operator", "=")
            value = cond.get("value")

            filter_expr = self._build_operator_filter(column, operator, value)
            if filter_expr is not None:
                filters.append(filter_expr)

        if not filters:
            return None

        return and_(*filters)

    def _build_operator_filter(self, column: Any, operator: str, value: Any) -> Any:
        """Build a filter expression for a specific operator."""
        operator = operator.lower()

        if operator == "=" or operator == "==":
            return column == value
        elif operator == "!=" or operator == "<>":
            return column != value
        elif operator == ">":
            return column > value
        elif operator == ">=":
            return column >= value
        elif operator == "<":
            return column < value
        elif operator == "<=":
            return column <= value
        elif operator == "in":
            return column.in_(value if isinstance(value, list) else [value])
        elif operator == "not in":
            return ~column.in_(value if isinstance(value, list) else [value])
        elif operator == "like":
            return column.like(value)
        elif operator == "ilike":
            return column.ilike(value)
        elif operator == "is null":
            return column.is_(None)
        elif operator == "is not null":
            return column.isnot(None)
        else:
            logger.warning(f"Unknown operator: {operator}")
            return None

    def _check_conditions(self, record: Any, conditions: Dict[str, Any]) -> bool:
        """Check if a record matches all conditions."""
        for field, cond in conditions.items():
            if not hasattr(record, field):
                return False

            record_value = getattr(record, field)
            operator = cond.get("operator", "=")
            expected = cond.get("value")

            if not self._check_operator(record_value, operator, expected):
                return False

        return True

    def _check_operator(self, actual: Any, operator: str, expected: Any) -> bool:
        """Check if a value matches an operator condition."""
        operator = operator.lower()

        if operator == "=" or operator == "==":
            return actual == expected
        elif operator == "!=" or operator == "<>":
            return actual != expected
        elif operator == ">":
            return actual > expected
        elif operator == ">=":
            return actual >= expected
        elif operator == "<":
            return actual < expected
        elif operator == "<=":
            return actual <= expected
        elif operator == "in":
            return actual in (expected if isinstance(expected, list) else [expected])
        elif operator == "not in":
            return actual not in (expected if isinstance(expected, list) else [expected])
        elif operator == "like":
            import fnmatch
            return fnmatch.fnmatch(str(actual or ""), expected.replace("%", "*"))
        elif operator == "is null":
            return actual is None
        elif operator == "is not null":
            return actual is not None
        else:
            return True


def get_record_rule_service(db: Session) -> RecordRuleService:
    """Factory function for RecordRuleService."""
    return RecordRuleService(db)
