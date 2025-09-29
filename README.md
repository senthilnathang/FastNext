# FastNext Framework 🚀

A comprehensive, production-ready full-stack web application framework built with Next.js 15, FastAPI, and enterprise-grade security features.

## ✨ Features

### 🎯 Frontend (Next.js 15)
- **Modern React Architecture**: App Router with TypeScript and Server Components
- **Advanced UI Components**: Radix UI + Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query + tRPC for type-safe APIs
- **Authentication**: Secure JWT-based authentication with auto-refresh
- **Admin Dashboard**: Complete RBAC with roles, permissions, and audit trails
- **Data Management**: Advanced Import/Export with multi-format support and validation
- **Workflow Engine**: Visual workflow builder with advanced analytics
- **Real-time Features**: WebSocket support for live updates
- **Performance**: Optimized with Turbopack and intelligent caching
- **Testing**: Jest, Playwright, and Storybook integration

### ⚡ Backend (FastAPI)
- **High-Performance API**: FastAPI with async/await and Pydantic v2
- **Database**: PostgreSQL with SQLAlchemy 2.0 and Alembic migrations
- **Authentication**: JWT with refresh tokens and role-based access control
- **Security Middleware**: Comprehensive threat detection and rate limiting
- **Caching Layer**: Redis integration with intelligent cache strategies
- **Monitoring**: Structured logging, performance metrics, and health checks
- **API Documentation**: Auto-generated OpenAPI/Swagger with export tools
- **Data Import/Export**: Advanced file processing with validation and progress tracking
- **Workflow System**: Complete workflow orchestration with state management

### 🔐 Enterprise Security Features
- **Content Security Policy**: Advanced CSP with nonces and environment-specific rules
- **XSS Protection**: Real-time detection with pattern matching and sanitization
- **Request Validation**: Multi-layer validation with malicious content filtering
- **Rate Limiting**: Intelligent rate limiting with sliding window and token bucket algorithms
- **Security Monitoring**: Real-time threat detection with automated alerting
- **Bundle Security**: Dependency vulnerability scanning and secret detection
- **Environment Validation**: Comprehensive environment variable validation with Zod
- **Trusted Types**: Implementation with DOMPurify integration for XSS prevention
- **Subresource Integrity**: SRI implementation for external resources
- **Security Headers**: 20+ security headers with OWASP compliance

### 🏗️ Infrastructure & DevOps
- **Container Ready**: Multi-stage Docker builds with security scanning
- **Orchestration**: Docker Compose with production and development configs
- **CI/CD Pipeline**: GitHub Actions with automated testing and security checks
- **Monitoring Stack**: Integrated logging, metrics, and error tracking
- **Scalability**: Horizontal scaling with load balancer and database clustering
- **Performance**: Bundle analysis, dependency auditing, and optimization tools

## 🛠️ Technology Stack

### 🎨 Frontend
- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS 4 + shadcn/ui + Radix UI
- **State Management**: TanStack Query + Zustand + Nuqs for URL state
- **Type Safety**: tRPC for end-to-end type safety
- **Security**: CSP, Trusted Types, SRI, XSS protection
- **Testing**: Jest + React Testing Library + Playwright + Storybook
- **Development**: Hot reload, bundle analysis, and performance monitoring

### ⚙️ Backend
- **Framework**: FastAPI (Python 3.11+) with async/await
- **Database**: PostgreSQL 15+ with SQLAlchemy 2.0
- **Caching**: Redis 7+ with intelligent strategies
- **Migration**: Alembic with automatic generation
- **Authentication**: JWT with refresh tokens and RBAC
- **Validation**: Pydantic v2 with custom validators
- **Security**: Multi-layer middleware with threat detection
- **Testing**: pytest with async support and fixtures
- **Monitoring**: Structured logging with performance metrics

### 🔒 Security & Infrastructure
- **Containerization**: Multi-stage Docker with security scanning
- **Orchestration**: Docker Compose with health checks
- **Reverse Proxy**: Nginx with security headers
- **CI/CD**: GitHub Actions with security checks
- **Monitoring**: Comprehensive logging, metrics, and alerting
- **Security**: OWASP compliance with 20+ security headers
- **Performance**: Bundle optimization and dependency auditing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose (recommended)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd FastNext

