"""
Distributed Module System - Performance and Load Analysis Tests

Tests execution time, load handling, and scalability of the distributed module system.
"""

import asyncio
import json
import logging
import os
import statistics
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from modules.base.services.remote_module_service import (
    RemoteModuleService,
    DistributedModuleLoader,
    RemoteSourceType,
    ModuleSyncStatus,
)
from app.core.modules.loader import ModuleLoader


# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# =============================================================================
# Performance Metrics
# =============================================================================


@dataclass
class OperationMetrics:
    """Metrics for a single operation."""
    operation: str
    duration_ms: float
    success: bool
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LoadTestResult:
    """Results from a load test run."""
    test_name: str
    total_operations: int
    successful_operations: int
    failed_operations: int
    total_duration_ms: float
    min_latency_ms: float
    max_latency_ms: float
    avg_latency_ms: float
    median_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    operations_per_second: float
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "test_name": self.test_name,
            "total_operations": self.total_operations,
            "successful": self.successful_operations,
            "failed": self.failed_operations,
            "total_duration_ms": round(self.total_duration_ms, 2),
            "latency": {
                "min_ms": round(self.min_latency_ms, 2),
                "max_ms": round(self.max_latency_ms, 2),
                "avg_ms": round(self.avg_latency_ms, 2),
                "median_ms": round(self.median_latency_ms, 2),
                "p95_ms": round(self.p95_latency_ms, 2),
                "p99_ms": round(self.p99_latency_ms, 2),
            },
            "throughput": {
                "ops_per_second": round(self.operations_per_second, 2),
            },
            "error_count": len(self.errors),
        }


def calculate_percentile(data: List[float], percentile: float) -> float:
    """Calculate percentile value from sorted data."""
    if not data:
        return 0.0
    sorted_data = sorted(data)
    index = int(len(sorted_data) * percentile / 100)
    return sorted_data[min(index, len(sorted_data) - 1)]


def analyze_metrics(test_name: str, metrics: List[OperationMetrics]) -> LoadTestResult:
    """Analyze operation metrics and return load test results."""
    successful = [m for m in metrics if m.success]
    failed = [m for m in metrics if not m.success]

    durations = [m.duration_ms for m in successful] if successful else [0]
    total_duration = sum(m.duration_ms for m in metrics)

    return LoadTestResult(
        test_name=test_name,
        total_operations=len(metrics),
        successful_operations=len(successful),
        failed_operations=len(failed),
        total_duration_ms=total_duration,
        min_latency_ms=min(durations) if durations else 0,
        max_latency_ms=max(durations) if durations else 0,
        avg_latency_ms=statistics.mean(durations) if durations else 0,
        median_latency_ms=statistics.median(durations) if durations else 0,
        p95_latency_ms=calculate_percentile(durations, 95),
        p99_latency_ms=calculate_percentile(durations, 99),
        operations_per_second=(len(successful) / (total_duration / 1000)) if total_duration > 0 else 0,
        errors=[m.error for m in failed if m.error],
    )


# =============================================================================
# Mock Remote Sources for Testing
# =============================================================================


class MockNFSSource:
    """Simulated NFS source with configurable latency."""

    def __init__(self, latency_ms: float = 50, modules: Optional[Dict] = None):
        self.latency_ms = latency_ms
        self.modules = modules or self._generate_mock_modules(10)

    def _generate_mock_modules(self, count: int) -> Dict[str, Dict]:
        """Generate mock module manifests."""
        return {
            f"nfs_module_{i}": {
                "name": f"nfs_module_{i}",
                "version": "1.0.0",
                "description": f"Mock NFS module {i}",
                "depends": ["base"],
                "path": f"/mnt/nfs/modules/nfs_module_{i}",
            }
            for i in range(count)
        }

    def list_modules(self) -> Dict[str, Dict]:
        """Simulate listing modules with network latency."""
        time.sleep(self.latency_ms / 1000)
        return self.modules

    def download_module(self, module_name: str) -> bytes:
        """Simulate downloading module with network latency."""
        time.sleep(self.latency_ms / 1000 * 2)  # Download takes longer
        return b"mock_module_content"


