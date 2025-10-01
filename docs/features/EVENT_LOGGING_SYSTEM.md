# Event Logging & Activity Monitoring System

## Overview

FastNext includes a comprehensive event logging and activity monitoring system inspired by VerifyWise's WatchTower Events implementation. This system provides enterprise-grade audit trails, security monitoring, and real-time event tracking capabilities.

## 🚀 Features

### Core Capabilities
- **Comprehensive Event Tracking** - Authentication, data operations, security events, API calls
- **Real-time Monitoring** - Live event dashboard with auto-refresh
- **Advanced Analytics** - Event statistics, trends, and insights
- **Risk Assessment** - Event scoring and impact analysis
- **Audit Compliance** - Complete audit trails for regulatory requirements
- **Export Capabilities** - JSON and CSV export with advanced filtering

### Event Categories
- **Authentication** - Login/logout events, failed attempts
- **Authorization** - Permission changes, access control
- **User Management** - User creation, updates, role assignments
- **Data Management** - CRUD operations, data exports/imports
- **System Management** - Configuration changes, system events
- **Security** - Security incidents, suspicious activities
- **Workflow** - Workflow executions, state changes
- **API** - API calls, rate limiting, errors
- **File Management** - File uploads, downloads, shares
- **Configuration** - System configuration changes

## 🏗️ Architecture

### Backend Components

#### 1. Enhanced Activity Log Model
**Location**: `backend/app/models/activity_log.py`

```python
class ActivityLog(Base):
    # Event identification
    event_id = Column(String(36), unique=True, index=True)
    correlation_id = Column(String(36), index=True)
    
    # Event categorization
    category = Column(Enum(EventCategory), nullable=False, index=True)
    action = Column(Enum(ActivityAction), nullable=False, index=True)
    
    # Enhanced metadata
    metadata = Column(JSON, nullable=True)
    request_headers = Column(JSON, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    risk_score = Column(Integer, nullable=True)
    
    # Geographic and session info
    country_code = Column(String(2), nullable=True)
    city = Column(String(100), nullable=True)
    session_id = Column(String(100), nullable=True)
```

#### 2. Enhanced Logger Utility
**Location**: `backend/app/utils/enhanced_logger.py`

Key features:
- Dual logging (database + file)
- Structured JSON logs with daily rotation
- Geographic IP tracking
- Request/response correlation
- Risk scoring algorithms

```python
# Example usage
from app.utils.enhanced_logger import enhanced_logger, log_authentication_event

# Log authentication event
log_authentication_event(
    db=db,
    action=ActivityAction.LOGIN,
    user_id=user.id,
    username=user.username,
    success=True,
    request=request
)

# Log custom event
enhanced_logger.log_event(
    db=db,
    category=EventCategory.SECURITY,
    action=ActivityAction.SECURITY_EVENT,
    entity_type="security",
    description="Suspicious login attempt detected",
    level=ActivityLevel.WARNING,
    risk_score=75,
    metadata={"ip_address": "192.168.1.100", "attempts": 5}
)
```

#### 3. Event API Endpoints
**Location**: `backend/app/api/v1/events.py`

