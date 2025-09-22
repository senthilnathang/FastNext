#!/usr/bin/env python3
"""
FastNext Backend Test Runner

Comprehensive test runner for the FastNext backend with pytest.
Provides different test execution modes and reporting options.
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path


def run_command(cmd, cwd=None):
    """Run command and return result."""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    
    return result.returncode == 0


def install_dependencies():
    """Install test dependencies."""
    print("Installing test dependencies...")
    return run_command([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])


def run_tests(test_type="all", coverage=True, verbose=True, parallel=False):
    """Run tests with specified options."""
    cmd = [sys.executable, "-m", "pytest"]
    
    # Add verbosity
    if verbose:
        cmd.append("-v")
    
    # Add coverage
    if coverage:
        cmd.extend(["--cov=app", "--cov-report=html", "--cov-report=term-missing"])
    
    # Add parallel execution
    if parallel:
        cmd.extend(["-n", "auto"])
    
    # Select test type
    if test_type == "unit":
        cmd.extend(["-m", "unit"])
    elif test_type == "integration":
        cmd.extend(["-m", "integration"])
    elif test_type == "api":
        cmd.extend(["-m", "api"])
    elif test_type == "auth":
        cmd.extend(["-m", "auth"])
    elif test_type == "workflow":
        cmd.extend(["-m", "workflow"])
    elif test_type == "crud":
        cmd.extend(["-m", "crud"])
    elif test_type == "fast":
        cmd.extend(["-m", "not slow"])
    elif test_type == "slow":
        cmd.extend(["-m", "slow"])
    
    # Add test directory
    cmd.append("tests/")
    
    return run_command(cmd)


def run_linting():
    """Run code linting."""
    print("Running code linting...")
    
    # Run pylint
    success = True
    if os.path.exists("pylint.ini"):
        success &= run_command([sys.executable, "-m", "pylint", "app/"])
    
    # Run black format check
    success &= run_command([sys.executable, "-m", "black", "--check", "app/"])
    
    return success


def generate_test_report():
    """Generate comprehensive test report."""
    print("Generating test report...")
    
    # Run tests with XML output for CI
    cmd = [
        sys.executable, "-m", "pytest",
        "--cov=app",
        "--cov-report=xml",
        "--cov-report=html",
        "--junit-xml=test-results/results.xml",
        "tests/"
    ]
    
    return run_command(cmd)


def setup_test_environment():
    """Setup test environment."""
    print("Setting up test environment...")
    
    # Create test results directory
    os.makedirs("test-results", exist_ok=True)
    os.makedirs("htmlcov", exist_ok=True)
    
    # Set environment variables for testing
    os.environ["ENVIRONMENT"] = "test"
    os.environ["DATABASE_URL"] = "sqlite:///./test.db"
    
    return True


def clean_test_artifacts():
    """Clean up test artifacts."""
    print("Cleaning test artifacts...")
    
    artifacts = [
        "test.db",
        ".coverage",
        "test-results/",
        "htmlcov/",
        "__pycache__/",
        ".pytest_cache/"
    ]
    
    for artifact in artifacts:
        if os.path.exists(artifact):
            if os.path.isfile(artifact):
                os.remove(artifact)
            else:
                import shutil
                shutil.rmtree(artifact)
    
    return True


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description="FastNext Backend Test Runner")
    
    parser.add_argument(
        "--type", 
        choices=["all", "unit", "integration", "api", "auth", "workflow", "crud", "fast", "slow"],
        default="all",
        help="Type of tests to run"
    )
    
    parser.add_argument(
        "--no-coverage",
        action="store_true",
        help="Skip coverage reporting"
    )
    
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Run in quiet mode"
    )
    
    parser.add_argument(
        "--parallel",
        action="store_true",
        help="Run tests in parallel"
    )
    
    parser.add_argument(
        "--lint",
        action="store_true",
        help="Run linting only"
    )
    
    parser.add_argument(
        "--install",
        action="store_true",
        help="Install dependencies only"
    )
    
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Clean test artifacts only"
    )
    
    parser.add_argument(
        "--setup",
        action="store_true",
        help="Setup test environment only"
    )
    
    parser.add_argument(
        "--report",
        action="store_true",
        help="Generate comprehensive test report"
    )
    
    args = parser.parse_args()
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    success = True
    
    # Handle specific actions
    if args.install:
        return 0 if install_dependencies() else 1
    
    if args.clean:
        return 0 if clean_test_artifacts() else 1
    
    if args.setup:
        return 0 if setup_test_environment() else 1
    
    if args.lint:
        return 0 if run_linting() else 1
    
    if args.report:
        setup_test_environment()
        return 0 if generate_test_report() else 1
    
    # Setup environment
    success &= setup_test_environment()
    
    # Install dependencies if needed
    if not os.path.exists("venv/lib") and not os.path.exists("venv/Lib"):
        success &= install_dependencies()
    
    # Run tests
    if success:
        success &= run_tests(
            test_type=args.type,
            coverage=not args.no_coverage,
            verbose=not args.quiet,
            parallel=args.parallel
        )
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())