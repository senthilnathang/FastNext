# FastNext Backend Deployment Guide

## Deployment Overview

This guide covers deploying the FastNext backend to various environments including development, staging, and production. The backend is designed to be cloud-native and supports multiple deployment strategies.

## Deployment Strategies

### 1. **Docker Containerization** 🐳
The recommended approach for consistent deployments across environments.

### 2. **Kubernetes** ☸️
For scalable, orchestrated deployments with high availability.

### 3. **Traditional VPS/VM** 🖥️
Direct deployment on virtual machines or bare metal servers.

### 4. **Cloud Platforms** ☁️
Platform-as-a-Service deployments on AWS, Google Cloud, Azure.

## Docker Deployment

### 1. **Dockerfile Configuration**

```dockerfile
# Multi-stage build for optimized production image
FROM python:3.11-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements/prod.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home --shell /bin/bash fastnext
USER fastnext

# Set working directory
WORKDIR /app

# Copy Python packages from builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=fastnext:fastnext . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Start application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. **Docker Compose (Development)**

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://fastnext:password@db:5432/fastnext
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=dev-secret-key
      - DEBUG=true
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
    networks:
      - fastnext-network

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: fastnext
      POSTGRES_USER: fastnext
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    networks:
      - fastnext-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - fastnext-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./deploy/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - fastnext-network

volumes:
  postgres_data:
  redis_data:

networks:
  fastnext-network:
    driver: bridge
```

### 3. **Production Docker Compose**

```yaml
version: '3.8'

services:
  app:
    image: fastnext/backend:latest
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=false
      - ENVIRONMENT=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - fastnext-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx/prod.conf:/etc/nginx/nginx.conf
      - ./deploy/nginx/ssl:/etc/nginx/ssl
      - ./logs:/var/log/nginx
    depends_on:
      - app
    networks:
      - fastnext-network

networks:
  fastnext-network:
    external: true
```

## Kubernetes Deployment

### 1. **Namespace Configuration**

```yaml
# deploy/k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: fastnext
  labels:
    name: fastnext
    environment: production
```

### 2. **ConfigMap**

```yaml
# deploy/k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fastnext-config
  namespace: fastnext
data:
  ENVIRONMENT: "production"
  DEBUG: "false"
  LOG_LEVEL: "INFO"
  REDIS_URL: "redis://redis-service:6379/0"
  DATABASE_HOST: "postgresql-service"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "fastnext"
```

### 3. **Secrets**

```yaml
# deploy/k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: fastnext-secrets
  namespace: fastnext
type: Opaque
data:
  SECRET_KEY: <base64-encoded-secret>
  DATABASE_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-jwt-secret>
```

### 4. **Deployment**

```yaml
# deploy/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastnext-backend
  namespace: fastnext
  labels:
    app: fastnext-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastnext-backend
  template:
    metadata:
      labels:
        app: fastnext-backend
    spec:
      containers:
      - name: fastnext-backend
        image: fastnext/backend:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: fastnext-config
        - secretRef:
            name: fastnext-secrets
        env:
        - name: DATABASE_URL
          value: "postgresql://$(DATABASE_USER):$(DATABASE_PASSWORD)@$(DATABASE_HOST):$(DATABASE_PORT)/$(DATABASE_NAME)"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
      imagePullSecrets:
      - name: registry-secret
```

### 5. **Service**

```yaml
# deploy/k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: fastnext-backend-service
  namespace: fastnext
spec:
  selector:
    app: fastnext-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: ClusterIP
```

### 6. **Ingress**

```yaml
# deploy/k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fastnext-ingress
  namespace: fastnext
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: fastnext-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: fastnext-backend-service
            port:
              number: 80
```

### 7. **Horizontal Pod Autoscaler**

```yaml
# deploy/k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: fastnext-hpa
  namespace: fastnext
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fastnext-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Cloud Platform Deployments

### 1. **Heroku Deployment** (Recommended for Rapid Deployment)

#### Backend Deployment to Heroku

Heroku offers a simple and fast way to deploy the FastNext backend with minimal configuration.

##### Prerequisites
- Heroku CLI installed
- Git repository
- Heroku account

##### Deployment Steps

```bash
# Login to Heroku
heroku login

