# FastNext Workflow API Guide

## Overview

This guide provides comprehensive documentation for the FastNext Workflow API, including endpoint details, request/response formats, authentication, and practical examples.

## Table of Contents

1. [Authentication](#authentication)
2. [Base URL and Versioning](#base-url-and-versioning)
3. [Common Response Formats](#common-response-formats)
4. [Workflow Types API](#workflow-types-api)
5. [Workflow States API](#workflow-states-api)
6. [Workflow Templates API](#workflow-templates-api)
7. [Workflow Instances API](#workflow-instances-api)
8. [Workflow Execution API](#workflow-execution-api)
9. [Analytics API](#analytics-api)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)
12. [SDK Examples](#sdk-examples)

## Authentication

The FastNext Workflow API uses JWT (JSON Web Token) authentication. All API requests must include a valid Bearer token in the Authorization header.

### Obtaining an Access Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here"
}
```

### Using the Token

Include the token in all subsequent requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Base URL and Versioning

- **Base URL:** `https://api.fastnext.com` (or your deployment URL)
- **API Version:** `v1`
- **Full Base Path:** `https://api.fastnext.com/api/v1`

All endpoints are prefixed with `/api/v1/` and require authentication unless otherwise specified.

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-09-26T10:00:00Z",
    "request_id": "req_1234567890"
  }
}
```

### List Response (Paginated)

```json
{
  "items": [...],
  "total": 150,
  "skip": 0,
  "limit": 50,
  "has_next": true,
  "has_prev": false
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "name",
      "issue": "Name is required"
    }
  },
  "meta": {
    "timestamp": "2024-09-26T10:00:00Z",
    "request_id": "req_1234567890"
  }
}
```

## Workflow Types API

Workflow Types represent categories of business processes (e.g., "Order Processing", "Invoice Approval").

### List Workflow Types

```http
GET /api/v1/workflow-types
```

**Query Parameters:**
- `skip` (integer, optional): Number of items to skip (default: 0)
- `limit` (integer, optional): Maximum items to return (default: 100, max: 1000)
- `search` (string, optional): Search term for name or description
- `is_active` (boolean, optional): Filter by active status

**Example Request:**
```bash
curl -X GET "https://api.fastnext.com/api/v1/workflow-types?limit=10&search=order" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Order Processing",
      "description": "Handle customer orders from placement to fulfillment",
      "icon": "ShoppingCart",
      "color": "#3B82F6",
      "is_active": true,
      "created_by": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "creator": {
        "id": 1,
        "username": "admin",
        "full_name": "System Administrator"
      }
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 10
}
```

### Create Workflow Type

```http
POST /api/v1/workflow-types
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Customer Onboarding",
  "description": "Complete customer onboarding process",
  "icon": "UserPlus",
  "color": "#10B981"
}
```

**Response:**
```json
{
  "id": 2,
  "name": "Customer Onboarding",
  "description": "Complete customer onboarding process",
  "icon": "UserPlus",
  "color": "#10B981",
  "is_active": true,
  "created_by": 1,
  "created_at": "2024-09-26T10:00:00Z",
  "updated_at": "2024-09-26T10:00:00Z"
}
```

### Get Workflow Type

```http
GET /api/v1/workflow-types/{type_id}
```

### Update Workflow Type

```http
PUT /api/v1/workflow-types/{type_id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "description": "Updated description",
  "color": "#8B5CF6"
}
```

### Delete Workflow Type

```http
DELETE /api/v1/workflow-types/{type_id}
```

**Response:**
```json
{
  "message": "Workflow type deleted successfully"
}
```

## Workflow States API

Workflow States define the possible states in a workflow (e.g., "Draft", "Approved", "Completed").

### List Workflow States

```http
GET /api/v1/workflow-states
```

**Query Parameters:**
- `skip`, `limit`: Pagination
- `search`: Search term
- `is_initial` (boolean): Filter initial states
- `is_final` (boolean): Filter final states

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "draft",
      "label": "Draft",
      "description": "Initial draft state",
      "color": "#6B7280",
      "bg_color": "#F9FAFB",
      "icon": "FileText",
      "is_initial": true,
      "is_final": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Workflow State

```http
POST /api/v1/workflow-states
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "pending_review",
  "label": "Pending Review",
  "description": "Waiting for manager review",
  "color": "#F59E0B",
  "bg_color": "#FFFBEB",
  "icon": "Clock",
  "is_initial": false,
  "is_final": false
}
```

## Workflow Templates API

Workflow Templates define reusable workflow structures with React Flow nodes and edges.

### List Workflow Templates

```http
GET /api/v1/workflow-templates
```

**Query Parameters:**
- `workflow_type_id` (integer): Filter by workflow type
- `status` (string): Filter by status (draft, active, inactive)
- `search`: Search in name and description
- `skip`, `limit`: Pagination

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Standard Order Processing",
      "description": "Standard flow for processing customer orders",
      "workflow_type_id": 1,
      "default_state_id": 1,
      "status": "active",
      "version": "1.0.0",
      "is_active": true,
      "nodes": [
        {
          "id": "start_node",
          "type": "workflowState",
          "position": {"x": 100, "y": 100},
          "data": {
            "label": "Order Received",
            "description": "New order submitted",
            "color": "#3B82F6",
            "isInitial": true
          }
        }
      ],
      "edges": [
        {
          "id": "e1",
          "source": "start_node",
          "target": "payment_node",
          "type": "smoothstep",
          "animated": true,
          "data": {"action": "submit", "label": "Submit Order"}
        }
      ],
      "settings": {
        "auto_advance": true,
        "notifications": true,
        "sla_enabled": true
      },
      "conditions": {
        "payment_check": "payment_status == 'paid'"
      },
      "permissions": {
        "view": ["all"],
        "edit": ["admin", "workflow_designer"],
        "execute": ["operator"]
      },
      "created_by": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "workflow_type": {
        "id": 1,
        "name": "Order Processing"
      }
    }
  ]
}
```

### Create Workflow Template

```http
POST /api/v1/workflow-templates
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Simple Approval Flow",
  "description": "Basic document approval workflow",
  "workflow_type_id": 1,
  "default_state_id": 1,
  "nodes": [
    {
      "id": "start",
      "type": "workflowState",
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "Document Submitted",
        "description": "Initial submission",
        "isInitial": true,
        "stateId": 1
      }
    },
    {
      "id": "review",
      "type": "userTask",
      "position": {"x": 300, "y": 100},
      "data": {
        "label": "Manager Review",
        "description": "Requires manager approval",
        "requiredRoles": ["manager"],
        "approval": true,
        "priority": "medium"
      }
    },
    {
      "id": "approved",
      "type": "workflowState",
      "position": {"x": 500, "y": 50},
      "data": {
        "label": "Approved",
        "description": "Document approved",
        "isFinal": true,
        "stateId": 4
      }
    },
    {
      "id": "rejected",
      "type": "workflowState",
      "position": {"x": 500, "y": 150},
      "data": {
        "label": "Rejected",
        "description": "Document rejected",
        "isFinal": true,
        "stateId": 5
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start",
      "target": "review",
      "type": "smoothstep",
      "data": {"action": "submit", "label": "Submit for Review"}
    },
    {
      "id": "e2",
      "source": "review",
      "target": "approved",
      "sourceHandle": "approve",
      "type": "smoothstep",
      "data": {"action": "approve", "label": "Approve"}
    },
    {
      "id": "e3",
      "source": "review",
      "target": "rejected",
      "sourceHandle": "reject",
      "type": "smoothstep",
      "data": {"action": "reject", "label": "Reject"}
    }
  ],
  "settings": {
    "auto_advance": false,
    "notifications": true,
    "sla_enabled": true,
    "default_sla_hours": 24
  },
  "conditions": {
    "auto_approve": "amount < 1000 && department == 'IT'"
  },
  "permissions": {
    "view": ["all"],
    "edit": ["workflow_admin"],
    "execute": ["employee", "manager"]
  }
}
```

### Get Workflow Template

```http
GET /api/v1/workflow-templates/{template_id}
```

### Update Workflow Template

```http
PUT /api/v1/workflow-templates/{template_id}
Content-Type: application/json
```

### Delete Workflow Template

```http
DELETE /api/v1/workflow-templates/{template_id}
```

## Workflow Instances API

Workflow Instances are active executions of workflow templates.

### List Workflow Instances

```http
GET /api/v1/workflow-instances
```

**Query Parameters:**
- `template_id`: Filter by template
- `workflow_type_id`: Filter by workflow type
- `status`: Filter by instance status (pending, running, completed, failed, cancelled)
- `assigned_to`: Filter by assignee user ID
- `entity_type`: Filter by entity type
- `entity_id`: Filter by specific entity ID
- `priority`: Filter by priority level
- `created_after`: Filter by creation date (ISO format)
- `created_before`: Filter by creation date (ISO format)
- `search`: Search in title and description

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "template_id": 1,
      "workflow_type_id": 1,
      "current_state_id": 2,
      "status": "running",
      "entity_id": "ORDER-2024-001",
      "entity_type": "order",
      "title": "Customer Order #12345",
      "description": "Electronics order from John Doe",
      "data": {
        "customer_id": 12345,
        "customer_name": "John Doe",
        "total_amount": 299.99,
        "items": [
          {
            "product": "Wireless Headphones",
            "quantity": 1,
            "price": 149.99
          }
        ]
      },
      "context": {
        "payment_status": "paid",
        "payment_method": "credit_card",
        "variables": {
          "tax_amount": 24.00,
          "shipping_cost": 9.99
        }
      },
      "active_nodes": ["processing_node"],
      "deadline": "2024-09-28T10:00:00Z",
      "priority": 1,
      "assigned_to": null,
      "created_by": 1,
      "started_at": "2024-09-26T08:00:00Z",
      "completed_at": null,
      "created_at": "2024-09-26T08:00:00Z",
      "updated_at": "2024-09-26T09:00:00Z",
      "template": {
        "id": 1,
        "name": "Standard Order Processing"
      },
      "workflow_type": {
        "id": 1,
        "name": "Order Processing"
      },
      "current_state": {
        "id": 2,
        "name": "processing",
        "label": "Processing"
      },
      "creator": {
        "id": 1,
        "username": "system"
      }
    }
  ]
}
```

### Create Workflow Instance

```http
POST /api/v1/workflow-instances
Content-Type: application/json
```

**Request Body:**
```json
{
  "template_id": 1,
  "workflow_type_id": 1,
  "current_state_id": 1,
  "entity_id": "ORDER-2024-002",
  "entity_type": "order",
  "title": "New Customer Order",
  "description": "Order for premium subscription",
  "data": {
    "customer_id": 67890,
    "product": "Premium Subscription",
    "amount": 99.99,
    "billing_cycle": "annual"
  },
  "context": {
    "source": "website",
    "campaign": "summer_sale",
    "variables": {}
  },
  "priority": 2,
  "deadline": "2024-09-30T23:59:59Z"
}
```

### Get Workflow Instance

```http
GET /api/v1/workflow-instances/{instance_id}
```

### Update Workflow Instance

```http
PUT /api/v1/workflow-instances/{instance_id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Order Title",
  "description": "Updated description",
  "data": {
    "customer_note": "Rush delivery requested"
  },
  "priority": 1,
  "assigned_to": 5
}
```

### Delete Workflow Instance

```http
DELETE /api/v1/workflow-instances/{instance_id}
```

## Workflow Execution API

Control workflow instance execution and state transitions.

### Execute State Transition

```http
POST /api/v1/workflow-instances/{instance_id}/transition
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "approve",
  "comment": "Order approved by manager",
  "data": {
    "approved_by": "manager@company.com",
    "approval_date": "2024-09-26T10:00:00Z",
    "approval_reason": "Standard approval process"
  },
  "context_updates": {
    "variables": {
      "approval_level": "manager",
      "approval_timestamp": "2024-09-26T10:00:00Z"
    }
  }
}
```

**Response:**
```json
{
  "id": 1,
  "current_state_id": 4,
  "status": "running",
  "context": {
    "variables": {
      "approval_level": "manager",
      "approval_timestamp": "2024-09-26T10:00:00Z"
    }
  },
  "updated_at": "2024-09-26T10:00:00Z",
  "history_entry": {
    "id": 15,
    "from_state_id": 2,
    "to_state_id": 4,
    "action": "approve",
    "comment": "Order approved by manager",
    "timestamp": "2024-09-26T10:00:00Z"
  }
}
```

### Get Available Actions

```http
GET /api/v1/workflow-instances/{instance_id}/actions
```

**Response:**
```json
{
  "actions": [
    {
      "action": "approve",
      "label": "Approve Order",
      "target_state_id": 4,
      "target_state_name": "approved",
      "requires_approval": false,
      "allowed_roles": ["manager", "supervisor"],
      "conditions": []
    },
    {
      "action": "reject",
      "label": "Reject Order",
      "target_state_id": 5,
      "target_state_name": "rejected",
      "requires_approval": false,
      "allowed_roles": ["manager", "supervisor"],
      "conditions": []
    }
  ]
}
```

### Get Workflow Instance History

```http
GET /api/v1/workflow-instances/{instance_id}/history
```

**Query Parameters:**
- `skip`, `limit`: Pagination
- `user_id`: Filter by user
- `action`: Filter by action type
- `from_date`, `to_date`: Date range filter

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "instance_id": 1,
      "from_state_id": null,
      "to_state_id": 1,
      "action": "create",
      "comment": "Workflow instance created",
      "meta_data": {
        "source": "api",
        "client_ip": "192.168.1.100"
      },
      "user_id": 1,
      "timestamp": "2024-09-26T08:00:00Z",
      "from_state": null,
      "to_state": {
        "id": 1,
        "name": "draft",
        "label": "Draft"
      },
      "user": {
        "id": 1,
        "username": "system",
        "full_name": "System User"
      }
    }
  ]
}
```

