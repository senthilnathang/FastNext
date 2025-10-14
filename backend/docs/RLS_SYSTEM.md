# Row Level Security (RLS) System Documentation

## Overview

FastNext includes a comprehensive Row Level Security (RLS) system that provides fine-grained access control at the database row level. This system allows you to define policies that control which rows users can access based on their identity, role, organization membership, and custom conditions.

## Core Components

### 1. **Database Models**

#### RLS Policy Model
```python
class RowLevelSecurityPolicy(SQLAlchemyBase):
    """Main policy definition for RLS rules"""
    name: str                    # Policy name
    description: str             # Policy description
    entity_type: RLSEntityType   # Target entity (USER, PROJECT, etc.)
    table_name: str             # Database table name
    policy_type: RLSPolicy      # Policy type (OWNER_ONLY, PUBLIC, etc.)
    action: RLSAction           # Action type (SELECT, INSERT, UPDATE, DELETE, ALL)
    condition_column: str       # Column for conditions
    custom_condition: str       # Custom SQL condition
    priority: int               # Policy priority (higher = first evaluated)
    is_active: bool            # Policy status
    organization_id: int       # Optional organization scope
```

#### RLS Context Model
```python
class RLSContext(SQLAlchemyBase):
    """User session context for RLS evaluation"""
    session_id: str            # Unique session identifier
    user_id: int              # User ID
    organization_id: int      # Current organization
    project_ids: List[int]    # Accessible project IDs
    roles: List[str]          # User roles
    permissions: List[str]    # User permissions
    tenant_id: str           # Multi-tenant identifier
    expires_at: datetime     # Context expiration
```

#### RLS Audit Log Model
```python
class RLSAuditLog(SQLAlchemyBase):
    """Audit trail for RLS access attempts"""
    session_id: str           # Session identifier
    user_id: int             # User making request
    policy_id: int           # Applied policy ID
    entity_type: RLSEntityType  # Target entity type
    entity_id: int           # Target entity ID
    action: RLSAction        # Attempted action
    access_granted: bool     # Whether access was granted
    denial_reason: str       # Reason if access denied
    table_name: str         # Target table
    execution_time_ms: float # Query execution time
```

### 2. **Policy Types**

```python
class RLSPolicy(Enum):
    """Available RLS policy types"""
    DENY_ALL = "deny_all"                    # Deny all access
    PUBLIC = "public"                        # Allow all access
    OWNER_ONLY = "owner_only"               # Only resource owner
    ORGANIZATION_MEMBER = "organization_member"  # Organization members
    PROJECT_MEMBER = "project_member"        # Project team members
    ROLE_BASED = "role_based"               # Based on user roles
    CONDITIONAL = "conditional"             # Custom SQL conditions
    TIME_BASED = "time_based"              # Time-based access
    IP_RESTRICTED = "ip_restricted"         # IP-based restrictions
```

### 3. **Action Types**

```python
class RLSAction(Enum):
    """RLS actions that can be controlled"""
    SELECT = "select"      # Read access
    INSERT = "insert"      # Create access
    UPDATE = "update"      # Modify access
    DELETE = "delete"      # Delete access
    ALL = "all"           # All operations
```

### 4. **Entity Types**

```python
class RLSEntityType(Enum):
    """Entities that can have RLS policies"""
    USER = "user"
    PROJECT = "project"
    ORGANIZATION = "organization"
    DOCUMENT = "document"
    WORKFLOW = "workflow"
    CUSTOM = "custom"
```

## RLS Service Layer

### Core Service Methods

```python
class RLSService:
    """Main service for RLS operations"""

    def create_context(self, user: User, session_id: str, **kwargs) -> RLSContext:
        """Create RLS context for user session"""

    def check_access(self, user_id: int, entity_type: RLSEntityType,
                    action: RLSAction, **kwargs) -> tuple[bool, str]:
        """Check if user has access to perform action"""

    def apply_rls_filter(self, query: Query, user_id: int,
                        entity_type: RLSEntityType, action: RLSAction) -> Query:
        """Apply RLS filters to database query"""

    def get_applicable_policies(self, entity_type: RLSEntityType,
                               action: RLSAction, user_id: int) -> List[RowLevelSecurityPolicy]:
        """Get policies applicable to user for specific action"""

    def create_policy(self, name: str, entity_type: RLSEntityType,
                     policy_type: RLSPolicy, **kwargs) -> RowLevelSecurityPolicy:
        """Create new RLS policy"""
```

