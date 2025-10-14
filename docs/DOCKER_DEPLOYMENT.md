# FastNext Framework - Docker Deployment Guide

This guide covers comprehensive Docker deployment for the FastNext Framework, including development, production, and monitoring setups.

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 10GB+ free disk space

### Development Environment

```bash
# Clone and setup
git clone <repository-url>
cd FastNext

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start development environment
./deploy.sh dev

# Or manually
docker-compose up -d
```

### Production Environment

```bash
# Setup production environment
./deploy.sh prod

# Or manually
docker-compose -f docker-compose.prod.yml up -d
```

### Scaled Production Environment (Phase 3)

For enterprise-scale deployment with database replication, Redis clustering, and horizontal scaling:

```bash
# Start scaled environment with replication and clustering
docker-compose -f docker-compose.scale.yml up -d

# Scale backend instances (3-20 pods with auto-scaling)
docker-compose -f docker-compose.scale.yml up -d --scale backend=5

# Check scaling status
docker-compose -f docker-compose.scale.yml ps

# View logs
docker-compose -f docker-compose.scale.yml logs -f backend
```

**Scaled Environment Features:**
- **Database Replication**: 1 primary + 2 read replicas with automatic failover
- **Redis Cluster**: 6-node cluster (3 masters + 3 replicas) for distributed caching
- **Load Balancing**: Nginx with health checks and least-connection routing
- **Horizontal Scaling**: Multiple backend instances with automatic scaling
- **High Availability**: Zero-downtime deployments and automatic recovery

## 📁 Docker Architecture

### Services Overview

| Service | Purpose | Port | Dependencies |
|---------|---------|------|--------------|
| `postgres` | PostgreSQL database | 5432 | - |
| `redis` | Cache & session store | 6379 | - |
| `backend` | FastAPI application | 8000 | postgres, redis |
| `frontend` | Next.js application | 3000 | backend |
| `nginx` | Reverse proxy/LB | 80, 443 | frontend, backend |

### Optional Services

| Service | Purpose | Port | Profile |
|---------|---------|------|---------|
| `pgadmin` | Database admin | 5050 | `tools` |
| `redis-insight` | Redis admin | 8001 | `tools` |
| `prometheus` | Metrics collection | 9090 | `monitoring` |
| `grafana` | Metrics dashboard | 3001 | `monitoring` |
| `backup` | Automated backups | - | `backup` |

## 🛠️ Deployment Script Usage

The `deploy.sh` script provides comprehensive deployment automation:

### Basic Commands

```bash
# Development environment
./deploy.sh dev

# Production environment  
./deploy.sh prod

# With admin tools
./deploy.sh dev -p tools

# With monitoring
./deploy.sh prod -p monitoring

# Build only
./deploy.sh build

# Stop services
./deploy.sh stop

# Complete teardown
./deploy.sh down
```

### Management Commands

```bash
# View logs
./deploy.sh logs backend
./deploy.sh logs  # All services

# Service status
./deploy.sh ps

# Restart services
./deploy.sh restart frontend

# Database migrations
./deploy.sh migrate

# Health checks
./deploy.sh health
```

### Backup & Restore

```bash
# Create backup
./deploy.sh backup

# Restore from backup
./deploy.sh restore backup_file.sql

# Run tests
./deploy.sh test
```

## 🔧 Configuration

### Environment Variables

Create `.env` file from `.env.example`:

```bash
# Database
POSTGRES_PASSWORD=secure_password_change_me
REDIS_PASSWORD=redis_secure_password_change_me

# Application
SECRET_KEY=super_secret_key_change_in_production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Scaling
BACKEND_WORKERS=4
BACKEND_REPLICAS=2
FRONTEND_REPLICAS=2
```

### Performance Tuning

#### PostgreSQL Optimization

Edit `docker/postgres/postgresql.conf`:

```conf
# For 8GB RAM system
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 16MB
maintenance_work_mem = 512MB
```

#### Redis Optimization

Edit `docker/redis/redis-prod.conf`:

```conf
# Adjust memory limit
maxmemory 1gb
maxmemory-policy allkeys-lru
```

#### Backend Scaling

Scale backend instances:

```bash
# Scale to 4 instances
./deploy.sh prod --scale backend=4

# Or in docker-compose
docker-compose -f docker-compose.prod.yml up -d --scale backend=4
```

## 🔒 Production Security

### SSL/TLS Setup

1. **Obtain SSL certificates:**
   ```bash
   # Using Let's Encrypt
   certbot certonly --webroot -w /var/www/html -d yourdomain.com
   ```

