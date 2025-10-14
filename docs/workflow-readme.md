# FastNext Workflow System 🚀

> **Enterprise-grade visual workflow automation platform built with React Flow and FastAPI**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/fastnext/workflow)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![React Flow](https://img.shields.io/badge/React%20Flow-11.11.4-61dafb.svg)](https://reactflow.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg)](https://fastapi.tiangolo.com/)
[![Redis](https://img.shields.io/badge/Redis-5.0+-dc382d.svg)](https://redis.io/)

## 🌟 Overview

The FastNext Workflow System is a comprehensive business process automation platform that combines the power of visual workflow design with robust backend execution. Create, manage, and monitor complex business workflows using our intuitive drag-and-drop interface powered by React Flow.

### ✨ Key Features

- **🎨 Visual Workflow Designer**: Drag-and-drop interface with React Flow
- **🔄 Advanced Control Flow**: Loops, conditions, parallel processing
- **📊 Data Operations**: Variables, calculations, transformations
- **🔗 Workflow Composition**: Sub-workflows and nested execution
- **⚡ Script Integration**: JavaScript, Python, SQL, Shell scripting
- **📈 Real-time Analytics**: Performance monitoring and bottleneck detection
- **🔐 Enterprise Security**: Role-based access control and audit trails
- **🚀 Production Ready**: Docker deployment with Redis caching

## 🏗️ Architecture

```mermaid
graph TB
    A[React Flow Frontend] --> B[FastAPI Backend]
    B --> C[PostgreSQL Database]
    B --> D[Redis Cache]
    B --> E[Workflow Engine]
    E --> F[State Machine]
    E --> G[Script Executor]
    E --> H[Event System]
```

### 🛠️ Technology Stack

- **Frontend**: Next.js 15, React Flow 11, TypeScript, Tailwind CSS
- **Backend**: FastAPI, SQLAlchemy, Alembic, Python 3.11+
- **Database**: PostgreSQL 14+ with optimized schemas
- **Cache**: Redis 6+ with connection pooling
- **Deployment**: Docker, Docker Compose, Uvicorn
- **Monitoring**: Structured logging, metrics collection

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 14+
- Redis 6+
- Docker (optional)

### 🐳 Docker Deployment (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd FastNext

# Deploy with Docker Compose
./deploy.sh dev    # Development
./deploy.sh prod   # Production

# Access the application
open http://localhost:3000/workflows
```

### 🔧 Manual Installation

```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements/prod.txt

# Database setup
alembic upgrade head
python demo_workflow_data.py

# Start backend
python main.py

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev

# Access workflow builder
open http://localhost:3000/workflows
```

## 🎯 Core Concepts

### Workflow Components

| Component | Description | Use Case |
|-----------|-------------|----------|
| **Workflow Type** | Category of business process | "Order Processing", "Invoice Approval" |
| **Workflow State** | Individual step/status | "Draft", "Approved", "Completed" |
| **Workflow Template** | Reusable workflow definition | Visual design with nodes and edges |
| **Workflow Instance** | Active execution of a template | Specific order being processed |

### Node Types

#### 🔵 Basic Nodes
- **State Node**: Represents workflow states
- **Conditional Node**: Decision logic with true/false branches
- **Parallel Gateway**: Split/merge parallel execution paths
- **Timer Node**: Delays and scheduled actions
- **User Task Node**: Human interaction points

#### 🟣 Advanced Nodes
- **Loop Node**: For, While, ForEach iterations
- **Variable Node**: Data operations and calculations
- **Sub-workflow Node**: Execute child workflows
- **Script Node**: Custom code execution (JS, Python, SQL)

## 📋 Usage Examples

### Simple Approval Workflow

```typescript
const approvalWorkflow = {
  nodes: [
    {
      id: 'start',
      type: 'workflowState',
      data: { label: 'Document Submitted', isInitial: true }
    },
    {
      id: 'review',
      type: 'userTask',
      data: {
        label: 'Manager Review',
        requiredRoles: ['manager'],
        approval: true
      }
    },
    {
      id: 'approved',
      type: 'workflowState',
      data: { label: 'Approved', isFinal: true }
    }
  ],
  edges: [
    { source: 'start', target: 'review' },
    { source: 'review', target: 'approved', sourceHandle: 'approve' }
  ]
};
```

### Advanced Order Processing

```typescript
const orderWorkflow = {
  nodes: [
    // Calculate tax
    {
      id: 'calc_tax',
      type: 'variable',
      data: {
        operationType: 'calculate',
        variableName: 'tax_amount',
        expression: 'order.subtotal * 0.08'
      }
    },
    // Amount-based routing
    {
      id: 'amount_check',
      type: 'conditional',
      data: { condition: 'order.total > 1000' }
    },
    // Bulk processing loop
    {
      id: 'process_items',
      type: 'loop',
      data: {
        loopType: 'forEach',
        collection: 'order.items',
        iteratorVariable: 'item'
      }
    }
  ]
};
```

### Script Integration

```javascript
// JavaScript automation example
const validationScript = {
  type: 'script',
  data: {
    language: 'javascript',
    script: `
      function validateOrder(order) {
        const errors = [];
        if (!order.customer_id) errors.push('Customer ID required');
        if (order.total <= 0) errors.push('Total must be positive');

        return {
          valid: errors.length === 0,
          errors: errors,
          total_items: order.items?.length || 0
        };
      }

      return validateOrder(order);
    `,
    inputVariables: ['order'],
    outputVariables: ['valid', 'errors', 'total_items']
  }
};
```

## 📊 Analytics and Monitoring

### Real-time Metrics

- **Performance**: Completion times, throughput rates
- **Quality**: Success rates, error patterns
- **Bottlenecks**: Slow nodes, resource constraints
- **Trends**: Historical analysis, forecasting

### Dashboard Features

```typescript
interface WorkflowMetrics {
  totalWorkflows: number;
  activeInstances: number;
  completedToday: number;
  averageCompletionTime: number;
  successRate: number;
  bottlenecks: BottleneckData[];
  statusDistribution: StatusData[];
  completionTrend: TrendData[];
}
```

## 🔌 API Integration

### REST API Examples

```bash
# Create workflow instance
curl -X POST "https://api.fastnext.com/api/v1/workflow-instances" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": 1,
    "entity_id": "ORDER-001",
    "entity_type": "order",
    "data": {"customer_id": 123, "amount": 299.99}
  }'

# Execute transition
curl -X POST "https://api.fastnext.com/api/v1/workflow-instances/1/transition" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "comment": "Order approved"
  }'
```

### Python SDK

```python
from fastnext_workflow import WorkflowAPI

api = WorkflowAPI(base_url="https://api.fastnext.com", token="YOUR_TOKEN")

# Create instance
instance = api.create_instance(
    template_id=1,
    entity_id="ORDER-002",
    entity_type="order",
    data={"customer_id": 456, "amount": 599.99}
)

# Execute transition
result = api.execute_transition(
    instance_id=instance.id,
    action="approve",
    comment="Automatically approved"
)
```

## 🎛️ Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/fastnext
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Performance
WORKERS=4
REDIS_CACHE_TTL=3600
MAX_CONNECTIONS=20
```

### Docker Compose Configuration

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/fastnext
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: fastnext
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data
```

## 🧪 Testing

### Unit Tests

```bash
# Backend tests
cd backend
pytest tests/ -v --cov=app

# Frontend tests
cd frontend
npm test
npm run test:e2e
```

### Load Testing

```bash
# Test workflow performance
cd backend
python -m pytest tests/load/test_workflow_performance.py
```

### Demo Data

```bash
# Load comprehensive demo data
cd backend
python demo_workflow_data.py
```

**Demo includes:**
- 5 workflow types (Order Processing, Invoice Approval, etc.)
- 19 workflow states (complete lifecycle)
- 3 complex templates with advanced features
- Sample instances with real-world data

## 📈 Performance Optimization

### Backend Optimizations

- **Redis Caching**: Connection pooling, multi-strategy caching
- **Database**: Optimized queries, proper indexing
- **Async Processing**: Non-blocking I/O operations
- **Connection Pooling**: Efficient resource management

### Frontend Optimizations

- **React Flow**: Optimized rendering, virtual scrolling
- **Code Splitting**: Lazy loading of components
- **Memoization**: Reduced re-renders
- **Bundle Optimization**: Tree shaking, compression

## 🔐 Security

### Authentication & Authorization

- **JWT Tokens**: Secure authentication
- **Role-based Access**: Granular permissions
- **API Rate Limiting**: DoS protection
- **Input Validation**: SQL injection prevention

### Audit & Compliance

- **Activity Logging**: Complete audit trails
- **State History**: Immutable transaction log
- **Permission Tracking**: Who did what, when
- **Data Encryption**: At rest and in transit

## 🚢 Deployment

### Production Deployment

```bash
# Build and deploy
./deploy.sh prod

# Scale services
docker-compose -f docker-compose.prod.yml up --scale backend=3

# Monitor logs
docker-compose logs -f backend
```

### Health Checks

```bash
# Check system health
curl http://localhost:8000/health
curl http://localhost:3000/api/health
```

### Backup & Recovery

```bash
# Database backup
./deploy.sh backup

# Restore from backup
./deploy.sh restore backup_20240926.sql
```

## 📚 Documentation

- **[Complete System Documentation](./docs/WORKFLOW_SYSTEM.md)**: Comprehensive guide
- **[API Reference](./docs/WORKFLOW_API_GUIDE.md)**: Detailed API documentation
- **[Tutorial](./docs/WORKFLOW_TUTORIAL.md)**: Step-by-step learning guide
- **[Best Practices](./docs/WORKFLOW_SYSTEM.md#best-practices)**: Design guidelines

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork the repository
git clone <your-fork>
cd FastNext

# Install dependencies
cd backend && pip install -r requirements/dev.txt
cd ../frontend && npm install

# Run tests
npm run test
pytest

# Start development
./deploy.sh dev
```

### Code Standards

- **Python**: Black formatting, type hints, docstrings
- **TypeScript**: ESLint, Prettier, strict mode
- **Commits**: Conventional commits format
- **Testing**: Minimum 80% coverage

## 🗺️ Roadmap

### Version 1.1 (Q1 2025)
- [ ] Real-time collaboration
- [ ] Workflow versioning
- [ ] Advanced analytics
- [ ] Mobile responsive design

### Version 1.2 (Q2 2025)
- [ ] Workflow marketplace
- [ ] AI-powered optimization
- [ ] Multi-tenant support
- [ ] GraphQL API

### Version 2.0 (Q3 2025)
- [ ] Distributed execution
- [ ] Event-driven architecture
- [ ] Machine learning integration
- [ ] Advanced monitoring

## 🆘 Support

### Community Support

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/fastnext/workflow/issues)
- **Discord**: [Join our community](https://discord.gg/fastnext)
- **Stack Overflow**: Tag questions with `fastnext-workflow`

### Professional Support

- **Email**: support@fastnext.com
- **Enterprise**: Dedicated support team
- **Training**: Workflow design workshops
- **Consulting**: Custom implementation services

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Flow Team**: For the amazing visual workflow library
- **FastAPI Community**: For the high-performance async framework
- **Contributors**: Everyone who helped build this system

---

<div align="center">

**Built with ❤️ by the FastNext Team**

[Website](https://fastnext.com) • [Documentation](./docs/) • [Community](https://discord.gg/fastnext) • [Support](mailto:support@fastnext.com)

⭐ **Star us on GitHub if this project helped you!** ⭐

</div>