# Start all services with production configuration
docker-compose -f docker-compose.prod.yml up -d

# Or start development environment
docker-compose up -d

# Services will be available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Documentation: http://localhost:8000/docs
# Redis Commander: http://localhost:8081
```

### Option 2: Manual Setup

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment configuration
cp .env.example .env
# Configure database, Redis, and security settings

# Initialize database
alembic upgrade head
python create_admin_user.py  # Create initial admin user

# Run security checks
python -m pytest tests/ -v

# Start server with auto-reload
python start_server.py
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies (choose one)
npm install
# yarn install
# pnpm install

# Environment configuration
cp .env.example .env.local
# Configure API endpoints and feature flags

# Run security audit
npm run security:full

# Start development server with Turbopack
npm run dev
```

### 🔒 Security Setup

```bash
# Run comprehensive security audit
cd frontend && npm run security:audit

# Analyze bundle for vulnerabilities
npm run security:bundle

# Generate security report
npm run security:full

# Backend security verification
cd ../backend && python test_workflow_comprehensive.py
```

## 📁 Project Structure

```
FastNext/
├── frontend/                          # Next.js 15 Application
│   ├── src/
│   │   ├── app/                      # App Router (pages, layouts, APIs)
│   │   │   ├── (dashboard)/          # Dashboard route group
│   │   │   ├── admin/               # Admin interface
│   │   │   ├── api/                 # API routes
│   │   │   │   └── monitoring/      # Security monitoring endpoints
│   │   │   ├── workflows/           # Workflow management
│   │   │   └── layout.tsx           # Root layout with providers
│   │   ├── lib/
│   │   │   ├── config/              # Environment validation
│   │   │   ├── security/            # Security utilities
│   │   │   │   ├── sri.ts           # Subresource Integrity
│   │   │   │   ├── trusted-types.ts # Trusted Types implementation
│   │   │   │   ├── xss-protection.ts # XSS detection and prevention
│   │   │   │   └── rate-limit.ts    # Rate limiting algorithms
│   │   │   ├── monitoring/          # Security monitoring
│   │   │   └── trpc/               # tRPC configuration
│   │   ├── modules/                 # Feature modules
│   │   │   ├── auth/               # Authentication
│   │   │   ├── admin/              # Admin management
│   │   │   ├── workflow/           # Workflow engine
│   │   │   └── api-docs/           # API documentation
│   │   └── shared/                 # Shared components and utilities
│   │       ├── components/         # UI components
│   │       ├── services/           # API clients
│   │       └── hooks/              # Custom React hooks
│   ├── scripts/                    # Security and build scripts
│   │   ├── security-audit.js       # Dependency vulnerability scanner
│   │   └── bundle-analyzer.js      # Bundle security analysis
│   ├── middleware.ts               # Next.js security middleware
│   ├── next.config.ts              # Next.js configuration with security headers
│   └── package.json
├── backend/                        # FastAPI Application
│   ├── app/
│   │   ├── api/                    # API routes with versioning
│   │   │   ├── v1/                 # API v1 endpoints
│   │   │   └── main.py             # API router configuration
│   │   ├── core/                   # Core functionality
│   │   │   ├── config.py           # Application configuration
│   │   │   ├── security.py         # Security utilities
│   │   │   └── database_optimization.py # Performance optimizations
│   │   ├── middleware/             # Security middleware
│   │   │   ├── security_middleware.py # Comprehensive security
│   │   │   └── optimization_middleware.py # Performance
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── workflow.py         # Workflow system models
│   │   │   └── security_setting.py # Security configuration
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── services/               # Business logic
│   │   │   └── workflow_engine.py  # Workflow orchestration
│   │   └── utils/                  # Utilities
│   │       ├── security_utils.py   # Security functions
│   │       └── activity_logger.py  # Audit logging
│   ├── alembic/                    # Database migrations
│   ├── tests/                      # Comprehensive test suite
│   ├── docs/                       # Documentation
│   ├── scaffolding/                # Code generation tools
│   └── requirements/               # Dependency management
├── docker/                         # Docker configurations
│   ├── nginx/                      # Nginx proxy configs
│   ├── postgres/                   # PostgreSQL setup
│   └── redis/                      # Redis configuration
├── docs/                           # Project documentation
├── docker-compose.yml              # Development environment
├── docker-compose.prod.yml         # Production environment
└── README.md
```

