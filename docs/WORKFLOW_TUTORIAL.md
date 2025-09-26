# FastNext Workflow System Tutorial

## Introduction

Welcome to the FastNext Workflow System tutorial! This comprehensive guide will take you through creating, managing, and optimizing business workflows using our visual workflow designer and powerful backend engine.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Tutorial 1: Basic Approval Workflow](#tutorial-1-basic-approval-workflow)
3. [Tutorial 2: Order Processing with Variables](#tutorial-2-order-processing-with-variables)
4. [Tutorial 3: Advanced Loop Processing](#tutorial-3-advanced-loop-processing)
5. [Tutorial 4: Conditional Branching](#tutorial-4-conditional-branching)
6. [Tutorial 5: Sub-workflow Integration](#tutorial-5-sub-workflow-integration)
7. [Tutorial 6: Script Automation](#tutorial-6-script-automation)
8. [Tutorial 7: Monitoring and Analytics](#tutorial-7-monitoring-and-analytics)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Before starting this tutorial, ensure you have:

1. FastNext system deployed and running
2. Access to the workflow interface at `/workflows`
3. User account with workflow creation permissions
4. Basic understanding of business processes

### Accessing the Workflow Builder

1. **Login** to your FastNext application
2. **Navigate** to `/workflows` or click "Workflows" in the main menu
3. **Toggle** to "Advanced Builder" mode for full feature access
4. **Familiarize** yourself with the interface:
   - **Toolbar**: Add nodes, auto-layout, test execution
   - **Canvas**: Drag-and-drop workflow design area
   - **Panels**: Information and validation feedback
   - **Status Bar**: Current mode and statistics

### Interface Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Toolbar: [Add Node ▼] [Auto Layout] [Fit View] [Test Run] [Save] │
├─────────────────────────────────────────────────────────────────┤
│  Canvas Area (React Flow)                     ┌─────────────────┐│
│                                                │   Info Panel    ││
│    ○ ────→ ◇ ────→ □                          │                 ││
│   Start  Condition  End                       │ • Nodes: 3      ││
│                                                │ • Edges: 2      ││
│                                                │ • Status: Valid ││
│                                                └─────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  Status: Edit Mode • 3 nodes • 2 edges • Advanced Mode           │
└─────────────────────────────────────────────────────────────────┘
```

## Tutorial 1: Basic Approval Workflow

**Goal**: Create a simple document approval workflow
**Estimated Time**: 15 minutes
**Difficulty**: Beginner

### Step 1: Create Workflow Type

1. **Click** the "Workflow Types" tab
2. **Click** "Create Type" button
3. **Fill** in the form:
   - **Name**: `Document Approval`
   - **Description**: `Standard document approval process`
   - **Icon**: `FileText`
   - **Color**: `#3B82F6`
4. **Click** "Create Type"

### Step 2: Design the Workflow

1. **Switch** to "Workflow Templates" tab
2. **Click** "Advanced Builder" button
3. **Add** the first node:
   - **Click** "Add Node" → "Basic Nodes" → "State"
   - **Configure** the node:
     - **Label**: `Document Submitted`
     - **Description**: `Initial document submission`
     - **Check** "Initial State"
4. **Add** a user task node:
   - **Click** "Add Node" → "Basic Nodes" → "User Task"
   - **Configure**:
     - **Label**: `Manager Review`
     - **Description**: `Requires manager approval`
     - **Required Roles**: `["manager"]`
     - **Priority**: `medium`
5. **Add** approval states:
   - **Add** two more "State" nodes
   - **Configure** first:
     - **Label**: `Approved`
     - **Description**: `Document approved`
     - **Check** "Final State"
   - **Configure** second:
     - **Label**: `Rejected`
     - **Description**: `Document rejected`
     - **Check** "Final State"

### Step 3: Connect the Nodes

1. **Connect** "Document Submitted" to "Manager Review":
   - **Drag** from the bottom handle of "Document Submitted"
   - **Drop** on the top handle of "Manager Review"

2. **Connect** "Manager Review" to both outcome states:
   - **Drag** from the right handle (approve) to "Approved"
   - **Drag** from the left handle (reject) to "Rejected"

### Step 4: Save and Test

1. **Click** "Save" button
2. **Enter** template details:
   - **Name**: `Basic Document Approval`
   - **Description**: `Standard approval workflow for documents`
   - **Workflow Type**: Select "Document Approval"
3. **Click** "Test Run" to simulate execution
4. **Observe** the validation panel for any issues

### Expected Result

```
Document Submitted → Manager Review → Approved
                          ↓
                     Rejected
```

**✅ Checkpoint**: You should have a working 4-node approval workflow with proper connections and validation.

## Tutorial 2: Order Processing with Variables

**Goal**: Build an order processing workflow with dynamic calculations
**Estimated Time**: 25 minutes
**Difficulty**: Intermediate

### Step 1: Create Order Processing Type

1. **Create** new workflow type:
   - **Name**: `Order Processing`
   - **Description**: `Complete order processing with calculations`
   - **Color**: `#10B981`

### Step 2: Design the Workflow with Variables

1. **Start** new template in Advanced Builder
2. **Add** initial state:
   - **Label**: `Order Received`
   - **Initial State**: ✓

3. **Add** variable nodes for calculations:
   
   **Tax Calculation:**
   - **Add Node** → "Data Operations" → "Calculate"
   - **Configure**:
     - **Label**: `Calculate Tax`
     - **Operation Type**: `calculate`
     - **Variable Name**: `tax_amount`
     - **Variable Type**: `number`
     - **Expression**: `order.subtotal * 0.08`
     - **Scope**: `instance`

   **Total Calculation:**
   - **Add** another "Calculate" node
   - **Configure**:
     - **Label**: `Calculate Total`
     - **Variable Name**: `order_total`
     - **Expression**: `order.subtotal + tax_amount + order.shipping`

4. **Add** conditional logic:
   - **Add Node** → "Basic Nodes" → "Condition"
   - **Configure**:
     - **Label**: `Amount Check`
     - **Condition**: `order_total > 1000`

5. **Add** processing paths:
   - **High Value Path**: User Task for manual review
   - **Standard Path**: Automatic processing state
   - **Final State**: Order completed

### Step 3: Build the Flow Logic

```
Order Received → Calculate Tax → Calculate Total → Amount Check
                                                       ├─ (>$1000) → Manual Review → Completed
                                                       └─ (≤$1000) → Auto Process → Completed
```

### Step 4: Configure Advanced Settings

1. **Click** on any node to see properties panel
2. **Set** variable scopes appropriately
3. **Configure** conditions with proper syntax
4. **Test** variable expressions

### Step 5: Implement and Test

1. **Save** the template
2. **Create** test instance with sample order data:
   ```json
   {
     "order": {
       "subtotal": 1200.00,
       "shipping": 15.99,
       "customer_id": 123
     }
   }
   ```
3. **Trace** variable calculations through execution

**✅ Checkpoint**: Order workflow with dynamic tax/total calculations and conditional routing based on amount.

## Tutorial 3: Advanced Loop Processing

**Goal**: Process bulk operations using loop constructs
**Estimated Time**: 30 minutes
**Difficulty**: Advanced

### Step 1: Create Bulk Processing Workflow

**Scenario**: Process a batch of email notifications

1. **Create** workflow type: `Bulk Operations`

### Step 2: Design Loop Structure

1. **Add** initial setup:
   - **State**: `Batch Started`
   - **Variable Node**: Load recipients list
     ```javascript
     // Set Variable: recipients
     // Type: array
     // Value: ["user1@example.com", "user2@example.com", "user3@example.com"]
     ```

2. **Add** ForEach Loop:
   - **Add Node** → "Control Flow" → "For Each Loop"
   - **Configure**:
     - **Label**: `Process Recipients`
     - **Loop Type**: `forEach`
     - **Collection**: `recipients`
     - **Iterator Variable**: `recipient`

3. **Design** loop body:
   - **Script Node**: Send email
     ```javascript
     // Language: javascript
     // Script:
     console.log(`Sending email to: ${recipient}`);
     // Simulate email sending
     const success = Math.random() > 0.1; // 90% success rate
     return { sent: success, recipient: recipient };
     ```

4. **Add** error handling:
   - **Conditional Node**: Check send result
   - **Variable Node**: Update counters

### Step 3: Implement Loop Logic

```
Batch Started → Load Recipients → ForEach Loop ┐
                                              │
                    ┌─────────────────────────┘
                    ▼
              Send Email Script
                    │
                    ▼
              Success Check ─── (Success) ───┐
                    │                        │
              (Failure) ─── Log Error ───────┤
                                            │
                    └──── Update Counters ◄─┘
                              │
                         Continue Loop
                              │
                    ┌─────────▼─────────┐
                    │   Batch Complete  │
                    └───────────────────┘
```

### Step 4: Advanced Loop Features

1. **Add** loop controls:
   - **Max iterations**: 1000
   - **Break condition**: `error_count > 10`
   - **Timeout**: 300 seconds

2. **Implement** progress tracking:
   ```javascript
   // Variable operations within loop
   processed_count = processed_count + 1;
   progress_percentage = (processed_count / total_recipients) * 100;
   ```

3. **Add** error aggregation:
   ```javascript
   // Collect failed recipients
   if (!success) {
     failed_recipients.push(recipient);
     error_count = error_count + 1;
   }
   ```

### Step 5: Test Loop Execution

1. **Create** test instance with recipient list
2. **Monitor** loop progression
3. **Verify** counter updates
4. **Check** error handling

**✅ Checkpoint**: Working bulk processing workflow with loop constructs, error handling, and progress tracking.

## Tutorial 4: Conditional Branching

**Goal**: Implement complex business logic with multiple conditions
**Estimated Time**: 20 minutes
**Difficulty**: Intermediate

### Step 1: Design Invoice Approval Logic

**Business Rules**:
- Amount < $500: Auto-approve
- Amount $500-$5000: Manager approval
- Amount > $5000: Director approval
- Emergency purchases: Skip to director regardless of amount

### Step 2: Implement Multi-Level Conditions

1. **Start** with invoice submission state

2. **Add** primary condition:
   ```javascript
   // Condition: Emergency Check
   invoice.priority === 'emergency'
   ```

3. **Add** amount-based routing:
   ```javascript
   // Condition: Amount Tiers
   invoice.amount < 500 ? 'auto' : 
   invoice.amount <= 5000 ? 'manager' : 'director'
   ```

4. **Create** approval matrix:
   ```
   Invoice Submitted
         │
         ▼
   Emergency Check ─── (Yes) ──→ Director Approval
         │
        (No)
         │
         ▼
   Amount Check ─── (<$500) ──→ Auto Approved
         │
         ├─── ($500-$5000) ──→ Manager Approval ──→ Approved
         │
         └─── (>$5000) ──→ Director Approval ──→ Approved
   ```

### Step 3: Advanced Conditional Logic

1. **Nested conditions**:
   ```javascript
   // Complex condition example
   (invoice.department === 'IT' && invoice.amount < 1000) || 
   (invoice.vendor === 'approved_vendor' && invoice.amount < 2000) ||
   (invoice.category === 'maintenance' && invoice.recurring === true)
   ```

2. **Dynamic routing**:
   ```javascript
   // Route based on user availability
   manager.available ? 'manager_review' : 'backup_approval'
   ```

### Step 4: Test Conditional Scenarios

**Test Cases**:
1. Emergency $10,000 purchase → Direct to director
2. Regular $300 purchase → Auto-approve
3. IT $800 purchase → Manager approval
4. Regular $7,500 purchase → Director approval

**✅ Checkpoint**: Multi-level conditional workflow with complex business logic routing.

## Tutorial 5: Sub-workflow Integration

**Goal**: Compose workflows using sub-workflow execution
**Estimated Time**: 35 minutes
**Difficulty**: Advanced

### Step 1: Create Parent and Child Workflows

**Parent Workflow**: Customer Onboarding
**Child Workflows**: 
- Background Check
- Account Setup
- Welcome Email

### Step 2: Design Child Workflows

**Background Check Workflow**:
1. **Input**: Customer ID, SSN
2. **Process**: External API call
3. **Output**: Pass/Fail result, Risk score

**Account Setup Workflow**:
1. **Input**: Customer data, Account type
2. **Process**: Create accounts, Set permissions
3. **Output**: Account numbers, Access credentials

### Step 3: Implement Sub-workflow Nodes

1. **Add** sub-workflow node:
   - **Type**: Sub Workflow
   - **Sub-workflow ID**: Background Check workflow ID
   - **Execution Mode**: Synchronous
   - **Input Parameters**:
     ```json
     {
       "customer_id": "{{instance.data.customer_id}}",
       "ssn": "{{instance.data.ssn}}",
       "check_type": "standard"
     }
     ```
   - **Output Parameters**: `["passed", "risk_score", "details"]`
   - **Timeout**: 300 seconds
   - **Error Handling**: Retry (3 attempts)

2. **Chain** sub-workflows:
   ```
   Customer Data Input
         │
         ▼
   Background Check (Sub-workflow)
         │
         ▼
   Check Results ─── (Pass) ──→ Account Setup (Sub-workflow)
         │                              │
        (Fail)                          ▼
         │                    Welcome Email (Sub-workflow)
         ▼                              │
   Rejection Process                    ▼
                              Onboarding Complete
   ```

### Step 4: Handle Sub-workflow Data Flow

1. **Data mapping**:
   ```json
   // Parent to child data mapping
   {
     "input_mapping": {
       "customer_id": "{{parent.customer_id}}",
       "priority": "{{parent.urgency_level}}",
       "context": "{{parent.source_application}}"
     },
     "output_mapping": {
       "parent.background_status": "{{child.result}}",
       "parent.risk_assessment": "{{child.risk_score}}",
       "parent.verification_date": "{{child.completed_at}}"
     }
   }
   ```

2. **Error propagation**:
   ```javascript
   // Handle child workflow failures
   if (background_check.status === 'failed') {
     if (background_check.error_type === 'timeout') {
       // Retry logic
       retry_count = retry_count + 1;
       return retry_count < 3 ? 'retry' : 'manual_review';
     } else {
       // Hard failure
       return 'rejection_process';
     }
   }
   ```

### Step 5: Monitor Nested Execution

1. **Track** parent-child relationships
2. **Monitor** sub-workflow progress
3. **Handle** timeout and error scenarios
4. **Aggregate** execution metrics

**✅ Checkpoint**: Complex workflow composition with multiple sub-workflows, data passing, and error handling.

## Tutorial 6: Script Automation

**Goal**: Integrate custom scripts for automation
**Estimated Time**: 25 minutes
**Difficulty**: Intermediate

### Step 1: JavaScript Automation

**Use Case**: Order validation and enrichment

1. **Add** Script Node:
   - **Language**: JavaScript
   - **Environment**: Sandbox
   - **Script**:
     ```javascript
     // Order validation and enrichment
     function validateOrder(order) {
       const errors = [];
       
       // Validate required fields
       if (!order.customer_id) errors.push('Customer ID required');
       if (!order.items || order.items.length === 0) errors.push('Items required');
       if (order.total <= 0) errors.push('Total must be positive');
       
       // Calculate additional fields
       const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
       const weight = order.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
       
       // Determine shipping method
       let shippingMethod = 'standard';
       if (order.total > 500 || order.priority === 'urgent') {
         shippingMethod = 'express';
       }
       if (weight > 50) {
         shippingMethod = 'freight';
       }
       
       return {
         valid: errors.length === 0,
         errors: errors,
         enriched_data: {
           item_count: itemCount,
           total_weight: weight,
           shipping_method: shippingMethod,
           processing_priority: order.total > 1000 ? 'high' : 'normal'
         }
       };
     }
     
     // Execute validation
     const result = validateOrder(order);
     console.log('Validation result:', result);
     
     // Return results
     return result;
     ```

### Step 2: Python Data Processing

**Use Case**: Customer analytics and scoring

1. **Add** Python Script Node:
   - **Language**: Python
   - **Environment**: Container
   - **Dependencies**: `["pandas", "numpy", "scikit-learn"]`
   - **Script**:
     ```python
     import json
     import pandas as pd
     import numpy as np
     from datetime import datetime, timedelta
     
     def calculate_customer_score(customer_data, order_history):
         """Calculate customer value score"""
         
         # Convert order history to DataFrame
         df = pd.DataFrame(order_history)
         df['order_date'] = pd.to_datetime(df['order_date'])
         
         # Calculate metrics
         total_orders = len(df)
         total_spent = df['amount'].sum()
         avg_order_value = df['amount'].mean()
         
         # Recent activity (last 90 days)
         recent_cutoff = datetime.now() - timedelta(days=90)
         recent_orders = df[df['order_date'] > recent_cutoff]
         recent_activity = len(recent_orders)
         
         # Calculate score components
         spending_score = min(total_spent / 1000, 10)  # Max 10 points
         frequency_score = min(total_orders / 10, 10)  # Max 10 points
         recency_score = min(recent_activity * 2, 10)  # Max 10 points
         loyalty_score = min(avg_order_value / 100, 10)  # Max 10 points
         
         # Final score (0-40)
         final_score = spending_score + frequency_score + recency_score + loyalty_score
         
         # Determine tier
         if final_score >= 30:
             tier = 'platinum'
         elif final_score >= 20:
             tier = 'gold'
         elif final_score >= 10:
             tier = 'silver'
         else:
             tier = 'bronze'
         
         return {
             'customer_score': round(final_score, 2),
             'customer_tier': tier,
             'metrics': {
                 'total_orders': total_orders,
                 'total_spent': round(total_spent, 2),
                 'avg_order_value': round(avg_order_value, 2),
                 'recent_activity': recent_activity
             },
             'recommendations': generate_recommendations(tier, recent_activity)
         }
     
     def generate_recommendations(tier, recent_activity):
         """Generate personalized recommendations"""
         recommendations = []
         
         if tier == 'platinum':
             recommendations.append('Offer exclusive early access to new products')
             recommendations.append('Provide dedicated customer service')
         elif tier == 'gold':
             recommendations.append('Send premium discount codes')
             recommendations.append('Invite to VIP events')
         elif recent_activity == 0:
             recommendations.append('Send re-engagement campaign')
             recommendations.append('Offer comeback discount')
         
         return recommendations
     
     # Execute scoring
     result = calculate_customer_score(customer, order_history)
     print(json.dumps(result, indent=2))
     
     # Return result
     return result
     ```

### Step 3: SQL Data Operations

**Use Case**: Inventory and reporting queries

1. **Add** SQL Script Node:
   - **Language**: SQL
   - **Environment**: Local (database connection)
   - **Script**:
     ```sql
     -- Inventory availability check
     WITH inventory_check AS (
       SELECT 
         p.id as product_id,
         p.name as product_name,
         i.quantity_available,
         i.quantity_reserved,
         (i.quantity_available - i.quantity_reserved) as available_stock,
         p.reorder_level,
         s.name as supplier_name,
         s.lead_time_days
       FROM products p
       JOIN inventory i ON p.id = i.product_id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id IN ({{order_items}})
     ),
     stock_status AS (
       SELECT 
         *,
         CASE 
           WHEN available_stock <= 0 THEN 'out_of_stock'
           WHEN available_stock < reorder_level THEN 'low_stock'
           ELSE 'in_stock'
         END as stock_status,
         CASE 
           WHEN available_stock <= 0 THEN CURRENT_DATE + INTERVAL lead_time_days DAY
           ELSE CURRENT_DATE
         END as estimated_ship_date
       FROM inventory_check
     )
     SELECT 
       json_object(
         'inventory_status', json_arrayagg(
           json_object(
             'product_id', product_id,
             'product_name', product_name,
             'available_stock', available_stock,
             'stock_status', stock_status,
             'estimated_ship_date', estimated_ship_date,
             'supplier', supplier_name
           )
         ),
         'overall_status', 
           CASE 
             WHEN COUNT(*) = SUM(CASE WHEN stock_status = 'in_stock' THEN 1 ELSE 0 END) THEN 'available'
             WHEN SUM(CASE WHEN stock_status = 'out_of_stock' THEN 1 ELSE 0 END) > 0 THEN 'partial'
             ELSE 'delayed'
           END,
         'earliest_ship_date', MAX(estimated_ship_date)
       ) as inventory_result
     FROM stock_status;
     ```

### Step 4: Error Handling and Monitoring

1. **Script error handling**:
   ```javascript
   try {
     const result = processData(input);
     return { success: true, data: result };
   } catch (error) {
     console.error('Script execution failed:', error);
     return { 
       success: false, 
       error: error.message,
       timestamp: new Date().toISOString()
     };
   }
   ```

2. **Monitor script performance**:
   - Execution time tracking
   - Memory usage monitoring
   - Error rate analysis
   - Output validation

**✅ Checkpoint**: Automated workflows with custom scripts for validation, analytics, and data processing.

## Tutorial 7: Monitoring and Analytics

**Goal**: Set up comprehensive workflow monitoring
**Estimated Time**: 20 minutes
**Difficulty**: Beginner

### Step 1: Access Analytics Dashboard

1. **Navigate** to `/workflows/analytics`
2. **Review** key metrics overview
3. **Explore** different time ranges (24h, 7d, 30d, 90d)

### Step 2: Understand Key Metrics

**Performance Indicators**:
- **Total Workflows**: Number of active templates
- **Active Instances**: Currently running workflows
- **Completed Today**: Daily throughput
- **Average Time**: Completion duration
- **Success Rate**: Percentage of successful completions

### Step 3: Analyze Bottlenecks

1. **Review** bottleneck analysis panel
2. **Identify** slow-performing nodes:
   ```
   Top Bottlenecks:
   1. Manager Approval     - 12h avg (15 instances)
   2. Payment Processing   - 45m avg (8 instances)
   3. Inventory Check      - 20m avg (12 instances)
   ```

3. **Investigate** root causes:
   - User availability issues
   - External system delays
   - Complex processing logic
   - Resource constraints

### Step 4: Monitor Trends

1. **Completion trends** over time
2. **Status distribution** analysis
3. **Performance by workflow type**
4. **Error pattern identification**

### Step 5: Set Up Alerts

**Configure monitoring alerts**:
```yaml
# Alert configuration (conceptual)
alerts:
  high_error_rate:
    condition: "error_rate > 5%"
    severity: critical
    notification: ["email", "slack"]
    
  sla_violation:
    condition: "avg_completion_time > sla_threshold"
    severity: warning
    notification: ["dashboard"]
    
  queue_backlog:
    condition: "pending_instances > 50"
    severity: info
    notification: ["email"]
```

### Step 6: Performance Optimization

**Based on analytics insights**:

1. **Optimize bottleneck nodes**:
   - Reduce approval wait times
   - Parallelize independent tasks
   - Cache frequently accessed data

2. **Improve error handling**:
   - Add retry logic
   - Implement fallback processes
   - Enhance validation

3. **Scale resources**:
   - Add more workers
   - Optimize database queries
   - Increase timeout limits

**✅ Checkpoint**: Comprehensive monitoring setup with insights for workflow optimization.

## Best Practices

### Design Best Practices

#### 1. Start Simple, Iterate
```
Iteration 1: Linear workflow (A → B → C)
Iteration 2: Add basic conditions
Iteration 3: Include parallel processing
Iteration 4: Advanced features (loops, scripts)
```

#### 2. Clear Naming Conventions
```javascript
// Good
"customer_order_approval"
"manager_review_task"
"payment_validation_check"

// Bad
"task1"
"approval"
"check"
```

#### 3. Proper Error Handling
```javascript
// Every critical node should have error paths
try {
  const result = criticalOperation();
  return { success: true, data: result };
} catch (error) {
  return { success: false, error: error.message };
}
```

### Performance Best Practices

#### 1. Variable Scoping
```javascript
// Use appropriate scopes
local_scope:    temporary calculations
instance_scope: workflow-specific data
global_scope:   system constants (sparingly)
```

#### 2. Efficient Conditions
```javascript
// Efficient condition ordering
if (cheap_check && expensive_check) {
  // Process
}

// Cache complex calculations
const calculated_value = expensive_calculation();
if (calculated_value > threshold) {
  // Use calculated_value
}
```

#### 3. Resource Management
- Set appropriate timeouts
- Limit loop iterations
- Monitor memory usage
- Implement connection pooling

### Security Best Practices

#### 1. Input Validation
```javascript
// Validate all inputs
function validateInput(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid input data');
  }
  
  // Sanitize string inputs
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim().substring(0, 1000);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
```

#### 2. Access Control
```json
{
  "permissions": {
    "view": ["employee", "manager", "admin"],
    "execute": ["employee", "manager"],
    "edit": ["workflow_designer", "admin"],
    "approve": ["manager", "director"]
  }
}
```

#### 3. Audit Logging
- Log all state transitions
- Track user actions
- Monitor script executions
- Record permission changes

## Troubleshooting

### Common Issues and Solutions

#### 1. Workflow Stuck in State

**Symptoms**:
- Instance not progressing
- No new history entries
- Status remains "running"

**Diagnosis**:
```sql
-- Find stuck instances
SELECT id, title, current_state_id, status, updated_at
FROM workflow_instances 
WHERE status = 'running' 
  AND updated_at < NOW() - INTERVAL '1 hour';
```

**Solutions**:
- Check user task assignments
- Verify conditional logic
- Review timeout settings
- Examine error logs

#### 2. Variable Not Found Errors

**Symptoms**:
- "Variable 'X' not found" errors
- Calculation failures
- Condition evaluation errors

**Solutions**:
```javascript
// Safe variable access
const value = variables.get('myVariable', defaultValue);

// Check variable existence
if (variables.has('requiredVariable')) {
  // Process
} else {
  // Handle missing variable
}
```

#### 3. Script Execution Failures

**Common Causes**:
- Syntax errors
- Missing dependencies
- Timeout issues
- Permission problems

**Debugging Steps**:
```javascript
// Add debug logging
console.log('Input data:', JSON.stringify(inputData, null, 2));
console.log('Processing step 1...');

try {
  const result = processStep1(inputData);
  console.log('Step 1 result:', result);
  return result;
} catch (error) {
  console.error('Step 1 failed:', error.message);
  throw error;
}
```

#### 4. Performance Issues

**Symptoms**:
- Slow workflow execution
- High resource usage
- Timeout errors

**Optimization Strategies**:
```javascript
// Optimize database queries
const cachedData = await getFromCache(key);
if (!cachedData) {
  const data = await fetchFromDatabase(query);
  await setCache(key, data, ttl);
  return data;
}
return cachedData;

// Implement pagination for large datasets
const batchSize = 100;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await processBatch(batch);
}
```

### Getting Help

#### 1. Documentation Resources
- [API Reference](./WORKFLOW_API_GUIDE.md)
- [System Documentation](./WORKFLOW_SYSTEM.md)
- [Deployment Guide](./DEPLOYMENT.md)

#### 2. Community Support
- GitHub Issues: Technical problems
- Discord: Real-time help
- Stack Overflow: Development questions

#### 3. Professional Support
- Email: support@fastnext.com
- Enterprise: Dedicated support team
- Training: Workflow design workshops

## Next Steps

### Advanced Topics to Explore

1. **Custom Node Development**
   - Create specialized node types
   - Implement custom business logic
   - Integrate third-party services

2. **Workflow Orchestration**
   - Multi-tenant workflows
   - Cross-system integration
   - Event-driven processing

3. **Performance Tuning**
   - Database optimization
   - Caching strategies
   - Load balancing

4. **Enterprise Features**
   - Role-based security
   - Compliance reporting
   - Backup and recovery

### Recommended Learning Path

```
Beginner → Intermediate → Advanced → Expert
    ↓            ↓           ↓         ↓
Basic        Variables   Scripts   Custom
Workflows    & Loops     & APIs    Development
```

**Week 1-2**: Master basic workflows and user tasks
**Week 3-4**: Learn variables, conditions, and loops
**Week 5-6**: Implement scripts and sub-workflows
**Week 7-8**: Advanced features and optimization

### Project Ideas

1. **HR Onboarding System**
   - Employee data collection
   - Background checks
   - Equipment provisioning
   - Training assignment

2. **E-commerce Order Fulfillment**
   - Inventory checking
   - Payment processing
   - Shipping coordination
   - Customer notifications

3. **Content Approval Pipeline**
   - Multi-stage review process
   - Legal compliance checks
   - Publication workflow
   - Analytics tracking

4. **IT Service Management**
   - Incident handling
   - Change requests
   - Asset management
   - SLA monitoring

---

**Congratulations!** 🎉 You've completed the FastNext Workflow System tutorial. You now have the knowledge to create sophisticated business process automation using our visual workflow designer.

**Happy workflow building!** 🚀

---

**Tutorial Version**: 1.0.0  
**Last Updated**: 2024-09-26  
**Estimated Total Time**: 3-4 hours  
**Prerequisites**: Basic FastNext knowledge