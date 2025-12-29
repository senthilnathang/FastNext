# Security Features

FastVue provides comprehensive security features including Row Level Security (RLS), Access Control Lists (ACL), Two-Factor Authentication (2FA), and user security settings.

## Overview

| Feature | Description | API Endpoint |
|---------|-------------|--------------|
| Security Settings | User security preferences, 2FA setup | `/api/v1/security/` |
| Row Level Security | Policy-based data access control | `/api/v1/rls/` |
| Access Control Lists | Per-record permission management | `/api/v1/acls/` |

## Security Settings

Manage user-specific security settings including two-factor authentication, session management, and notification preferences.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/security/settings` | Get current user's security settings |
| PUT | `/api/v1/security/settings` | Update security settings |
| GET | `/api/v1/security/overview` | Get security overview with score |
| POST | `/api/v1/security/2fa/setup` | Initialize 2FA setup (returns QR code) |
| POST | `/api/v1/security/2fa/verify` | Verify and enable 2FA |
| POST | `/api/v1/security/2fa/disable` | Disable 2FA |

### Security Settings Schema

```json
{
  "two_factor_enabled": false,
  "require_password_change": false,
  "password_expiry_days": 90,
  "max_login_attempts": 5,
  "lockout_duration_minutes": 30,
  "max_session_duration_hours": 24,
  "allow_concurrent_sessions": true,
  "max_concurrent_sessions": 5,
  "email_on_login": true,
  "email_on_password_change": true,
  "email_on_security_change": true,
  "email_on_suspicious_activity": true,
  "activity_logging_enabled": true,
  "data_retention_days": 90,
  "api_access_enabled": true,
  "api_rate_limit": 100
}
```

### Two-Factor Authentication (2FA)

FastVue supports TOTP-based two-factor authentication compatible with Google Authenticator, Authy, and similar apps.

#### Setup Flow

1. **Initialize Setup** - `POST /api/v1/security/2fa/setup`
   ```json
   {
     "secret": "BASE32_SECRET",
     "qr_code_url": "otpauth://totp/FastVue:user@example.com?secret=...",
     "backup_codes": ["12345678", "87654321", "..."]
   }
   ```

2. **Verify Setup** - `POST /api/v1/security/2fa/verify`
   ```json
   {
     "token": "123456"
   }
   ```

3. **Disable 2FA** - `POST /api/v1/security/2fa/disable`
   ```json
   {
     "password": "current_password",
     "token": "123456"
   }
   ```

## Row Level Security (RLS)

Row Level Security provides fine-grained access control at the data level, allowing you to define policies that control which rows users can access.

### Concepts

- **Policy**: A rule that defines access conditions for an entity type
- **Context**: Runtime context containing user, company, and request information
- **Rule Assignment**: Links policies to users, roles, or groups
- **Audit Log**: Records all access attempts for compliance

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/rls/policies` | List RLS policies |
| POST | `/api/v1/rls/policies` | Create RLS policy |
| GET | `/api/v1/rls/policies/{id}` | Get policy details |
| PUT | `/api/v1/rls/policies/{id}` | Update policy |
| DELETE | `/api/v1/rls/policies/{id}` | Delete policy |
| GET | `/api/v1/rls/audit-logs` | Get audit logs |
| GET | `/api/v1/rls/audit-logs/stats` | Get audit statistics |
| POST | `/api/v1/rls/check-access` | Check access for entity |

### RLS Policy Schema

```json
{
  "name": "Company Data Access",
  "description": "Users can only access data from their own company",
  "entity_type": "leads",
  "policy_type": "filter",
  "condition_expression": "company_id = :user_company_id",
  "condition_context": {
    "user_company_id": "{{user.company_id}}"
  },
  "applies_to_roles": ["sales_rep", "sales_manager"],
  "priority": 100,
  "is_active": true
}
```

### Policy Types

| Type | Description |
|------|-------------|
| `filter` | Filters query results based on conditions |
| `restrict` | Completely blocks access if conditions not met |
| `mask` | Masks sensitive field values |
| `audit` | Logs access without restricting |

### Audit Log Statistics

```json
{
  "period_days": 7,
  "total_attempts": 1500,
  "granted_count": 1450,
  "denied_count": 50,
  "success_rate": 96.67,
  "top_denied_reasons": [
    {"reason": "Company mismatch", "count": 30},
    {"reason": "Role not authorized", "count": 20}
  ],
  "entity_type_stats": [
    {"entity_type": "leads", "count": 800},
    {"entity_type": "contacts", "count": 500}
  ]
}
```

## Access Control Lists (ACL)

ACLs provide per-record permission management, allowing fine-grained control over who can perform specific operations on individual records.

### Concepts