## 🔐 Enterprise Security Features

FastNext implements comprehensive security measures following OWASP guidelines and industry best practices:

### 🛡️ Content Security & XSS Prevention
- **Content Security Policy**: Advanced CSP with nonces and environment-specific rules
- **Trusted Types**: Implementation with DOMPurify integration for safe DOM manipulation
- **XSS Protection**: Real-time detection with pattern matching and automatic sanitization
- **Subresource Integrity**: SRI implementation for external scripts and stylesheets
- **Input Sanitization**: Multi-layer validation with malicious content filtering

### 🔒 Authentication & Authorization
- **JWT Security**: Secure token implementation with refresh rotation
- **Role-Based Access Control**: Granular RBAC with permissions and audit trails
- **Session Management**: Automatic token refresh with secure cookie handling
- **Multi-Factor Ready**: Infrastructure for MFA/2FA implementation
- **Account Security**: Lockout mechanisms and suspicious activity detection

### 🚦 Request Security & Rate Limiting
- **Intelligent Rate Limiting**: Multiple algorithms (sliding window, token bucket)
- **Request Validation**: Comprehensive validation with threat pattern detection
- **Malicious Content Detection**: Real-time scanning for injection attempts
- **Geographic Filtering**: IP-based access control and geolocation validation
- **Bot Detection**: User-agent analysis and behavioral pattern recognition

### 📊 Security Monitoring & Alerting
- **Real-Time Monitoring**: 13 security event types with automatic correlation
- **Threat Detection**: Machine learning-based anomaly detection
- **Alert System**: Configurable thresholds with multi-channel notifications
- **Security Analytics**: Comprehensive dashboards with threat intelligence
- **Incident Response**: Automated response workflows and escalation procedures

### 🔍 Vulnerability Management
- **Dependency Scanning**: Automated vulnerability detection in npm packages
- **Bundle Security**: Analysis of bundled code for exposed secrets and vulnerabilities
- **License Compliance**: Automatic checking for restrictive licenses
- **Security Auditing**: Regular automated security assessments
- **Penetration Testing**: Built-in security testing tools and frameworks

### 🏗️ Infrastructure Security
- **Security Headers**: 20+ security headers with OWASP compliance
- **Environment Validation**: Comprehensive validation with secret detection
- **Container Security**: Multi-stage Docker builds with vulnerability scanning
- **Network Security**: Nginx security configuration with SSL/TLS hardening
- **Database Security**: Encrypted connections and query optimization

### 📋 Compliance & Governance
- **Audit Trails**: Comprehensive logging of all security events
- **Data Protection**: GDPR-ready with data anonymization and retention policies
- **Security Policies**: Configurable security policies with version control
- **Compliance Reporting**: Automated compliance reports and security metrics
- **Documentation**: Complete security documentation and runbooks

## 📊 Data Import/Export System

FastNext includes a comprehensive data management system with **Dynamic Table Selection** that supports importing and exporting data across multiple formats with enterprise-grade features:

### 🎯 Dynamic Table Management
- **Auto-Discovery**: Automatically discover all database tables for import/export
- **Schema Detection**: Real-time table schema analysis with column types and constraints
- **Smart Field Mapping**: Automatic field mapping based on actual table structure
- **Permission Integration**: Table-specific permissions with real-time validation
- **Settings Integration**: Dedicated settings pages for managing any table dynamically

### 🔄 Import Features
- **Multi-Format Support**: CSV, JSON, Excel (XLSX/XLS), XML, YAML
- **Dynamic Table Selection**: Choose any database table from dropdown
- **Advanced Validation**: Schema validation, data type checking, and custom rules
- **Smart Field Mapping**: Intelligent field mapping with preview and transformation
- **Progress Tracking**: Real-time progress updates for large file imports
- **Error Handling**: Detailed error reporting with row-level validation
- **Permission Control**: Table-level permissions with approval workflows
- **Batch Processing**: Efficient processing of large datasets
- **Duplicate Handling**: Configurable strategies for duplicate data (skip, update, error)

