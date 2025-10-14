"""
Comprehensive API performance monitoring and analytics for FastAPI applications.
"""

import asyncio
import json
import logging
import statistics
import threading
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union

import httpx
import psutil
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of performance metrics"""

    RESPONSE_TIME = "response_time"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    MEMORY_USAGE = "memory_usage"
    CPU_USAGE = "cpu_usage"
    DATABASE_QUERIES = "database_queries"
    CACHE_HIT_RATE = "cache_hit_rate"
    CONCURRENT_REQUESTS = "concurrent_requests"


class AlertLevel(Enum):
    """Alert severity levels"""

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


@dataclass
class MetricPoint:
    """Single metric data point"""

    timestamp: datetime
    value: float
    labels: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "value": self.value,
            "labels": self.labels,
        }


@dataclass
class RequestMetrics:
    """Metrics for a single request"""

    method: str
    path: str
    status_code: int
    response_time: float
    request_size: int
    response_size: int
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    user_id: Optional[str] = None
    database_queries: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    memory_usage: Optional[float] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)

    @property
    def endpoint(self) -> str:
        """Get normalized endpoint path"""
        # Remove IDs and other dynamic parts for grouping
        import re

        normalized = re.sub(r"/\d+", "/{id}", self.path)
        normalized = re.sub(r"/[a-f0-9-]{36}", "/{uuid}", normalized)
        return f"{self.method} {normalized}"


@dataclass
class PerformanceAlert:
    """Performance alert configuration and data"""

    metric_type: MetricType
    threshold: float
    level: AlertLevel
    message: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    resolved: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "metric_type": self.metric_type.value,
            "threshold": self.threshold,
            "level": self.level.value,
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
            "resolved": self.resolved,
        }


class MetricsCollector:
    """Collect and aggregate performance metrics"""

    def __init__(self, max_data_points: int = 10000):
        self.max_data_points = max_data_points
        self.metrics: Dict[MetricType, deque] = {
            metric_type: deque(maxlen=max_data_points) for metric_type in MetricType
        }
        self.request_metrics: deque = deque(maxlen=max_data_points)
        self.endpoint_stats: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {
                "count": 0,
                "total_time": 0.0,
                "min_time": float("inf"),
                "max_time": 0.0,
                "error_count": 0,
                "status_codes": defaultdict(int),
            }
        )
        self._lock = threading.Lock()

    def add_metric(
        self,
        metric_type: MetricType,
        value: float,
        labels: Optional[Dict[str, str]] = None,
    ):
        """Add a metric data point"""
        with self._lock:
            metric_point = MetricPoint(
                timestamp=datetime.utcnow(), value=value, labels=labels or {}
            )
            self.metrics[metric_type].append(metric_point)

    def add_request_metrics(self, metrics: RequestMetrics):
        """Add request metrics"""
        with self._lock:
            self.request_metrics.append(metrics)

            # Update endpoint statistics
            endpoint = metrics.endpoint
            stats = self.endpoint_stats[endpoint]
            stats["count"] += 1
            stats["total_time"] += metrics.response_time
            stats["min_time"] = min(stats["min_time"], metrics.response_time)
            stats["max_time"] = max(stats["max_time"], metrics.response_time)
            stats["status_codes"][metrics.status_code] += 1

            if metrics.status_code >= 400:
                stats["error_count"] += 1

    def get_metrics(
        self,
        metric_type: MetricType,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[MetricPoint]:
        """Get metrics within time range"""
        with self._lock:
            metrics = list(self.metrics[metric_type])

        if start_time:
            metrics = [m for m in metrics if m.timestamp >= start_time]
        if end_time:
            metrics = [m for m in metrics if m.timestamp <= end_time]

        return metrics

    def get_endpoint_stats(self, endpoint: Optional[str] = None) -> Dict[str, Any]:
        """Get endpoint performance statistics"""
        with self._lock:
            if endpoint:
                return dict(self.endpoint_stats.get(endpoint, {}))

            # Return aggregated stats for all endpoints
            return {
                endpoint: {
                    **stats,
                    "avg_time": (
                        stats["total_time"] / stats["count"]
                        if stats["count"] > 0
                        else 0
                    ),
                    "error_rate": (
                        stats["error_count"] / stats["count"]
                        if stats["count"] > 0
                        else 0
                    ),
                }
                for endpoint, stats in self.endpoint_stats.items()
            }

    def get_aggregated_metrics(
        self,
        metric_type: MetricType,
        aggregation: str = "avg",
        time_window: timedelta = timedelta(minutes=5),
    ) -> float:
        """Get aggregated metric value over time window"""
        end_time = datetime.utcnow()
        start_time = end_time - time_window

        metrics = self.get_metrics(metric_type, start_time, end_time)
        values = [m.value for m in metrics]

        if not values:
            return 0.0

        if aggregation == "avg":
            return statistics.mean(values)
        elif aggregation == "min":
            return min(values)
        elif aggregation == "max":
            return max(values)
        elif aggregation == "sum":
            return sum(values)
        elif aggregation == "median":
            return statistics.median(values)
        elif aggregation == "p95":
            return (
                statistics.quantiles(values, n=20)[18]
                if len(values) >= 20
                else max(values)
            )
        elif aggregation == "p99":
            return (
                statistics.quantiles(values, n=100)[98]
                if len(values) >= 100
                else max(values)
            )

        return 0.0


class SystemMonitor:
    """Monitor system resources"""

    def __init__(self, collector: MetricsCollector):
        self.collector = collector
        self.monitoring = False
        self._monitor_task: Optional[asyncio.Task] = None

    async def start_monitoring(self, interval: float = 5.0):
        """Start system resource monitoring"""
        if self.monitoring:
            return

        self.monitoring = True
        self._monitor_task = asyncio.create_task(self._monitor_loop(interval))
        logger.info("System monitoring started")

    async def stop_monitoring(self):
        """Stop system resource monitoring"""
        self.monitoring = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("System monitoring stopped")

    async def _monitor_loop(self, interval: float):
        """Main monitoring loop"""
        while self.monitoring:
            try:
                # CPU usage
                cpu_percent = psutil.cpu_percent(interval=None)
                self.collector.add_metric(MetricType.CPU_USAGE, cpu_percent)

                # Memory usage
                memory = psutil.virtual_memory()
                memory_percent = memory.percent
                self.collector.add_metric(MetricType.MEMORY_USAGE, memory_percent)

                # Additional system metrics
                disk_usage = psutil.disk_usage("/").percent
                self.collector.add_metric(
                    MetricType.MEMORY_USAGE, disk_usage, {"type": "disk"}
                )

                await asyncio.sleep(interval)

            except Exception as e:
                logger.error(f"System monitoring error: {e}")
                await asyncio.sleep(interval)


class AlertManager:
    """Manage performance alerts and notifications"""

    def __init__(self, collector: MetricsCollector):
        self.collector = collector
        self.alert_rules: List[Dict[str, Any]] = []
        self.active_alerts: List[PerformanceAlert] = []
        self.alert_callbacks: List[Callable[[PerformanceAlert], None]] = []
        self._lock = threading.Lock()
        self.monitoring = False
        self._monitor_task: Optional[asyncio.Task] = None

    def add_alert_rule(
        self,
        metric_type: MetricType,
        threshold: float,
        level: AlertLevel,
        message: str,
        condition: str = "gt",  # gt, lt, eq
        time_window: timedelta = timedelta(minutes=5),
    ):
        """Add an alert rule"""
        rule = {
            "metric_type": metric_type,
            "threshold": threshold,
            "level": level,
            "message": message,
            "condition": condition,
            "time_window": time_window,
        }
        self.alert_rules.append(rule)
        logger.info(f"Added alert rule: {metric_type.value} {condition} {threshold}")

    def add_alert_callback(self, callback: Callable[[PerformanceAlert], None]):
        """Add callback for alert notifications"""
        self.alert_callbacks.append(callback)

    async def start_monitoring(self, check_interval: float = 30.0):
        """Start alert monitoring"""
        if self.monitoring:
            return

        self.monitoring = True
        self._monitor_task = asyncio.create_task(
            self._alert_monitor_loop(check_interval)
        )
        logger.info("Alert monitoring started")

    async def stop_monitoring(self):
        """Stop alert monitoring"""
        self.monitoring = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("Alert monitoring stopped")

    async def _alert_monitor_loop(self, interval: float):
        """Main alert monitoring loop"""
        while self.monitoring:
            try:
                await self._check_alert_rules()
                await asyncio.sleep(interval)
            except Exception as e:
                logger.error(f"Alert monitoring error: {e}")
                await asyncio.sleep(interval)

    async def _check_alert_rules(self):
        """Check all alert rules and trigger alerts"""
        for rule in self.alert_rules:
            try:
                # Get current metric value
                value = self.collector.get_aggregated_metrics(
                    rule["metric_type"],
                    aggregation="avg",
                    time_window=rule["time_window"],
                )

                # Check condition
                triggered = False
                if rule["condition"] == "gt" and value > rule["threshold"]:
                    triggered = True
                elif rule["condition"] == "lt" and value < rule["threshold"]:
                    triggered = True
                elif (
                    rule["condition"] == "eq" and abs(value - rule["threshold"]) < 0.01
                ):
                    triggered = True

                if triggered:
                    await self._trigger_alert(rule, value)
                else:
                    await self._resolve_alert(rule["metric_type"])

            except Exception as e:
                logger.error(f"Error checking alert rule: {e}")

    async def _trigger_alert(self, rule: Dict[str, Any], value: float):
        """Trigger an alert"""
        with self._lock:
            # Check if alert is already active
            existing_alert = next(
                (
                    alert
                    for alert in self.active_alerts
                    if alert.metric_type == rule["metric_type"] and not alert.resolved
                ),
                None,
            )

            if existing_alert:
                return  # Alert already active

            # Create new alert
            alert = PerformanceAlert(
                metric_type=rule["metric_type"],
                threshold=rule["threshold"],
                level=rule["level"],
                message=f"{rule['message']} Current value: {value:.2f}",
            )

            self.active_alerts.append(alert)

            # Notify callbacks
            for callback in self.alert_callbacks:
                try:
                    callback(alert)
                except Exception as e:
                    logger.error(f"Alert callback error: {e}")

            logger.warning(f"Alert triggered: {alert.message}")

    async def _resolve_alert(self, metric_type: MetricType):
        """Resolve an active alert"""
        with self._lock:
            for alert in self.active_alerts:
                if alert.metric_type == metric_type and not alert.resolved:
                    alert.resolved = True
                    logger.info(f"Alert resolved: {metric_type.value}")
                    break

    def get_active_alerts(self) -> List[PerformanceAlert]:
        """Get all active alerts"""
        with self._lock:
            return [alert for alert in self.active_alerts if not alert.resolved]


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for comprehensive API performance monitoring"""

    def __init__(self, app, collector: MetricsCollector):
        super().__init__(app)
        self.collector = collector
        self.active_requests = 0
        self._lock = threading.Lock()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Monitor request performance"""
        start_time = time.time()

        # Track concurrent requests
        with self._lock:
            self.active_requests += 1

        self.collector.add_metric(MetricType.CONCURRENT_REQUESTS, self.active_requests)

        try:
            # Get request size
            request_size = 0
            if hasattr(request, "body"):
                body = await request.body()
                request_size = len(body)

            # Process request
            response = await call_next(request)

            # Calculate metrics
            end_time = time.time()
            response_time = end_time - start_time

            # Get response size
            response_size = 0
            if hasattr(response, "body"):
                response_size = len(response.body)

            # Create request metrics
            metrics = RequestMetrics(
                method=request.method,
                path=str(request.url.path),
                status_code=response.status_code,
                response_time=response_time,
                request_size=request_size,
                response_size=response_size,
                user_agent=request.headers.get("user-agent"),
                ip_address=request.client.host if request.client else None,
            )

            # Add to collector
            self.collector.add_request_metrics(metrics)

            # Add individual metrics
            self.collector.add_metric(MetricType.RESPONSE_TIME, response_time)

            # Calculate error rate
            if response.status_code >= 400:
                self.collector.add_metric(MetricType.ERROR_RATE, 1.0)
            else:
                self.collector.add_metric(MetricType.ERROR_RATE, 0.0)

            return response

        finally:
            with self._lock:
                self.active_requests -= 1


class PerformanceReporter:
    """Generate performance reports and analytics"""

    def __init__(self, collector: MetricsCollector):
        self.collector = collector

    def generate_summary_report(
        self, time_window: timedelta = timedelta(hours=1)
    ) -> Dict[str, Any]:
        """Generate comprehensive performance summary"""
        end_time = datetime.utcnow()
        start_time = end_time - time_window

        # Get endpoint statistics
        endpoint_stats = self.collector.get_endpoint_stats()

        # Calculate overall metrics
        total_requests = sum(stats["count"] for stats in endpoint_stats.values())
        total_errors = sum(stats["error_count"] for stats in endpoint_stats.values())

        # Get aggregated metrics
        avg_response_time = self.collector.get_aggregated_metrics(
            MetricType.RESPONSE_TIME, "avg", time_window
        )
        p95_response_time = self.collector.get_aggregated_metrics(
            MetricType.RESPONSE_TIME, "p95", time_window
        )
        avg_cpu_usage = self.collector.get_aggregated_metrics(
            MetricType.CPU_USAGE, "avg", time_window
        )
        avg_memory_usage = self.collector.get_aggregated_metrics(
            MetricType.MEMORY_USAGE, "avg", time_window
        )

        # Find slowest endpoints
        slowest_endpoints = sorted(
            [
                (endpoint, stats["max_time"])
                for endpoint, stats in endpoint_stats.items()
            ],
            key=lambda x: x[1],
            reverse=True,
        )[:10]

        # Find endpoints with highest error rates
        error_endpoints = sorted(
            [
                (endpoint, stats["error_rate"])
                for endpoint, stats in endpoint_stats.items()
            ],
            key=lambda x: x[1],
            reverse=True,
        )[:10]

        return {
            "summary": {
                "time_window": str(time_window),
                "total_requests": total_requests,
                "total_errors": total_errors,
                "error_rate": (
                    total_errors / total_requests if total_requests > 0 else 0
                ),
                "avg_response_time": avg_response_time,
                "p95_response_time": p95_response_time,
                "avg_cpu_usage": avg_cpu_usage,
                "avg_memory_usage": avg_memory_usage,
            },
            "slowest_endpoints": slowest_endpoints,
            "error_prone_endpoints": error_endpoints,
            "endpoint_stats": endpoint_stats,
            "generated_at": end_time.isoformat(),
        }

    def export_metrics(
        self, format_type: str = "json", time_window: Optional[timedelta] = None
    ) -> Union[str, Dict[str, Any]]:
        """Export metrics in various formats"""
        time_window = time_window or timedelta(hours=24)
        report = self.generate_summary_report(time_window)

        if format_type == "json":
            return json.dumps(report, indent=2)
        elif format_type == "dict":
            return report
        else:
            raise ValueError(f"Unsupported format: {format_type}")


# Global performance monitoring components
performance_collector = MetricsCollector()
system_monitor = SystemMonitor(performance_collector)
alert_manager = AlertManager(performance_collector)
performance_reporter = PerformanceReporter(performance_collector)


async def setup_performance_monitoring():
    """Setup and start performance monitoring"""
    # Setup default alert rules
    alert_manager.add_alert_rule(
        MetricType.RESPONSE_TIME,
        threshold=2.0,  # 2 seconds
        level=AlertLevel.WARNING,
        message="High response time detected",
    )

    alert_manager.add_alert_rule(
        MetricType.ERROR_RATE,
        threshold=0.05,  # 5% error rate
        level=AlertLevel.CRITICAL,
        message="High error rate detected",
    )

    alert_manager.add_alert_rule(
        MetricType.CPU_USAGE,
        threshold=80.0,  # 80% CPU usage
        level=AlertLevel.WARNING,
        message="High CPU usage detected",
    )

    alert_manager.add_alert_rule(
        MetricType.MEMORY_USAGE,
        threshold=85.0,  # 85% memory usage
        level=AlertLevel.CRITICAL,
        message="High memory usage detected",
    )

    # Start monitoring
    await system_monitor.start_monitoring(interval=10.0)
    await alert_manager.start_monitoring(check_interval=30.0)

    logger.info("Performance monitoring initialized")


async def shutdown_performance_monitoring():
    """Shutdown performance monitoring"""
    await system_monitor.stop_monitoring()
    await alert_manager.stop_monitoring()
    logger.info("Performance monitoring shutdown completed")


@asynccontextmanager
async def performance_monitoring_context():
    """Context manager for performance monitoring lifecycle"""
    await setup_performance_monitoring()
    try:
        yield
    finally:
        await shutdown_performance_monitoring()


def get_performance_metrics() -> Dict[str, Any]:
    """Get current performance metrics"""
    return performance_reporter.generate_summary_report()


def get_performance_alerts() -> List[Dict[str, Any]]:
    """Get active performance alerts"""
    return [alert.to_dict() for alert in alert_manager.get_active_alerts()]
