#!/usr/bin/env python3
"""
Check for debug code in Python files
Prevents print statements and debugger calls from being committed to production code
"""

import re
import subprocess
import sys
from pathlib import Path

DEBUG_PATTERNS = [
    (r"\bprint\s*\(", "print() statement"),
    (r"\bbreakpoint\s*\(", "breakpoint() call"),
    (r"\bpdb\.set_trace\s*\(", "pdb.set_trace() call"),
    (r"\bipdb\.set_trace\s*\(", "ipdb.set_trace() call"),
    (r"import\s+pdb", "pdb import"),
    (r"import\s+ipdb", "ipdb import"),
]

ALLOWED_PATHS = [
    "tests/",
    "test_",
    "scripts/",
    "migrations/",
    "alembic/",
    "scaffolding/",
    "auth_status_report.py",
    "check_dependencies.py",
]


def is_allowed_file(filepath):
    """Check if file is allowed to have debug code"""
    return any(pattern in str(filepath) for pattern in ALLOWED_PATHS)


def check_file(filepath, content):
    """Check a single file for debug patterns"""
    issues = []

    if is_allowed_file(filepath):
        return issues

    lines = content.split("\n")

    for pattern, name in DEBUG_PATTERNS:
        for line_num, line in enumerate(lines, 1):
            # Skip comments
            if line.strip().startswith("#"):
                continue

            if re.search(pattern, line):
                issues.append(
                    {
                        "file": filepath,
                        "line": line_num,
                        "pattern": name,
                        "code": line.strip(),
                    }
                )

    return issues


def main():
    try:
        # Get staged Python files
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            capture_output=True,
            text=True,
            check=True,
        )

        staged_files = [
            f
            for f in result.stdout.split("\n")
            if f.endswith(".py") and f.startswith("backend/")
        ]

        if not staged_files:
            sys.exit(0)

        all_issues = []

        for file in staged_files:
            try:
                # Get staged content
                result = subprocess.run(
                    ["git", "show", f":{file}"],
                    capture_output=True,
                    text=True,
                    check=True,
                )

                issues = check_file(file, result.stdout)
                all_issues.extend(issues)

            except subprocess.CalledProcessError:
                # File might be deleted or binary, skip
                continue

        if all_issues:
            print("\n❌ Debug code detected in staged Python files:\n")

            for issue in all_issues:
                print(f"  {issue['file']}:{issue['line']}")
                print(f"    {issue['pattern']}: {issue['code']}")
                print("")

            print("🚫 Please remove debug code before committing.\n")
            print("💡 Tip: Use Python logging module in production code.\n")

            sys.exit(1)

        sys.exit(0)

    except Exception as e:
        print(f"Error checking debug code: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