### Pause Workflow Instance

```http
POST /api/v1/workflow-instances/{instance_id}/pause
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Waiting for external approval",
  "pause_until": "2024-09-27T10:00:00Z"
}
```

### Resume Workflow Instance

```http
POST /api/v1/workflow-instances/{instance_id}/resume
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "External approval received"
}
```

### Cancel Workflow Instance

```http
POST /api/v1/workflow-instances/{instance_id}/cancel
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Customer requested cancellation",
  "force": false
}
```

## Analytics API

Get workflow performance metrics and analytics data.

### Workflow Metrics

```http
GET /api/v1/workflow-analytics/metrics
```

**Query Parameters:**
- `time_range`: Time period (24h, 7d, 30d, 90d)
- `workflow_type_id`: Filter by workflow type
- `template_id`: Filter by template

**Response:**
```json
{
  "total_workflows": 156,
  "active_instances": 23,
  "completed_today": 45,
  "average_completion_time": 180,
  "success_rate": 94.5,
  "throughput": {
    "hourly": 3.2,
    "daily": 45,
    "weekly": 315
  },
  "performance_by_type": [
    {
      "workflow_type_id": 1,
      "workflow_type_name": "Order Processing",
      "avg_completion_time": 120,
      "success_rate": 96.8,
      "total_instances": 89
    }
  ]
}
```