**Available Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/events` | GET | Get filtered events with pagination |
| `/api/v1/events/statistics` | GET | Get event statistics for dashboard |
| `/api/v1/events/{event_id}` | GET | Get specific event details |
| `/api/v1/logs` | GET | Get logs from file (VerifyWise-inspired) |
| `/api/v1/events/export` | GET | Export events (JSON/CSV) |
| `/api/v1/events/cleanup` | DELETE | Cleanup old events |
| `/api/v1/events/levels` | GET | Get available event levels |
| `/api/v1/events/categories` | GET | Get available categories |
| `/api/v1/events/actions` | GET | Get available actions |

### Frontend Components

#### 1. Events Dashboard Page
**Location**: `frontend/src/app/admin/events/page.tsx`

Features:
- Real-time event monitoring with statistics cards
- Advanced search and filtering capabilities
- Event level visualization with color coding
- Auto-refresh functionality (configurable intervals)
- Analytics tab with charts and insights
- Export functionality (JSON/CSV)

#### 2. Event Detail Dialog
**Location**: `frontend/src/modules/admin/components/EventDetailDialog.tsx`

Provides comprehensive event inspection with:
- Event overview with risk assessment
- Request/response details
- Metadata visualization
- Raw JSON data view
- Copy-to-clipboard functionality

#### 3. Event Hooks & Types
**Location**: `frontend/src/modules/admin/hooks/useEvents.ts` & `frontend/src/modules/admin/types/events.ts`

React Query hooks for:
- Event fetching with caching
- Real-time statistics
- Export functionality
- File-based log retrieval

## 📊 Event Dashboard

### Statistics Overview
The dashboard provides real-time metrics including:
- **Total Events** - Events in selected time range
- **Active Users** - Unique users with recent activity
- **Critical Events** - High-priority events requiring attention
- **Error Rate** - Percentage of error/critical events

### Event Filtering
Advanced filtering options:
- **Level**: Debug, Info, Warning, Error, Critical
- **Category**: Authentication, Security, Data Management, etc.
- **Action**: Create, Read, Update, Delete, Login, etc.
- **User**: Filter by specific user ID
- **Date Range**: Custom date range selection
- **Risk Score**: Low (0-30), Medium (31-70), High (71-100)

### Analytics Features
- **Event Distribution** - By level and category
- **Top Active Users** - Users with most events
- **Recent Critical Events** - Latest high-priority events
- **Trend Analysis** - Event patterns over time

## 🔧 Configuration

### Environment Variables
```bash
# Event logging configuration
LOG_LEVEL=INFO
LOG_FILE_RETENTION_DAYS=30
EVENT_CLEANUP_DAYS=90

# Performance settings
EVENT_PAGINATION_LIMIT=500
STATISTICS_CACHE_SECONDS=30
```

### Database Settings
The enhanced activity log requires database migration:

```bash
# Generate migration
alembic revision --autogenerate -m "enhance_activity_log_for_events"

# Apply migration
alembic upgrade head
```

## 🚨 Security Features

### Risk Scoring
Events are automatically assigned risk scores (0-100) based on:
- Event type and severity
- User behavior patterns
- Geographic anomalies
- Failed authentication attempts
- Suspicious API usage

### Audit Compliance
The system provides:
- **Immutable Event Records** - Events cannot be modified after creation
- **Complete Audit Trails** - Full request/response logging
- **Retention Policies** - Configurable data retention
- **Export Capabilities** - Compliance reporting

### Security Event Detection
Automatic detection and logging of:
- Failed login attempts
- Permission escalation
- Unusual data access patterns
- API abuse patterns
- Geographic anomalies

## 📈 Monitoring & Alerting

### Real-time Monitoring
- **Auto-refresh Dashboard** - Configurable refresh intervals
- **Event Streaming** - Ready for WebSocket integration
- **Critical Event Highlighting** - Visual indicators for high-risk events

### Future Enhancements
- **WebSocket Integration** - Real-time event streaming
- **Email Alerts** - Automated notifications for critical events
- **Slack Integration** - Team notifications
- **Custom Dashboards** - User-configurable monitoring views

## 🔄 Integration Guide

### Adding Event Logging to Your Code

#### 1. Authentication Events
```python
from app.utils.enhanced_logger import log_authentication_event

# In your login endpoint
log_authentication_event(
    db=db,
    action=ActivityAction.LOGIN,
    user_id=user.id,
    username=user.username,
    success=True,
    request=request
)
```

#### 2. Data Operations
```python
from app.utils.enhanced_logger import log_data_operation

# In your CRUD operations
log_data_operation(
    db=db,
    action=ActivityAction.CREATE,
    entity_type="project",
    entity_id=project.id,
    entity_name=project.name,
    user_id=current_user.id,
    username=current_user.username,
    description=f"Created project: {project.name}",
    request=request
)
```

#### 3. Security Events
```python
from app.utils.enhanced_logger import log_security_event

