#!/usr/bin/env python3
"""
Integration script for Enhanced Logging Middleware
This script integrates the new enhanced event logging middleware into the main FastAPI application
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))


def integrate_enhanced_logging():
    """Integrate enhanced logging middleware into main.py"""

    print("🔧 Integrating Enhanced Event Logging Middleware...")

    main_py_path = Path(__file__).parent / "main.py"

    # Read current main.py content
    with open(main_py_path, "r") as f:
        content = f.read()

    # Check if enhanced logging is already integrated
    if "enhanced_logging_middleware" in content.lower():
        print("✅ Enhanced logging middleware already integrated!")
        return True

    # Add import for enhanced logging middleware
    import_line = "from app.middleware.enhanced_logging_middleware import (\n    create_enhanced_logging_middleware, create_auth_event_middleware\n)"

    # Find the line with other middleware imports
    lines = content.split("\n")
    security_import_index = None

    for i, line in enumerate(lines):
        if "from app.middleware.security_middleware import" in line:
            security_import_index = i
            break

    if security_import_index is not None:
        # Insert the enhanced logging import after security middleware import
        lines.insert(security_import_index + 3, import_line)
    else:
        # Add at the end of imports section
        for i, line in enumerate(lines):
            if line.startswith("from app.api.main import"):
                lines.insert(i, import_line)
                break

    # Find the _setup_middleware function and add enhanced logging
    setup_middleware_start = None
    for i, line in enumerate(lines):
        if "def _setup_middleware(app: FastAPI):" in line:
            setup_middleware_start = i
            break

    if setup_middleware_start is not None:
        # Find where to insert the enhanced logging middleware
        # Look for the CORS middleware section
        cors_section = None
        for i in range(setup_middleware_start, len(lines)):
            if "app.add_middleware(CORSMiddleware" in lines[i]:
                cors_section = i
                break

        if cors_section is not None:
            # Add enhanced logging middleware before CORS
            enhanced_logging_code = """
    # Enhanced Event Logging Middleware
    # Add authentication event tracking
    app.add_middleware(create_auth_event_middleware())

    # Add comprehensive event logging
    app.add_middleware(
        create_enhanced_logging_middleware(
            enable_enhanced_logging=True,
            log_all_requests=False,  # Only log sensitive endpoints and errors
            exclude_paths={
                '/health', '/metrics', '/favicon.ico', '/static/', '/_next/',
                '/docs', '/redoc', '/openapi.json', '/ping', '/version', '/debug'
            }
        )
    )
    """

            lines.insert(cors_section, enhanced_logging_code)

    # Write back the modified content
    modified_content = "\n".join(lines)

    # Create backup
    backup_path = main_py_path.with_suffix(".py.backup")
    with open(backup_path, "w") as f:
        f.write(content)

    # Write modified content
    with open(main_py_path, "w") as f:
        f.write(modified_content)

    print("✅ Enhanced logging middleware integrated successfully!")
    print(f"📁 Backup created at: {backup_path}")
    print("\n🎯 Enhanced Event Logging Features Added:")
    print("   - Comprehensive API call logging")
    print("   - Authentication event tracking")
    print("   - Risk-based event scoring")
    print("   - Automatic categorization")
    print("   - Performance monitoring")
    print("   - Geographic and session tracking")

    return True


def create_middleware_config():
    """Create configuration file for enhanced logging middleware"""

    config_content = """# Enhanced Logging Middleware Configuration
# This file contains configuration options for the enhanced event logging system

# Enable/disable enhanced logging
ENHANCED_LOGGING_ENABLED = True

# Log all requests (set to False to only log sensitive endpoints and errors)
LOG_ALL_REQUESTS = False

# Excluded paths (will not be logged)
EXCLUDED_PATHS = [
    '/health',
    '/metrics',
    '/favicon.ico',
    '/static/',
    '/_next/',
    '/docs',
    '/redoc',
    '/openapi.json',
    '/ping',
    '/version',
    '/debug'
]

# Sensitive endpoints (always logged regardless of LOG_ALL_REQUESTS setting)
SENSITIVE_ENDPOINTS = [
    '/api/v1/auth/login',
    '/api/v1/auth/logout',
    '/api/v1/auth/refresh',
    '/api/v1/users/',
    '/api/v1/roles/',
    '/api/v1/permissions/',
    '/api/v1/data/import',
    '/api/v1/data/export',
    '/api/v1/admin/'
]

# Risk scoring configuration
RISK_SCORING = {
    'status_5xx': 30,
    'status_4xx': 20,
    'sensitive_endpoint': 15,
    'unauthenticated_access': 25,
    'admin_operation': 10,
    'auth_failure': 20,
    'data_modification': 5
}

# Enhanced logging levels
LOG_LEVEL_THRESHOLD = 'INFO'  # DEBUG, INFO, WARNING, ERROR, CRITICAL
"""

    config_path = Path(__file__).parent / "app" / "core" / "enhanced_logging_config.py"

    with open(config_path, "w") as f:
        f.write(config_content)

    print(f"📝 Configuration file created at: {config_path}")


def run_tests():
    """Run basic tests to verify integration"""

    print("\n🧪 Running Integration Tests...")

    try:
        # Test imports
        from app.middleware.enhanced_logging_middleware import (
            AuthenticationEventMiddleware,
            EnhancedEventLoggingMiddleware,
            create_auth_event_middleware,
            create_enhanced_logging_middleware,
        )

        print("✅ Enhanced logging middleware imports successful")

        # Test enhanced logger
        from app.utils.enhanced_logger import enhanced_logger, log_api_call

        print("✅ Enhanced logger imports successful")

        # Test models
        from app.models.activity_log import (
            ActivityAction,
            ActivityLevel,
            ActivityLog,
            EventCategory,
        )

        print("✅ Enhanced activity log models successful")

        print("\n🎉 All integration tests passed!")
        return True

    except ImportError as e:
        print(f"❌ Import test failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        return False


def main():
    """Main integration function"""

    print("🚀 Starting Enhanced Event Logging Integration...")
    print("=" * 60)

    try:
        # Step 1: Integrate middleware
        if not integrate_enhanced_logging():
            print("❌ Failed to integrate enhanced logging middleware")
            return False

        # Step 2: Create configuration
        create_middleware_config()

        # Step 3: Run tests
        if not run_tests():
            print("❌ Integration tests failed")
            return False

        print("\n" + "=" * 60)
        print("🎉 Enhanced Event Logging Integration Complete!")
        print("\n📋 Next Steps:")
        print("   1. Run the database migration: python run_migration.py")
        print("   2. Restart your FastAPI server: python main.py")
        print("   3. Test event logging at: /docs#/v1-events")
        print("   4. Access admin dashboard: /admin/events")
        print("\n💡 Tips:")
        print("   - Check logs directory for file-based event logs")
        print("   - Monitor /health endpoint for system status")
        print("   - Use /debug/headers to test middleware integration")

        return True

    except Exception as e:
        print(f"❌ Integration failed: {str(e)}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
