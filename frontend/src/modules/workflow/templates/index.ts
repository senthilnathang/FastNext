import { WorkflowTemplate, WorkflowType } from '../types';

export const SALES_WORKFLOW_TEMPLATE: WorkflowTemplate = {
  id: 'sales-default',
  name: 'Sales Order Workflow',
  type: 'sales' as WorkflowType,
  description: 'Standard sales order processing workflow',
  defaultState: 'new',
  finalStates: ['completed', 'cancelled'],
  nodes: [
    {
      id: 'new',
      type: 'state',
      label: 'New Order',
      state: 'new',
      position: { x: 100, y: 100 },
      data: {
        label: 'New Order',
        state: 'new',
        description: 'New sales order created',
        color: '#3B82F6',
        actions: ['confirm', 'cancel']
      }
    },
    {
      id: 'confirmed',
      type: 'state',
      label: 'Confirmed',
      state: 'confirmed',
      position: { x: 300, y: 100 },
      data: {
        label: 'Confirmed',
        state: 'confirmed',
        description: 'Order confirmed by customer',
        color: '#10B981',
        actions: ['process', 'cancel']
      }
    },
    {
      id: 'processing',
      type: 'state',
      label: 'Processing',
      state: 'processing',
      position: { x: 500, y: 100 },
      data: {
        label: 'Processing',
        state: 'processing',
        description: 'Order being processed',
        color: '#8B5CF6',
        actions: ['ship', 'cancel']
      }
    },
    {
      id: 'shipped',
      type: 'state',
      label: 'Shipped',
      state: 'shipped',
      position: { x: 700, y: 100 },
      data: {
        label: 'Shipped',
        state: 'shipped',
        description: 'Order shipped to customer',
        color: '#06B6D4',
        actions: ['deliver', 'return']
      }
    },
    {
      id: 'delivered',
      type: 'state',
      label: 'Delivered',
      state: 'delivered',
      position: { x: 900, y: 100 },
      data: {
        label: 'Delivered',
        state: 'delivered',
        description: 'Order delivered successfully',
        color: '#10B981',
        actions: ['complete']
      }
    },
    {
      id: 'completed',
      type: 'state',
      label: 'Completed',
      state: 'completed',
      position: { x: 1100, y: 100 },
      data: {
        label: 'Completed',
        state: 'completed',
        description: 'Sales order completed',
        color: '#059669'
      }
    },
    {
      id: 'cancelled',
      type: 'state',
      label: 'Cancelled',
      state: 'cancelled',
      position: { x: 500, y: 300 },
      data: {
        label: 'Cancelled',
        state: 'cancelled',
        description: 'Order cancelled',
        color: '#6B7280'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'new', target: 'confirmed', label: 'Confirm' },
    { id: 'e2', source: 'confirmed', target: 'processing', label: 'Process' },
    { id: 'e3', source: 'processing', target: 'shipped', label: 'Ship' },
    { id: 'e4', source: 'shipped', target: 'delivered', label: 'Deliver' },
    { id: 'e5', source: 'delivered', target: 'completed', label: 'Complete' },
    { id: 'e6', source: 'new', target: 'cancelled', label: 'Cancel' },
    { id: 'e7', source: 'confirmed', target: 'cancelled', label: 'Cancel' },
    { id: 'e8', source: 'processing', target: 'cancelled', label: 'Cancel' }
  ]
};

export const PURCHASE_WORKFLOW_TEMPLATE: WorkflowTemplate = {
  id: 'purchase-default',
  name: 'Purchase Order Workflow',
  type: 'purchase' as WorkflowType,
  description: 'Standard purchase order processing workflow',
  defaultState: 'draft',
  finalStates: ['completed', 'cancelled'],
  nodes: [
    {
      id: 'draft',
      type: 'state',
      label: 'Draft',
      state: 'draft',
      position: { x: 100, y: 100 },
      data: {
        label: 'Draft',
        state: 'draft',
        description: 'Purchase order draft',
        color: '#6B7280',
        actions: ['submit', 'cancel']
      }
    },
    {
      id: 'pending',
      type: 'state',
      label: 'Pending Approval',
      state: 'pending',
      position: { x: 300, y: 100 },
      data: {
        label: 'Pending Approval',
        state: 'pending',
        description: 'Awaiting approval',
        color: '#F59E0B',
        actions: ['approve', 'reject']
      }
    },
    {
      id: 'approved',
      type: 'state',
      label: 'Approved',
      state: 'approved',
      position: { x: 500, y: 100 },
      data: {
        label: 'Approved',
        state: 'approved',
        description: 'Purchase order approved',
        color: '#10B981',
        actions: ['send', 'cancel']
      }
    },
    {
      id: 'sent',
      type: 'state',
      label: 'Sent to Vendor',
      state: 'confirmed',
      position: { x: 700, y: 100 },
      data: {
        label: 'Sent to Vendor',
        state: 'confirmed',
        description: 'PO sent to vendor',
        color: '#06B6D4',
        actions: ['receive', 'cancel']
      }
    },
    {
      id: 'received',
      type: 'state',
      label: 'Received',
      state: 'delivered',
      position: { x: 900, y: 100 },
      data: {
        label: 'Received',
        state: 'delivered',
        description: 'Goods received',
        color: '#10B981',
        actions: ['complete']
      }
    },
    {
      id: 'completed',
      type: 'state',
      label: 'Completed',
      state: 'completed',
      position: { x: 1100, y: 100 },
      data: {
        label: 'Completed',
        state: 'completed',
        description: 'Purchase completed',
        color: '#059669'
      }
    },
    {
      id: 'rejected',
      type: 'state',
      label: 'Rejected',
      state: 'rejected',
      position: { x: 300, y: 300 },
      data: {
        label: 'Rejected',
        state: 'rejected',
        description: 'Purchase order rejected',
        color: '#EF4444'
      }
    },
    {
      id: 'cancelled',
      type: 'state',
      label: 'Cancelled',
      state: 'cancelled',
      position: { x: 600, y: 300 },
      data: {
        label: 'Cancelled',
        state: 'cancelled',
        description: 'Purchase order cancelled',
        color: '#6B7280'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'draft', target: 'pending', label: 'Submit' },
    { id: 'e2', source: 'pending', target: 'approved', label: 'Approve' },
    { id: 'e3', source: 'pending', target: 'rejected', label: 'Reject' },
    { id: 'e4', source: 'approved', target: 'sent', label: 'Send to Vendor' },
    { id: 'e5', source: 'sent', target: 'received', label: 'Receive Goods' },
    { id: 'e6', source: 'received', target: 'completed', label: 'Complete' },
    { id: 'e7', source: 'draft', target: 'cancelled', label: 'Cancel' },
    { id: 'e8', source: 'approved', target: 'cancelled', label: 'Cancel' },
    { id: 'e9', source: 'sent', target: 'cancelled', label: 'Cancel' }
  ]
};

export const INVOICE_WORKFLOW_TEMPLATE: WorkflowTemplate = {
  id: 'invoice-default',
  name: 'Invoice Workflow',
  type: 'invoice' as WorkflowType,
  description: 'Standard invoice processing workflow',
  defaultState: 'draft',
  finalStates: ['paid', 'cancelled', 'refunded'],
  nodes: [
    {
      id: 'draft',
      type: 'state',
      label: 'Draft',
      state: 'draft',
      position: { x: 100, y: 100 },
      data: {
        label: 'Draft',
        state: 'draft',
        description: 'Invoice draft',
        color: '#6B7280',
        actions: ['send', 'cancel']
      }
    },
    {
      id: 'sent',
      type: 'state',
      label: 'Sent',
      state: 'confirmed',
      position: { x: 300, y: 100 },
      data: {
        label: 'Sent',
        state: 'confirmed',
        description: 'Invoice sent to customer',
        color: '#06B6D4',
        actions: ['pay', 'overdue', 'cancel']
      }
    },
    {
      id: 'paid',
      type: 'state',
      label: 'Paid',
      state: 'paid',
      position: { x: 500, y: 100 },
      data: {
        label: 'Paid',
        state: 'paid',
        description: 'Invoice paid',
        color: '#10B981',
        actions: ['refund']
      }
    },
    {
      id: 'overdue',
      type: 'state',
      label: 'Overdue',
      state: 'overdue',
      position: { x: 300, y: 300 },
      data: {
        label: 'Overdue',
        state: 'overdue',
        description: 'Payment overdue',
        color: '#DC2626',
        actions: ['pay', 'cancel']
      }
    },
    {
      id: 'refunded',
      type: 'state',
      label: 'Refunded',
      state: 'refunded',
      position: { x: 700, y: 100 },
      data: {
        label: 'Refunded',
        state: 'refunded',
        description: 'Payment refunded',
        color: '#F59E0B'
      }
    },
    {
      id: 'cancelled',
      type: 'state',
      label: 'Cancelled',
      state: 'cancelled',
      position: { x: 500, y: 300 },
      data: {
        label: 'Cancelled',
        state: 'cancelled',
        description: 'Invoice cancelled',
        color: '#6B7280'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'draft', target: 'sent', label: 'Send' },
    { id: 'e2', source: 'sent', target: 'paid', label: 'Receive Payment' },
    { id: 'e3', source: 'sent', target: 'overdue', label: 'Mark Overdue' },
    { id: 'e4', source: 'overdue', target: 'paid', label: 'Receive Payment' },
    { id: 'e5', source: 'paid', target: 'refunded', label: 'Process Refund' },
    { id: 'e6', source: 'draft', target: 'cancelled', label: 'Cancel' },
    { id: 'e7', source: 'sent', target: 'cancelled', label: 'Cancel' },
    { id: 'e8', source: 'overdue', target: 'cancelled', label: 'Cancel' }
  ]
};

export const PAYMENT_WORKFLOW_TEMPLATE: WorkflowTemplate = {
  id: 'payment-default',
  name: 'Payment Workflow',
  type: 'payment' as WorkflowType,
  description: 'Standard payment processing workflow',
  defaultState: 'pending',
  finalStates: ['completed', 'cancelled', 'refunded'],
  nodes: [
    {
      id: 'pending',
      type: 'state',
      label: 'Pending',
      state: 'pending',
      position: { x: 100, y: 100 },
      data: {
        label: 'Pending',
        state: 'pending',
        description: 'Payment pending',
        color: '#F59E0B',
        actions: ['process', 'cancel']
      }
    },
    {
      id: 'processing',
      type: 'state',
      label: 'Processing',
      state: 'processing',
      position: { x: 300, y: 100 },
      data: {
        label: 'Processing',
        state: 'processing',
        description: 'Payment being processed',
        color: '#8B5CF6',
        actions: ['complete', 'fail']
      }
    },
    {
      id: 'completed',
      type: 'state',
      label: 'Completed',
      state: 'completed',
      position: { x: 500, y: 100 },
      data: {
        label: 'Completed',
        state: 'completed',
        description: 'Payment completed',
        color: '#059669',
        actions: ['refund']
      }
    },
    {
      id: 'failed',
      type: 'state',
      label: 'Failed',
      state: 'rejected',
      position: { x: 300, y: 300 },
      data: {
        label: 'Failed',
        state: 'rejected',
        description: 'Payment failed',
        color: '#EF4444',
        actions: ['retry', 'cancel']
      }
    },
    {
      id: 'refunded',
      type: 'state',
      label: 'Refunded',
      state: 'refunded',
      position: { x: 700, y: 100 },
      data: {
        label: 'Refunded',
        state: 'refunded',
        description: 'Payment refunded',
        color: '#F59E0B'
      }
    },
    {
      id: 'cancelled',
      type: 'state',
      label: 'Cancelled',
      state: 'cancelled',
      position: { x: 500, y: 300 },
      data: {
        label: 'Cancelled',
        state: 'cancelled',
        description: 'Payment cancelled',
        color: '#6B7280'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'pending', target: 'processing', label: 'Process' },
    { id: 'e2', source: 'processing', target: 'completed', label: 'Success' },
    { id: 'e3', source: 'processing', target: 'failed', label: 'Failure' },
    { id: 'e4', source: 'failed', target: 'processing', label: 'Retry' },
    { id: 'e5', source: 'completed', target: 'refunded', label: 'Refund' },
    { id: 'e6', source: 'pending', target: 'cancelled', label: 'Cancel' },
    { id: 'e7', source: 'failed', target: 'cancelled', label: 'Cancel' }
  ]
};

export const WORKFLOW_TEMPLATES: Record<WorkflowType, WorkflowTemplate> = {
  sales: SALES_WORKFLOW_TEMPLATE,
  purchase: PURCHASE_WORKFLOW_TEMPLATE,
  invoice: INVOICE_WORKFLOW_TEMPLATE,
  payment: PAYMENT_WORKFLOW_TEMPLATE
};