### 📤 Export Features
- **Format Options**: CSV, JSON, Excel, XML, YAML export formats
- **Dynamic Table Selection**: Export from any database table
- **Column Selection**: Choose specific columns with permission-based filtering
- **Data Filtering**: Apply filters and search before export
- **Large Dataset Support**: Background processing for large exports
- **Download Management**: Secure file downloads with expiration
- **Template System**: Reusable export templates
- **Permission Control**: User-based export permissions and column restrictions
- **Live Data Preview**: Real-time data preview with search and pagination

### 🛠️ Usage Examples

#### Dynamic Settings Pages (New!)
Navigate to **Settings → Data Import** or **Settings → Data Export** for the new dynamic interface:

```typescript
// Settings pages with automatic table discovery
// Located at: /settings/data-import and /settings/data-export

// Features:
// ✅ Dropdown with all available database tables
// ✅ Real-time schema detection and column mapping
// ✅ Permission-based access control
// ✅ Live data preview and validation
// ✅ Integrated import/export components
```

#### Table Discovery API
```typescript
// Get all available tables
const tablesResponse = await fetch('/api/v1/data/tables/available');
const { tables } = await tablesResponse.json();
// Returns: ["users", "products", "orders", "customers", ...]

// Get table schema
const schemaResponse = await fetch('/api/v1/data/tables/users/schema');
const schema = await schemaResponse.json();
// Returns: columns, primary keys, sample data, constraints

// Get table permissions
const permissionsResponse = await fetch('/api/v1/data/tables/users/permissions');
const permissions = await permissionsResponse.json();
// Returns: import/export permissions, limits, allowed formats
```

#### Component Integration
```typescript
// Import Data Component
import { DataImport } from '@/shared/components/DataImport';

const ImportPage = () => {
  const columns = [
    { key: 'name', label: 'Name', type: 'string', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'age', label: 'Age', type: 'number', required: false }
  ];

  const handleImport = async (data, options) => {
    const response = await fetch('/api/v1/data/import/upload', {
      method: 'POST',
      body: formData
    });
    return response.json();
  };

  return (
    <DataImport
      tableName="users"
      columns={columns}
      onImport={handleImport}
      maxFileSize={50} // 50MB
      allowedFormats={['csv', 'json', 'excel']}
    />
  );
};

// Export Data Component
import { DataExport } from '@/shared/components/DataExport';

const ExportPage = () => {
  const handleExport = async (options) => {
    const response = await fetch('/api/v1/data/export/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    return response.json();
  };

  return (
    <DataExport
      tableName="users"
      columns={columns}
      onExport={handleExport}
      allowedFormats={['csv', 'json', 'excel']}
    />
  );
};
```

#### Backend API Usage
```python
# Table Discovery APIs (New!)
from app.api.v1.data_import_export import get_available_tables, get_table_schema, get_table_permissions

@app.get("/tables")
async def list_tables(current_user: User = Depends(get_current_user)):
    """Get all available tables for import/export"""
    tables = await get_available_tables(current_user)
    return tables

@app.get("/tables/{table_name}/info")
async def get_table_info(table_name: str, current_user: User = Depends(get_current_user)):
    """Get complete table information including schema and permissions"""
    schema = await get_table_schema(table_name, current_user)
    permissions = await get_table_permissions(table_name, current_user)
    return {"schema": schema, "permissions": permissions}

# Import endpoint usage
from fastapi import UploadFile
from app.api.v1.data_import_export import upload_and_create_import_job

@app.post("/custom-import")
async def custom_import(
    file: UploadFile,
    table_name: str,
    current_user: User = Depends(get_current_user)
):
    # The import system handles validation, permissions, and processing
    result = await upload_and_create_import_job(
        file=file,
        table_name=table_name,
        import_options='{"format": "csv", "has_headers": true}',
        field_mappings='[]',
        current_user=current_user
    )
    return result

# Export endpoint usage
@app.post("/custom-export")
async def custom_export(
    export_request: ExportJobCreate,
    current_user: User = Depends(get_current_user)
):
    result = await create_export_job(
        export_request=export_request,
        current_user=current_user
    )
    return result
```

### 🔐 Security & Permissions

#### Import Permissions
```python
# Set up import permissions for users
import_permission = ImportPermission(
    user_id=user.id,
    table_name="products",
    can_import=True,
    can_validate=True,
    can_preview=True,
    max_file_size_mb=100,
    max_rows_per_import=50000,
    allowed_formats=["csv", "json", "excel"],
    requires_approval=False
)
```