2. **Configure certificates:**
   ```bash
   # Copy certificates
   mkdir -p docker/nginx/ssl
   cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
   cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/key.pem
   ```

3. **Update environment:**
   ```bash
   SSL_CERTFILE=/etc/nginx/ssl/cert.pem
   SSL_KEYFILE=/etc/nginx/ssl/key.pem
   ```

### Security Headers

Nginx is configured with security headers:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Referrer-Policy`

### Database Security

- SCRAM-SHA-256 authentication
- Restricted network access
- Regular security updates
- Encrypted connections (production)

## 📊 Monitoring & Logging

### Enable Monitoring Stack

```bash
# Start with monitoring
./deploy.sh prod -p monitoring

# Access dashboards
# Grafana: http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
```

### Log Management

```bash
# View real-time logs
docker-compose logs -f backend

# Log rotation is configured
# Files are limited to 10MB with 3 rotations
```

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# Manual health check
curl http://localhost:8000/health
```

## 🔄 Backup & Recovery

### Automated Backups

Enable backup service:

```bash
# Start with backup service
./deploy.sh prod -p backup
```

Backup configuration:
- Daily backups at 2 AM
- 30-day retention
- Optional S3 upload

### Manual Backup

```bash
# Database backup
./deploy.sh backup

# Full system backup
docker run --rm -v fastnext_postgres_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/postgres_data_$(date +%Y%m%d).tar.gz -C /data .
```

### Disaster Recovery

```bash
# 1. Stop services
./deploy.sh stop

# 2. Restore database
./deploy.sh restore backup_file.sql

# 3. Restore volumes (if needed)
docker run --rm -v fastnext_postgres_data:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/postgres_data_20240101.tar.gz -C /data

# 4. Start services
./deploy.sh prod
```

## 🚀 Performance Optimization

### Resource Limits

Production compose includes resource limits:

```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
    reservations:
      memory: 256M
      cpus: '0.25'
```

### Caching Strategy

- **Redis**: Session and application cache
- **Nginx**: Static asset caching
- **Application**: Response caching middleware

### Database Optimization

- Connection pooling
- Query optimization
- Index optimization
- Automated vacuum

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check port usage
   sudo netstat -tulpn | grep :8000
   
   # Change ports in docker-compose
   ports:
     - "8001:8000"  # Host:Container
   ```

2. **Permission issues:**
   ```bash
   # Fix volume permissions
   sudo chown -R $(id -u):$(id -g) ./data
   ```

3. **Memory issues:**
   ```bash
   # Increase Docker memory limit
   # Docker Desktop: Settings > Resources > Memory
   ```

4. **Database connection:**
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Test connection
   docker-compose exec backend python -c "from app.db.session import get_db; print('DB OK')"
   ```

### Log Analysis

```bash
# Backend errors
docker-compose logs backend | grep ERROR

# Database performance
docker-compose exec postgres psql -U fastnext -d fastnext -c "SELECT * FROM pg_stat_activity;"

# Redis stats
docker-compose exec redis redis-cli info stats
```

### Performance Monitoring

```bash
# Container stats
docker stats

# System resources
docker system df
docker system prune  # Clean up
```

## 🚀 Scaling Guidelines

### Horizontal Scaling

```bash
# Scale backend
docker-compose -f docker-compose.prod.yml up -d --scale backend=4

# Scale frontend
docker-compose -f docker-compose.prod.yml up -d --scale frontend=3
```

### Load Balancing

Nginx automatically load balances across scaled instances using `least_conn` algorithm.

### Database Scaling

For database scaling, consider:
- Read replicas
- Connection pooling (PgBouncer)
- Sharding strategies

## 📋 Maintenance

### Regular Maintenance

```bash
# Update images
docker-compose pull
docker-compose up -d

# Clean up
docker system prune -f
docker volume prune -f

# Database maintenance
docker-compose exec postgres psql -U fastnext -d fastnext -c "VACUUM ANALYZE;"
```

### Security Updates

```bash
# Rebuild with latest base images
./deploy.sh build --no-cache

# Update dependencies
# Edit Dockerfile and rebuild
```

## 🎯 Best Practices

### Development

- Use volume mounts for hot reload
- Enable debug logging
- Use single worker for easier debugging

### Production

- Use multi-stage builds
- Run as non-root users
- Enable health checks
- Configure resource limits
- Use secrets management
- Regular backups
- Monitor performance

### Security

- Use strong passwords
- Enable SSL/TLS
- Regular security updates
- Network segmentation
- Access logging
- Vulnerability scanning

This comprehensive guide should help you deploy and manage the FastNext Framework effectively in any environment.