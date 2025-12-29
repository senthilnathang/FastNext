"""
Advanced background task processing system for FastVue
Supports priority queues, retries, scheduling, and task result tracking
"""

import asyncio
import logging
import threading
import time
import traceback
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union

logger = logging.getLogger("fastvue.background_tasks")


class TaskStatus(Enum):
    """Task execution status"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRY = "retry"
    CANCELLED = "cancelled"


class TaskPriority(Enum):
    """Task priority levels"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class TaskResult:
    """Result of a task execution"""
    task_id: str
    status: TaskStatus
    result: Any = None
    error: Optional[str] = None
    traceback: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration: Optional[float] = None
    retry_count: int = 0
    max_retries: int = 3


@dataclass
class BackgroundTask:
    """Background task definition"""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    func: Callable = None
    args: tuple = field(default_factory=tuple)
    kwargs: dict = field(default_factory=dict)
    priority: TaskPriority = TaskPriority.NORMAL
    max_retries: int = 3
    retry_delay: int = 60  # seconds
    timeout: int = 300  # seconds
    queue_name: str = "default"
    created_at: datetime = field(default_factory=datetime.utcnow)
    scheduled_at: Optional[datetime] = None
    metadata: dict = field(default_factory=dict)
    is_async: bool = False


class TaskResultStore:
    """Storage for task results"""

    def __init__(self):
        self._results: Dict[str, TaskResult] = {}
        self._lock = threading.RLock()

    def store_result(self, result: TaskResult) -> None:
        """Store task result"""
        with self._lock:
            self._results[result.task_id] = result

    def get_result(self, task_id: str) -> Optional[TaskResult]:
        """Get task result"""
        with self._lock:
            return self._results.get(task_id)

    def get_results_by_status(self, status: TaskStatus, limit: int = 100) -> List[TaskResult]:
        """Get results by status"""
        with self._lock:
            results = [
                result for result in self._results.values()
                if result.status == status
            ]
            return results[:limit]

    def cleanup_old_results(self, max_age_hours: int = 24) -> int:
        """Clean up old results"""
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        cleaned = 0

        with self._lock:
            old_task_ids = [
                task_id for task_id, result in self._results.items()
                if result.completed_at and result.completed_at < cutoff_time
            ]

            for task_id in old_task_ids:
                del self._results[task_id]
                cleaned += 1

        if cleaned:
            logger.info(f"Cleaned up {cleaned} old task results")

        return cleaned