## Usage Examples

### 1. **Creating RLS Policies**

```python
from app.services.rls_service import RLSService

rls_service = RLSService(db_session)

# Owner-only policy for projects
project_policy = rls_service.create_policy(
    name="Project Owner Access",
    entity_type=RLSEntityType.PROJECT,
    table_name="projects",
    policy_type=RLSPolicy.OWNER_ONLY,
    action=RLSAction.ALL,
    condition_column="user_id",
    priority=100
)

# Organization member policy
org_policy = rls_service.create_policy(
    name="Organization Member Access",
    entity_type=RLSEntityType.PROJECT,
    table_name="projects",
    policy_type=RLSPolicy.ORGANIZATION_MEMBER,
    action=RLSAction.SELECT,
    organization_id=organization.id,
    priority=50
)

# Conditional policy with custom SQL
conditional_policy = rls_service.create_policy(
    name="Public Projects Access",
    entity_type=RLSEntityType.PROJECT,
    table_name="projects",
    policy_type=RLSPolicy.CONDITIONAL,
    action=RLSAction.SELECT,
    custom_condition="is_public = true",
    priority=25
)
```

### 2. **Using RLS in API Endpoints**

```python
from fastapi import Depends
from app.services.rls_service import RLSService
from app.api.deps.auth import get_current_user

@router.get("/projects/{project_id}")
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    rls_service: RLSService = Depends(get_rls_service)
):
    # Check access
    access_granted, reason = rls_service.check_access(
        user_id=current_user.id,
        entity_type=RLSEntityType.PROJECT,
        action=RLSAction.SELECT,
        entity_id=project_id
    )

    if not access_granted:
        raise HTTPException(status_code=403, detail=reason)

    # Apply RLS filter to query
    query = db.query(Project).filter(Project.id == project_id)
    filtered_query = rls_service.apply_rls_filter(
        query=query,
        user_id=current_user.id,
        entity_type=RLSEntityType.PROJECT,
        action=RLSAction.SELECT
    )

    project = filtered_query.first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project
```

### 3. **Creating User Context**

```python
@router.post("/auth/login")
async def login(
    credentials: LoginRequest,
    rls_service: RLSService = Depends(get_rls_service)
):
    # Authenticate user
    user = authenticate_user(credentials.email, credentials.password)

    # Create RLS context
    session_id = generate_session_id()
    context = rls_service.create_context(
        user=user,
        session_id=session_id,
        organization_id=user.default_organization_id
    )

    # Generate JWT with session ID
    token = create_access_token(
        data={"user_id": user.id, "session_id": session_id}
    )

    return {"access_token": token, "token_type": "bearer"}
```

## Frontend Integration

### 1. **RLS Administration Interface**

The frontend includes comprehensive RLS management in the admin section:

- **Policies Management**: `/admin/rls/policies`
- **Assignments Management**: `/admin/rls/assignments`
- **Audit Logs**: `/admin/rls/audit`
- **RLS Dashboard**: `/admin/rls`

### 2. **RLS Components**

```typescript
// RLS Policy Manager Component
import { RLSPolicyManager } from '@/modules/rls/components/RLSPolicyManager'

// RLS Dashboard Component
import { RLSDashboard } from '@/modules/rls/components/RLSDashboard'

// RLS Audit Viewer Component
import { RLSAuditViewer } from '@/modules/rls/components/RLSAuditViewer'

// RLS Protected Component
import { RLSProtectedComponent } from '@/modules/rls/components/RLSProtectedComponent'
```

### 3. **RLS Hooks**

```typescript
import { useRLSPolicies } from '@/modules/rls/hooks/useRLSPolicies'
import { useRLSAssignments } from '@/modules/rls/hooks/useRLSAssignments'
import { useRLSAuditLogs } from '@/modules/rls/hooks/useRLSAuditLogs'

function RLSManagement() {
  const { policies, createPolicy, updatePolicy, deletePolicy } = useRLSPolicies()
  const { assignments, createAssignment } = useRLSAssignments()
  const { auditLogs, filters, setFilters } = useRLSAuditLogs()

  // Component implementation
}
```