### Status Distribution

```http
GET /api/v1/workflow-analytics/status-distribution
```

**Response:**
```json
{
  "distribution": [
    {
      "status": "running",
      "count": 23,
      "percentage": 15.2,
      "color": "#3B82F6"
    },
    {
      "status": "completed",
      "count": 120,
      "percentage": 79.0,
      "color": "#10B981"
    },
    {
      "status": "failed",
      "count": 8,
      "percentage": 5.3,
      "color": "#EF4444"
    }
  ]
}
```

### Bottleneck Analysis

```http
GET /api/v1/workflow-analytics/bottlenecks
```

**Response:**
```json
{
  "bottlenecks": [
    {
      "node_id": "manager_approval",
      "node_name": "Manager Approval",
      "template_id": 1,
      "template_name": "Order Processing",
      "average_time": 720,
      "instance_count": 15,
      "severity": "high"
    }
  ]
}
```

### Completion Trends

```http
GET /api/v1/workflow-analytics/trends
```

**Query Parameters:**
- `period`: Aggregation period (hour, day, week, month)
- `start_date`, `end_date`: Date range

**Response:**
```json
{
  "trends": [
    {
      "date": "2024-09-26",
      "completed": 45,
      "failed": 3,
      "cancelled": 1,
      "average_time": 185
    }
  ]
}
```