- **ACL**: Defines permissions for an entity type and operation
- **Record Permission**: Grants specific access to a user or role for a record
- **Condition Script**: Dynamic conditions evaluated at runtime

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/acls/` | List ACLs |
| POST | `/api/v1/acls/` | Create ACL |
| GET | `/api/v1/acls/{id}` | Get ACL details |
| PUT | `/api/v1/acls/{id}` | Update ACL |
| DELETE | `/api/v1/acls/{id}` | Delete ACL |
| GET | `/api/v1/acls/record-permissions` | List record permissions |
| POST | `/api/v1/acls/record-permissions` | Grant record permission |
| DELETE | `/api/v1/acls/record-permissions/{id}` | Revoke permission |
| POST | `/api/v1/acls/check-permission` | Check user permission |
| GET | `/api/v1/acls/user-permissions` | Get current user's permissions |

### ACL Schema

```json
{
  "name": "Sales Lead Edit",
  "description": "Allow editing leads owned by user",
  "entity_type": "leads",
  "operation": "update",
  "field_name": null,
  "condition_script": "record.owner_id == user.id",
  "condition_context": {},
  "allowed_roles": ["sales_rep", "sales_manager"],
  "denied_roles": [],
  "allowed_users": [],
  "denied_users": [],
  "requires_approval": false,
  "approval_workflow_id": null,
  "priority": 100,
  "is_active": true
}
```

### Operations

| Operation | Description |
|-----------|-------------|
| `create` | Permission to create new records |
| `read` | Permission to view records |
| `update` | Permission to modify records |
| `delete` | Permission to delete records |
| `manage` | Full administrative access |
| `export` | Permission to export data |
| `import` | Permission to import data |

### Record Permission Schema

```json
{
  "entity_type": "leads",
  "entity_id": "123",
  "user_id": 5,
  "role_id": null,
  "operation": "update",
  "expires_at": "2025-12-31T23:59:59Z",
  "conditions": {
    "max_edits": 10
  }
}
```

### Permission Check

```bash
# Check if user can update a specific lead
curl -X POST /api/v1/acls/check-permission \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "entity_type": "leads",
    "entity_id": "123",
    "operation": "update"
  }'
```

Response:
```json
{
  "has_access": true,
  "reason": "Granted by ACL: Sales Lead Edit",
  "applicable_acls": ["Sales Lead Edit", "Manager Override"]
}
```

## Frontend Integration

The security features are accessible in the Settings section of the frontend:

| Route | Component | Description |
|-------|-----------|-------------|
| `/settings/security` | `security.vue` | Security settings and 2FA |
| `/settings/rls` | `rls.vue` | RLS policies and audit logs |
| `/settings/acl` | `acl.vue` | ACL management |

### Required Permissions

| Feature | Required Permission |
|---------|---------------------|
| View Security Settings | `security.read` |
| Manage Security Settings | `security.update` |
| View RLS Policies | `rls.read` |
| Manage RLS Policies | `rls.create`, `rls.update`, `rls.delete` |
| View ACLs | `acl.read` |
| Manage ACLs | `acl.create`, `acl.update`, `acl.delete` |
| View Record Permissions | `record_permission.read` |
| Manage Record Permissions | `record_permission.create`, `record_permission.delete` |

## Database Tables

The security features use the following database tables:

| Table | Description |
|-------|-------------|
| `security_settings` | User security preferences |
| `rls_policies` | Row Level Security policies |
| `rls_contexts` | Runtime context for RLS |
| `rls_rule_assignments` | Policy to user/role mappings |
| `rls_audit_logs` | Access audit trail |
| `access_control_lists` | ACL definitions |
| `record_permissions` | Per-record permissions |

## Best Practices

### RLS Policies

1. **Start Restrictive**: Begin with restrictive policies and gradually open access
2. **Use Company Isolation**: Always include company_id in multi-tenant applications
3. **Audit Critical Data**: Enable audit logging for sensitive entity types
4. **Test Thoroughly**: Test policies with different user roles before deployment

### ACLs

1. **Use Role-Based ACLs**: Prefer role-based over user-based ACLs for maintainability
2. **Set Expiration**: Use `expires_at` for temporary access grants
3. **Document Conditions**: Add clear descriptions for condition scripts
4. **Monitor Denials**: Review denied access in audit logs regularly

### 2FA

1. **Encourage Adoption**: Promote 2FA for all users, especially administrators
2. **Secure Backup Codes**: Store backup codes securely and use them sparingly
3. **Session Management**: Configure appropriate session durations

## Troubleshooting

### Common Issues

**403 Forbidden on Security Endpoints**
- Ensure user has `security.read` or `security.update` permission
- Superusers always have access

**RLS Policy Not Applied**
- Check policy `is_active` status
- Verify `entity_type` matches exactly
- Check `applies_to_roles` includes user's role

**ACL Permission Denied**
- Check ACL priority (lower number = higher priority)
- Verify condition script syntax
- Check `denied_roles` doesn't include user's role

**2FA Setup Failed**
- Ensure TOTP secret is not already set
- Verify token is 6 digits
- Check system time synchronization