## API Endpoints

### RLS Management APIs

```
GET    /api/v1/rls/policies          # List RLS policies
POST   /api/v1/rls/policies          # Create RLS policy
GET    /api/v1/rls/policies/{id}     # Get policy details
PUT    /api/v1/rls/policies/{id}     # Update policy
DELETE /api/v1/rls/policies/{id}     # Delete policy

GET    /api/v1/rls/assignments       # List rule assignments
POST   /api/v1/rls/assignments       # Create assignment
DELETE /api/v1/rls/assignments/{id}  # Delete assignment

GET    /api/v1/rls/audit-logs        # List audit logs
GET    /api/v1/rls/audit-logs/stats  # Audit statistics

POST   /api/v1/rls/check-access      # Check access permission
POST   /api/v1/rls/context           # Create/update context
```

### Project-specific RLS APIs

```
GET    /api/v1/projects-rls/policies    # Project-specific policies
POST   /api/v1/projects-rls/assign      # Assign project policy
GET    /api/v1/projects-rls/audit       # Project audit logs
```

## Security Considerations

### 1. **Policy Priority**
- Higher priority policies are evaluated first
- First matching policy determines access
- Default deny if no policies match

### 2. **Performance Optimization**
- Policies are cached in Redis
- Database indexes on RLS tables
- Efficient query filtering

### 3. **Audit Trail**
- All access attempts are logged
- Failed access attempts include denial reasons
- Execution times are tracked for performance

### 4. **Context Security**
- Session-based context with expiration
- Secure context invalidation on logout
- Context validation on each request

## Migration and Setup

### 1. **Database Migration**

```bash
# Run RLS migration
alembic upgrade head

# Or specific RLS migration
alembic upgrade +1  # If RLS migration is next
```

### 2. **Creating Default Policies**

```python
from app.services.rls_service import create_default_policies

# Create default policies for all entities
create_default_policies(db_session, admin_user_id)
```

### 3. **Environment Configuration**

```bash
# Enable RLS in environment
RLS_ENABLED=true
RLS_CACHE_TTL=300  # Cache policies for 5 minutes
RLS_AUDIT_ENABLED=true
```

## Testing

### 1. **RLS Test Suite**

The system includes comprehensive tests in `backend/tests/` covering:

- Policy creation and evaluation
- Access control verification
- Query filtering validation
- Audit logging functionality
- Performance benchmarks

### 2. **Running RLS Tests**

```bash
# Run all RLS tests
pytest tests/rls/ -v

# Run specific RLS test categories
pytest tests/rls/test_policies.py -v
pytest tests/rls/test_access_control.py -v
pytest tests/rls/test_audit.py -v
```

## Best Practices

### 1. **Policy Design**
- Keep policies simple and focused
- Use meaningful names and descriptions
- Set appropriate priorities
- Test policies thoroughly

### 2. **Performance**
- Monitor query execution times
- Use appropriate database indexes
- Cache frequently accessed policies
- Avoid overly complex conditions

### 3. **Security**
- Regular policy audits
- Monitor failed access attempts
- Use principle of least privilege
- Implement proper error handling

### 4. **Maintenance**
- Regular cleanup of expired contexts
- Archive old audit logs
- Monitor policy effectiveness
- Update policies as business rules change

## Troubleshooting

### Common Issues

1. **Access Denied Errors**
   - Check policy assignments
   - Verify user context
   - Review audit logs for denial reasons

2. **Performance Issues**
   - Monitor query execution times
   - Check database indexes
   - Review policy complexity

3. **Policy Conflicts**
   - Review policy priorities
   - Check for overlapping conditions
   - Verify entity types and actions

### Debug Mode

```python
# Enable RLS debug logging
import logging
logging.getLogger('app.services.rls_service').setLevel(logging.DEBUG)
```

This comprehensive RLS system provides enterprise-grade security with fine-grained access control, comprehensive auditing, and excellent performance.