#### Export Permissions
```python
# Set up export permissions for users
export_permission = ExportPermission(
    user_id=user.id,
    table_name="users",
    can_export=True,
    can_preview=True,
    max_rows_per_export=100000,
    allowed_formats=["csv", "json", "excel"],
    allowed_columns=["name", "email", "created_at"]  # Restrict sensitive data
)
```

### 📁 File Structure
```
backend/
├── app/
│   ├── models/data_import_export.py      # Database models
│   ├── schemas/data_import_export.py     # Pydantic schemas
│   ├── api/v1/data_import_export.py      # API endpoints
│   └── utils/
│       ├── data_import.py                # Import processing
│       └── data_export.py                # Export processing
├── demo_data/                            # Sample files for testing
│   ├── sample_users.csv
│   ├── sample_products.csv
│   ├── sample_orders.csv
│   └── sample_customers.json
└── create_import_export_demo_data.py     # Demo data generator

frontend/
└── src/shared/components/
    ├── DataImport/                       # Import components
    │   ├── DataImport.tsx
    │   ├── components/
    │   │   ├── FileUpload.tsx
    │   │   ├── FieldMapper.tsx
    │   │   ├── ImportProgress.tsx
    │   │   └── PermissionManager.tsx
    │   ├── hooks/useDataImport.ts
    │   └── utils/parseUtils.ts
    └── DataExport/                       # Export components
        ├── DataExport.tsx
        ├── components/
        │   ├── FieldSelector.tsx
        │   ├── FormatSelector.tsx
        │   └── ExportProgress.tsx
        ├── hooks/useDataExport.ts
        └── utils/exportUtils.ts
```

### 🚀 Quick Start Guide

#### 1. Set Up Demo Data
```bash
cd backend
source venv/bin/activate
python create_import_export_demo_data.py
```

#### 2. Start the System
```bash
# Terminal 1: Start Backend
cd backend
source venv/bin/activate
python main.py

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

#### 3. Access Dynamic Import/Export (New!)
```bash
# Open browser and navigate to:
# http://localhost:3000/settings/data-import   # Dynamic Import
# http://localhost:3000/settings/data-export   # Dynamic Export

# Features available:
# ✅ Select any database table from dropdown
# ✅ View table schema and sample data
# ✅ Check permissions and limits
# ✅ Import/export with field mapping
# ✅ Real-time progress tracking
```

#### 4. Test with Demo Data
```bash
# Import Test:
# 1. Go to Settings → Data Import
# 2. Select "users" table
# 3. Upload demo_data/sample_users.csv
# 4. Map fields automatically
# 5. Validate and import

# Export Test:
# 1. Go to Settings → Data Export  
# 2. Select any table with data
# 3. Choose columns and format
# 4. Preview and export
```

### 📋 API Endpoints

#### Table Discovery Endpoints (New!)
- `GET /api/v1/data/tables/available` - Get all available database tables
- `GET /api/v1/data/tables/{table_name}/schema` - Get table schema and structure
- `GET /api/v1/data/tables/{table_name}/permissions` - Get user permissions for table

#### Import Endpoints
- `POST /api/v1/data/import/upload` - Upload file and create import job
- `POST /api/v1/data/import/parse` - Parse file and return preview
- `POST /api/v1/data/import/{job_id}/validate` - Validate import data
- `POST /api/v1/data/import/{job_id}/start` - Start import process
- `GET /api/v1/data/import/{job_id}/status` - Get import status
- `GET /api/v1/data/import/jobs` - List user's import jobs

#### Export Endpoints
- `POST /api/v1/data/export/create` - Create export job
- `GET /api/v1/data/export/{job_id}/status` - Get export status
- `GET /api/v1/data/export/{job_id}/download` - Download export file
- `GET /api/v1/data/export/jobs` - List user's export jobs

#### System Endpoints
- `GET /api/v1/data/health` - System health check

### 📊 Monitoring & Analytics
- **Progress Tracking**: Real-time progress updates for large operations
- **Error Reporting**: Detailed error logs with row-level information
- **Audit Trails**: Complete audit logs for all import/export activities
- **Performance Metrics**: Processing time and throughput statistics
- **Usage Analytics**: User activity and system utilization reports

## 🧪 Testing & Quality Assurance

### 🎯 Frontend Testing
```bash
cd frontend

