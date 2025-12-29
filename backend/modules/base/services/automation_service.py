"""
Automation Service

Executes server actions and automation rules.
Provides the engine for record-triggered automation.
"""

import importlib
import logging
import traceback
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Type

import httpx
from sqlalchemy.orm import Session

from ..models.server_action import ActionType, AutomationRule, ServerAction

logger = logging.getLogger(__name__)


class AutomationService:
    """
    Service for executing automation rules and server actions.

    Usage:
        service = AutomationService(db)

        # Trigger on record create
        service.trigger_create(record, user)

        # Trigger on record update
        service.trigger_write(record, changed_fields, user)

        # Execute a server action directly
        service.execute_action(action, records)
    """

    def __init__(self, db: Session):
        self.db = db
        self._action_handlers: Dict[str, Callable] = {
            ActionType.PYTHON_CODE.value: self._execute_python_code,
            ActionType.CALL_METHOD.value: self._execute_call_method,
            ActionType.UPDATE_RECORD.value: self._execute_update_record,
            ActionType.CREATE_RECORD.value: self._execute_create_record,
            ActionType.SEND_NOTIFICATION.value: self._execute_send_notification,
            ActionType.WEBHOOK.value: self._execute_webhook,
            ActionType.CHAIN_ACTIONS.value: self._execute_chain_actions,
        }

    # -------------------------------------------------------------------------
    # Trigger Methods
    # -------------------------------------------------------------------------

    def trigger_create(
        self,
        record: Any,
        user: Any = None,
        context: Dict[str, Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Trigger automation rules for record creation.

        Args:
            record: The created record
            user: Current user
            context: Additional context

        Returns:
            List of execution results
        """
        return self._trigger(
            trigger_type="on_create",
            records=[record],
            user=user,
            context=context,
        )

    def trigger_write(
        self,
        record: Any,
        changed_fields: Dict[str, Any],
        user: Any = None,
        context: Dict[str, Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Trigger automation rules for record update.

        Args:
            record: The updated record
            changed_fields: Dict of field -> (old_value, new_value)
            user: Current user
            context: Additional context

        Returns:
            List of execution results
        """
        ctx = context or {}
        ctx["changed_fields"] = changed_fields

        return self._trigger(
            trigger_type="on_write",
            records=[record],
            user=user,
            context=ctx,
        )

    def trigger_delete(
        self,
        record: Any,
        user: Any = None,
        context: Dict[str, Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Trigger automation rules for record deletion.

        Args:
            record: The record being deleted
            user: Current user
            context: Additional context

        Returns:
            List of execution results
        """
        return self._trigger(
            trigger_type="on_delete",
            records=[record],
            user=user,
            context=context,
        )

    def trigger_time_based(self) -> List[Dict[str, Any]]:
        """
        Trigger all time-based automation rules.

        Should be called periodically (e.g., every minute via cron).

        Returns:
            List of execution results
        """
        results = []
        now = datetime.utcnow()

        # Get time-based rules
        rules = (
            self.db.query(AutomationRule)
            .filter(
                AutomationRule.is_active == True,
                AutomationRule.trigger == "on_time",
            )
            .all()
        )

        for rule in rules:
            try:
                result = self._execute_time_rule(rule, now)
                results.append(result)
            except Exception as e:
                logger.error(f"Time-based rule '{rule.code}' failed: {e}")
                results.append({"rule": rule.code, "status": "error", "error": str(e)})

        return results

    # -------------------------------------------------------------------------
    # Internal Trigger Logic
    # -------------------------------------------------------------------------

    def _trigger(
        self,
        trigger_type: str,
        records: List[Any],
        user: Any = None,
        context: Dict[str, Any] = None,
    ) -> List[Dict[str, Any]]:
        """Execute all matching automation rules for a trigger."""
        if not records:
            return []

        # Get model name from first record
        model_class = type(records[0])
        model_name = self._get_model_name(model_class)

        # Get matching rules
        rules = (
            self.db.query(AutomationRule)
            .filter(
                AutomationRule.is_active == True,
                AutomationRule.model_name == model_name,
                AutomationRule.trigger == trigger_type,
            )
            .order_by(AutomationRule.sequence)
            .all()
        )

        results = []
        ctx = context or {}
        ctx["user"] = user
        ctx["trigger"] = trigger_type

        for rule in rules:
            # Filter records by domain
            matching_records = [
                r for r in records
                if rule.evaluate_domain(r, ctx)
            ]

            if not matching_records:
                continue

            try:
                result = self._execute_rule(rule, matching_records, ctx)
                results.append(result)
            except Exception as e:
                logger.error(f"Rule '{rule.code}' execution failed: {e}")
                results.append({
                    "rule": rule.code,
                    "status": "error",
                    "error": str(e),
                })

        return results

    def _execute_rule(
        self,
        rule: AutomationRule,
        records: List[Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute a single automation rule."""
        result = {
            "rule": rule.code,
            "records_count": len(records),
            "status": "success",
        }

        # Execute Python code directly
        if rule.python_code:
            for record in records:
                self._run_python_code(rule.python_code, record, context)

        # Or execute linked server action
        elif rule.action_id or rule.action_code:
            action = self._get_action(rule.action_id, rule.action_code)
            if action:
                for record in records:
                    self.execute_action(action, record, context)

        return result

    def _execute_time_rule(
        self,
        rule: AutomationRule,
        now: datetime,
    ) -> Dict[str, Any]:
        """Execute a time-based automation rule."""
        from datetime import timedelta

        if not rule.time_field:
            return {"rule": rule.code, "status": "skipped", "reason": "no_time_field"}

        # Get the model class
        model_class = self._get_model_class(rule.model_name)
        if not model_class:
            return {"rule": rule.code, "status": "error", "error": "model_not_found"}

        # Calculate target time
        target_time = now - timedelta(minutes=rule.time_delta)

        # Query records where time_field matches
        time_column = getattr(model_class, rule.time_field, None)
        if not time_column:
            return {"rule": rule.code, "status": "error", "error": "time_field_not_found"}

        # Find records that match
        query = self.db.query(model_class)

        if rule.last_run:
            # Only process records since last run
            query = query.filter(time_column > rule.last_run)

        query = query.filter(time_column <= target_time)
        query = query.limit(rule.max_records_per_run)

        records = query.all()

        if not records:
            return {"rule": rule.code, "status": "success", "records_count": 0}

        # Filter by domain
        matching = [r for r in records if rule.evaluate_domain(r, {})]

        # Execute action
        for record in matching:
            if rule.python_code:
                self._run_python_code(rule.python_code, record, {})
            elif rule.action_id or rule.action_code:
                action = self._get_action(rule.action_id, rule.action_code)
                if action:
                    self.execute_action(action, record, {})

        # Update last run
        rule.last_run = now
        self.db.commit()

        return {"rule": rule.code, "status": "success", "records_count": len(matching)}

    # -------------------------------------------------------------------------
    # Action Execution
    # -------------------------------------------------------------------------

    def execute_action(
        self,
        action: ServerAction,
        record: Any,
        context: Dict[str, Any] = None,
    ) -> Any:
        """
        Execute a server action on a record.

        Args:
            action: The server action to execute
            record: Target record
            context: Execution context

        Returns:
            Action result
        """
        handler = self._action_handlers.get(action.action_type)
        if not handler:
            raise ValueError(f"Unknown action type: {action.action_type}")

        ctx = context or {}
        ctx["record"] = record
        ctx["action"] = action
        ctx["db"] = self.db

        return handler(action, record, ctx)

    def _execute_python_code(
        self,
        action: ServerAction,
        record: Any,
        context: Dict[str, Any],
    ) -> Any:
        """Execute Python code action."""
        return self._run_python_code(action.python_code, record, context)

    def _execute_call_method(
        self,
        action: ServerAction,
        record: Any,
        context: Dict[str, Any],
    ) -> Any:
        """Execute method call action."""
        method = getattr(record, action.method_name, None)
        if method and callable(method):
            args = action.method_args or []
            return method(*args)
        raise ValueError(f"Method '{action.method_name}' not found on record")

    def _execute_update_record(
        self,
        action: ServerAction,
        record: Any,
        context: Dict[str, Any],
    ) -> Any:
        """Execute update record action."""
        for field, value in (action.update_values or {}).items():
            # Resolve dynamic values
            if isinstance(value, str) and value.startswith("$"):
                value = self._resolve_variable(value, context)
            setattr(record, field, value)

        self.db.commit()
        return record

    def _execute_create_record(
        self,
        action: ServerAction,
        record: Any,
        context: Dict[str, Any],
    ) -> Any:
        """Execute create record action."""
        model_class = self._get_model_class(action.create_model)
        if not model_class:
            raise ValueError(f"Model '{action.create_model}' not found")

        values = {}
        for field, value in (action.create_values or {}).items():
            if isinstance(value, str) and value.startswith("$"):
                value = self._resolve_variable(value, context)
            values[field] = value

        new_record = model_class(**values)
        self.db.add(new_record)
        self.db.commit()
        self.db.refresh(new_record)

        return new_record

    def _execute_send_notification(
        self,
        action: ServerAction,
        record: Any,
        context: Dict[str, Any],
    ) -> Any:
        """Execute send notification action."""
        # This would integrate with your notification system
        logger.info(f"Notification triggered by action '{action.code}'")
        return {"status": "notification_sent"}

    def _execute_webhook(
        self,
        action: ServerAction,
        record: Any,
        context: Dict[str, Any],
    ) -> Any:
        """Execute webhook action."""
        if not action.webhook_url:
            raise ValueError("Webhook URL not configured")

        # Build payload
        payload = {}
        for key, value in (action.webhook_payload or {}).items():
            if isinstance(value, str) and value.startswith("$"):
                value = self._resolve_variable(value, context)
            payload[key] = value

        # Send webhook
        with httpx.Client() as client:
            if action.webhook_method.upper() == "POST":
                response = client.post(action.webhook_url, json=payload)
            elif action.webhook_method.upper() == "GET":
                response = client.get(action.webhook_url, params=payload)
            else:
                response = client.request(
                    action.webhook_method.upper(),
                    action.webhook_url,
                    json=payload,
                )

        return {"status_code": response.status_code, "response": response.text[:500]}

    def _execute_chain_actions(
        self,
        action: ServerAction,
        record: Any,
        context: Dict[str, Any],
    ) -> Any:
        """Execute chained actions."""
        results = []

        for action_id in action.child_action_ids or []:
            child_action = self.db.query(ServerAction).filter(
                ServerAction.id == action_id
            ).first()

            if child_action:
                result = self.execute_action(child_action, record, context)
                results.append(result)

        return results

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------

    def _run_python_code(
        self,
        code: str,
        record: Any,
        context: Dict[str, Any],
    ) -> Any:
        """Execute Python code safely."""
        exec_context = {
            "record": record,
            "db": self.db,
            "datetime": datetime,
            "logger": logger,
            "result": None,
            **context,
        }

        exec(code, exec_context)
        return exec_context.get("result")

    def _get_action(
        self,
        action_id: Optional[int],
        action_code: Optional[str],
    ) -> Optional[ServerAction]:
        """Get a server action by ID or code."""
        if action_id:
            return self.db.query(ServerAction).filter(
                ServerAction.id == action_id
            ).first()
        elif action_code:
            return self.db.query(ServerAction).filter(
                ServerAction.code == action_code
            ).first()
        return None

    def _get_model_name(self, model_class: Type) -> str:
        """Get the full model name."""
        module = model_class.__module__
        parts = module.split(".")
        if "modules" in parts:
            idx = parts.index("modules")
            if idx + 1 < len(parts):
                return f"{parts[idx + 1]}.{model_class.__name__}"
        return model_class.__name__

    def _get_model_class(self, model_name: str) -> Optional[Type]:
        """Get a model class by name."""
        try:
            parts = model_name.split(".")
            if len(parts) == 2:
                mod = importlib.import_module(f"modules.{parts[0]}.models")
                return getattr(mod, parts[1], None)
        except Exception:
            pass
        return None

    def _resolve_variable(self, var: str, context: Dict[str, Any]) -> Any:
        """Resolve a variable reference like $record.field."""
        parts = var[1:].split(".")
        obj = context.get(parts[0])

        for part in parts[1:]:
            if obj is None:
                return None
            obj = getattr(obj, part, None)

        return obj


def get_automation_service(db: Session) -> AutomationService:
    """Factory function for AutomationService."""
    return AutomationService(db)