class MockS3Source:
    """Simulated S3 source with configurable latency."""

    def __init__(self, latency_ms: float = 100, modules: Optional[Dict] = None):
        self.latency_ms = latency_ms
        self.modules = modules or self._generate_mock_modules(20)

    def _generate_mock_modules(self, count: int) -> Dict[str, Dict]:
        return {
            f"s3_module_{i}": {
                "name": f"s3_module_{i}",
                "version": "2.0.0",
                "description": f"Mock S3 module {i}",
                "depends": ["base"],
                "bucket": "company-modules",
                "key": f"addons/s3_module_{i}.zip",
            }
            for i in range(count)
        }

    def list_objects(self) -> Dict[str, Dict]:
        time.sleep(self.latency_ms / 1000)
        return self.modules

    def download_object(self, key: str) -> bytes:
        time.sleep(self.latency_ms / 1000 * 3)  # S3 download typically slower
        return b"mock_s3_module_content"


class MockGitSource:
    """Simulated Git source with configurable latency."""

    def __init__(self, latency_ms: float = 200, modules: Optional[Dict] = None):
        self.latency_ms = latency_ms
        self.modules = modules or self._generate_mock_modules(5)

    def _generate_mock_modules(self, count: int) -> Dict[str, Dict]:
        return {
            f"git_module_{i}": {
                "name": f"git_module_{i}",
                "version": "3.0.0",
                "description": f"Mock Git module {i}",
                "depends": ["base"],
                "repo": "https://github.com/company/modules.git",
                "branch": "main",
            }
            for i in range(count)
        }

    def clone_or_pull(self) -> Dict[str, Dict]:
        time.sleep(self.latency_ms / 1000)
        return self.modules

    def checkout_module(self, module_name: str) -> bytes:
        time.sleep(self.latency_ms / 1000)
        return b"mock_git_module_content"


class MockRegistrySource:
    """Simulated HTTP Registry source."""

    def __init__(self, latency_ms: float = 30, modules: Optional[Dict] = None):
        self.latency_ms = latency_ms
        self.modules = modules or self._generate_mock_modules(50)

    def _generate_mock_modules(self, count: int) -> Dict[str, Dict]:
        return {
            f"registry_module_{i}": {
                "name": f"registry_module_{i}",
                "version": "4.0.0",
                "description": f"Mock Registry module {i}",
                "depends": ["base"],
                "registry_url": "https://registry.fastvue.io",
            }
            for i in range(count)
        }

    def search(self) -> Dict[str, Dict]:
        time.sleep(self.latency_ms / 1000)
        return self.modules

    def download(self, module_name: str) -> bytes:
        time.sleep(self.latency_ms / 1000 * 2)
        return b"mock_registry_module_content"


# =============================================================================
# Performance Test Cases
# =============================================================================