# Create a new Heroku app
heroku create your-fastnext-backend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:essential-0

# Add Redis addon
heroku addons:create heroku-redis:essential-0

# Set environment variables
heroku config:set SECRET_KEY="your-production-secret-key"
heroku config:set ENVIRONMENT="production"
heroku config:set DEBUG="false"

# Deploy the application
git push heroku main

# Run database migrations
heroku run alembic upgrade head

# Check application logs
heroku logs --tail
```

##### Procfile Configuration
```
# Procfile
web: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4
release: alembic upgrade head
```

##### app.json for Review Apps
```json
{
  "name": "FastNext Backend",
  "description": "A comprehensive full-stack web application framework",
  "image": "heroku/python",
  "repository": "https://github.com/your-username/FastNext",
  "keywords": ["python", "fastapi", "postgresql"],
  "addons": [
    "heroku-postgresql:essential-0",
    "heroku-redis:essential-0"
  ],
  "env": {
    "SECRET_KEY": {
      "description": "Secret key for the application",
      "generator": "secret"
    },
    "ENVIRONMENT": {
      "value": "staging"
    },
    "DEBUG": {
      "value": "false"
    }
  },
  "formation": {
    "web": {
      "quantity": 1,
      "size": "basic"
    }
  },
  "buildpacks": [
    {
      "url": "heroku/python"
    }
  ]
}
```

#### Frontend Deployment to Vercel

Vercel is the recommended platform for deploying the Next.js frontend with optimal performance.

##### Deployment Steps

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
cd frontend
vercel

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://your-backend.herokuapp.com
# NEXT_PUBLIC_ENVIRONMENT=production
```

##### vercel.json Configuration
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "NEXT_PUBLIC_API_URL": "@next_public_api_url",
    "NEXT_PUBLIC_ENVIRONMENT": "@next_public_environment"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_API_URL": "@next_public_api_url",
      "NEXT_PUBLIC_ENVIRONMENT": "@next_public_environment"
    }
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1", "sfo1"],
  "github": {
    "silent": true
  }
}
```

### 2. **DigitalOcean Deployment**

#### DigitalOcean App Platform

```yaml
# .do/app.yaml
name: fastnext-backend
services:
- name: api
  source_dir: /
  github:
    repo: your-username/FastNext
    branch: main
    deploy_on_push: true
  run_command: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4
  environment_slug: python
  instance_count: 2
  instance_size_slug: basic-xxs
  health_check:
    http_path: /api/v1/health
  envs:
  - key: SECRET_KEY
    scope: RUN_TIME
    value: ${SECRET_KEY}
  - key: ENVIRONMENT
    scope: RUN_TIME
    value: production
  - key: DATABASE_URL
    scope: RUN_TIME
    value: ${db.DATABASE_URL}
  - key: REDIS_URL
    scope: RUN_TIME
    value: ${redis.REDIS_URL}

databases:
- name: db
  engine: PG
  version: "15"
  size: basic-xs

- name: redis
  engine: REDIS
  version: "7"
  size: basic-xs

workers:
- name: migration
  source_dir: /
  run_command: alembic upgrade head
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: DATABASE_URL
    scope: RUN_TIME
    value: ${db.DATABASE_URL}
```

#### DigitalOcean Droplet Deployment

```bash
#!/bin/bash
# scripts/deploy-digitalocean.sh

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Setup SSL certificates
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com --non-interactive --agree-tos --email admin@yourdomain.com

# Clone repository
git clone https://github.com/your-username/FastNext.git /app
cd /app

# Setup environment variables
cp .env.example .env
nano .env  # Edit configuration

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Setup automatic backups
echo "0 2 * * * /app/scripts/backup-database.sh" | crontab -
```

### 3. **Railway Deployment**

Railway provides a modern platform with automatic deployments and built-in databases.

#### railway.json Configuration
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4",
    "healthcheckPath": "/api/v1/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Deployment Steps
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add PostgreSQL service
railway add postgresql

# Add Redis service
railway add redis

# Set environment variables
railway variables set SECRET_KEY="your-secret-key"
railway variables set ENVIRONMENT="production"

# Deploy
railway up
```

