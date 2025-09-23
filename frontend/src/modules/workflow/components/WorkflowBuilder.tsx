'use client';

import React, { useCallback, useRef, useState, memo, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Connection,
  ConnectionMode,
  ReactFlowProvider,
  Panel,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { WorkflowNode, WorkflowEdge } from '../types/reactflow';
import WorkflowStateNode from './WorkflowStateNode';
import ConditionalNode from './ConditionalNode';
import ParallelGatewayNode from './ParallelGatewayNode';
import TimerNode from './TimerNode';
import UserTaskNode from './UserTaskNode';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { 
  Plus, 
  Save, 
  ZoomOut, 
  Maximize,
  Circle,
  GitBranch,
  GitMerge,
  Clock,
  User,
  ChevronDown
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';

interface WorkflowBuilderProps {
  templateId?: number;
  workflowTypeId?: number;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  onSave?: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  readOnly?: boolean;
}

const nodeTypes = {
  workflowState: WorkflowStateNode,
  conditional: ConditionalNode,
  parallelGateway: ParallelGatewayNode,
  timer: TimerNode,
  userTask: UserTaskNode,
};

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

const WorkflowBuilderInner = memo(({
  templateId,
  workflowTypeId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  readOnly = false
}: WorkflowBuilderProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Handle connection creation
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly || !params.source || !params.target) return;
      
      const edge: WorkflowEdge = {
        id: `edge_${params.source}_${params.target}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: 'smoothstep',
        animated: true,
        data: {
          action: 'transition',
          label: 'Transition',
        }
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges, readOnly]
  );

  // Memoized node templates for better performance
  const nodeTemplates = useMemo(() => ({
    state: {
      type: 'workflowState',
      data: {
        label: `New State`,
        description: 'Click to edit this state',
        color: '#6B7280',
        bgColor: '#F9FAFB',
        icon: 'Circle',
        isInitial: false,
        isFinal: false,
      },
    },
    condition: {
      type: 'conditional',
      data: {
        label: `Decision`,
        description: 'Conditional logic',
        color: '#F97316',
        condition: 'value == "yes"',
      },
    },
    parallel: {
      type: 'parallelGateway',
      data: {
        label: `Parallel Split`,
        description: 'Parallel processing',
        color: '#8B5CF6',
      },
    },
    timer: {
      type: 'timer',
      data: {
        label: `Timer`,
        description: 'Wait for duration',
        color: '#EAB308',
        duration: '1h',
      },
    },
    userTask: {
      type: 'userTask',
      data: {
        label: `User Task`,
        description: 'Manual task requiring user action',
        color: '#6366F1',
        requiredRoles: ['user'],
        approval: false,
        priority: 'medium' as const,
      },
    },
  }), []);

  // Add new node (with type selection) - optimized version
  const addNode = useCallback((nodeType: string) => {
    if (readOnly) return;

    const template = nodeTemplates[nodeType as keyof typeof nodeTemplates];
    if (!template) return;

    const newNode: WorkflowNode = {
      id: getId(),
      type: template.type,
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      data: { ...template.data },
    };

    setNodes((nds) => nds.concat(newNode));
  }, [setNodes, readOnly, nodeTemplates]);

  // Save workflow template
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes, edges);
    }
  }, [nodes, edges, onSave]);

  // Auto-layout nodes
  const autoLayout = useCallback(() => {
    if (readOnly) return;
    
    // Simple horizontal layout
    const updatedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % 3) * 250 + 100,
        y: Math.floor(index / 3) * 150 + 100,
      },
    }));
    
    setNodes(updatedNodes);
  }, [nodes, setNodes, readOnly]);

  // Fit view to content
  const fitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [reactFlowInstance]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Workflow Builder
          </h2>
          {templateId && (
            <span className="text-sm text-gray-500">
              Template #{templateId}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {!readOnly && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Node
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => addNode('state')}>
                    <Circle className="h-4 w-4 mr-2" />
                    State
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addNode('condition')}>
                    <GitBranch className="h-4 w-4 mr-2" />
                    Condition
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addNode('parallel')}>
                    <GitMerge className="h-4 w-4 mr-2" />
                    Parallel Gateway
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addNode('timer')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Timer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addNode('userTask')}>
                    <User className="h-4 w-4 mr-2" />
                    User Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="outline"
                size="sm"
                onClick={autoLayout}
              >
                <Maximize className="h-4 w-4 mr-2" />
                Auto Layout
              </Button>
            </>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={fitView}
          >
            <ZoomOut className="h-4 w-4 mr-2" />
            Fit View
          </Button>
          
          {!readOnly && (
            <Button
              onClick={handleSave}
              disabled={!onSave}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* ReactFlow Canvas */}
      <div className="flex-1 relative">
        <div ref={reactFlowWrapper} className="h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            snapToGrid
            snapGrid={[15, 15]}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
            attributionPosition="bottom-left"
          >
            <Controls
              position="top-left"
              showFitView={false}
              showZoom={false}
            />
            <MiniMap
              position="bottom-right"
              nodeStrokeWidth={3}
              pannable
              zoomable
              className="!w-32 !h-24"
            />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#e5e7eb"
            />
            
            {/* Custom Panel */}
            <Panel position="top-right" className="space-y-2">
              <Card className="w-64 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Workflow Info</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">States:</span>
                      <span className="font-medium">{nodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Transitions:</span>
                      <span className="font-medium">{edges.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium">#{workflowTypeId || 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t text-xs text-gray-500">
        <div>
          {readOnly ? 'View Mode' : 'Edit Mode'} • {nodes.length} states • {edges.length} transitions
        </div>
        <div className="flex items-center space-x-4">
          <span>Snap to Grid: On</span>
          <span>Zoom: {reactFlowInstance?.getZoom().toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
});

WorkflowBuilderInner.displayName = 'WorkflowBuilderInner';

export default function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}