class BackgroundTaskManager:
    """Manager for background task processing using asyncio"""

    def __init__(self):
        self.result_store = TaskResultStore()
        self._pending_tasks: Dict[str, BackgroundTask] = {}
        self._running = False
        self._lock = threading.RLock()

        # Configuration
        self.max_concurrent_tasks = 10
        self.cleanup_interval = 300  # 5 minutes

    async def start(self) -> None:
        """Start the task manager"""
        if self._running:
            return

        self._running = True
        asyncio.create_task(self._cleanup_loop())
        logger.info("Background task manager started")

    async def stop(self) -> None:
        """Stop the task manager"""
        self._running = False
        logger.info("Background task manager stopped")

    def submit_task(
        self,
        func: Callable,
        args: tuple = (),
        kwargs: Optional[dict] = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        max_retries: int = 3,
        retry_delay: int = 60,
        timeout: int = 300,
        scheduled_at: Optional[datetime] = None,
        metadata: Optional[dict] = None,
    ) -> str:
        """Submit a task for execution"""
        if kwargs is None:
            kwargs = {}
        if metadata is None:
            metadata = {}

        is_async = asyncio.iscoroutinefunction(func)

        task = BackgroundTask(
            func=func,
            args=args,
            kwargs=kwargs,
            priority=priority,
            max_retries=max_retries,
            retry_delay=retry_delay,
            timeout=timeout,
            scheduled_at=scheduled_at,
            metadata=metadata,
            is_async=is_async,
        )

        with self._lock:
            self._pending_tasks[task.task_id] = task

        # Schedule task execution
        asyncio.create_task(self._execute_task(task))

        return task.task_id

    async def _execute_task(self, task: BackgroundTask) -> None:
        """Execute a single task"""
        # Wait if scheduled for future
        if task.scheduled_at and task.scheduled_at > datetime.utcnow():
            delay = (task.scheduled_at - datetime.utcnow()).total_seconds()
            await asyncio.sleep(delay)

        task_result = TaskResult(
            task_id=task.task_id,
            status=TaskStatus.RUNNING,
            started_at=datetime.utcnow(),
            max_retries=task.max_retries,
        )
        self.result_store.store_result(task_result)

        try:
            logger.info(f"Executing task {task.task_id}")
            start_time = time.time()

            # Execute with timeout
            if task.is_async:
                result = await asyncio.wait_for(
                    task.func(*task.args, **task.kwargs),
                    timeout=task.timeout,
                )
            else:
                result = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(
                        None, lambda: task.func(*task.args, **task.kwargs)
                    ),
                    timeout=task.timeout,
                )

            duration = time.time() - start_time

            task_result.status = TaskStatus.SUCCESS
            task_result.result = result
            task_result.completed_at = datetime.utcnow()
            task_result.duration = duration

            logger.info(f"Task {task.task_id} completed successfully in {duration:.2f}s")

        except asyncio.TimeoutError:
            task_result.status = TaskStatus.FAILED
            task_result.error = f"Task timed out after {task.timeout} seconds"
            task_result.completed_at = datetime.utcnow()
            logger.error(f"Task {task.task_id} timed out")

        except Exception as e:
            task_result.status = TaskStatus.FAILED
            task_result.error = str(e)
            task_result.traceback = traceback.format_exc()
            task_result.completed_at = datetime.utcnow()
            logger.error(f"Task {task.task_id} failed: {e}")

            # Schedule retry if applicable
            if task_result.retry_count < task.max_retries:
                await self._schedule_retry(task, task_result)

        finally:
            self.result_store.store_result(task_result)

            with self._lock:
                self._pending_tasks.pop(task.task_id, None)

    async def _schedule_retry(self, task: BackgroundTask, task_result: TaskResult) -> None:
        """Schedule task for retry"""
        task_result.retry_count += 1
        task_result.status = TaskStatus.RETRY

        # Create new task for retry
        retry_task = BackgroundTask(
            task_id=task.task_id,  # Keep same ID
            func=task.func,
            args=task.args,
            kwargs=task.kwargs,
            priority=task.priority,
            max_retries=task.max_retries,
            retry_delay=task.retry_delay,
            timeout=task.timeout,
            scheduled_at=datetime.utcnow() + timedelta(seconds=task.retry_delay),
            metadata={**task.metadata, "retry_count": task_result.retry_count},
            is_async=task.is_async,
        )

        logger.info(
            f"Task {task.task_id} scheduled for retry {task_result.retry_count}/{task.max_retries}"
        )

        # Wait and execute retry
        await asyncio.sleep(task.retry_delay)
        await self._execute_task(retry_task)

    async def _cleanup_loop(self) -> None:
        """Background cleanup loop"""
        while self._running:
            try:
                self.result_store.cleanup_old_results()
                await asyncio.sleep(self.cleanup_interval)
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
                await asyncio.sleep(60)

    def get_task_result(self, task_id: str) -> Optional[TaskResult]:
        """Get result of a task"""
        return self.result_store.get_result(task_id)

    def get_statistics(self) -> Dict[str, Any]:
        """Get task processing statistics"""
        all_results = list(self.result_store._results.values())

        stats = {
            "total_tasks": len(all_results),
            "pending_tasks": len(self._pending_tasks),
            "status_counts": {},
            "average_duration": 0,
            "success_rate": 0,
        }

        # Count by status
        for status in TaskStatus:
            count = sum(1 for r in all_results if r.status == status)
            stats["status_counts"][status.value] = count

        # Calculate average duration and success rate
        completed_tasks = [r for r in all_results if r.duration is not None]
        if completed_tasks:
            stats["average_duration"] = sum(r.duration for r in completed_tasks) / len(
                completed_tasks
            )

        successful_tasks = sum(1 for r in all_results if r.status == TaskStatus.SUCCESS)
        if stats["total_tasks"] > 0:
            stats["success_rate"] = (successful_tasks / stats["total_tasks"]) * 100

        return stats