### 4. **Render Deployment**

Render offers free tiers and simple deployment for both frontend and backend.

#### render.yaml Configuration
```yaml
# render.yaml
services:
  - type: web
    name: fastnext-backend
    env: python
    plan: starter
    buildCommand: pip install -r requirements/prod.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4
    healthCheckPath: /api/v1/health
    envVars:
      - key: SECRET_KEY
        sync: false
      - key: ENVIRONMENT
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: fastnext-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: fastnext-redis
          property: connectionString

  - type: static
    name: fastnext-frontend
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/out
    routes:
      - type: rewrite
        source: /api/*
        destination: https://fastnext-backend.onrender.com/api/*
    envVars:
      - key: NEXT_PUBLIC_API_URL
        value: https://fastnext-backend.onrender.com

databases:
  - name: fastnext-db
    databaseName: fastnext
    user: fastnext

  - type: redis
    name: fastnext-redis
    plan: starter
```

### 5. **AWS Deployment**

#### ECS Fargate Task Definition
```json
{
  "family": "fastnext-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "fastnext-backend",
      "image": "fastnext/backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:fastnext/database-url"
        },
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:fastnext/secret-key"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/api/v1/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fastnext-backend",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### ECS Service Configuration
```json
{
  "serviceName": "fastnext-backend-service",
  "cluster": "fastnext-cluster",
  "taskDefinition": "fastnext-backend:1",
  "desiredCount": 3,
  "launchType": "FARGATE",
  "platformVersion": "LATEST",
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["subnet-12345", "subnet-67890"],
      "securityGroups": ["sg-12345"],
      "assignPublicIp": "ENABLED"
    }
  },
  "loadBalancers": [
    {
      "targetGroupArn": "arn:aws:elasticloadbalancing:region:account:targetgroup/fastnext-tg",
      "containerName": "fastnext-backend",
      "containerPort": 8000
    }
  ],
  "healthCheckGracePeriodSeconds": 300
}
```

### 2. **Google Cloud Run**

#### cloud-run.yaml
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: fastnext-backend
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/execution-environment: gen2
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/execution-environment: gen2
        run.googleapis.com/memory: "1Gi"
        run.googleapis.com/cpu: "1000m"
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      containers:
      - image: gcr.io/project-id/fastnext-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: ENVIRONMENT
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-url
              key: url
        resources:
          limits:
            cpu: "1000m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 30
```

### 3. **Azure Container Instances**

#### azure-deployment.json
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-12-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "containerGroupName": {
      "type": "string",
      "defaultValue": "fastnext-backend"
    }
  },
  "resources": [
    {
      "type": "Microsoft.ContainerInstance/containerGroups",
      "apiVersion": "2021-03-01",
      "name": "[parameters('containerGroupName')]",
      "location": "[resourceGroup().location]",
      "properties": {
        "containers": [
          {
            "name": "fastnext-backend",
            "properties": {
              "image": "fastnext/backend:latest",
              "ports": [
                {
                  "port": 8000,
                  "protocol": "TCP"
                }
              ],
              "environmentVariables": [
                {
                  "name": "ENVIRONMENT",
                  "value": "production"
                }
              ],
              "resources": {
                "requests": {
                  "cpu": 1,
                  "memoryInGB": 1
                }
              }
            }
          }
        ],
        "osType": "Linux",
        "ipAddress": {
          "type": "Public",
          "ports": [
            {
              "protocol": "TCP",
              "port": 8000
            }
          ]
        },
        "restartPolicy": "Always"
      }
    }
  ]
}
```

## Database Deployment

### 1. **PostgreSQL Setup**

#### Docker PostgreSQL
```yaml
# database/docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: fastnext
      POSTGRES_USER: fastnext
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
      - ./backups:/backups
    command: >
      postgres
        -c shared_preload_libraries=pg_stat_statements
        -c pg_stat_statements.track=all
        -c log_statement=all
        -c log_min_duration_statement=1000
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fastnext"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

