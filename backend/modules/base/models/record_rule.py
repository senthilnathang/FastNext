"""
Record Rules Model

Implements row-level security (RLS) similar to Odoo's ir.rule.
Allows modules to define which records users can access based on
domain filters and conditions.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, TYPE_CHECKING

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class RuleScope(str, Enum):
    """Scope of the record rule."""
    GLOBAL = "global"  # Applies to all users
    USER = "user"  # Applies based on user context
    GROUP = "group"  # Applies to specific groups/roles
    COMPANY = "company"  # Applies within company context


class RuleOperation(str, Enum):
    """Operations the rule applies to."""
    READ = "read"
    WRITE = "write"
    CREATE = "create"
    DELETE = "delete"


class RecordRule(Base, TimestampMixin):
    """
    Record Rule for row-level security.

    Similar to Odoo's ir.rule, defines conditions for record access.
    Rules are combined with AND logic for the same model.

    Example rule domain:
    [
        {"field": "company_id", "operator": "=", "value": "$user.current_company_id"},
        {"field": "is_active", "operator": "=", "value": true}
    ]
    """

    __tablename__ = "record_rules"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Rule identification
    name = Column(String(200), nullable=False)
    model_name = Column(String(100), nullable=False, index=True, comment="Target model name (e.g., 'demo.DemoItem')")
    module_name = Column(String(100), nullable=True, index=True, comment="Module that defined this rule")

    # Rule definition
    domain = Column(JSONB, default=list, comment="Domain filter as JSON array")
    scope = Column(SQLEnum(RuleScope), default=RuleScope.USER, nullable=False)

    # Operations this rule applies to
    apply_read = Column(Boolean, default=True)
    apply_write = Column(Boolean, default=True)
    apply_create = Column(Boolean, default=True)
    apply_delete = Column(Boolean, default=True)

    # Role/Group restriction (optional)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)

    # Priority and activation
    sequence = Column(Integer, default=10, comment="Lower = higher priority")
    is_active = Column(Boolean, default=True, index=True)

    # Global bypass
    is_superuser_bypass = Column(Boolean, default=True, comment="Superusers bypass this rule")

    def __repr__(self) -> str:
        return f"<RecordRule(name={self.name}, model={self.model_name})>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "model_name": self.model_name,
            "module_name": self.module_name,
            "domain": self.domain,
            "scope": self.scope.value if self.scope else None,
            "apply_read": self.apply_read,
            "apply_write": self.apply_write,
            "apply_create": self.apply_create,
            "apply_delete": self.apply_delete,
            "role_id": self.role_id,
            "sequence": self.sequence,
            "is_active": self.is_active,
        }

    def applies_to_operation(self, operation: str) -> bool:
        """Check if this rule applies to the given operation."""
        op_map = {
            "read": self.apply_read,
            "write": self.apply_write,
            "create": self.apply_create,
            "delete": self.apply_delete,
        }
        return op_map.get(operation.lower(), False)

    def evaluate_domain(self, user: "User", record: Any = None) -> Dict[str, Any]:
        """
        Evaluate the domain filter with user context.

        Returns a dictionary of field conditions to apply.
        Supports special variables:
        - $user.id, $user.current_company_id, etc.
        - $now, $today
        - $record.field_name (for existing records)
        """
        from datetime import date

        conditions = {}
        context = {
            "user": user,
            "now": datetime.utcnow(),
            "today": date.today(),
            "record": record,
        }

        for condition in self.domain or []:
            field = condition.get("field")
            operator = condition.get("operator", "=")
            value = condition.get("value")

            # Resolve dynamic values
            if isinstance(value, str) and value.startswith("$"):
                value = self._resolve_variable(value, context)

            conditions[field] = {"operator": operator, "value": value}

        return conditions

    def _resolve_variable(self, var: str, context: Dict[str, Any]) -> Any:
        """Resolve a variable like $user.current_company_id."""
        parts = var[1:].split(".")  # Remove $ and split

        obj = context.get(parts[0])
        for part in parts[1:]:
            if obj is None:
                return None
            obj = getattr(obj, part, None)

        return obj
