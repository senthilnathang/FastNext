export type WorkflowType = "sales" | "purchase" | "invoice" | "payment";

export type WorkflowState =
  | "new"
  | "draft"
  | "pending"
  | "confirmed"
  | "approved"
  | "rejected"
  | "processing"
  | "shipped"
  | "delivered"
  | "paid"
  | "cancelled"
  | "completed"
  | "overdue"
  | "refunded";

export interface WorkflowNode {
  id: string;
  type: "state" | "action" | "condition";
  label: string;
  state?: WorkflowState;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
    state?: WorkflowState;
    description?: string;
    color?: string;
    icon?: string;
    actions?: string[];
    conditions?: string[];
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  data?: {
    condition?: string;
    action?: string;
  };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  type: WorkflowType;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  defaultState: WorkflowState;
  finalStates: WorkflowState[];
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  type: WorkflowType;
  currentState: WorkflowState;
  entityId: string; // ID of the sales order, invoice, etc.
  entityType: string;
  createdAt: string;
  updatedAt: string;
  history: WorkflowStateHistory[];
  data: Record<string, unknown>;
}

export interface WorkflowStateHistory {
  id: string;
  fromState: WorkflowState;
  toState: WorkflowState;
  action: string;
  userId: string;
  timestamp: string;
  comment?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowAction {
  id: string;
  label: string;
  fromState: WorkflowState;
  toState: WorkflowState;
  condition?: string;
  requiresApproval?: boolean;
  allowedRoles?: string[];
}

// Predefined workflow states with colors and icons
export const WORKFLOW_STATES: Record<
  WorkflowState,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
    description: string;
  }
> = {
  new: {
    label: "New",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    icon: "plus-circle",
    description: "Newly created item",
  },
  draft: {
    label: "Draft",
    color: "#6B7280",
    bgColor: "#F9FAFB",
    icon: "edit-3",
    description: "Work in progress",
  },
  pending: {
    label: "Pending",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    icon: "clock",
    description: "Awaiting action",
  },
  confirmed: {
    label: "Confirmed",
    color: "#10B981",
    bgColor: "#ECFDF5",
    icon: "check-circle",
    description: "Confirmed and ready",
  },
  approved: {
    label: "Approved",
    color: "#10B981",
    bgColor: "#ECFDF5",
    icon: "check-circle-2",
    description: "Approved by authority",
  },
  rejected: {
    label: "Rejected",
    color: "#EF4444",
    bgColor: "#FEF2F2",
    icon: "x-circle",
    description: "Rejected or declined",
  },
  processing: {
    label: "Processing",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    icon: "loader",
    description: "Currently being processed",
  },
  shipped: {
    label: "Shipped",
    color: "#06B6D4",
    bgColor: "#F0F9FF",
    icon: "truck",
    description: "Shipped to customer",
  },
  delivered: {
    label: "Delivered",
    color: "#10B981",
    bgColor: "#ECFDF5",
    icon: "package-check",
    description: "Successfully delivered",
  },
  paid: {
    label: "Paid",
    color: "#10B981",
    bgColor: "#ECFDF5",
    icon: "dollar-sign",
    description: "Payment completed",
  },
  cancelled: {
    label: "Cancelled",
    color: "#6B7280",
    bgColor: "#F9FAFB",
    icon: "ban",
    description: "Cancelled by user",
  },
  completed: {
    label: "Completed",
    color: "#059669",
    bgColor: "#D1FAE5",
    icon: "check-circle",
    description: "Successfully completed",
  },
  overdue: {
    label: "Overdue",
    color: "#DC2626",
    bgColor: "#FEF2F2",
    icon: "alert-triangle",
    description: "Past due date",
  },
  refunded: {
    label: "Refunded",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    icon: "undo",
    description: "Payment refunded",
  },
};
