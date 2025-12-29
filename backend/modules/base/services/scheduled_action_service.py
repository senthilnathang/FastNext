"""
Scheduled Action Service

Manages and executes scheduled actions (cron jobs).
Provides thread-safe execution with proper error handling.
"""

import asyncio
import importlib
import logging
import threading
import traceback
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from ..models.scheduled_action import ScheduledAction, ScheduledActionLog

logger = logging.getLogger(__name__)


class ScheduledActionService:
    """
    Service for managing and executing scheduled actions.

    Features:
    - Execute actions by code or ID
    - Run all due actions
    - Retry failed actions
    - Track execution history

    Usage:
        service = ScheduledActionService(db)
        service.run_due_actions()
    """

    def __init__(self, db: Session):
        self.db = db
        self._running: set = set()  # Track currently running actions
        self._lock = threading.Lock()

    def get_action(self, code: str) -> Optional[ScheduledAction]:
        """Get a scheduled action by code."""
        return (
            self.db.query(ScheduledAction)
            .filter(ScheduledAction.code == code)
            .first()
        )

    def get_due_actions(self, limit: int = 100) -> List[ScheduledAction]:
        """
        Get all actions that are due for execution.

        Args:
            limit: Maximum number of actions to return

        Returns:
            List of due ScheduledAction objects
        """
        now = datetime.utcnow()

        return (
            self.db.query(ScheduledAction)
            .filter(
                ScheduledAction.is_active == True,
                ScheduledAction.next_run <= now,
            )
            .order_by(ScheduledAction.priority, ScheduledAction.next_run)
            .limit(limit)
            .all()
        )

    def run_action(self, action: ScheduledAction) -> Dict[str, Any]:
        """
        Execute a single scheduled action.

        Args:
            action: The action to execute

        Returns:
            Execution result dictionary
        """
        # Prevent concurrent execution of same action
        with self._lock:
            if action.code in self._running:
                return {"status": "skipped", "reason": "already_running"}
            self._running.add(action.code)

        started_at = datetime.utcnow()
        log = ScheduledActionLog(
            action_id=action.id,
            action_code=action.code,
            started_at=started_at,
            status="running",
        )
        self.db.add(log)
        self.db.flush()

        result = {"status": "success", "result": None}

        try:
            # Execute the action
            if action.python_code:
                exec_result = self._execute_python_code(action)
            else:
                exec_result = self._execute_method(action)

            result["result"] = exec_result

            # Update action state
            action.last_run = started_at
            action.last_run_status = "success"
            action.last_error = None
            action.retry_count = 0
            action.next_run = action.calculate_next_run(started_at)

            # Update log
            log.status = "success"
            log.result = {"return_value": str(exec_result)[:1000] if exec_result else None}

        except Exception as e:
            error_msg = str(e)
            error_tb = traceback.format_exc()

            logger.error(f"Scheduled action '{action.code}' failed: {error_msg}")

            result["status"] = "error"
            result["error"] = error_msg

            # Update action state
            action.last_run = started_at
            action.last_run_status = "error"
            action.last_error = error_msg
            action.retry_count += 1

            # Schedule retry or disable
            if action.retry_count >= action.max_retries:
                logger.warning(f"Action '{action.code}' exceeded max retries, disabling")
                action.is_active = False
            else:
                # Exponential backoff for retries
                retry_delay = timedelta(minutes=5 * (2 ** action.retry_count))
                action.next_run = started_at + retry_delay

            # Update log
            log.status = "error"
            log.error_message = error_msg
            log.error_traceback = error_tb

        finally:
            finished_at = datetime.utcnow()
            duration = int((finished_at - started_at).total_seconds())

            action.last_run_duration = duration
            log.finished_at = finished_at
            log.duration_seconds = duration

            self.db.commit()

            with self._lock:
                self._running.discard(action.code)

        return result

    def run_due_actions(self) -> List[Dict[str, Any]]:
        """
        Run all due scheduled actions.

        Returns:
            List of execution results
        """
        actions = self.get_due_actions()
        results = []

        for action in actions:
            result = self.run_action(action)
            result["action_code"] = action.code
            results.append(result)

        return results

    def run_by_code(self, code: str) -> Dict[str, Any]:
        """
        Run a specific action by code (manual trigger).

        Args:
            code: Action code

        Returns:
            Execution result
        """
        action = self.get_action(code)
        if not action:
            return {"status": "error", "error": f"Action '{code}' not found"}

        return self.run_action(action)

    def _execute_method(self, action: ScheduledAction) -> Any:
        """Execute an action's method."""
        if action.model_name:
            # Import the model and call method
            module_path = action.model_name.rsplit(".", 1)
            if len(module_path) == 2:
                mod = importlib.import_module(f"modules.{module_path[0]}.models")
                model_class = getattr(mod, module_path[1], None)
                if model_class:
                    method = getattr(model_class, action.method_name, None)
                    if method:
                        args = action.method_args or []
                        kwargs = action.method_kwargs or {}
                        return method(*args, **kwargs)
        else:
            # Try to import from module services
            if action.module_name:
                try:
                    mod = importlib.import_module(f"modules.{action.module_name}.services")
                    method = getattr(mod, action.method_name, None)
                    if method:
                        args = action.method_args or []
                        kwargs = action.method_kwargs or {}
                        kwargs["db"] = self.db  # Inject database session
                        return method(*args, **kwargs)
                except ImportError:
                    pass

        raise ValueError(f"Method '{action.method_name}' not found")

    def _execute_python_code(self, action: ScheduledAction) -> Any:
        """
        Execute Python code from the action.

        WARNING: This executes arbitrary code. Only use with trusted input.
        """
        # Create execution context
        context = {
            "db": self.db,
            "action": action,
            "datetime": datetime,
            "logger": logger,
            "result": None,
        }

        # Execute code
        exec(action.python_code, context)

        return context.get("result")

    def create_action(
        self,
        code: str,
        name: str,
        method_name: str,
        interval_number: int = 1,
        interval_type: str = "days",
        model_name: Optional[str] = None,
        module_name: Optional[str] = None,
        cron_expression: Optional[str] = None,
        **kwargs,
    ) -> ScheduledAction:
        """
        Create a new scheduled action.

        Args:
            code: Unique action code
            name: Human-readable name
            method_name: Method to call
            interval_number: Interval value
            interval_type: Interval unit
            model_name: Target model (optional)
            module_name: Owning module (optional)
            cron_expression: Cron expression (optional, overrides interval)
            **kwargs: Additional fields

        Returns:
            Created ScheduledAction
        """
        action = ScheduledAction(
            code=code,
            name=name,
            method_name=method_name,
            model_name=model_name,
            module_name=module_name,
            interval_number=interval_number,
            interval_type=interval_type,
            cron_expression=cron_expression,
            next_run=datetime.utcnow(),
            is_active=True,
            **kwargs,
        )

        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)

        logger.info(f"Created scheduled action: {code}")
        return action

    def get_execution_history(
        self,
        action_code: str,
        limit: int = 50,
    ) -> List[ScheduledActionLog]:
        """Get execution history for an action."""
        return (
            self.db.query(ScheduledActionLog)
            .filter(ScheduledActionLog.action_code == action_code)
            .order_by(ScheduledActionLog.started_at.desc())
            .limit(limit)
            .all()
        )

    def cleanup_old_logs(self, days: int = 30) -> int:
        """
        Delete old execution logs.

        Args:
            days: Delete logs older than this many days

        Returns:
            Number of logs deleted
        """
        cutoff = datetime.utcnow() - timedelta(days=days)

        deleted = (
            self.db.query(ScheduledActionLog)
            .filter(ScheduledActionLog.started_at < cutoff)
            .delete()
        )

        self.db.commit()
        logger.info(f"Deleted {deleted} old scheduled action logs")

        return deleted


def get_scheduled_action_service(db: Session) -> ScheduledActionService:
    """Factory function for ScheduledActionService."""
    return ScheduledActionService(db)
