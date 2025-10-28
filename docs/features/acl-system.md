# FastNext Dynamic ACL System Documentation

## Overview

The FastNext Dynamic Access Control List (ACL) system provides enterprise-grade, per-record permissions with condition-based access control. It enables fine-grained security policies that can evaluate complex business rules in real-time, ensuring users only access data they're authorized to see and modify.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Concepts](#core-concepts)
3. [ACL Components](#acl-components)
4. [Permission Evaluation](#permission-evaluation)
5. [API Reference](#api-reference)
6. [Frontend Components](#frontend-components)
7. [Integration Examples](#integration-examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Architecture

### System Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │   Database      │
│   (Next.js)     │◄──►│    (FastAPI)     │◄──►│  (PostgreSQL)   │
│                 │    │                  │    │                 │
│ • ACL Manager   │    │ • ACL Service    │    │ • ACL Rules     │
│ • Permission UI │    │ • ACL Middleware │    │ • Record Perms  │
│ • Real-time Eval│    │ • Condition Engine│    │ • Audit Logs   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                               │
                        ┌──────▼──────┐
                        │    Redis    │
                        │  (Caching)  │
                        └─────────────┘
```

### Database Schema

The ACL system uses the following main entities:

- **AccessControlList**: Defines permission rules with conditions
- **RecordPermission**: Grants specific permissions on individual records
- **Audit Logs**: Tracks all permission evaluations and decisions

## Core Concepts

### 1. Access Control Lists (ACLs)

ACLs are reusable permission rules that define:
- **Entity Type**: The type of resource (orders, invoices, users, etc.)
- **Operation**: The action being performed (read, write, delete, approve)
- **Field Name**: Optional field-level restrictions
- **Conditions**: Python expressions for dynamic evaluation
- **Role/User Permissions**: Who can access the resource

### 2. Record-Level Permissions

Individual permissions granted on specific records:
- **Entity Type & ID**: Identifies the specific record
- **User/Role**: Who has the permission
- **Operation**: What they can do
- **Expiration**: Optional time-based permissions
- **Conditions**: Additional constraints

### 3. Condition-Based Evaluation

Dynamic permission evaluation using Python expressions:
```python
# Examples of condition expressions
"user.department == 'HR'"
"record.amount <= 1000"
"user.role in ['manager', 'director']"
"datetime.now().hour >= 9 and datetime.now().hour <= 17"
"record.status == 'approved' and user.clearance_level >= 3"
```

## ACL Components

### Backend Models

#### AccessControlList
```python
class AccessControlList(Base):
    id: int
    name: str                    # Unique rule name
    description: str
    entity_type: str            # Resource type
    operation: str              # read, write, delete, approve
    field_name: str             # Optional field restriction
    condition_script: str       # Python evaluation expression
    allowed_roles: List[str]    # Permitted roles
    denied_roles: List[str]     # Explicitly denied roles
    allowed_users: List[int]    # Specific user IDs
    denied_users: List[int]     # Denied user IDs
    priority: int               # Evaluation order (higher = first)
    requires_approval: bool     # Triggers approval workflow
    approval_workflow_id: int   # Linked approval process
    is_active: bool
```

#### RecordPermission
```python
class RecordPermission(Base):
    id: int
    entity_type: str
    entity_id: str
    user_id: int                # Optional user-specific
    role_id: int                # Optional role-based
    operation: str
    granted_by: int
    granted_at: datetime
    expires_at: datetime        # Optional expiration
    conditions: dict           # Additional constraints
    is_active: bool
```

### ACL Service

The ACLService handles all permission evaluation logic:

```python
class ACLService:
    @staticmethod
    def evaluate_condition(condition_script: str, context: dict) -> bool:
        """Safely evaluate Python expressions with context variables"""

    @staticmethod
    def check_record_access(user, entity_type, entity_id, operation) -> (bool, str):
        """Check if user can perform operation on specific record"""

    @staticmethod
    def check_field_access(user, entity_type, field_name, operation) -> (bool, str):
        """Check field-level permissions"""

    @staticmethod
    def grant_record_permission(entity_type, entity_id, user_id, operation) -> RecordPermission:
        """Grant specific permission on a record"""
```

### ACL Middleware

Automatic permission checking on all API requests:

```python
class ACLMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Extract entity info from URL
        entity_info = self._extract_entity_info(request)

        if entity_info and user:
            has_access, reason = self._check_request_permissions(user, entity_info)
            if not has_access:
                return JSONResponse(status_code=403, detail=f"Access denied: {reason}")

        return await call_next(request)
```

## Permission Evaluation

### Evaluation Flow

1. **Record-Specific Check**: First check for explicit record permissions
2. **ACL Evaluation**: If no record permissions, evaluate applicable ACLs
3. **Priority Ordering**: ACLs evaluated by priority (highest first)
4. **Condition Evaluation**: Execute condition scripts with safe context
5. **Role/User Matching**: Check allowed/denied roles and users
6. **Final Decision**: Return access granted/denied with reason

### Context Variables

Available in condition expressions:
```python
context = {
    'user': user_object,
    'user_id': user.id,
    'user_roles': ['admin', 'manager'],
    'entity_data': record_data,
    'context': additional_context,
    'datetime': datetime_module,
    # ... other safe modules
}
```

### Safe Evaluation

Conditions are evaluated in a restricted environment:
- **Allowed Modules**: `str`, `int`, `float`, `bool`, `len`, `datetime`
- **Operators**: Standard Python operators and comparisons
- **Timeout**: 5-second execution limit
- **Memory Limits**: Prevent resource exhaustion

## API Reference

### ACL Management

#### GET /api/v1/acls
List all ACL rules with filtering and pagination.

**Parameters:**
- `entity_type`: Filter by resource type
- `operation`: Filter by operation
- `active_only`: Show only active rules

#### POST /api/v1/acls
Create a new ACL rule.

**Request Body:**
```json
{
  "name": "order_approval_acl",
  "description": "Orders over $5000 require approval",
  "entity_type": "orders",
  "operation": "approve",
  "condition_script": "entity_data['total_amount'] > 5000",
  "allowed_roles": ["manager", "director"],
  "priority": 100,
  "requires_approval": true,
  "approval_workflow_id": 1
}
```

#### PUT /api/v1/acls/{id}
Update an existing ACL rule.

#### DELETE /api/v1/acls/{id}
Delete an ACL rule.

### Record Permissions

#### GET /api/v1/acls/record-permissions
List record permissions with filtering.

#### POST /api/v1/acls/record-permissions
Grant a record permission.

**Request Body:**
```json
{
  "entity_type": "orders",
  "entity_id": "order_123",
  "user_id": 456,
  "operation": "write",
  "expires_at": "2024-12-31T23:59:59Z",
  "conditions": {
    "department": "sales"
  }
}
```

#### DELETE /api/v1/acls/record-permissions/{id}
Revoke a record permission.

### Permission Checking

#### POST /api/v1/acls/check-permission
Manually check permissions for testing.

**Request Body:**
```json
{
  "entity_type": "orders",
  "entity_id": "order_123",
  "operation": "read"
}
```

**Response:**
```json
{
  "has_access": true,
  "reason": "ACL 'order_read_acl' allows access: User role 'manager' is allowed",
  "evaluated_acls": 3,
  "execution_time_ms": 45
}
```

## Frontend Components

### ACL Manager

Main interface for managing ACL rules:

```typescript
interface ACLManagerProps {
  onRuleCreated?: (rule: ACL) => void;
  onRuleUpdated?: (rule: ACL) => void;
  onRuleDeleted?: (ruleId: number) => void;
  showAdvanced?: boolean;
}

// Usage
<ACLManager
  onRuleCreated={handleRuleCreated}
  showAdvanced={true}
/>
```

### Permission Tester

Real-time permission testing interface:

```typescript
interface PermissionTesterProps {
  entityTypes: string[];
  operations: string[];
  onTestResult?: (result: PermissionCheckResult) => void;
}
```

### ACL Rule Builder

Visual rule creation with condition builder:

```typescript
interface ACLRuleBuilderProps {
  initialRule?: Partial<ACL>;
  onSave: (rule: ACL) => Promise<void>;
  onCancel: () => void;
}
```

## Integration Examples

### 1. Order Approval Workflow

```python
# ACL for high-value orders
high_value_acl = AccessControlList(
    name="high_value_order_acl",
    entity_type="orders",
    operation="approve",
    condition_script="entity_data['total_amount'] > 5000",
    allowed_roles=["manager", "director"],
    requires_approval=True,
    approval_workflow_id=approval_workflow.id
)

# Grant temporary permission
temp_permission = ACLService.grant_record_permission(
    entity_type="orders",
    entity_id="order_123",
    user_id=manager.id,
    operation="approve",
    expires_at=datetime.now() + timedelta(hours=24)
)
```

### 2. Department-Based Access

```python
# HR can only see their department's employees
hr_acl = AccessControlList(
    name="hr_department_acl",
    entity_type="users",
    operation="read",
    condition_script="""
    entity_data['department'] == user.department or
    user.role in ['hr_director', 'admin']
    """,
    allowed_roles=["hr_manager", "hr_specialist"]
)
```

### 3. Time-Based Permissions

```python
# Contractors can only access during business hours
contractor_acl = AccessControlList(
    name="contractor_hours_acl",
    entity_type="projects",
    operation="write",
    condition_script="""
    user.role == 'contractor' and (
        datetime.now().hour < 9 or datetime.now().hour > 17 or
        datetime.now().weekday() >= 5
    )
    """,
    denied_roles=["contractor"]
)
```

### 4. Frontend Integration

```typescript
// Check permission before showing action
const canApprove = await checkPermission({
  entity_type: 'orders',
  entity_id: orderId,
  operation: 'approve'
});

if (canApprove.has_access) {
  showApproveButton();
}

// Real-time permission updates
useEffect(() => {
  const subscription = subscribeToPermissionChanges(user.id, (change) => {
    if (change.entity_type === 'orders' && change.entity_id === orderId) {
      refreshPermissions();
    }
  });

  return () => subscription.unsubscribe();
}, [orderId]);
```

## Best Practices

### 1. ACL Design

#### Keep Conditions Simple
```python
# Good
"record.amount > 1000"

# Avoid
"record.amount > 1000 and (user.department == 'sales' or record.region in user.regions) and datetime.now().hour >= 9"
```

#### Use Descriptive Names
```python
# Good
name="manager_order_approval"

# Avoid
name="acl_rule_1"
```

#### Set Appropriate Priorities
- **High Priority (200+)**: Security-critical rules
- **Medium Priority (100-199)**: Business rules
- **Low Priority (<100)**: Default allow rules

### 2. Performance Optimization

#### Cache ACL Evaluations
```python
# Cache permission results for 5 minutes
@cache(expire=300)
def check_user_permission(user_id, entity_type, entity_id, operation):
    return ACLService.check_record_access(user_id, entity_type, entity_id, operation)
```

#### Index Database Fields
```sql
CREATE INDEX idx_acl_entity_operation ON access_control_lists(entity_type, operation);
CREATE INDEX idx_record_perm_entity ON record_permissions(entity_type, entity_id);
```

#### Limit Condition Complexity
- Keep conditions under 500 characters
- Avoid expensive operations (database queries in conditions)
- Use pre-computed values when possible

### 3. Security Considerations

#### Principle of Least Privilege
- Grant minimum required permissions
- Use role-based access over user-specific
- Implement time-based expiration for sensitive permissions

#### Audit All Changes
```python
# Log all ACL modifications
@logger.log_action('acl_modified')
def update_acl(acl_id, changes):
    # Implementation
    pass
```

#### Regular Reviews
- Review ACL rules quarterly
- Audit permission usage patterns
- Remove unused permissions

### 4. Testing Strategies

#### Unit Tests
```python
def test_acl_condition_evaluation():
    context = {
        'user': {'role': 'manager'},
        'entity_data': {'amount': 1500}
    }

    result = ACLService.evaluate_condition(
        "entity_data['amount'] > 1000 and user['role'] == 'manager'",
        context
    )

    assert result is True
```

#### Integration Tests
```python
def test_record_permission_workflow(client):
    # Create ACL
    acl = client.post('/api/v1/acls', json=acl_data)

    # Grant record permission
    permission = client.post('/api/v1/acls/record-permissions', json=perm_data)

    # Test access
    response = client.get(f'/api/v1/orders/{order_id}')
    assert response.status_code == 200
```

## Troubleshooting

### Common Issues

#### 1. Permission Denied Errors

**Symptoms:**
- Users can't access expected resources
- Inconsistent permission behavior

**Causes:**
- ACL priority conflicts
- Condition evaluation errors
- Missing role assignments

**Solutions:**
```python
# Debug permission evaluation
debug_result = ACLService.check_record_access(
    user=user,
    entity_type='orders',
    entity_id='123',
    operation='read',
    debug=True  # Enable detailed logging
)
print(f"Debug result: {debug_result}")
```

#### 2. Slow Permission Checks

**Symptoms:**
- API response times > 500ms
- High database load

**Causes:**
- Complex condition expressions
- Missing database indexes
- Inefficient ACL queries

**Solutions:**
```sql
-- Add performance indexes
CREATE INDEX CONCURRENTLY idx_acl_lookup
ON access_control_lists(entity_type, operation, is_active, priority DESC);

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM access_control_lists
WHERE entity_type = 'orders' AND operation = 'read' AND is_active = true
ORDER BY priority DESC;
```

#### 3. Condition Evaluation Errors

**Symptoms:**
- ACL rules not working as expected
- Error logs showing evaluation failures

**Causes:**
- Syntax errors in condition scripts
- Missing context variables
- Unsafe operations in conditions

**Solutions:**
```python
# Test condition evaluation
try:
    result = ACLService.evaluate_condition(
        condition_script,
        context_variables
    )
except ACLEvaluationError as e:
    print(f"Condition error: {e}")
    # Fix syntax or provide missing variables
```

#### 4. Memory Issues

**Symptoms:**
- Application crashes with memory errors
- Slow performance under load

**Causes:**
- Large context objects in conditions
- Memory leaks in evaluation engine
- Too many concurrent evaluations

**Solutions:**
```python
# Limit context size
MAX_CONTEXT_SIZE = 1024 * 1024  # 1MB

def sanitize_context(context):
    # Remove large objects
    # Limit array sizes
    # Sanitize sensitive data
    pass
```

### Debug Tools

#### Permission Audit Log
```python
# Enable detailed logging
import logging
logging.getLogger('acl_service').setLevel(logging.DEBUG)

# Check audit logs
audit_logs = db.query(AuditLog).filter(
    AuditLog.action == 'permission_check',
    AuditLog.user_id == user_id
).order_by(AuditLog.timestamp.desc()).limit(10)
```

#### Performance Monitoring
```python
# Monitor evaluation times
@timer
def check_permission_with_metrics(user, entity_type, entity_id, operation):
    start_time = time.time()
    result = ACLService.check_record_access(user, entity_type, entity_id, operation)
    duration = time.time() - start_time

    metrics.histogram('acl_evaluation_duration').observe(duration)
    return result
```

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| ACL001 | Condition evaluation failed | Check condition syntax and context variables |
| ACL002 | ACL not found | Verify ACL exists and is active |
| ACL003 | Permission denied | Check user roles and ACL rules |
| ACL004 | Database connection error | Check database connectivity |
| ACL005 | Context too large | Reduce context size or optimize conditions |
| ACL006 | Timeout exceeded | Simplify condition or increase timeout limit |

---

**Last Updated:** 2025-01-15
**Version:** 1.0.0
**Author:** FastNext Security Team