# Global task manager instance
task_manager = BackgroundTaskManager()


def background_task(
    priority: TaskPriority = TaskPriority.NORMAL,
    max_retries: int = 3,
    retry_delay: int = 60,
    timeout: int = 300,
):
    """
    Decorator to make function run as background task

    Usage:
        @background_task(priority=TaskPriority.HIGH)
        def send_email(to: str, subject: str):
            ...

        # Call synchronously
        send_email("user@example.com", "Hello")

        # Call as background task
        task_id = send_email.delay("user@example.com", "Hello")
    """

    def decorator(func: Callable):
        def wrapper(*args, **kwargs):
            # Direct call - execute synchronously
            return func(*args, **kwargs)

        def delay(*args, **kwargs) -> str:
            # Delayed call - submit as background task
            return task_manager.submit_task(
                func=func,
                args=args,
                kwargs=kwargs,
                priority=priority,
                max_retries=max_retries,
                retry_delay=retry_delay,
                timeout=timeout,
            )

        wrapper.delay = delay
        wrapper.__name__ = func.__name__
        wrapper.__doc__ = func.__doc__

        return wrapper

    return decorator


def scheduled_task(
    schedule_at: datetime,
    priority: TaskPriority = TaskPriority.NORMAL,
    max_retries: int = 3,
):
    """
    Decorator to schedule task for specific time

    Usage:
        from datetime import datetime, timedelta

        @scheduled_task(schedule_at=datetime.utcnow() + timedelta(hours=1))
        def generate_report():
            ...
    """

    def decorator(func: Callable):
        def wrapper(*args, **kwargs):
            return task_manager.submit_task(
                func=func,
                args=args,
                kwargs=kwargs,
                priority=priority,
                scheduled_at=schedule_at,
                max_retries=max_retries,
            )

        wrapper.__name__ = func.__name__
        wrapper.__doc__ = func.__doc__

        return wrapper

    return decorator


# Utility functions
async def start_task_manager() -> None:
    """Start the global task manager"""
    await task_manager.start()


async def stop_task_manager() -> None:
    """Stop the global task manager"""
    await task_manager.stop()


def submit_task(func: Callable, *args, **kwargs) -> str:
    """Submit a task to be executed"""
    return task_manager.submit_task(func, args, kwargs)


def get_task_result(task_id: str) -> Optional[TaskResult]:
    """Get result of a task"""
    return task_manager.get_task_result(task_id)


def get_task_statistics() -> Dict[str, Any]:
    """Get task processing statistics"""
    return task_manager.get_statistics()


# Example tasks
@background_task(priority=TaskPriority.HIGH, max_retries=5)
def send_notification_email(user_email: str, subject: str, message: str) -> Dict[str, Any]:
    """Example background task for sending emails"""
    import time

    time.sleep(2)  # Simulate email sending
    logger.info(f"Email sent to {user_email}: {subject}")
    return {"status": "sent", "recipient": user_email}


@background_task(timeout=600)
def generate_report(company_id: int, report_type: str) -> Dict[str, Any]:
    """Example background task for report generation"""
    import time

    time.sleep(10)  # Simulate report generation
    logger.info(f"Report generated for company {company_id}")
    return {"report_id": str(uuid.uuid4()), "status": "completed"}
