import { Node, Edge } from 'reactflow';

export interface WorkflowNodeData {
  label: string;
  stateId?: number;
  stateName?: string;
  description?: string;
  color?: string;
  bgColor?: string;
  icon?: string;
  isInitial?: boolean;
  isFinal?: boolean;
  actions?: string[];
  // Additional properties for specific node types
  condition?: string;
  duration?: string;
  assignee?: string;
  requiredRoles?: string[];
  approval?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface WorkflowEdgeData {
  action?: string;
  label?: string;
  condition?: string;
  requiresApproval?: boolean;
  allowedRoles?: string[];
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge<WorkflowEdgeData>;

export interface WorkflowBuilderProps {
  templateId?: number;
  workflowTypeId?: number;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  onSave?: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  readOnly?: boolean;
}

export interface NodeContextMenuProps {
  nodeId: string;
  x: number;
  y: number;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export interface EdgeContextMenuProps {
  edgeId: string;
  x: number;
  y: number;
  onEdit: (edgeId: string) => void;
  onDelete: (edgeId: string) => void;
  onClose: () => void;
}