# Unit testing with Jest
npm test                    # Run unit tests
npm run test:coverage      # Coverage report
npm run test:watch         # Watch mode

# End-to-end testing with Playwright
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Interactive UI mode
npm run test:e2e:headed    # Run in headed browser
npm run test:e2e:debug     # Debug mode

# Component testing with Storybook
npm run storybook          # Start Storybook
npm run build-storybook    # Build static Storybook

# Code quality and linting
npm run lint               # ESLint
npm run biome              # Biome linting
npm run biome:fix          # Auto-fix issues
```

### ⚙️ Backend Testing
```bash
cd backend

# Comprehensive testing suite
pytest                              # Run all tests
pytest --cov=app --cov-report=html # Coverage report
pytest tests/api/ -v               # API tests only
pytest tests/workflow/ -v          # Workflow tests

# Security testing
python test_workflow_comprehensive.py  # Security validation
python test_backend_scaffold.py        # Infrastructure tests

# Load testing
pytest tests/integration/ -v           # Integration tests
python -m pytest tests/unit/ -v       # Unit tests only
```

### 🔒 Security Testing
```bash
# Frontend security audit
npm run security:audit      # Dependency vulnerabilities
npm run security:bundle     # Bundle analysis
npm run security:full       # Complete security scan

# Backend security validation
cd backend
python test_upgrade_verification.py    # Security upgrade tests
pytest tests/auth/ -v                  # Authentication tests
pytest tests/api/test_auth_api.py -v   # API security tests

# Infrastructure testing
docker-compose -f docker-compose.yml config    # Validate Docker config
docker security scan fastnext-frontend         # Container security scan
```

### 📊 Performance Testing
```bash
# Bundle analysis
npm run analyze             # Webpack bundle analyzer

# Performance monitoring
npm run build              # Production build analysis
npm run start              # Production server testing

# Backend performance
cd backend
python -m pytest tests/ --benchmark-only       # Benchmark tests
uvicorn app.main:app --workers 4               # Multi-worker testing
```

## 🚀 Production Deployment

### 🔧 Environment Configuration

#### Frontend Environment Variables
```bash
# Production (.env.local)
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_DOMAIN=yourdomain.com
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
NEXT_PUBLIC_ENABLE_ANALYTICS=true
SECURITY_HEADERS_ENABLED=true
```

#### Backend Environment Variables
```bash
# Production (.env)
SECRET_KEY=your-256-bit-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
POSTGRES_SERVER=your-db-host
POSTGRES_USER=your-db-user
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=fastnext_prod

# Redis
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password

# Security
CORS_ORIGINS=https://yourdomain.com
ENABLE_GZIP_COMPRESSION=true
WORKERS=4
```

### 🐳 Docker Production Deployment
```bash
# Production deployment with security scanning
docker-compose -f docker-compose.prod.yml up -d

# Health checks and monitoring
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f

# Horizontal scaling
docker-compose -f docker-compose.prod.yml up -d --scale backend=3 --scale frontend=2

# Security updates
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### ☁️ Cloud Platform Deployment

#### Vercel (Frontend)
```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy with environment variables
vercel --prod

# Configure security headers in vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'" }
      ]
    }
  ]
}
```

#### AWS/GCP/Azure (Backend)
```bash
cd backend

# Production requirements
pip install -r requirements/prod.txt

# Database migrations
alembic upgrade head

# Production server with Gunicorn
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
```

### 🔒 Security Hardening

#### SSL/TLS Configuration
```nginx
# Nginx configuration (nginx/prod.conf)
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
}
```

#### Database Security
```bash
# PostgreSQL security hardening
# Enable SSL connections
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'

# Connection limits
max_connections = 100
shared_preload_libraries = 'pg_stat_statements'
```

### 📊 Monitoring & Observability

#### Application Monitoring
```bash
# Health check endpoints
curl https://api.yourdomain.com/api/health
curl https://yourdomain.com/api/health

# Security monitoring
curl https://api.yourdomain.com/api/monitoring/security-events
curl https://api.yourdomain.com/api/monitoring/security-alerts
```