# For security incidents
log_security_event(
    db=db,
    description="Suspicious API usage detected",
    level=ActivityLevel.WARNING,
    user_id=user.id,
    username=user.username,
    request=request,
    risk_score=65,
    metadata={
        "api_calls_per_minute": 1000,
        "suspicious_patterns": ["rapid_requests", "unusual_endpoints"]
    }
)
```

### Middleware Integration
The enhanced logger can be integrated into FastAPI middleware for automatic API call logging:

```python
# In your middleware
from app.utils.enhanced_logger import log_api_call

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    response_time = int((time.time() - start_time) * 1000)
    
    # Log API call
    log_api_call(
        db=get_db_session(),
        request=request,
        response_time_ms=response_time,
        status_code=response.status_code,
        user_id=getattr(request.state, 'user_id', None),
        username=getattr(request.state, 'username', None)
    )
    
    return response
```

## 📚 API Reference

### Event Query Parameters
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 50, max: 500)
- `level` (string): Filter by event level
- `category` (string): Filter by event category
- `action` (string): Filter by event action
- `user_id` (int): Filter by user ID
- `start_date` (string): Start date (ISO format)
- `end_date` (string): End date (ISO format)
- `search_query` (string): Search in description, entity name, username

### Event Response Format
```json
{
  "eventId": "uuid",
  "correlationId": "uuid",
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "category": "authentication",
  "action": "login",
  "user": {
    "id": 1,
    "username": "john.doe"
  },
  "entity": {
    "type": "auth",
    "id": "1",
    "name": "john.doe"
  },
  "request": {
    "method": "POST",
    "path": "/api/v1/auth/login",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "statusCode": 200,
    "responseTime": 150
  },
  "location": {
    "country": "US",
    "city": "New York"
  },
  "description": "User john.doe login successful",
  "metadata": {
    "device_type": "desktop",
    "browser": "chrome"
  },
  "riskScore": 0,
  "system": {
    "server": "app-server-1",
    "environment": "production",
    "version": "1.0.0"
  }
}
```

## 🎯 Best Practices

### 1. Event Categorization
- Use appropriate categories for different types of events
- Implement consistent naming conventions
- Include relevant metadata for troubleshooting

### 2. Risk Assessment
- Assign meaningful risk scores based on event impact
- Consider user behavior patterns
- Monitor geographic anomalies

### 3. Performance Optimization
- Use async logging for high-volume events
- Implement proper indexing on frequently queried fields
- Consider log rotation and archival strategies

### 4. Privacy Compliance
- Avoid logging sensitive data (passwords, tokens)
- Implement data retention policies
- Provide data export capabilities for GDPR compliance

## 🔍 Troubleshooting

### Common Issues

#### 1. High Volume Performance
- **Problem**: Slow event logging affecting API performance
- **Solution**: Implement async logging, database connection pooling

#### 2. Disk Space Usage
- **Problem**: Log files consuming too much disk space
- **Solution**: Configure log rotation, implement cleanup policies

#### 3. Missing Events
- **Problem**: Some events not being logged
- **Solution**: Check middleware integration, verify database connections

### Monitoring Health
- Monitor log file sizes and rotation
- Check database performance metrics
- Verify event processing queues
- Monitor API response times

## 📋 Maintenance

### Regular Tasks
1. **Log Rotation** - Automated daily log file rotation
2. **Database Cleanup** - Regular cleanup of old events based on retention policy
3. **Index Optimization** - Monitor and optimize database indexes
4. **Export Archives** - Regular export of historical data for compliance

### Performance Monitoring
- Track event logging performance metrics
- Monitor database query performance
- Analyze event volume trends
- Optimize based on usage patterns

---

*For more information about specific implementation details, see the API documentation and code comments in the respective files.*