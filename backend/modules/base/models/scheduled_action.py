"""
Scheduled Action Model

Implements scheduled/cron jobs for modules.
Similar to Odoo's ir.cron.

Features:
- Cron-style scheduling
- Interval-based scheduling
- Module-specific actions
- Execution history tracking
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.base import TimestampMixin


class IntervalType(str, Enum):
    """Interval type for scheduled actions."""
    MINUTES = "minutes"
    HOURS = "hours"
    DAYS = "days"
    WEEKS = "weeks"
    MONTHS = "months"


class ScheduledAction(Base, TimestampMixin):
    """
    Scheduled Action (Cron Job).

    Supports two scheduling modes:
    1. Interval-based: Run every N minutes/hours/days
    2. Cron expression: Standard cron format

    Example cron expressions:
    - "0 0 * * *" = Daily at midnight
    - "0 */2 * * *" = Every 2 hours
    - "30 8 * * 1-5" = 8:30 AM weekdays
    """

    __tablename__ = "scheduled_actions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Action identification
    name = Column(String(200), nullable=False)
    code = Column(String(100), unique=True, nullable=False, index=True)
    module_name = Column(String(100), nullable=True, index=True)

    # Action definition
    model_name = Column(String(100), nullable=True, comment="Target model for the action")
    method_name = Column(String(100), nullable=False, comment="Method or function to call")
    method_args = Column(JSONB, default=list, comment="Arguments to pass")
    method_kwargs = Column(JSONB, default=dict, comment="Keyword arguments")

    # Python code (alternative to method)
    python_code = Column(Text, nullable=True, comment="Python code to execute")

    # Scheduling - Interval mode
    interval_number = Column(Integer, default=1)
    interval_type = Column(String(20), default="days")

    # Scheduling - Cron mode
    cron_expression = Column(String(100), nullable=True, comment="Cron expression (overrides interval)")

    # Execution tracking
    next_run = Column(DateTime(timezone=True), nullable=True, index=True)
    last_run = Column(DateTime(timezone=True), nullable=True)
    last_run_duration = Column(Integer, nullable=True, comment="Duration in seconds")
    last_run_status = Column(String(20), nullable=True, comment="success, error, timeout")
    last_error = Column(Text, nullable=True)

    # Execution limits
    max_retries = Column(Integer, default=3)
    retry_count = Column(Integer, default=0)
    timeout_seconds = Column(Integer, default=300, comment="Max execution time")

    # Priority and activation
    priority = Column(Integer, default=10, comment="Lower = higher priority")
    is_active = Column(Boolean, default=True, index=True)
    run_missed = Column(Boolean, default=True, comment="Run if missed during downtime")

    # User context (optional)
    user_id = Column(Integer, nullable=True, comment="User context for execution")

    def __repr__(self) -> str:
        return f"<ScheduledAction(code={self.code}, next={self.next_run})>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "module_name": self.module_name,
            "model_name": self.model_name,
            "method_name": self.method_name,
            "interval_number": self.interval_number,
            "interval_type": self.interval_type,
            "cron_expression": self.cron_expression,
            "next_run": self.next_run.isoformat() if self.next_run else None,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "last_run_status": self.last_run_status,
            "is_active": self.is_active,
            "priority": self.priority,
        }

    def calculate_next_run(self, from_time: Optional[datetime] = None) -> datetime:
        """
        Calculate the next run time.

        Args:
            from_time: Base time (default: now)

        Returns:
            Next scheduled run time
        """
        from_time = from_time or datetime.utcnow()

        if self.cron_expression:
            return self._next_from_cron(from_time)
        else:
            return self._next_from_interval(from_time)

    def _next_from_interval(self, from_time: datetime) -> datetime:
        """Calculate next run from interval."""
        interval_map = {
            "minutes": timedelta(minutes=self.interval_number),
            "hours": timedelta(hours=self.interval_number),
            "days": timedelta(days=self.interval_number),
            "weeks": timedelta(weeks=self.interval_number),
            "months": timedelta(days=self.interval_number * 30),  # Approximation
        }

        delta = interval_map.get(self.interval_type, timedelta(days=1))
        return from_time + delta

    def _next_from_cron(self, from_time: datetime) -> datetime:
        """
        Calculate next run from cron expression.

        Uses croniter if available, otherwise falls back to interval.
        """
        try:
            from croniter import croniter
            cron = croniter(self.cron_expression, from_time)
            return cron.get_next(datetime)
        except ImportError:
            # Fallback to interval if croniter not installed
            return self._next_from_interval(from_time)
        except Exception:
            return self._next_from_interval(from_time)

    def is_due(self, current_time: Optional[datetime] = None) -> bool:
        """Check if the action is due for execution."""
        if not self.is_active:
            return False

        if not self.next_run:
            return True

        current = current_time or datetime.utcnow()
        return current >= self.next_run


class ScheduledActionLog(Base):
    """
    Execution log for scheduled actions.

    Tracks execution history for debugging and monitoring.
    """

    __tablename__ = "scheduled_action_logs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    action_id = Column(Integer, nullable=False, index=True)
    action_code = Column(String(100), nullable=False, index=True)

    # Execution details
    started_at = Column(DateTime(timezone=True), nullable=False)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    # Result
    status = Column(String(20), nullable=False, comment="success, error, timeout, skipped")
    result = Column(JSONB, nullable=True, comment="Return value if any")
    error_message = Column(Text, nullable=True)
    error_traceback = Column(Text, nullable=True)

    # Records affected (if applicable)
    records_processed = Column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<ScheduledActionLog(action={self.action_code}, status={self.status})>"