#### Performance Monitoring
```bash
# Frontend performance
npm run analyze                    # Bundle analysis
npm run security:full             # Security audit

# Backend performance
python -m pytest tests/ --benchmark-only
curl https://api.yourdomain.com/metrics
```

### 🔄 CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy Production
on:
  push:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Security Audit
        run: |
          cd frontend && npm run security:full
          cd backend && python -m safety check
  
  deploy:
    needs: security-scan
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.prod.yml up -d
```

## 📖 Documentation & Resources

### 📚 API Documentation
- **Interactive API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **OpenAPI Export**: Available in JSON/YAML formats
- **Postman Collection**: `backend/exports/fastnext-postman-collection.json`

### 🏗️ Architecture Documentation
- **Backend Architecture**: `backend/docs/ARCHITECTURE.md`
- **Frontend Architecture**: `frontend/docs/scaffolding-usage.md`
- **Database Schema**: `backend/docs/DEVELOPMENT.md`
- **Security Guide**: `backend/docs/SECURITY.md`
- **Workflow System**: `docs/WORKFLOW_SYSTEM.md`

### 🎨 Component Documentation
- **Storybook**: `http://localhost:6006` (Component library)
- **UI Components**: `frontend/src/shared/components/README.md`
- **Design System**: Built with Radix UI and Tailwind CSS
- **Component Testing**: Jest and Testing Library integration

### 📊 Monitoring & Analytics
- **Security Dashboard**: Real-time security event monitoring
- **Performance Metrics**: Bundle analysis and optimization reports
- **Audit Trails**: Comprehensive logging and compliance reporting
- **Health Checks**: Application and infrastructure monitoring

## 🛠️ Development Tools & Scripts

### 🔍 Security Tools
```bash
# Frontend security
npm run security:audit          # Dependency vulnerability scan
npm run security:bundle         # Bundle security analysis
npm run security:full           # Complete security audit

# Backend security
python test_workflow_comprehensive.py  # Security validation
python -m safety check                 # Dependency security scan
```

### 📦 Code Generation
```bash
# Backend scaffolding
cd backend
python scaffolding/backend_generator.py    # Generate CRUD operations
python scaffolding/test_generator.py       # Generate test files
python scaffolding/docs_generator.py       # Generate documentation

# Frontend scaffolding
cd frontend
npm run scaffold:component                 # Generate React components
npm run scaffold:page                      # Generate Next.js pages
```

### 🚀 Performance Tools
```bash
# Bundle analysis
npm run analyze                 # Webpack bundle analyzer
npm run build                   # Production build with optimization

# Performance testing
npm run test:performance        # Performance benchmarks
python -m pytest tests/ --benchmark-only   # Backend benchmarks
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### 🔒 Security First
1. **Security Review**: All contributions undergo security review
2. **Vulnerability Disclosure**: Report security issues privately
3. **Code Standards**: Follow security coding standards
4. **Testing**: Include security tests for new features

### 📋 Development Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run security audit (`npm run security:full`)
4. Write tests and ensure coverage
5. Commit with conventional commits
6. Push and create a Pull Request

### 📝 Code Standards
- **TypeScript**: Strict mode with comprehensive typing
- **Python**: PEP 8 compliance with type hints
- **Security**: OWASP compliance and security reviews
- **Testing**: Minimum 80% code coverage required
- **Documentation**: Comprehensive docs for all features

Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) for detailed information.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team**: Revolutionary React framework with App Router
- **FastAPI Team**: High-performance Python web framework
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **tRPC**: End-to-end type safety
- **Security Community**: OWASP and security researchers
- **Open Source Contributors**: Amazing libraries and tools

## 🆘 Support & Community

- **Issues**: [GitHub Issues](https://github.com/yourusername/fastnext/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/fastnext/discussions)
- **Security**: security@yourdomain.com
- **Documentation**: [Project Wiki](https://github.com/yourusername/fastnext/wiki)

---

<div align="center">

**FastNext Framework** - Production-ready full-stack development with enterprise security

[⭐ Star this project](https://github.com/yourusername/fastnext) • [🐛 Report Bug](https://github.com/yourusername/fastnext/issues) • [✨ Request Feature](https://github.com/yourusername/fastnext/issues)

</div>