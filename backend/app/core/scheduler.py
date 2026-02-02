"""
Scheduler Manager

Provides APScheduler integration for running scheduled actions.
Uses AsyncIOScheduler with SQLAlchemy jobstore for persistence.
"""

import asyncio
import importlib
import logging
import traceback
from datetime import datetime
from typing import Any, Callable, Dict, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED

logger = logging.getLogger(__name__)


class SchedulerManager:
    """
    Singleton scheduler manager wrapping APScheduler.

    Integrates with the ScheduledAction model to run module-defined
    cron jobs and interval-based tasks.
    """

    def __init__(self):
        self._scheduler: Optional[AsyncIOScheduler] = None
        self._initialized = False

    @property
    def is_running(self) -> bool:
        return self._scheduler is not None and self._scheduler.running

    def initialize(self, db_url: str) -> None:
        """Initialize the scheduler with a SQLAlchemy jobstore."""
        if self._initialized:
            return

        jobstores = {
            "default": SQLAlchemyJobStore(url=db_url),
        }
        job_defaults = {
            "coalesce": True,  # Combine missed runs into one
            "max_instances": 1,  # Only one instance of each job at a time
            "misfire_grace_time": 300,  # 5 minute grace period
        }

        self._scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            job_defaults=job_defaults,
        )

        # Listen for job events
        self._scheduler.add_listener(
            self._on_job_executed, EVENT_JOB_EXECUTED
        )
        self._scheduler.add_listener(
            self._on_job_error, EVENT_JOB_ERROR
        )

        self._initialized = True
        logger.info("Scheduler initialized with SQLAlchemy jobstore")

    def start(self) -> None:
        """Start the scheduler."""
        if not self._initialized:
            raise RuntimeError("Scheduler not initialized. Call initialize() first.")
        if self._scheduler.running:
            logger.warning("Scheduler already running")
            return
        self._scheduler.start()
        logger.info("Scheduler started")

    def shutdown(self, wait: bool = False) -> None:
        """Shutdown the scheduler."""
        if self._scheduler and self._scheduler.running:
            self._scheduler.shutdown(wait=wait)
            logger.info("Scheduler shut down")

    def add_job(
        self,
        func: Callable,
        trigger: str,
        job_id: Optional[str] = None,
        replace_existing: bool = True,
        **trigger_kwargs: Any,
    ) -> Any:
        """
        Add a job to the scheduler.

        Args:
            func: Callable to execute
            trigger: Trigger type ('cron', 'interval', 'date')
            job_id: Unique job identifier
            replace_existing: Replace if job_id already exists
            **trigger_kwargs: Arguments for the trigger (e.g., seconds=60, hour=0)
        """
        if not self._scheduler:
            raise RuntimeError("Scheduler not initialized")

        return self._scheduler.add_job(
            func,
            trigger=trigger,
            id=job_id,
            replace_existing=replace_existing,
            **trigger_kwargs,
        )

    def remove_job(self, job_id: str) -> None:
        """Remove a job by ID."""
        if self._scheduler:
            try:
                self._scheduler.remove_job(job_id)
            except Exception:
                logger.debug(f"Job {job_id} not found for removal")

    def get_job(self, job_id: str) -> Optional[Any]:
        """Get a job by ID."""
        if self._scheduler:
            return self._scheduler.get_job(job_id)
        return None

    def get_jobs(self) -> list:
        """Get all scheduled jobs."""
        if self._scheduler:
            return self._scheduler.get_jobs()
        return []

    def register_scheduled_action(self, action) -> None:
        """
        Register a ScheduledAction model instance as an APScheduler job.

        Args:
            action: ScheduledAction ORM instance with cron_expression
                    or interval_number/interval_type
        """
        if not action.is_active:
            return

        job_id = f"scheduled_action_{action.code}"

        # Build trigger
        if action.cron_expression:
            trigger = CronTrigger.from_crontab(action.cron_expression)
        else:
            interval_map = {
                "minutes": {"minutes": action.interval_number},
                "hours": {"hours": action.interval_number},
                "days": {"days": action.interval_number},
                "weeks": {"weeks": action.interval_number},
                "months": {"days": action.interval_number * 30},
            }
            kwargs = interval_map.get(action.interval_type, {"days": 1})
            trigger = IntervalTrigger(**kwargs)

        self._scheduler.add_job(
            run_scheduled_action,
            trigger=trigger,
            id=job_id,
            replace_existing=True,
            kwargs={"action_code": action.code},
            name=action.name,
        )
        logger.info(f"Registered scheduled action: {action.code} ({action.name})")

    def _on_job_executed(self, event) -> None:
        """Callback when a job finishes successfully."""
        logger.debug(f"Job executed: {event.job_id}")

    def _on_job_error(self, event) -> None:
        """Callback when a job raises an exception."""
        logger.error(
            f"Job {event.job_id} failed with exception: {event.exception}",
            exc_info=event.exception,
        )


