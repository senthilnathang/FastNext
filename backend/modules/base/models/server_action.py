"""
Server Action Model

Implements server-side actions and automation rules.
Similar to Odoo's ir.actions.server and base.automation.

Features:
- Trigger on create, update, delete, or time-based
- Execute Python code, call methods, send emails
- Chain multiple actions
- Condition-based execution
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.base import TimestampMixin


class ActionTrigger(str, Enum):
    """When the action is triggered."""
    ON_CREATE = "on_create"
    ON_WRITE = "on_write"
    ON_DELETE = "on_delete"
    ON_TIME = "on_time"  # Time-based condition
    MANUAL = "manual"  # Triggered manually


class ActionType(str, Enum):
    """Type of action to perform."""
    PYTHON_CODE = "python_code"
    CALL_METHOD = "call_method"
    UPDATE_RECORD = "update_record"
    CREATE_RECORD = "create_record"
    SEND_EMAIL = "send_email"
    SEND_NOTIFICATION = "send_notification"
    WEBHOOK = "webhook"
    CHAIN_ACTIONS = "chain_actions"


class ServerAction(Base, TimestampMixin):
    """
    Server Action definition.

    Defines an action that can be triggered on records.
    Can execute code, update records, send notifications, etc.
    """

    __tablename__ = "server_actions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Action identification
    name = Column(String(200), nullable=False)
    code = Column(String(100), unique=True, nullable=False, index=True)
    module_name = Column(String(100), nullable=True, index=True)

    # Target model
    model_name = Column(String(100), nullable=False, index=True)

    # Action type and definition
    action_type = Column(String(30), default="python_code")

    # Python code (for python_code type)
    python_code = Column(Text, nullable=True)

    # Method call (for call_method type)
    method_name = Column(String(100), nullable=True)
    method_args = Column(JSONB, default=list)

    # Record update (for update_record type)
    update_values = Column(JSONB, default=dict, comment="Field values to update")

    # Create record (for create_record type)
    create_model = Column(String(100), nullable=True)
    create_values = Column(JSONB, default=dict)

    # Email/Notification (for send_email/send_notification type)
    template_id = Column(Integer, nullable=True)
    email_to = Column(String(500), nullable=True)
    notification_type = Column(String(50), nullable=True)

    # Webhook (for webhook type)
    webhook_url = Column(String(500), nullable=True)
    webhook_method = Column(String(10), default="POST")
    webhook_payload = Column(JSONB, default=dict)

    # Chain actions (for chain_actions type)
    child_action_ids = Column(JSONB, default=list, comment="IDs of actions to chain")

    # Execution context
    use_sudo = Column(Boolean, default=False, comment="Execute with elevated privileges")

    # Priority and activation
    sequence = Column(Integer, default=10)
    is_active = Column(Boolean, default=True, index=True)

    def __repr__(self) -> str:
        return f"<ServerAction(code={self.code}, type={self.action_type})>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "model_name": self.model_name,
            "action_type": self.action_type,
            "sequence": self.sequence,
            "is_active": self.is_active,
        }


class AutomationRule(Base, TimestampMixin):
    """
    Automation Rule.

    Automatically triggers server actions based on conditions.
    Similar to Odoo's base.automation.
    """

    __tablename__ = "automation_rules"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Rule identification
    name = Column(String(200), nullable=False)
    code = Column(String(100), unique=True, nullable=False, index=True)
    module_name = Column(String(100), nullable=True, index=True)

    # Target model
    model_name = Column(String(100), nullable=False, index=True)

    # Trigger configuration
    trigger = Column(String(30), default="on_create")

    # Condition (domain filter)
    domain = Column(JSONB, default=list, comment="Conditions that must match")

    # Before/After filter (for on_write)
    before_domain = Column(JSONB, nullable=True, comment="Conditions before update")

    # Time-based trigger settings
    time_field = Column(String(100), nullable=True, comment="Date field for time trigger")
    time_delta = Column(Integer, default=0, comment="Minutes before/after time_field")
    last_run = Column(DateTime(timezone=True), nullable=True)

    # Action to execute
    action_id = Column(Integer, nullable=True, comment="Server action to run")
    action_code = Column(String(100), nullable=True, comment="Or action code")

    # Direct Python code (alternative to action)
    python_code = Column(Text, nullable=True)

    # Execution limits
    max_records_per_run = Column(Integer, default=1000)

    # Priority and activation
    sequence = Column(Integer, default=10)
    is_active = Column(Boolean, default=True, index=True)

    def __repr__(self) -> str:
        return f"<AutomationRule(code={self.code}, trigger={self.trigger})>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "model_name": self.model_name,
            "trigger": self.trigger,
            "domain": self.domain,
            "action_id": self.action_id,
            "is_active": self.is_active,
        }

    def matches_trigger(self, trigger_type: str) -> bool:
        """Check if this rule matches a trigger type."""
        return self.trigger == trigger_type

    def evaluate_domain(self, record: Any, context: Dict[str, Any] = None) -> bool:
        """
        Evaluate if a record matches the domain conditions.

        Args:
            record: The record to check
            context: Additional context (user, env, etc.)

        Returns:
            True if record matches all conditions
        """
        context = context or {}

        for condition in self.domain or []:
            field = condition.get("field")
            operator = condition.get("operator", "=")
            value = condition.get("value")

            # Resolve dynamic values
            if isinstance(value, str) and value.startswith("$"):
                value = self._resolve_variable(value, record, context)

            record_value = getattr(record, field, None)

            if not self._check_condition(record_value, operator, value):
                return False

        return True

    def _resolve_variable(self, var: str, record: Any, context: Dict[str, Any]) -> Any:
        """Resolve a variable reference."""
        parts = var[1:].split(".")

        if parts[0] == "record":
            obj = record
            for part in parts[1:]:
                obj = getattr(obj, part, None)
            return obj
        elif parts[0] in context:
            obj = context[parts[0]]
            for part in parts[1:]:
                obj = getattr(obj, part, None)
            return obj

        return None

    def _check_condition(self, actual: Any, operator: str, expected: Any) -> bool:
        """Check a single condition."""
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
        elif operator == "like" or operator == "contains":
            return expected in str(actual or "")
        elif operator == "is null":
            return actual is None
        elif operator == "is not null":
            return actual is not None
        elif operator == "changed":
            # For on_write trigger - check if field changed
            return True  # Handled separately
        else:
            return True
