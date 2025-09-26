# FastAPI Multi-stage Dockerfile for FastNext Framework
# Optimized for production with security and performance in mind

# Build stage
FROM python:3.11-slim as builder

# Set environment variables for build
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    g++ \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements first for better caching
COPY requirements/ requirements/

# Install Python dependencies
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements/prod.txt

# Additional packages are already included in requirements/prod.txt

# Production stage
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PATH="/opt/venv/bin:$PATH" \
    ENVIRONMENT=production \
    PORT=8000

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -r fastnext && \
    useradd -r -g fastnext -d /app -s /bin/bash -c "FastNext user" fastnext

# Create application directory
WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY --chown=fastnext:fastnext . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/exports /app/static && \
    chown -R fastnext:fastnext /app

# Copy startup scripts
COPY --chown=fastnext:fastnext start_server.py /app/
COPY --chown=fastnext:fastnext uvicorn_config.py /app/
RUN chmod +x /app/start_server.py

# Create health check script
RUN echo '#!/bin/bash\ncurl -f http://localhost:$PORT/health || exit 1' > /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh && \
    chown fastnext:fastnext /usr/local/bin/healthcheck.sh

# Switch to non-root user
USER fastnext

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Expose port
EXPOSE 8000

# Labels for metadata
LABEL maintainer="FastNext Framework" \
      description="FastAPI backend for FastNext Framework" \
      version="1.0" \
      license="MIT"

# Default command
CMD ["python", "start_server.py"]

# Development stage (for development with hot reload)
FROM production as development

# Switch back to root to install dev dependencies
USER root

# Install development tools
RUN apt-get update && apt-get install -y \
    vim \
    less \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install development Python packages
RUN pip install -r requirements/dev.txt

# Set development environment
ENV ENVIRONMENT=development \
    DEBUG=true \
    WORKERS=1 \
    RELOAD=true

# Switch back to application user
USER fastnext

# Development command with hot reload
CMD ["uvicorn", "main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "app"]

# Testing stage
FROM builder as testing

# Install test dependencies
RUN pip install \
    pytest \
    pytest-asyncio \
    pytest-cov \
    pytest-mock \
    httpx \
    factory-boy \
    freezegun

# Copy test files
COPY tests/ tests/
COPY pytest.ini .
COPY test_runner.py .

# Set testing environment
ENV ENVIRONMENT=testing \
    DATABASE_URL=sqlite:///./test.db

# Run tests
RUN python -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term

# Test command
CMD ["python", "test_runner.py"]