async def run_scheduled_action(action_code: str) -> None:
    """
    Execute a scheduled action by its code.

    This is the actual job function that APScheduler calls.
    It loads the action from the DB and executes the configured method.
    """
    from app.db.base import SessionLocal

    db = SessionLocal()
    try:
        from modules.base.models.scheduled_action import ScheduledAction, ScheduledActionLog

        action = db.query(ScheduledAction).filter(
            ScheduledAction.code == action_code,
            ScheduledAction.is_active == True,
        ).first()

        if not action:
            logger.warning(f"Scheduled action '{action_code}' not found or inactive")
            return

        started_at = datetime.utcnow()
        log_entry = ScheduledActionLog(
            action_id=action.id,
            action_code=action.code,
            started_at=started_at,
            status="running",
        )
        db.add(log_entry)
        db.commit()

        try:
            result = _invoke_action(action, db)

            if asyncio.iscoroutine(result):
                result = await result

            finished_at = datetime.utcnow()
            duration = int((finished_at - started_at).total_seconds())

            # Update log
            log_entry.finished_at = finished_at
            log_entry.duration_seconds = duration
            log_entry.status = "success"
            log_entry.result = {"result": str(result)} if result else None

            # Update action
            action.last_run = finished_at
            action.last_run_duration = duration
            action.last_run_status = "success"
            action.last_error = None
            action.retry_count = 0
            action.next_run = action.calculate_next_run(finished_at)

            db.commit()
            logger.info(f"Scheduled action '{action_code}' completed in {duration}s")

        except Exception as e:
            finished_at = datetime.utcnow()
            duration = int((finished_at - started_at).total_seconds())

            log_entry.finished_at = finished_at
            log_entry.duration_seconds = duration
            log_entry.status = "error"
            log_entry.error_message = str(e)
            log_entry.error_traceback = traceback.format_exc()

            action.last_run = finished_at
            action.last_run_duration = duration
            action.last_run_status = "error"
            action.last_error = str(e)
            action.retry_count = (action.retry_count or 0) + 1
            action.next_run = action.calculate_next_run(finished_at)

            db.commit()
            logger.error(f"Scheduled action '{action_code}' failed: {e}")

    finally:
        db.close()


def _invoke_action(action, db) -> Any:
    """Invoke the actual action method or code."""
    if action.method_name:
        # Call a method: model_name is the module path, method_name is the function
        if action.model_name:
            module = importlib.import_module(action.model_name)
            method = getattr(module, action.method_name)
        else:
            # Direct dotted reference like "modules.base.services.cleanup.run"
            parts = action.method_name.rsplit(".", 1)
            if len(parts) == 2:
                mod = importlib.import_module(parts[0])
                method = getattr(mod, parts[1])
            else:
                raise ValueError(f"Invalid method reference: {action.method_name}")

        args = action.method_args or []
        kwargs = action.method_kwargs or {}
        return method(*args, **kwargs)

    return None


# Global singleton
_scheduler_manager: Optional[SchedulerManager] = None


def get_scheduler() -> SchedulerManager:
    """Get the global SchedulerManager instance."""
    global _scheduler_manager
    if _scheduler_manager is None:
        _scheduler_manager = SchedulerManager()
    return _scheduler_manager