## Error Handling

The API uses standard HTTP status codes and provides detailed error information.

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "workflow_type_id",
      "value": "invalid",
      "constraint": "must be a valid integer"
    }
  },
  "meta": {
    "timestamp": "2024-09-26T10:00:00Z",
    "request_id": "req_1234567890"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Valid authentication token required |
| `PERMISSION_DENIED` | 403 | Insufficient permissions for operation |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `WORKFLOW_STATE_ERROR` | 422 | Invalid workflow state transition |
| `TEMPLATE_VALIDATION_ERROR` | 422 | Workflow template validation failed |
| `EXECUTION_ERROR` | 500 | Workflow execution failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

## Rate Limiting

The API implements rate limiting to ensure fair usage.

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1695729600
X-RateLimit-Window: 3600
```

### Rate Limits by Endpoint

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Read Operations | 1000 requests | 1 hour |
| Write Operations | 100 requests | 1 hour |
| Execution Operations | 500 requests | 1 hour |
| Analytics | 200 requests | 1 hour |

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 3600 seconds.",
    "details": {
      "limit": 1000,
      "window": 3600,
      "reset_at": "2024-09-26T11:00:00Z"
    }
  }
}
```

## SDK Examples

### Python SDK

```python
import requests
from typing import Dict, List, Optional

class FastNextWorkflowAPI:
    def __init__(self, base_url: str, access_token: str):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

    def create_workflow_instance(self, template_id: int, entity_id: str,
                                entity_type: str, **kwargs) -> Dict:
        """Create a new workflow instance"""
        data = {
            'template_id': template_id,
            'entity_id': entity_id,
            'entity_type': entity_type,
            **kwargs
        }

        response = requests.post(
            f'{self.base_url}/api/v1/workflow-instances',
            json=data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def execute_transition(self, instance_id: int, action: str,
                          comment: Optional[str] = None, **kwargs) -> Dict:
        """Execute a workflow state transition"""
        data = {
            'action': action,
            'comment': comment,
            **kwargs
        }

        response = requests.post(
            f'{self.base_url}/api/v1/workflow-instances/{instance_id}/transition',
            json=data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def get_workflow_metrics(self, time_range: str = '24h') -> Dict:
        """Get workflow analytics metrics"""
        response = requests.get(
            f'{self.base_url}/api/v1/workflow-analytics/metrics',
            params={'time_range': time_range},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage example
api = FastNextWorkflowAPI(
    base_url='https://api.fastnext.com',
    access_token='your_access_token'
)

# Create a workflow instance
instance = api.create_workflow_instance(
    template_id=1,
    entity_id='ORDER-2024-003',
    entity_type='order',
    title='New Order Processing',
    data={'customer_id': 123, 'amount': 299.99}
)

# Execute transition
result = api.execute_transition(
    instance_id=instance['id'],
    action='approve',
    comment='Order approved automatically'
)

# Get metrics
metrics = api.get_workflow_metrics(time_range='7d')
print(f"Success rate: {metrics['success_rate']}%")
```

### JavaScript/Node.js SDK

```javascript
class FastNextWorkflowAPI {
  constructor(baseUrl, accessToken) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async createWorkflowInstance(templateId, entityId, entityType, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/v1/workflow-instances`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        template_id: templateId,
        entity_id: entityId,
        entity_type: entityType,
        ...options
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async executeTransition(instanceId, action, options = {}) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/workflow-instances/${instanceId}/transition`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          action,
          ...options
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getWorkflowMetrics(timeRange = '24h') {
    const response = await fetch(
      `${this.baseUrl}/api/v1/workflow-analytics/metrics?time_range=${timeRange}`,
      {
        headers: this.headers
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// Usage example
const api = new FastNextWorkflowAPI(
  'https://api.fastnext.com',
  'your_access_token'
);

async function processOrder() {
  try {
    // Create workflow instance
    const instance = await api.createWorkflowInstance(
      1, // template_id
      'ORDER-2024-004', // entity_id
      'order', // entity_type
      {
        title: 'Rush Order Processing',
        data: { customer_id: 456, amount: 599.99, priority: 'high' }
      }
    );

    console.log('Created instance:', instance.id);

    // Execute transition
    const result = await api.executeTransition(instance.id, 'submit', {
      comment: 'Order submitted for processing'
    });

    console.log('Transition executed:', result);

    // Get metrics
    const metrics = await api.getWorkflowMetrics('7d');
    console.log('Metrics:', metrics);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

processOrder();
```

### cURL Examples

#### Create Workflow Instance
```bash
curl -X POST "https://api.fastnext.com/api/v1/workflow-instances" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": 1,
    "entity_id": "ORDER-2024-005",
    "entity_type": "order",
    "title": "Customer Order Processing",
    "data": {
      "customer_id": 789,
      "amount": 149.99,
      "items": ["Wireless Mouse", "Keyboard"]
    },
    "priority": 2
  }'
```

#### Execute Transition
```bash
curl -X POST "https://api.fastnext.com/api/v1/workflow-instances/123/transition" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "comment": "Order approved by system",
    "data": {
      "approval_source": "automated_rules",
      "approval_time": "2024-09-26T10:30:00Z"
    }
  }'
```

#### Get Analytics
```bash
curl -X GET "https://api.fastnext.com/api/v1/workflow-analytics/metrics?time_range=30d" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Support

For API support and questions:

- **Documentation**: [https://docs.fastnext.com](https://docs.fastnext.com)
- **Support Email**: api-support@fastnext.com
- **GitHub Issues**: [https://github.com/fastnext/issues](https://github.com/fastnext/issues)
- **Community Discord**: [https://discord.gg/fastnext](https://discord.gg/fastnext)

---

**API Version:** 1.0.0
**Last Updated:** 2024-09-26
**Rate Limit:** Yes
**Authentication:** JWT Bearer Token Required
