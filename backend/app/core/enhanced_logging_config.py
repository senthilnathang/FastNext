# Enhanced Logging Middleware Configuration
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