#### Managed Database Services
- **AWS RDS**: PostgreSQL with automated backups and scaling
- **Google Cloud SQL**: Managed PostgreSQL with high availability
- **Azure Database**: PostgreSQL with built-in security features

### 2. **Database Migration Strategy**

#### Production Migration Script
```bash
#!/bin/bash
# scripts/migrate-prod.sh

set -e

echo "Starting production migration..."

# Backup database
pg_dump $DATABASE_URL > "backups/backup_$(date +%Y%m%d_%H%M%S).sql"

# Run migrations
alembic upgrade head

# Verify migration
python -c "
import asyncio
from app.db.session import get_db
async def verify():
    async for db in get_db():
        result = await db.execute('SELECT version_num FROM alembic_version')
        version = result.scalar()
        print(f'Current migration version: {version}')
        break
asyncio.run(verify())
"

echo "Migration completed successfully"
```

#### Zero-Downtime Migration
```python
# For zero-downtime deployments
# 1. Add new columns with default values
# 2. Deploy application that writes to both old and new columns
# 3. Migrate data from old to new columns
# 4. Deploy application that only uses new columns
# 5. Remove old columns
```

## Environment Configuration

### 1. **Environment Variables**

#### Production Environment
```bash
# Core Configuration
export ENVIRONMENT=production
export DEBUG=false
export SECRET_KEY="your-super-secret-production-key"
export API_V1_STR="/api/v1"

# Database
export DATABASE_URL="postgresql://user:pass@host:5432/fastnext"
export DATABASE_POOL_SIZE=20
export DATABASE_MAX_OVERFLOW=30

# Redis
export REDIS_URL="redis://redis-host:6379/0"
export CACHE_TTL=300

# Security
export ACCESS_TOKEN_EXPIRE_MINUTES=60
export CORS_ORIGINS='["https://yourdomain.com", "https://www.yourdomain.com"]'
export ALLOWED_HOSTS='["yourdomain.com", "www.yourdomain.com"]'

# Monitoring
export SENTRY_DSN="https://your-sentry-dsn"
export ENABLE_METRICS=true
export LOG_LEVEL=INFO

# Email
export SMTP_SERVER="smtp.mailgun.org"
export SMTP_PORT=587
export SMTP_USERNAME="your-smtp-username"
export SMTP_PASSWORD="your-smtp-password"
export EMAILS_FROM="noreply@yourdomain.com"

# External Services
export OPENAI_API_KEY="your-openai-key"
export STRIPE_SECRET_KEY="sk_live_..."
```

### 2. **Configuration Management**

#### Using Docker Secrets
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    image: fastnext/backend:latest
    secrets:
      - database_password
      - secret_key
      - jwt_secret
    environment:
      - DATABASE_PASSWORD_FILE=/run/secrets/database_password
      - SECRET_KEY_FILE=/run/secrets/secret_key

secrets:
  database_password:
    external: true
  secret_key:
    external: true
  jwt_secret:
    external: true
```

#### Using Kubernetes Secrets
```bash
# Create secrets
kubectl create secret generic fastnext-secrets \
  --from-literal=database-password='your-db-password' \
  --from-literal=secret-key='your-secret-key' \
  --from-literal=jwt-secret='your-jwt-secret'
```

## Monitoring & Logging

### 1. **Application Monitoring**

#### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'fastnext-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 5s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "FastNext Backend",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"4..|5..\"}[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      }
    ]
  }
}
```

### 2. **Centralized Logging**

#### ELK Stack Configuration
```yaml
# logging/docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  es_data:
```

#### Structured Logging Configuration
```python
# app/core/logging.py
import structlog
from pythonjsonlogger import jsonlogger

def setup_logging():
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
```

## SSL/TLS Configuration

### 1. **Nginx SSL Configuration**

```nginx
# deploy/nginx/prod.conf
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://app:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
```

