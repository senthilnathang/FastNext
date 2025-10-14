#!/usr/bin/env python3
"""
Production server startup script for FastNext Framework
"""

import multiprocessing
import os
import sys
from pathlib import Path

import uvicorn

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from main import create_app
from uvicorn_config import get_config


def main():
    """Main server startup function"""

    # Get environment
    environment = os.getenv("ENVIRONMENT", "development").lower()
    debug = environment == "development"

    # Get port
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    print(f"🚀 Starting FastNext Framework")
    print(f"   Environment: {environment}")
    print(f"   Debug mode: {debug}")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Redis enabled: {settings.CACHE_ENABLED}")

    if environment == "production":
        print("🔧 Using production configuration with Gunicorn")

        # Use gunicorn for production
        try:
            import gunicorn.app.wsgiapp as wsgiapp

            # Get uvicorn config
            config = get_config()

            # Override with environment variables
            config.update(
                {
                    "bind": f"{host}:{port}",
                    "module": "main:create_app()",
                    "worker_class": "uvicorn.workers.UvicornWorker",
                }
            )

            # Set gunicorn sys.argv for configuration
            sys.argv = [
                "gunicorn",
                "--bind",
                f"{host}:{port}",
                "--workers",
                str(config["workers"]),
                "--worker-class",
                config["worker_class"],
                "--worker-connections",
                str(config["worker_connections"]),
                "--max-requests",
                str(config["max_requests"]),
                "--max-requests-jitter",
                str(config["max_requests_jitter"]),
                "--timeout",
                str(config["timeout"]),
                "--keepalive",
                str(config["keepalive"]),
                "--preload",
                "--access-logfile",
                "-",
                "--error-logfile",
                "-",
                "--log-level",
                config["loglevel"],
                "main:create_app()",
            ]

            # Add SSL configuration if available
            if config.get("keyfile") and config.get("certfile"):
                sys.argv.extend(["--keyfile", config["keyfile"]])
                sys.argv.extend(["--certfile", config["certfile"]])

            # Start gunicorn
            wsgiapp.run()

        except ImportError:
            print("⚠️  Gunicorn not available, falling back to Uvicorn")
            use_uvicorn(host, port, debug)
    else:
        print("🔧 Using development configuration with Uvicorn")
        use_uvicorn(host, port, debug)


def use_uvicorn(host: str, port: int, debug: bool):
    """Start server using Uvicorn directly"""

    # Calculate workers for development/production
    if debug:
        workers = 1
        reload = True
    else:
        workers = min((multiprocessing.cpu_count() * 2) + 1, 8)
        reload = False

    # Create app
    app = create_app()

    # Uvicorn configuration
    uvicorn_config = {
        "app": app,
        "host": host,
        "port": port,
        "workers": workers,
        "reload": reload,
        "reload_dirs": ["app"] if reload else None,
        "log_level": "debug" if debug else "info",
        "access_log": True,
        "loop": "uvloop",  # Use uvloop for better performance
        "http": "httptools",  # Use httptools for better HTTP parsing
        "lifespan": "on",
        "server_header": False,  # Disable server header for security
        "date_header": False,  # Disable date header for security
    }

    # Add SSL configuration if available
    ssl_keyfile = os.getenv("SSL_KEYFILE")
    ssl_certfile = os.getenv("SSL_CERTFILE")
    if ssl_keyfile and ssl_certfile:
        uvicorn_config.update(
            {
                "ssl_keyfile": ssl_keyfile,
                "ssl_certfile": ssl_certfile,
            }
        )
        print(f"🔒 SSL enabled (cert: {ssl_certfile})")

    print(f"🌟 Starting Uvicorn with {workers} worker(s)")

    # Start server
    uvicorn.run(**uvicorn_config)


if __name__ == "__main__":
    # Set multiprocessing start method for compatibility
    if hasattr(multiprocessing, "set_start_method"):
        try:
            multiprocessing.set_start_method("spawn", force=True)
        except RuntimeError:
            pass  # Already set

    main()
