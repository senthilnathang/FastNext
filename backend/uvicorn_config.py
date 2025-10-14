"""
Uvicorn configuration for FastNext Framework with performance optimizations
"""

import multiprocessing
import os

from app.core.config import settings


# Calculate optimal worker count
def get_workers():
    """Calculate optimal number of workers based on CPU cores"""
    # Use environment variable if set, otherwise calculate based on CPU cores
    workers = settings.WORKERS
    if workers <= 0:
        # Use 2 * CPU cores + 1 (recommended for I/O bound applications)
        workers = (multiprocessing.cpu_count() * 2) + 1
        # Cap at 8 workers to avoid memory issues
        workers = min(workers, 8)
    return workers


# Uvicorn configuration
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
workers = get_workers()
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = settings.MAX_CONCURRENT_CONNECTIONS
max_requests = 1000  # Restart workers after handling this many requests
max_requests_jitter = 100  # Add randomness to prevent all workers restarting at once
preload_app = True  # Preload application for faster startup
keepalive = 5  # Keep connections alive for 5 seconds
timeout = 120  # Worker timeout
graceful_timeout = 30  # Graceful shutdown timeout

# Logging configuration
loglevel = os.getenv("LOG_LEVEL", "info").lower()
accesslog = "-"  # Log to stdout
errorlog = "-"  # Log to stderr
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Performance settings
backlog = 2048  # Maximum number of pending connections
worker_tmp_dir = "/dev/shm"  # Use shared memory for temporary files (Linux only)

# SSL/TLS settings (if certificates are available)
keyfile = os.getenv("SSL_KEYFILE")
certfile = os.getenv("SSL_CERTFILE")

# Security settings
limit_request_line = 8192  # Maximum size of HTTP request line
limit_request_fields = 100  # Maximum number of header fields
limit_request_field_size = 8190  # Maximum size of header field

# Development vs Production settings
if os.getenv("ENVIRONMENT", "development").lower() == "production":
    # Production optimizations
    workers = max(workers, 2)  # Minimum 2 workers in production
    worker_connections = min(worker_connections, 1000)  # Reasonable limit
    timeout = 60  # Shorter timeout in production
    max_requests = 2000  # More requests per worker in production
else:
    # Development settings
    workers = 1  # Single worker for easier debugging
    reload = True  # Auto-reload on code changes
    reload_dirs = ["app"]  # Watch these directories for changes


def post_fork(server, worker):
    """Post-fork hook for worker initialization"""
    server.log.info(f"Worker spawned (pid: {worker.pid})")


def worker_int(worker):
    """Worker interrupt handler"""
    worker.log.info(f"Worker received INT or QUIT signal (pid: {worker.pid})")


def on_starting(server):
    """Called just before the master process is initialized"""
    server.log.info(f"Starting FastNext Framework with {workers} workers")
    server.log.info(f"Uvicorn configuration:")
    server.log.info(f"  - Workers: {workers}")
    server.log.info(f"  - Worker connections: {worker_connections}")
    server.log.info(f"  - Max requests per worker: {max_requests}")
    server.log.info(f"  - Timeout: {timeout}s")
    server.log.info(f"  - Bind: {bind}")


def on_reload(server):
    """Called when configuration is reloaded"""
    server.log.info("Configuration reloaded")


# Export configuration for gunicorn
def get_config():
    """Get configuration dict for programmatic use"""
    return {
        "bind": bind,
        "workers": workers,
        "worker_class": worker_class,
        "worker_connections": worker_connections,
        "max_requests": max_requests,
        "max_requests_jitter": max_requests_jitter,
        "preload_app": preload_app,
        "keepalive": keepalive,
        "timeout": timeout,
        "graceful_timeout": graceful_timeout,
        "loglevel": loglevel,
        "accesslog": accesslog,
        "errorlog": errorlog,
        "access_log_format": access_log_format,
        "backlog": backlog,
        "worker_tmp_dir": worker_tmp_dir,
        "keyfile": keyfile,
        "certfile": certfile,
        "limit_request_line": limit_request_line,
        "limit_request_fields": limit_request_fields,
        "limit_request_field_size": limit_request_field_size,
        "post_fork": post_fork,
        "worker_int": worker_int,
        "on_starting": on_starting,
        "on_reload": on_reload,
    }
