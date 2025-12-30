# Backend Deployment Guide

Guide for deploying the FastVue backend to production environments.

## Deployment Options

1. **Docker (Recommended)** - Containerized deployment
2. **Traditional** - Direct server deployment
3. **Cloud Platforms** - AWS, GCP, Azure managed services

## Pre-Deployment Checklist

- [ ] Generate new `SECRET_KEY` and `JWT_SECRET_KEY` (**CRITICAL** - app will fail to start with default key)
- [ ] Configure production database credentials
- [ ] Tune database connection pool settings for expected load
- [ ] Set `DEBUG=false` and `ENVIRONMENT=production`
- [ ] Configure CORS for production domains
- [ ] Setup SSL/TLS certificates
- [ ] Configure Redis for caching
- [ ] Configure logging and monitoring
- [ ] Run database migrations
- [ ] Test all critical endpoints

> **Security Note:** In production, the application enforces that `SECRET_KEY` is not set to the default value. If you attempt to start with the default key in production mode, the application will fail with a configuration error. Generate a secure key using: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

## Docker Deployment

### Build Production Image

```dockerfile
# docker/backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start with Gunicorn
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend/Dockerfile
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SECRET_KEY=${SECRET_KEY}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - ENVIRONMENT=production
      - DEBUG=false
      # Database Connection Pool
      - DB_POOL_SIZE=${DB_POOL_SIZE:-20}
      - DB_MAX_OVERFLOW=${DB_MAX_OVERFLOW:-40}
      - DB_POOL_TIMEOUT=${DB_POOL_TIMEOUT:-30}
      - DB_POOL_RECYCLE=${DB_POOL_RECYCLE:-3600}
      # Caching
      - CACHE_ENABLED=true
      - CACHE_DEFAULT_TTL=300
    depends_on:
      - db
      - redis
    networks:
      - fastvue-network
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - fastvue-network

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - fastvue-network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
    networks:
      - fastvue-network

volumes:
  postgres_data:
  redis_data:

networks:
  fastvue-network:
    driver: bridge
```

### Deploy with Docker

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# View logs
docker compose -f docker-compose.prod.yml logs -f backend
```

## Nginx Configuration

```nginx
# docker/nginx/nginx.conf
upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Proxy settings
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }
}
```

## Environment Configuration

### Production Environment Variables

```env
# .env.production

# Application
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Security (CHANGE THESE! - App will fail to start with default values in production)
SECRET_KEY=generate-with-openssl-rand-base64-32
JWT_SECRET_KEY=generate-different-key-here

# Database
DATABASE_URL=postgresql://user:password@db-host:5432/fastvue
POSTGRES_USER=fastvue
POSTGRES_PASSWORD=strong-password-here
POSTGRES_DB=fastvue

# Database Connection Pool (tune for your expected load)
DB_POOL_SIZE=20              # Number of connections to keep open
DB_MAX_OVERFLOW=40           # Max additional connections during peak
DB_POOL_TIMEOUT=30           # Seconds to wait for available connection
DB_POOL_RECYCLE=3600         # Recycle connections after this many seconds

# Redis
REDIS_URL=redis://redis-host:6379/0

# Caching
CACHE_ENABLED=true           # Enable Redis caching
CACHE_DEFAULT_TTL=300        # Default cache TTL in seconds

# CORS (production domains)
BACKEND_CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# OAuth (if using)
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/v1/auth/oauth/google/callback

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
```

### Connection Pool Tuning Guide

| Load Level | DB_POOL_SIZE | DB_MAX_OVERFLOW | Notes |
|------------|--------------|-----------------|-------|
| Light (<100 req/s) | 5 | 10 | Default development settings |
| Medium (100-500 req/s) | 20 | 40 | Recommended production baseline |
| Heavy (500-1000 req/s) | 50 | 100 | Ensure PostgreSQL max_connections supports this |
| Very Heavy (>1000 req/s) | 100+ | 200+ | Consider connection pooler (PgBouncer) |

**Formula:** `max_connections >= (DB_POOL_SIZE + DB_MAX_OVERFLOW) * num_app_instances + 10`

## Cloud Deployments

### AWS (Elastic Beanstalk)

```yaml
# .ebextensions/01_packages.config
packages:
  yum:
    postgresql-devel: []

