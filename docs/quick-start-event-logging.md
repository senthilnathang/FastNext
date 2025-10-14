# Quick Start: Event Logging System

## 🚀 Getting Started with Event Logging

The FastNext Event Logging System provides comprehensive activity monitoring and audit trails. Here's how to quickly get started.

## 📋 Prerequisites

- FastNext application running (backend + frontend)
- Admin user access
- Database migrations applied

## 🎯 Quick Access

### 1. Access the Event Dashboard
1. Log in to FastNext with admin credentials
2. Navigate to **Admin → Event Logs** in the sidebar
3. The dashboard will show real-time event statistics and recent activity

### 2. View Event Details
- Click the **eye icon** (👁️) on any event to see detailed information
- Use the tabs to explore different aspects:
  - **Overview**: Basic event information and risk assessment
  - **Request**: HTTP request details and response times
  - **Metadata**: Structured event metadata
  - **Raw**: Complete JSON data for debugging

### 3. Filter and Search Events
- Use the **Advanced Search** to filter by:
  - Event level (Debug, Info, Warning, Error, Critical)
  - Category (Authentication, Security, Data Management, etc.)
  - Date range
  - User ID
  - Risk score
- Use **full-text search** to find specific events

## 🔧 Basic Integration

### Add Event Logging to Your Code

#### 1. Authentication Events
```python
from app.utils.enhanced_logger import log_authentication_event

# In your login endpoint
await log_authentication_event(
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
await log_data_operation(
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

# For suspicious activities
await log_security_event(
    db=db,
    description="Multiple failed login attempts",
    level=ActivityLevel.WARNING,
    user_id=user.id,
    username=user.username,
    request=request,
    risk_score=75
)
```

## 📊 Dashboard Features

### Statistics Cards
- **Total Events**: Events in selected time range
- **Active Users**: Users with recent activity
- **Critical Events**: High-priority events requiring attention
- **Error Rate**: Percentage of error/critical events

### Event Table
- **Real-time updates**: Auto-refresh every 30 seconds
- **Color-coded levels**: Visual indicators for event severity
- **Risk scoring**: 0-100 risk assessment for each event
- **Quick actions**: View details, export data

### Analytics Tab
- **Event distribution** by level and category
- **Top active users** with event counts
- **Recent critical events** requiring attention
- **Trend analysis** over time

## 🔍 Common Use Cases

### 1. Security Monitoring
- Monitor failed login attempts
- Track permission changes
- Identify suspicious activities
- Analyze geographic anomalies

### 2. Audit Compliance
- Generate compliance reports
- Track data access patterns
- Monitor administrative actions
- Export audit trails

### 3. Performance Analysis
- Monitor API response times
- Track high-volume operations
- Identify bottlenecks
- Analyze user behavior patterns

### 4. Troubleshooting
- Debug application issues
- Trace user session problems
- Identify error patterns
- Monitor system health

## 📈 Export and Reporting

### Export Data
1. Click the **Export** dropdown in the dashboard
2. Choose format: **JSON** or **CSV**
3. Apply filters before export if needed
4. File downloads automatically with current date

### API Access
Use the REST API for programmatic access:

```bash
# Get recent events
curl -X GET "http://localhost:8000/api/v1/events?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get event statistics
curl -X GET "http://localhost:8000/api/v1/events/statistics?hours=24" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Export events
curl -X GET "http://localhost:8000/api/v1/events/export?format=json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## ⚙️ Configuration

### Environment Variables
```bash
# Log retention (default: 90 days)
EVENT_CLEANUP_DAYS=90

# Auto-refresh interval (default: 30 seconds)
EVENT_REFRESH_INTERVAL=30

# Maximum export size (default: 10000)
EVENT_EXPORT_LIMIT=10000
```

### Dashboard Settings
- **Auto-refresh**: Toggle automatic refresh on/off
- **Refresh interval**: Configure update frequency (30s-5m)
- **Time range**: Select monitoring period (1h-1week)
- **Filters**: Save common filter combinations

## 🚨 Alerts and Notifications

### Critical Event Detection
The system automatically identifies critical events:
- Multiple failed login attempts
- Permission escalation activities
- High-risk score events (>70)
- Unusual geographic access patterns

### Future Enhancements
- **Email alerts** for critical events
- **Slack notifications** for team awareness
- **Custom alert rules** based on patterns
- **Real-time WebSocket updates**

## 🔧 Troubleshooting

### Common Issues

#### Events Not Appearing
1. Check database connection
2. Verify API endpoints are accessible
3. Ensure proper authentication
4. Check browser console for errors

#### Performance Issues
1. Apply date range filters
2. Limit result size
3. Check database indexes
4. Monitor server resources

#### Missing Event Details
1. Verify middleware integration
2. Check enhanced logger configuration
3. Ensure proper imports in code
4. Review error logs

### Support Resources
- **Full Documentation**: [Event Logging System Guide](EVENT_LOGGING_SYSTEM.md)
- **API Reference**: Available at `/docs#/v1-events`
- **Code Examples**: Check `backend/app/utils/enhanced_logger.py`
- **Test Implementation**: See backend test files

## 🎯 Next Steps

1. **Explore the Dashboard**: Familiarize yourself with all features
2. **Integrate Logging**: Add event logging to your custom endpoints
3. **Set Up Monitoring**: Configure alerts for your use case
4. **Customize Filters**: Create saved filter combinations
5. **Export Reports**: Generate regular compliance reports

---

*For more advanced features and detailed configuration options, see the complete [Event Logging System Guide](EVENT_LOGGING_SYSTEM.md).*