### 2. **Let's Encrypt with Certbot**

```bash
# scripts/setup-ssl.sh
#!/bin/bash

# Install certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d api.yourdomain.com --non-interactive --agree-tos --email admin@yourdomain.com

# Setup automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## CI/CD Pipeline

### 1. **GitHub Actions**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        pip install -r requirements/test.txt

    - name: Run tests
      run: |
        pytest --cov=app --cov-report=xml
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build and push Docker image
      uses: docker/build-push-action@v3
      with:
        context: .
        push: true
        tags: ghcr.io/${{ github.repository }}/backend:latest
        cache-from: type=gha
        cache-to: type=gha,mode=max

    - name: Deploy to Kubernetes
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          deploy/k8s/deployment.yaml
          deploy/k8s/service.yaml
          deploy/k8s/ingress.yaml
        images: |
          ghcr.io/${{ github.repository }}/backend:latest
```

### 2. **GitLab CI/CD**

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE/backend
  DOCKER_TAG: $CI_COMMIT_SHA

test:
  stage: test
  image: python:3.11
  services:
    - postgres:15
  variables:
    POSTGRES_DB: test_db
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/test_db
  before_script:
    - pip install -r requirements/test.txt
  script:
    - pytest --cov=app --cov-report=term --cov-report=xml
  coverage: '/TOTAL.*\s+(\d+%)$/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $DOCKER_IMAGE:$DOCKER_TAG -t $DOCKER_IMAGE:latest .
    - docker push $DOCKER_IMAGE:$DOCKER_TAG
    - docker push $DOCKER_IMAGE:latest
  only:
    - main

deploy_production:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl set image deployment/fastnext-backend fastnext-backend=$DOCKER_IMAGE:$DOCKER_TAG
    - kubectl rollout status deployment/fastnext-backend
  environment:
    name: production
    url: https://api.yourdomain.com
  only:
    - main
  when: manual
```

## Backup & Recovery

### 1. **Database Backup Strategy**

```bash
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="fastnext_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump $DATABASE_URL > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/$BACKUP_FILE.gz s3://your-backup-bucket/database/

# Clean up old backups (keep last 30 days)
find $BACKUP_DIR -name "fastnext_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

### 2. **Automated Backup with Cron**

```bash
# Setup cron job for daily backups
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

### 3. **Disaster Recovery Plan**

```bash
#!/bin/bash
# scripts/restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

echo "Restoring database from $BACKUP_FILE"

# Stop application
kubectl scale deployment fastnext-backend --replicas=0

# Restore database
gunzip -c $BACKUP_FILE | psql $DATABASE_URL

# Run migrations if needed
alembic upgrade head

# Start application
kubectl scale deployment fastnext-backend --replicas=3

echo "Database restoration completed"
```

## Performance Optimization

### 1. **Application Performance**

#### Uvicorn Configuration
```python
# production startup
uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --access-log \
    --loop uvloop \
    --http httptools
```

#### Connection Pooling
```python
# app/core/database.py
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)
```

### 2. **Load Balancing**

#### HAProxy Configuration
```
# haproxy.cfg
global
    daemon
    maxconn 4096

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend fastnext_frontend
    bind *:80
    redirect scheme https if !{ ssl_fc }

frontend fastnext_ssl_frontend
    bind *:443 ssl crt /etc/ssl/certs/fastnext.pem
    default_backend fastnext_backend

backend fastnext_backend
    balance roundrobin
    option httpchk GET /api/v1/health
    server app1 app1:8000 check
    server app2 app2:8000 check
    server app3 app3:8000 check
```

## Security Considerations

### 1. **Network Security**

```yaml
# Security groups for AWS
Resources:
  ApplicationSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for FastNext backend
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          SourceSecurityGroupId: !Ref LoadBalancerSecurityGroup
        - IpProtocol: tcp
          FromPort: 8000
          ToPort: 8000
          SourceSecurityGroupId: !Ref LoadBalancerSecurityGroup