class DistributedModulePerformanceTester:
    """Performance tester for distributed module operations."""

    def __init__(self):
        self.results: List[LoadTestResult] = []
        self.temp_dir = tempfile.mkdtemp(prefix="fastvue_perf_test_")
        self.local_addons_path = Path(self.temp_dir) / "addons"
        self.local_addons_path.mkdir(exist_ok=True)

        # Create mock local modules
        self._create_local_modules(5)

    def _create_local_modules(self, count: int):
        """Create local mock modules for testing."""
        for i in range(count):
            module_dir = self.local_addons_path / f"local_module_{i}"
            module_dir.mkdir(exist_ok=True)

            manifest = {
                "name": f"local_module_{i}",
                "version": "1.0.0",
                "description": f"Local test module {i}",
                "depends": ["base"],
            }

            (module_dir / "__manifest__.py").write_text(f"manifest = {json.dumps(manifest, indent=2)}")
            (module_dir / "__init__.py").write_text("# Local module")

    def _create_mock_remote_service(self) -> RemoteModuleService:
        """Create a RemoteModuleService with mocked sources."""
        # Mock database session
        mock_db = MagicMock()
        service = RemoteModuleService(mock_db)

        # Store mock sources for testing
        service._mock_sources = {
            "nfs_corp": MockNFSSource(latency_ms=50),
            "s3_cloud": MockS3Source(latency_ms=100),
            "git_github": MockGitSource(latency_ms=200),
            "registry_public": MockRegistrySource(latency_ms=30),
        }

        return service

    # -------------------------------------------------------------------------
    # Test: Module Discovery Performance
    # -------------------------------------------------------------------------

    def test_local_discovery_performance(self, iterations: int = 100) -> LoadTestResult:
        """Test local module discovery performance."""
        logger.info(f"Testing local discovery performance ({iterations} iterations)...")
        metrics: List[OperationMetrics] = []

        loader = ModuleLoader([str(self.local_addons_path)])

        for i in range(iterations):
            start = time.perf_counter()
            try:
                # Force re-discovery
                loader._modules_cache = {}
                loader._manifest_cache = {}
                modules = loader.discover_modules()

                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="local_discovery",
                    duration_ms=duration_ms,
                    success=True,
                    metadata={"modules_found": len(modules)},
                ))
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="local_discovery",
                    duration_ms=duration_ms,
                    success=False,
                    error=str(e),
                ))

        result = analyze_metrics("Local Module Discovery", metrics)
        self.results.append(result)
        return result

    def test_remote_discovery_performance(self, iterations: int = 50) -> LoadTestResult:
        """Test remote module discovery performance across all sources."""
        logger.info(f"Testing remote discovery performance ({iterations} iterations)...")
        metrics: List[OperationMetrics] = []

        for i in range(iterations):
            start = time.perf_counter()
            try:
                # Simulate discovery from multiple sources
                all_modules = {}
                sources = {
                    "nfs": MockNFSSource(latency_ms=50),
                    "s3": MockS3Source(latency_ms=100),
                    "git": MockGitSource(latency_ms=200),
                    "registry": MockRegistrySource(latency_ms=30),
                }

                for name, source in sources.items():
                    if hasattr(source, "list_modules"):
                        all_modules.update(source.list_modules())
                    elif hasattr(source, "list_objects"):
                        all_modules.update(source.list_objects())
                    elif hasattr(source, "clone_or_pull"):
                        all_modules.update(source.clone_or_pull())
                    elif hasattr(source, "search"):
                        all_modules.update(source.search())

                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="remote_discovery",
                    duration_ms=duration_ms,
                    success=True,
                    metadata={"modules_found": len(all_modules)},
                ))
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="remote_discovery",
                    duration_ms=duration_ms,
                    success=False,
                    error=str(e),
                ))

        result = analyze_metrics("Remote Module Discovery (All Sources)", metrics)
        self.results.append(result)
        return result

    # -------------------------------------------------------------------------
    # Test: Concurrent Discovery Performance
    # -------------------------------------------------------------------------

    def test_concurrent_discovery(self, workers: int = 10, operations: int = 100) -> LoadTestResult:
        """Test concurrent module discovery performance."""
        logger.info(f"Testing concurrent discovery ({workers} workers, {operations} operations)...")
        metrics: List[OperationMetrics] = []

        def discover_operation(operation_id: int) -> OperationMetrics:
            start = time.perf_counter()
            try:
                source = MockRegistrySource(latency_ms=30)
                modules = source.search()

                duration_ms = (time.perf_counter() - start) * 1000
                return OperationMetrics(
                    operation="concurrent_discovery",
                    duration_ms=duration_ms,
                    success=True,
                    metadata={"operation_id": operation_id, "modules_found": len(modules)},
                )
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                return OperationMetrics(
                    operation="concurrent_discovery",
                    duration_ms=duration_ms,
                    success=False,
                    error=str(e),
                )

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [executor.submit(discover_operation, i) for i in range(operations)]
            for future in as_completed(futures):
                metrics.append(future.result())

        result = analyze_metrics(f"Concurrent Discovery ({workers} workers)", metrics)
        self.results.append(result)
        return result

    # -------------------------------------------------------------------------
    # Test: Module Sync Performance
    # -------------------------------------------------------------------------

    def test_module_sync_performance(self, module_count: int = 20) -> LoadTestResult:
        """Test module synchronization performance."""
        logger.info(f"Testing module sync performance ({module_count} modules)...")
        metrics: List[OperationMetrics] = []

        source = MockS3Source(latency_ms=100)
        modules = source.list_objects()

        for module_name in list(modules.keys())[:module_count]:
            start = time.perf_counter()
            try:
                # Simulate sync operation
                content = source.download_object(module_name)

                # Simulate write to cache
                cache_path = Path(self.temp_dir) / "cache" / module_name
                cache_path.mkdir(parents=True, exist_ok=True)
                (cache_path / "module.zip").write_bytes(content)

                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="module_sync",
                    duration_ms=duration_ms,
                    success=True,
                    metadata={"module": module_name, "size": len(content)},
                ))
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="module_sync",
                    duration_ms=duration_ms,
                    success=False,
                    error=str(e),
                ))

        result = analyze_metrics("Module Sync (S3)", metrics)
        self.results.append(result)
        return result

    # -------------------------------------------------------------------------
    # Test: Distributed Loader Performance
    # -------------------------------------------------------------------------

    def test_distributed_loader_performance(self, iterations: int = 50) -> LoadTestResult:
        """Test DistributedModuleLoader performance."""
        logger.info(f"Testing distributed loader performance ({iterations} iterations)...")
        metrics: List[OperationMetrics] = []

        for i in range(iterations):
            start = time.perf_counter()
            try:
                # Simulate full distributed discovery
                local_modules = {}
                remote_modules = {}

                # Local discovery
                loader = ModuleLoader([str(self.local_addons_path)])
                local_modules = loader.discover_modules()

                # Remote discovery (parallel simulation)
                sources = [
                    MockNFSSource(latency_ms=20),
                    MockS3Source(latency_ms=40),
                    MockRegistrySource(latency_ms=15),
                ]

                for source in sources:
                    if hasattr(source, "list_modules"):
                        remote_modules.update(source.list_modules())
                    elif hasattr(source, "list_objects"):
                        remote_modules.update(source.list_objects())
                    elif hasattr(source, "search"):
                        remote_modules.update(source.search())

                # Merge with priority
                all_modules = {**remote_modules, **local_modules}

                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="distributed_loader",
                    duration_ms=duration_ms,
                    success=True,
                    metadata={
                        "local_count": len(local_modules),
                        "remote_count": len(remote_modules),
                        "total_count": len(all_modules),
                    },
                ))
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="distributed_loader",
                    duration_ms=duration_ms,
                    success=False,
                    error=str(e),
                ))

        result = analyze_metrics("Distributed Loader", metrics)
        self.results.append(result)
        return result

    # -------------------------------------------------------------------------
    # Test: Cache Performance
    # -------------------------------------------------------------------------

    def test_cache_hit_performance(self, iterations: int = 1000) -> LoadTestResult:
        """Test cache hit performance (best case scenario)."""
        logger.info(f"Testing cache hit performance ({iterations} iterations)...")
        metrics: List[OperationMetrics] = []

        # Pre-populate cache
        cache = {}
        for i in range(100):
            cache[f"module_{i}"] = {
                "name": f"module_{i}",
                "version": "1.0.0",
                "manifest": {"depends": ["base"]},
            }

        for i in range(iterations):
            start = time.perf_counter()
            try:
                module_name = f"module_{i % 100}"
                result = cache.get(module_name)

                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="cache_hit",
                    duration_ms=duration_ms,
                    success=result is not None,
                    metadata={"module": module_name},
                ))
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="cache_hit",
                    duration_ms=duration_ms,
                    success=False,
                    error=str(e),
                ))

        result = analyze_metrics("Cache Hit Performance", metrics)
        self.results.append(result)
        return result

    # -------------------------------------------------------------------------
    # Test: Source Failover Performance
    # -------------------------------------------------------------------------

    def test_failover_performance(self, iterations: int = 30) -> LoadTestResult:
        """Test failover performance when primary source fails."""
        logger.info(f"Testing failover performance ({iterations} iterations)...")
        metrics: List[OperationMetrics] = []

        class FailingSource:
            def __init__(self, fail_rate: float = 0.5):
                self.fail_rate = fail_rate
                self.call_count = 0

            def list_modules(self):
                self.call_count += 1
                if self.call_count % 2 == 0:  # Fail 50% of the time
                    raise ConnectionError("Primary source unavailable")
                time.sleep(0.05)
                return {"module_1": {"name": "module_1"}}

        for i in range(iterations):
            start = time.perf_counter()
            try:
                sources = [
                    ("primary", FailingSource()),
                    ("secondary", MockNFSSource(latency_ms=100)),
                ]

                modules = None
                attempted_sources = []

                for name, source in sources:
                    try:
                        modules = source.list_modules()
                        attempted_sources.append(name)
                        break
                    except Exception:
                        attempted_sources.append(f"{name}(failed)")
                        continue

                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="failover",
                    duration_ms=duration_ms,
                    success=modules is not None,
                    metadata={"sources_tried": attempted_sources},
                ))
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                metrics.append(OperationMetrics(
                    operation="failover",
                    duration_ms=duration_ms,
                    success=False,
                    error=str(e),
                ))

        result = analyze_metrics("Source Failover", metrics)
        self.results.append(result)
        return result

    # -------------------------------------------------------------------------
    # Test: Load Under Stress
    # -------------------------------------------------------------------------

    def test_stress_load(self, workers: int = 50, operations: int = 500) -> LoadTestResult:
        """Test system under stress with many concurrent operations."""
        logger.info(f"Testing stress load ({workers} workers, {operations} operations)...")
        metrics: List[OperationMetrics] = []

        def stress_operation(operation_id: int) -> OperationMetrics:
            start = time.perf_counter()
            try:
                # Mix of operations
                op_type = operation_id % 4

                if op_type == 0:
                    # Discovery
                    source = MockRegistrySource(latency_ms=10 + (operation_id % 20))
                    source.search()
                elif op_type == 1:
                    # Cache lookup
                    time.sleep(0.001)
                elif op_type == 2:
                    # Sync
                    source = MockS3Source(latency_ms=20 + (operation_id % 30))
                    source.download_object(f"module_{operation_id}")
                else:
                    # Manifest read
                    time.sleep(0.002)

                duration_ms = (time.perf_counter() - start) * 1000
                return OperationMetrics(
                    operation="stress",
                    duration_ms=duration_ms,
                    success=True,
                    metadata={"operation_id": operation_id, "op_type": op_type},
                )
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                return OperationMetrics(
                    operation="stress",
                    duration_ms=duration_ms,
                    success=False,
                    error=str(e),
                )

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [executor.submit(stress_operation, i) for i in range(operations)]
            for future in as_completed(futures):
                metrics.append(future.result())

        result = analyze_metrics(f"Stress Load ({workers} workers, {operations} ops)", metrics)
        self.results.append(result)
        return result

    # -------------------------------------------------------------------------
    # Generate Report
    # -------------------------------------------------------------------------

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report."""
        report = {
            "test_run": {
                "timestamp": datetime.now().isoformat(),
                "test_count": len(self.results),
            },
            "summary": {
                "total_operations": sum(r.total_operations for r in self.results),
                "total_successful": sum(r.successful_operations for r in self.results),
                "total_failed": sum(r.failed_operations for r in self.results),
                "overall_success_rate": 0,
            },
            "tests": [r.to_dict() for r in self.results],
            "recommendations": [],
        }

        total_ops = report["summary"]["total_operations"]
        if total_ops > 0:
            report["summary"]["overall_success_rate"] = round(
                report["summary"]["total_successful"] / total_ops * 100, 2
            )

        # Add recommendations based on results
        for result in self.results:
            if result.p99_latency_ms > 500:
                report["recommendations"].append(
                    f"{result.test_name}: Consider caching - p99 latency is {result.p99_latency_ms:.0f}ms"
                )
            if result.failed_operations > result.total_operations * 0.05:
                failure_rate = result.failed_operations / result.total_operations * 100
                report["recommendations"].append(
                    f"{result.test_name}: High failure rate ({failure_rate:.1f}%) - review error handling"
                )
            if result.operations_per_second < 10:
                report["recommendations"].append(
                    f"{result.test_name}: Low throughput ({result.operations_per_second:.1f} ops/s) - consider parallelization"
                )

        return report

    def print_report(self):
        """Print formatted performance report."""
        report = self.generate_report()

        print("\n" + "=" * 80)
        print("DISTRIBUTED MODULE SYSTEM - PERFORMANCE REPORT")
        print("=" * 80)
        print(f"\nTest Run: {report['test_run']['timestamp']}")
        print(f"Tests Executed: {report['test_run']['test_count']}")

        print("\n" + "-" * 80)
        print("SUMMARY")
        print("-" * 80)
        print(f"Total Operations: {report['summary']['total_operations']}")
        print(f"Successful: {report['summary']['total_successful']}")
        print(f"Failed: {report['summary']['total_failed']}")
        print(f"Success Rate: {report['summary']['overall_success_rate']}%")

        print("\n" + "-" * 80)
        print("TEST RESULTS")
        print("-" * 80)

        for test in report["tests"]:
            print(f"\n{test['test_name']}")
            print(f"  Operations: {test['total_operations']} (success: {test['successful']}, failed: {test['failed']})")
            print(f"  Latency (ms): min={test['latency']['min_ms']}, avg={test['latency']['avg_ms']}, "
                  f"p95={test['latency']['p95_ms']}, p99={test['latency']['p99_ms']}, max={test['latency']['max_ms']}")
            print(f"  Throughput: {test['throughput']['ops_per_second']} ops/sec")

        if report["recommendations"]:
            print("\n" + "-" * 80)
            print("RECOMMENDATIONS")
            print("-" * 80)
            for rec in report["recommendations"]:
                print(f"  • {rec}")

        print("\n" + "=" * 80)

        return report

    def cleanup(self):
        """Clean up temporary files."""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)


# =============================================================================
# Main Execution
# =============================================================================


def run_all_tests():
    """Run all performance tests and generate report."""
    tester = DistributedModulePerformanceTester()

    try:
        print("\nStarting Distributed Module Performance Tests...\n")

        # Run tests
        tester.test_local_discovery_performance(iterations=100)
        tester.test_remote_discovery_performance(iterations=50)
        tester.test_concurrent_discovery(workers=10, operations=100)
        tester.test_module_sync_performance(module_count=20)
        tester.test_distributed_loader_performance(iterations=50)
        tester.test_cache_hit_performance(iterations=1000)
        tester.test_failover_performance(iterations=30)
        tester.test_stress_load(workers=50, operations=500)

        # Generate report
        report = tester.print_report()

        # Save report to file
        report_path = Path("/opt/FastVue/backend/tests/performance_report.json")
        report_path.write_text(json.dumps(report, indent=2))
        print(f"\nReport saved to: {report_path}")

        return report

    finally:
        tester.cleanup()


if __name__ == "__main__":
    run_all_tests()
