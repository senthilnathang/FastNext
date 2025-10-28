# FastNext Workflow System Documentation

## Overview

The FastNext Workflow System is a comprehensive business process automation platform built with React Flow for visual workflow design and FastAPI for backend processing. It provides enterprise-grade workflow management with advanced features including loops, variables, conditional logic, sub-workflow execution, and seamless integration with the Dynamic ACL system for approval workflows and per-record permissions.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Components](#core-components)
3. [Workflow Node Types](#workflow-node-types)
4. [API Reference](#api-reference)
5. [Frontend Components](#frontend-components)
6. [Advanced Features](#advanced-features)
7. [Analytics & Monitoring](#analytics--monitoring)
8. [Getting Started](#getting-started)
9. [Examples](#examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Architecture

### System Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │   Database      │
│   (Next.js)     │◄──►│    (FastAPI)     │◄──►│  (PostgreSQL)   │
│                 │    │                  │    │                 │
│ • React Flow    │    │ • Workflow Engine│    │ • Workflow Data │
│ • Visual Builder│    │ • State Machine  │    │ • Instance Data │
│ • Analytics     │    │ • Event System   │    │ • History Logs  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌──────▼──────┐
                       │    Redis    │
                       │  (Caching)  │
                       └─────────────┘
```

### Database Schema

The workflow system uses the following main entities:

- **WorkflowType**: Categories of workflows (e.g., "Order Processing", "Invoice Approval")
- **WorkflowState**: Individual states in a workflow (stages) (e.g., "Draft", "Approved", "Completed")
- **WorkflowTemplate**: Reusable workflow definitions with React Flow nodes and edges
- **WorkflowInstance**: Active instances of workflows with current state and context
- **WorkflowHistory**: Audit trail of all state transitions
- **WorkflowTransition**: Allowed transitions between states with approval requirements
- **AccessControlList**: ACL rules integrated with workflow approvals
- **RecordPermission**: Per-record permissions that can be granted based on workflow state

## Core Components

### Backend Models

#### WorkflowType
```python
class WorkflowType(Base):
    id: int
    name: str                    # e.g., "Order Processing"
    description: str
    icon: str                   # Icon name for UI
    color: str                  # Hex color code
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: datetime
```

#### WorkflowTemplate
```python
class WorkflowTemplate(Base):
    id: int
    name: str
    description: str
    workflow_type_id: int
    default_state_id: int
    status: WorkflowStatus      # DRAFT, ACTIVE, INACTIVE
    version: str
    nodes: JSON                 # React Flow nodes
    edges: JSON                 # React Flow edges
    settings: JSON              # Configuration
    conditions: JSON            # Business logic
    permissions: JSON           # Role-based access
    sla_config: JSON           # SLA settings
```

#### WorkflowInstance
```python
class WorkflowInstance(Base):
    id: int
    template_id: int
    current_state_id: int
    status: InstanceStatus      # PENDING, RUNNING, COMPLETED
    entity_id: str             # Related entity ID
    entity_type: str           # Entity type
    data: JSON                 # Instance data
    context: JSON              # Runtime variables
    active_nodes: JSON         # Currently active nodes
    deadline: datetime         # SLA deadline
    priority: int
    assigned_to: int
```

### Frontend Architecture

```typescript
// Component Hierarchy
WorkflowsPage
├── WorkflowBuilder (Basic)
└── AdvancedWorkflowBuilder
    ├── Node Components
    │   ├── WorkflowStateNode
    │   ├── ConditionalNode
    │   ├── LoopNode
    │   ├── VariableNode
    │   ├── SubWorkflowNode
    │   └── ScriptNode
    ├── Analytics Dashboard
    └── Validation System
```

## Workflow Node Types

### 1. Basic Nodes

#### WorkflowStateNode
Represents a state in the workflow process.
```typescript
interface WorkflowStateNodeData {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  isInitial: boolean;  // Starting state
  isFinal: boolean;    // Ending state
  stateId?: number;    // Reference to WorkflowState
}
```

#### ConditionalNode
Implements decision logic with true/false branches.
```typescript
interface ConditionalNodeData {
  label: string;
  description: string;
  condition: string;   // JavaScript expression
  color: string;
}
```

#### ParallelGatewayNode
Enables parallel processing of multiple paths.
```typescript
interface ParallelGatewayNodeData {
  label: string;
  description: string;
  gatewayType: 'split' | 'merge';
  color: string;
}
```

#### TimerNode
Implements delays and scheduled actions.
```typescript
interface TimerNodeData {
  label: string;
  description: string;
  duration: string;    // e.g., "1h", "30m", "2d"
  timerType: 'delay' | 'deadline';
  color: string;
}
```

#### UserTaskNode
Requires human interaction to proceed.
```typescript
interface UserTaskNodeData {
  label: string;
  description: string;
  requiredRoles: string[];
  approval: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  formSchema?: object;
  color: string;
}
```

### 2. Advanced Nodes

#### LoopNode
Implements iteration logic with multiple loop types.
```typescript
interface LoopNodeData {
  label: string;
  description: string;
  loopType: 'for' | 'while' | 'forEach';
  condition?: string;      // For while loops
  maxIterations?: number;  // For for loops
  iteratorVariable?: string; // For forEach loops
  collection?: string;     // For forEach loops
  color: string;
}
```

**Loop Types:**
- **For Loop**: Fixed number of iterations
- **While Loop**: Condition-based iteration
- **ForEach Loop**: Iterate over collections

**Handles:**
- `continue`: Main flow continuation
- `loop_body`: Loop body execution
- `exit`: Loop exit condition
- `loop_back`: Return to loop start

#### VariableNode
Manages data operations and calculations.
```typescript
interface VariableNodeData {
  label: string;
  operationType: 'set' | 'get' | 'calculate' | 'transform';
  variableName: string;
  variableType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  value?: any;
  expression?: string;     // For calculations
  scope: 'local' | 'global' | 'instance';
  color: string;
}
```

**Operation Types:**
- **Set**: Assign value to variable
- **Get**: Retrieve variable value
- **Calculate**: Perform mathematical operations
- **Transform**: Data type conversions

**Variable Scopes:**
- **Local**: Node execution scope
- **Instance**: Workflow instance scope
- **Global**: System-wide scope

#### SubWorkflowNode
Executes child workflows as sub-processes.
```typescript
interface SubWorkflowNodeData {
  label: string;
  subWorkflowId: number;
  subWorkflowName: string;
  inputParameters: Record<string, any>;
  outputParameters: string[];
  executionMode: 'synchronous' | 'asynchronous';
  timeout?: number;
  onError: 'fail' | 'continue' | 'retry';
  retryCount?: number;
  color: string;
}
```

**Execution Modes:**
- **Synchronous**: Wait for completion before proceeding
- **Asynchronous**: Continue immediately, monitor separately

**Error Handling:**
- **Fail**: Stop workflow on error
- **Continue**: Proceed despite errors
- **Retry**: Attempt multiple executions

#### ScriptNode
Executes code in various programming languages.
```typescript
interface ScriptNodeData {
  label: string;
  language: 'javascript' | 'python' | 'sql' | 'shell' | 'jq';
  script: string;
  inputVariables: string[];
  outputVariables: string[];
  timeout?: number;
  runAsUser?: string;
  environment: 'sandbox' | 'container' | 'local';
  dependencies?: string[];
  color: string;
}
```

**Supported Languages:**
- **JavaScript**: V8 engine execution
- **Python**: Containerized Python interpreter
- **SQL**: Database query execution
- **Shell**: System command execution
- **JQ**: JSON processing

**Execution Environments:**
- **Sandbox**: Isolated, secure execution
- **Container**: Docker-based execution
- **Local**: Direct system execution (restricted)

## API Reference

### Workflow Types

#### GET /api/v1/workflow-types
List all workflow types.

**Parameters:**
- `skip` (int): Pagination offset
- `limit` (int): Items per page
- `search` (str): Search term

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Order Processing",
      "description": "Handle customer orders",
      "icon": "ShoppingCart",
      "color": "#3B82F6",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 5,
  "skip": 0,
  "limit": 100
}
```

#### POST /api/v1/workflow-types
Create a new workflow type.

**Request Body:**
```json
{
  "name": "Invoice Approval",
  "description": "Multi-level invoice approval",
  "icon": "FileText",
  "color": "#10B981"
}
```

### Workflow Templates

#### GET /api/v1/workflow-templates
List workflow templates.

**Parameters:**
- `workflow_type_id` (int): Filter by workflow type
- `search` (str): Search term
- `skip` (int): Pagination offset
- `limit` (int): Items per page

#### POST /api/v1/workflow-templates
Create a workflow template.

**Request Body:**
```json
{
  "name": "Standard Order Flow",
  "description": "Standard process for orders",
  "workflow_type_id": 1,
  "default_state_id": 1,
  "nodes": [
    {
      "id": "start",
      "type": "workflowState",
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "Order Received",
        "isInitial": true,
        "stateId": 1
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start",
      "target": "end",
      "data": {"action": "complete"}
    }
  ],
  "settings": {
    "auto_advance": false,
    "notifications": true
  }
}
```

### Workflow Instances

#### GET /api/v1/workflow-instances
List workflow instances.

**Parameters:**
- `status` (str): Filter by status
- `template_id` (int): Filter by template
- `assigned_to` (int): Filter by assignee
- `search` (str): Search term

#### POST /api/v1/workflow-instances
Create a workflow instance.

**Request Body:**
```json
{
  "template_id": 1,
  "workflow_type_id": 1,
  "current_state_id": 1,
  "entity_id": "ORDER-001",
  "entity_type": "order",
  "title": "Customer Order #12345",
  "data": {
    "customer_id": 123,
    "total_amount": 299.99
  },
  "context": {
    "variables": {}
  },
  "priority": 1
}
```

### Workflow Execution

#### POST /api/v1/workflow-instances/{id}/transition
Execute a state transition.

**Request Body:**
```json
{
  "action": "approve",
  "comment": "Order approved by manager",
  "data": {
    "approved_by": "manager@company.com",
    "approval_date": "2024-01-01T12:00:00Z"
  }
}
```

#### GET /api/v1/workflow-instances/{id}/history
Get workflow instance history.

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "from_state": null,
      "to_state": "draft",
      "action": "create",
      "comment": "Workflow instance created",
      "user": "system",
      "timestamp": "2024-01-01T10:00:00Z"
    }
  ]
}
```

## Frontend Components

### AdvancedWorkflowBuilder

The main workflow design interface with React Flow integration.

```typescript
interface AdvancedWorkflowBuilderProps {
  templateId?: number;
  workflowTypeId?: number;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  onSave?: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  readOnly?: boolean;
  enableAdvancedFeatures?: boolean;
}
```

**Features:**
- Drag-and-drop node creation
- Visual connection editing
- Real-time validation
- Auto-layout functionality
- Test execution simulation
- Export/import capabilities

### WorkflowAnalyticsDashboard

Comprehensive analytics and monitoring interface.

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
  performanceByType: PerformanceData[];
}
```

**Visualizations:**
- Status distribution pie chart
- Completion trend line chart
- Performance bar charts
- Bottleneck analysis
- Success rate indicators

### Usage Example

```typescript
import { AdvancedWorkflowBuilder } from '@/modules/workflow';

function WorkflowDesigner() {
  const handleSave = (nodes, edges) => {
    // Save workflow template
    saveWorkflowTemplate({
      name: "My Workflow",
      nodes,
      edges,
      workflow_type_id: 1
    });
  };

  return (
    <AdvancedWorkflowBuilder
      enableAdvancedFeatures={true}
      onSave={handleSave}
      readOnly={false}
    />
  );
}
```

## Advanced Features

### 1. ACL Integration & Approvals

The workflow system integrates seamlessly with FastNext's Dynamic ACL system to provide approval-based workflows and conditional permissions.

#### Approval Workflows
```json
{
  "type": "userTask",
  "data": {
    "label": "Manager Approval",
    "requiredRoles": ["manager"],
    "approval": true,
    "approvalWorkflowId": 123,
    "description": "Requires manager approval for orders over $1000"
  }
}
```

#### State-Based Permissions
Workflow state changes can automatically grant or revoke permissions:

```python
# When workflow reaches 'approved' state, grant access
if workflow_instance.current_state.name == 'approved':
    ACLService.grant_record_permission(
        entity_type='orders',
        entity_id=workflow_instance.entity_id,
        role_id=approved_role.id,
        operation='read'
    )
```

#### Conditional Access Based on Workflow State
```python
# ACL condition that checks workflow state
acl_condition = """
entity_data['workflow_state'] == 'approved' or
user.role in ['admin', 'auditor']
"""
```

### 2. Conditional Logic

Implement complex decision trees using conditional nodes:

```javascript
// Example condition expressions
"order.amount > 1000"
"user.role === 'manager'"
"status === 'approved' && priority === 'high'"
"items.length > 0 && items.every(item => item.available)"
```

### 2. Loop Constructs

#### For Loop Example
```json
{
  "type": "loop",
  "data": {
    "loopType": "for",
    "maxIterations": 10,
    "iteratorVariable": "i"
  }
}
```

#### While Loop Example
```json
{
  "type": "loop",
  "data": {
    "loopType": "while",
    "condition": "counter < items.length"
  }
}
```

#### ForEach Loop Example
```json
{
  "type": "loop",
  "data": {
    "loopType": "forEach",
    "collection": "orderItems",
    "iteratorVariable": "item"
  }
}
```

### 3. Variable Management

#### Variable Operations
```json
{
  "type": "variable",
  "data": {
    "operationType": "set",
    "variableName": "totalAmount",
    "variableType": "number",
    "value": 0,
    "scope": "instance"
  }
}
```

#### Calculations
```json
{
  "type": "variable",
  "data": {
    "operationType": "calculate",
    "variableName": "tax",
    "expression": "totalAmount * 0.08",
    "variableType": "number"
  }
}
```

### 4. Sub-workflow Execution

```json
{
  "type": "subWorkflow",
  "data": {
    "subWorkflowId": 5,
    "executionMode": "synchronous",
    "inputParameters": {
      "orderId": "{{instance.entity_id}}",
      "amount": "{{variables.totalAmount}}"
    },
    "outputParameters": ["result", "processedAt"],
    "onError": "retry",
    "retryCount": 3
  }
}
```

### 5. Script Execution

#### JavaScript Example
```json
{
  "type": "script",
  "data": {
    "language": "javascript",
    "script": "const total = items.reduce((sum, item) => sum + item.price, 0); return { total };",
    "inputVariables": ["items"],
    "outputVariables": ["total"],
    "environment": "sandbox"
  }
}
```

#### Python Example
```json
{
  "type": "script",
  "data": {
    "language": "python",
    "script": "import json\nresult = {'processed': True, 'timestamp': str(datetime.now())}\nprint(json.dumps(result))",
    "environment": "container",
    "dependencies": ["datetime"]
  }
}
```

#### SQL Example
```json
{
  "type": "script",
  "data": {
    "language": "sql",
    "script": "SELECT COUNT(*) as order_count FROM orders WHERE customer_id = {{variables.customer_id}}",
    "outputVariables": ["order_count"],
    "environment": "local"
  }
}
```

## Analytics & Monitoring

### Performance Metrics

The system tracks comprehensive performance metrics:

- **Throughput**: Workflows completed per time period
- **Latency**: Average time from start to completion
- **Success Rate**: Percentage of successful completions
- **Bottlenecks**: Nodes with highest processing time
- **Error Rates**: Failed instances by error type
- **Resource Usage**: CPU, memory, and database load

### Monitoring Dashboard

Access real-time monitoring at `/workflows/analytics`:

```typescript
// Sample metrics data structure
const metrics: WorkflowMetrics = {
  totalWorkflows: 156,
  activeInstances: 23,
  completedToday: 45,
  averageCompletionTime: 180, // minutes
  successRate: 94.5,
  bottlenecks: [
    {
      nodeId: "approval_step",
      nodeName: "Manager Approval",
      averageTime: 720, // 12 hours
      instanceCount: 15
    }
  ],
  statusDistribution: [
    { status: "running", count: 23, color: "#3B82F6" },
    { status: "completed", count: 120, color: "#10B981" },
    { status: "failed", count: 8, color: "#EF4444" }
  ]
};
```

### Alerts and Notifications

Configure alerts for:
- SLA violations
- High error rates
- Performance degradation
- Bottleneck detection
- System resource limits

## Getting Started

### 1. Prerequisites

Ensure you have the following installed:
- Node.js 18+
- Python 3.11+
- PostgreSQL 14+
- Redis 6+
- Docker (for containerized deployment)

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd FastNext

# Install dependencies
cd frontend && npm install
cd ../backend && pip install -r requirements.txt

# Setup database
alembic upgrade head

# Load demo data
python demo_workflow_data.py
```

### 3. Development Setup

```bash
# Start development servers
./deploy.sh dev

# Or start components individually
cd backend && python main.py
cd frontend && npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Workflow Builder**: http://localhost:3000/workflows

### 5. Create Your First Workflow

1. Navigate to `/workflows`
2. Click "Create Type" to define a workflow category
3. Click "Advanced Builder" to design your workflow
4. Add nodes by clicking "Add Node" dropdown
5. Connect nodes by dragging between handles
6. Configure node properties by clicking on them
7. Save your template
8. Create instances to test execution

## Examples

### Example 1: Simple Approval Workflow

```json
{
  "name": "Document Approval",
  "nodes": [
    {
      "id": "start",
      "type": "workflowState",
      "data": {
        "label": "Document Submitted",
        "isInitial": true
      }
    },
    {
      "id": "review",
      "type": "userTask",
      "data": {
        "label": "Manager Review",
        "requiredRoles": ["manager"],
        "approval": true
      }
    },
    {
      "id": "approved",
      "type": "workflowState",
      "data": {
        "label": "Approved",
        "isFinal": true
      }
    },
    {
      "id": "rejected",
      "type": "workflowState",
      "data": {
        "label": "Rejected",
        "isFinal": true
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start",
      "target": "review"
    },
    {
      "id": "e2",
      "source": "review",
      "target": "approved",
      "sourceHandle": "approve"
    },
    {
      "id": "e3",
      "source": "review",
      "target": "rejected",
      "sourceHandle": "reject"
    }
  ]
}
```

### Example 2: Order Processing with Variables

```json
{
  "name": "Order Processing Flow",
  "nodes": [
    {
      "id": "start",
      "type": "workflowState",
      "data": {
        "label": "Order Received",
        "isInitial": true
      }
    },
    {
      "id": "calc_tax",
      "type": "variable",
      "data": {
        "operationType": "calculate",
        "variableName": "tax",
        "expression": "order.subtotal * 0.08"
      }
    },
    {
      "id": "calc_total",
      "type": "variable",
      "data": {
        "operationType": "calculate",
        "variableName": "total",
        "expression": "order.subtotal + tax + order.shipping"
      }
    },
    {
      "id": "amount_check",
      "type": "conditional",
      "data": {
        "condition": "total > 1000"
      }
    },
    {
      "id": "auto_approve",
      "type": "workflowState",
      "data": {
        "label": "Auto Approved"
      }
    },
    {
      "id": "manual_review",
      "type": "userTask",
      "data": {
        "label": "Manual Review Required",
        "requiredRoles": ["sales_manager"]
      }
    }
  ]
}
```

### Example 3: Batch Processing with Loops

```json
{
  "name": "Bulk Email Campaign",
  "nodes": [
    {
      "id": "start",
      "type": "workflowState",
      "data": {
        "label": "Campaign Started",
        "isInitial": true
      }
    },
    {
      "id": "load_recipients",
      "type": "script",
      "data": {
        "language": "sql",
        "script": "SELECT email FROM subscribers WHERE active = true",
        "outputVariables": ["recipients"]
      }
    },
    {
      "id": "email_loop",
      "type": "loop",
      "data": {
        "loopType": "forEach",
        "collection": "recipients",
        "iteratorVariable": "recipient"
      }
    },
    {
      "id": "send_email",
      "type": "script",
      "data": {
        "language": "python",
        "script": "send_email(recipient.email, template_id, campaign_data)"
      }
    },
    {
      "id": "update_stats",
      "type": "variable",
      "data": {
        "operationType": "calculate",
        "variableName": "sent_count",
        "expression": "sent_count + 1"
      }
    },
    {
      "id": "completed",
      "type": "workflowState",
      "data": {
        "label": "Campaign Completed",
        "isFinal": true
      }
    }
  ]
}
```

## Best Practices

### 1. Workflow Design

#### Keep It Simple
- Start with simple linear workflows
- Add complexity gradually
- Use descriptive node names
- Document complex logic

#### Error Handling
```json
{
  "nodes": [
    {
      "id": "risky_operation",
      "type": "script",
      "data": {
        "timeout": 30,
        "onError": "retry",
        "retryCount": 3
      }
    },
    {
      "id": "error_handler",
      "type": "userTask",
      "data": {
        "label": "Handle Error",
        "requiredRoles": ["admin"]
      }
    }
  ],
  "edges": [
    {
      "source": "risky_operation",
      "target": "error_handler",
      "sourceHandle": "error"
    }
  ]
}
```

#### Performance Optimization
- Use parallel gateways for independent tasks
- Implement appropriate timeouts
- Cache frequently accessed data
- Monitor bottlenecks regularly

### 2. Variable Management

#### Naming Conventions
```javascript
// Good
const customerEmail = "user@example.com";
const orderTotal = 299.99;
const isApproved = true;

// Bad
const x = "user@example.com";
const total = 299.99;
const flag = true;
```

#### Scope Management
- Use `local` scope for temporary calculations
- Use `instance` scope for workflow-specific data
- Use `global` scope sparingly for system-wide constants

### 3. Security Considerations

#### Script Execution
- Always use sandbox environment for untrusted code
- Validate all input parameters
- Implement proper timeout limits
- Log script execution for audit trails

#### Access Control
```json
{
  "permissions": {
    "view": ["all"],
    "edit": ["workflow_admin", "business_analyst"],
    "execute": ["process_operator", "system"],
    "approve": ["manager", "director"]
  }
}
```

### 4. Testing Strategies

#### Unit Testing
Test individual nodes in isolation:
```javascript
// Test variable calculation
const result = executeVariableNode({
  operationType: 'calculate',
  expression: 'a + b',
  context: { a: 10, b: 20 }
});
expect(result.value).toBe(30);
```

#### Integration Testing
Test complete workflow execution:
```javascript
// Test workflow completion
const instance = await createWorkflowInstance({
  template_id: 1,
  data: { order_id: 123 }
});

await executeWorkflow(instance.id);
const finalState = await getWorkflowInstance(instance.id);
expect(finalState.status).toBe('completed');
```

#### Load Testing
- Test with high concurrent instances
- Monitor system resource usage
- Validate SLA compliance
- Check database performance

### 5. Monitoring and Alerting

#### Key Metrics to Monitor
- Workflow completion rate
- Average processing time
- Error frequency by type
- System resource utilization
- User task queue length

#### Alert Configuration
```yaml
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    severity: "critical"
    channels: ["email", "slack"]

  - name: "SLA Violation"
    condition: "avg_completion_time > sla_limit"
    severity: "warning"
    channels: ["email"]

  - name: "Queue Backlog"
    condition: "pending_instances > 100"
    severity: "info"
    channels: ["dashboard"]
```

## Troubleshooting

### Common Issues

#### 1. Workflow Instances Stuck in Processing

**Symptoms:**
- Instances remain in "running" status indefinitely
- No new state transitions recorded

**Causes:**
- User tasks waiting for assignment
- Script timeouts not configured
- Database connection issues
- Conditional logic errors

**Solutions:**
```sql
-- Find stuck instances
SELECT id, title, current_state_id, status, updated_at
FROM workflow_instances
WHERE status = 'running'
AND updated_at < NOW() - INTERVAL '1 hour';

-- Check for pending user tasks
SELECT wi.id, wi.title, ut.label, ut.assigned_to
FROM workflow_instances wi
JOIN user_tasks ut ON wi.id = ut.instance_id
WHERE wi.status = 'running' AND ut.status = 'pending';
```

#### 2. Node Validation Errors

**Common Validation Issues:**
- Missing required connections
- Invalid condition expressions
- Circular dependencies
- Orphaned nodes

**Resolution:**
```typescript
// Validation function
function validateWorkflow(nodes: Node[], edges: Edge[]) {
  const issues: string[] = [];

  // Check for start node
  const startNodes = nodes.filter(n => n.data.isInitial);
  if (startNodes.length === 0) {
    issues.push('No start node defined');
  }

  // Check for orphaned nodes
  const connectedNodes = new Set();
  edges.forEach(e => {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });

  const orphaned = nodes.filter(n => !connectedNodes.has(n.id));
  if (orphaned.length > 0) {
    issues.push(`Orphaned nodes: ${orphaned.map(n => n.id).join(', ')}`);
  }

  return issues;
}
```

#### 3. Performance Issues

**Symptoms:**
- Slow workflow execution
- High database load
- Memory leaks
- Timeout errors

**Diagnostic Steps:**
```bash
# Check system resources
top -p $(pgrep -f "python main.py")

# Monitor database queries
tail -f /var/log/postgresql/postgresql.log | grep SLOW

# Check Redis cache hit rate
redis-cli info stats | grep keyspace
```

**Optimization Strategies:**
- Enable Redis caching
- Optimize database queries
- Implement connection pooling
- Use asynchronous processing
- Add proper indexes

#### 4. Script Execution Failures

**Common Script Issues:**
- Syntax errors
- Missing dependencies
- Permission issues
- Timeout errors
- Memory limits

**Debugging Script Nodes:**
```json
{
  "type": "script",
  "data": {
    "language": "python",
    "script": "import sys\nprint(f'Python version: {sys.version}')\nprint(f'Available modules: {sys.modules.keys()}')",
    "environment": "container",
    "timeout": 60
  }
}
```

### Error Codes Reference

| Code | Description | Resolution |
|------|-------------|------------|
| WF001 | Invalid workflow template | Check template structure and required fields |
| WF002 | Node validation failed | Review node configuration and connections |
| WF003 | Script execution timeout | Increase timeout or optimize script |
| WF004 | Permission denied | Verify user roles and permissions |
| WF005 | State transition not allowed | Check workflow state configuration |
| WF006 | Variable not found | Ensure variable is defined in correct scope |
| WF007 | Condition evaluation error | Validate condition syntax and variables |
| WF008 | Sub-workflow execution failed | Check child workflow status and configuration |

### Performance Tuning

#### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_template ON workflow_instances(template_id);
CREATE INDEX idx_workflow_history_instance ON workflow_history(instance_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM workflow_instances WHERE status = 'running';
```

#### Redis Configuration
```python
# Optimize Redis settings
REDIS_CONFIG = {
    'max_connections': 20,
    'retry_on_timeout': True,
    'socket_keepalive': True,
    'health_check_interval': 30,
    'default_ttl': 3600  # 1 hour
}
```

#### Memory Management
```python
# Configure worker memory limits
WORKER_CONFIG = {
    'max_memory_per_worker': '512MB',
    'gc_frequency': 100,
    'timeout_seconds': 300
}
```

## Support and Resources

### Documentation Links
- [API Reference](./API_REFERENCE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Guidelines](./SECURITY.md)
- [Development Setup](./DEVELOPMENT.md)

### Community
- GitHub Issues: Report bugs and feature requests
- Discord: Real-time community support
- Stack Overflow: Tag questions with `fastnext-workflow`

### Professional Support
Contact support@fastnext.com for:
- Enterprise deployment assistance
- Custom workflow development
- Performance optimization consulting
- Training and workshops

---

**Last Updated:** 2024-09-26
**Version:** 1.0.0
**Author:** FastNext Development Team