```

### 2. **Runtime Security**

```dockerfile
# Security-focused Dockerfile additions
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash fastnext \
    && chown -R fastnext:fastnext /app

USER fastnext

# Security scanning
RUN pip-audit --requirement requirements/prod.txt
```

## Frontend Deployment Options

### 1. **Vercel** (Recommended)
- **Best for**: Next.js applications with optimal performance
- **Features**: Automatic deployments, edge functions, built-in CDN
- **Cost**: Free tier available, pay-as-you-go pricing
- **Setup**: Connect GitHub repository, automatic deployments on push

### 2. **Netlify**
- **Best for**: Static sites and JAMstack applications
- **Features**: Form handling, serverless functions, split testing
- **Cost**: Free tier available with generous limits
- **Setup**: Drag and drop or Git-based deployments

### 3. **AWS Amplify**
- **Best for**: Full-stack applications with AWS integration
- **Features**: CI/CD, custom domains, branch previews
- **Cost**: Pay per build minute and data transfer
- **Setup**: Connect repository, configure build settings

### 4. **GitHub Pages**
- **Best for**: Static documentation sites
- **Features**: Free hosting, custom domains, HTTPS
- **Cost**: Free for public repositories
- **Setup**: Enable in repository settings, use Next.js static export

## Deployment Comparison Matrix

| Platform | Backend | Frontend | Database | Free Tier | Best For |
|----------|---------|----------|----------|-----------|----------|
| **Heroku + Vercel** | ✅ | ✅ | ✅ | Limited | Rapid prototyping |
| **DigitalOcean** | ✅ | ✅ | ✅ | No | Cost-effective production |
| **Railway** | ✅ | ✅ | ✅ | Yes | Modern development |
| **Render** | ✅ | ✅ | ✅ | Yes | Simple full-stack |
| **AWS** | ✅ | ✅ | ✅ | Limited | Enterprise scale |
| **Google Cloud** | ✅ | ✅ | ✅ | Limited | Machine learning integration |
| **Azure** | ✅ | ✅ | ✅ | Limited | Microsoft ecosystem |

## Quick Start Deployment

### Option 1: Heroku + Vercel (Fastest)
```bash
# Backend to Heroku (5 minutes)
heroku create your-app-backend
heroku addons:create heroku-postgresql:essential-0
git push heroku main

# Frontend to Vercel (2 minutes)
cd frontend && npx vercel
```

### Option 2: Railway (All-in-One)
```bash
# Both backend and frontend (3 minutes)
npx @railway/cli init
railway add postgresql redis
railway up
```

### Option 3: DigitalOcean (VPS)
```bash
# Full control deployment (15 minutes)
git clone https://github.com/your-username/FastNext.git
cd FastNext
docker-compose -f docker-compose.prod.yml up -d
```

## Post-Deployment Checklist

### Security
- [ ] HTTPS enabled with valid SSL certificates
- [ ] Environment variables properly configured
- [ ] Database credentials secured
- [ ] CORS origins configured correctly
- [ ] API rate limiting enabled

### Performance
- [ ] CDN configured for static assets
- [ ] Database connection pooling optimized
- [ ] Caching strategies implemented
- [ ] Image optimization enabled
- [ ] Compression enabled (gzip/brotli)

### Monitoring
- [ ] Application monitoring setup (Sentry, DataDog, etc.)
- [ ] Database monitoring configured
- [ ] Log aggregation implemented
- [ ] Health checks configured
- [ ] Alerts setup for critical metrics

### Backup & Recovery
- [ ] Automated database backups
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented
- [ ] Data retention policies defined

## Cost Optimization Tips

1. **Use free tiers effectively**: Combine free tiers from different providers
2. **Optimize resource usage**: Right-size your deployments
3. **Implement caching**: Reduce database and API calls
4. **Use CDNs**: Minimize bandwidth costs
5. **Monitor usage**: Set up billing alerts and usage monitoring

This comprehensive deployment guide covers various deployment scenarios and best practices for the FastNext framework. Choose the deployment strategy that best fits your infrastructure requirements, budget, and scale requirements.