# .ebextensions/02_python.config
option_settings:
  aws:elasticbeanstalk:container:python:
    WSGIPath: main:app
  aws:elasticbeanstalk:application:environment:
    ENVIRONMENT: production
    DEBUG: "false"
```

### AWS (ECS/Fargate)

```json
// task-definition.json
{
  "family": "fastvue-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-ecr-repo/fastvue-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "ENVIRONMENT", "value": "production"},
        {"name": "DEBUG", "value": "false"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "SECRET_KEY", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fastvue-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Run

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/fastvue-backend', './backend']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/fastvue-backend']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'fastvue-backend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/fastvue-backend'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
```

## Database Management

### Running Migrations

```bash
# Production migration
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Rollback one version
docker compose -f docker-compose.prod.yml exec backend alembic downgrade -1

# Show current version
docker compose -f docker-compose.prod.yml exec backend alembic current
```

### Database Backup

```bash
# Backup
docker compose exec db pg_dump -U fastvue fastvue > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T db psql -U fastvue fastvue < backup_20240101.sql
```

## Monitoring & Logging

### Structured Logging

```python
# app/core/logging.py
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)
```

### Health Check Endpoint

```python
# Already included in main.py
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }
```

### Prometheus Metrics (Optional)

```python
from prometheus_fastapi_instrumentator import Instrumentator

# In main.py
Instrumentator().instrument(app).expose(app)
```

## Security Hardening

### Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/v1/auth/login")
@limiter.limit("5/minute")
def login():
    pass
```

### Security Headers

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
)

if settings.ENVIRONMENT == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

## Zero-Downtime Deployment

### Blue-Green Deployment

```bash
# Deploy new version to green
docker compose -f docker-compose.green.yml up -d

# Run migrations
docker compose -f docker-compose.green.yml exec backend alembic upgrade head

# Health check
curl https://green.yourdomain.com/health

# Switch traffic (update nginx/load balancer)
# ...

# Stop blue
docker compose -f docker-compose.blue.yml down
```

### Rolling Deployment (Docker Swarm)

```bash
# Update service with rolling update
docker service update \
  --image your-registry/fastvue-backend:new-version \
  --update-parallelism 1 \
  --update-delay 10s \
  fastvue-backend
```

## Troubleshooting

### Common Issues

1. **Connection refused to database**
   - Check DATABASE_URL
   - Verify network connectivity
   - Check PostgreSQL logs

2. **502 Bad Gateway**
   - Check if backend is running
   - Verify nginx upstream config
   - Check backend logs

3. **Slow response times**
   - Check database query performance
   - Enable query logging
   - Consider adding indexes
   - Verify Redis caching is working

4. **Permission checks slow**
   - Verify Redis is accessible
   - Check cache hit ratio
   - Permission cache TTL is 1 hour by default

5. **Stale permissions after role change**
   - Permission cache needs invalidation
   - Use admin endpoint to invalidate cache
   - Or wait for cache TTL expiry (1 hour)

### Debug Commands

```bash
# View logs
docker compose logs -f backend

# Execute shell
docker compose exec backend /bin/bash

# Check database connection
docker compose exec backend python -c "from app.db.session import engine; print(engine.url)"

# Test Redis connection
docker compose exec redis redis-cli ping

# Check Redis cache keys
docker compose exec redis redis-cli keys "user:*:permissions"

# Check permission cache for specific user
docker compose exec redis redis-cli get "user:1:company:1:permissions"

# Clear all permission caches
docker compose exec redis redis-cli keys "user:*:permissions" | xargs -r docker compose exec -T redis redis-cli del

# Check database pool status
docker compose exec backend python -c "from app.db.session import engine; print(engine.pool.status())"

# Run system check
docker compose exec backend python manage.py check
```
