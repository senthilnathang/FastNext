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
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { WorkflowNode, WorkflowEdge } from '../types/reactflow';
import WorkflowStateNode from './WorkflowStateNode';
import ConditionalNode from './ConditionalNode';
import ParallelGatewayNode from './ParallelGatewayNode';
import TimerNode from './TimerNode';
import UserTaskNode from './UserTaskNode';
import LoopNode from './LoopNode';
import VariableNode from './VariableNode';
import SubWorkflowNode from './SubWorkflowNode';
import ScriptNode from './ScriptNode';

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
  ChevronDown,
  RotateCw,
  Variable,
  Workflow,
  Code,
  Play,
  Pause
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/shared/components/ui/dropdown-menu';
import { useWorkflowTemplate } from '../hooks/useWorkflow';

interface AdvancedWorkflowBuilderProps {
  templateId?: number;
  workflowTypeId?: number;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  onSave?: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  readOnly?: boolean;
  enableAdvancedFeatures?: boolean;
}

const nodeTypes: NodeTypes = {
  workflowState: WorkflowStateNode,
  conditional: ConditionalNode,
  parallelGateway: ParallelGatewayNode,
  timer: TimerNode,
  userTask: UserTaskNode,
  loop: LoopNode,
  variable: VariableNode,
  subWorkflow: SubWorkflowNode,
  script: ScriptNode,
};

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

const AdvancedWorkflowBuilderInner = memo(({
  templateId,
  workflowTypeId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  readOnly = false,
  enableAdvancedFeatures = true
}: AdvancedWorkflowBuilderProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'error'>('idle');

  // Load template data if templateId is provided
  const { data: templateData, isLoading: templateLoading } = useWorkflowTemplate(templateId || 0);

  // Update nodes and edges when template data is loaded
  React.useEffect(() => {
    if (templateData) {
      // Initialize with template data if available
      if (templateData.nodes && Array.isArray(templateData.nodes) && templateData.nodes.length > 0) {
        setNodes(templateData.nodes);
      }
      if (templateData.edges && Array.isArray(templateData.edges) && templateData.edges.length > 0) {
        setEdges(templateData.edges);
      }
    } else if (templateId === undefined || templateId === null) {
      // Reset to initial state if no template is selected
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [templateData, templateId, initialNodes, initialEdges, setNodes, setEdges]);

  // Handle node data updates from edit dialogs
  React.useEffect(() => {
    const handleNodeDataUpdate = (event: CustomEvent) => {
      const { nodeId, newData } = event.detail;
      setNodes(nds => nds.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      ));
    };

    window.addEventListener('updateNodeData', handleNodeDataUpdate as EventListener);
    return () => {
      window.removeEventListener('updateNodeData', handleNodeDataUpdate as EventListener);
    };
  }, [setNodes]);

  // Handle connection creation with advanced validation
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly || !params.source || !params.target) return;

      // Validate connection based on node types
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      if (!sourceNode || !targetNode) return;

      // Prevent self-loops (except for loop nodes)
      if (params.source === params.target && sourceNode.type !== 'loop') return;

      // Special handling for loop nodes
      if (sourceNode.type === 'loop' && params.sourceHandle === 'loop_back') {
        // This is a loop-back connection, allow it
      }

      const edge: WorkflowEdge = {
        id: `edge_${params.source}_${params.target}_${Date.now()}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: 'smoothstep',
        animated: true,
        data: {
          action: 'transition',
          label: 'Transition',
          condition: params.sourceHandle === 'false' ? 'condition === false' :
                    params.sourceHandle === 'true' ? 'condition === true' : undefined
        }
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges, readOnly, nodes]
  );

  // Advanced node templates
  const nodeTemplates = useMemo(() => ({
    // Basic nodes
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
    // Advanced nodes
    forLoop: {
      type: 'loop',
      data: {
        label: 'For Loop',
        description: 'Repeat for N iterations',
        color: '#8B5CF6',
        loopType: 'for' as const,
        maxIterations: 10,
      },
    },
    whileLoop: {
      type: 'loop',
      data: {
        label: 'While Loop',
        description: 'Repeat while condition is true',
        color: '#8B5CF6',
        loopType: 'while' as const,
        condition: 'counter < 10',
      },
    },
    forEachLoop: {
      type: 'loop',
      data: {
        label: 'For Each Loop',
        description: 'Iterate over collection',
        color: '#8B5CF6',
        loopType: 'forEach' as const,
        collection: 'items',
        iteratorVariable: 'item',
      },
    },
    setVariable: {
      type: 'variable',
      data: {
        label: 'Set Variable',
        description: 'Set variable value',
        color: '#14B8A6',
        operationType: 'set' as const,
        variableName: 'variable_name',
        variableType: 'string' as const,
        scope: 'local' as const,
        value: 'default_value',
      },
    },
    getVariable: {
      type: 'variable',
      data: {
        label: 'Get Variable',
        description: 'Retrieve variable value',
        color: '#14B8A6',
        operationType: 'get' as const,
        variableName: 'variable_name',
        variableType: 'string' as const,
        scope: 'local' as const,
      },
    },
    calculate: {
      type: 'variable',
      data: {
        label: 'Calculate',
        description: 'Perform calculation',
        color: '#14B8A6',
        operationType: 'calculate' as const,
        variableName: 'result',
        variableType: 'number' as const,
        scope: 'local' as const,
        expression: 'a + b',
      },
    },
    subWorkflow: {
      type: 'subWorkflow',
      data: {
        label: 'Sub Workflow',
        description: 'Execute another workflow',
        color: '#6366F1',
        subWorkflowId: 1,
        subWorkflowName: 'Child Workflow',
        inputParameters: {},
        outputParameters: [],
        executionMode: 'synchronous' as const,
        onError: 'fail' as const,
      },
    },
    jsScript: {
      type: 'script',
      data: {
        label: 'JavaScript',
        description: 'Execute JavaScript code',
        color: '#F59E0B',
        language: 'javascript' as const,
        inputVariables: [],
        outputVariables: [],
        environment: 'sandbox' as const,
      },
    },
    pythonScript: {
      type: 'script',
      data: {
        label: 'Python Script',
        description: 'Execute Python code',
        color: '#3B82F6',
        language: 'python' as const,
        script: 'print("Hello World")',
        inputVariables: [],
        outputVariables: [],
        environment: 'container' as const,
      },
    },
    sqlQuery: {
      type: 'script',
      data: {
        label: 'SQL Query',
        description: 'Execute SQL query',
        color: '#10B981',
        language: 'sql' as const,
        script: 'SELECT * FROM users WHERE active = true',
        inputVariables: [],
        outputVariables: ['result_set'],
        environment: 'local' as const,
      },
    },
  }), []);

  // Add new node
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

  // Auto-layout with improved algorithm
  const autoLayout = useCallback(() => {
    if (readOnly) return;

    // Hierarchical layout for better workflow visualization
    const updatedNodes = nodes.map((node, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      return {
        ...node,
        position: {
          x: col * 280 + 100,
          y: row * 200 + 100,
        },
      };
    });

    setNodes(updatedNodes);
  }, [nodes, setNodes, readOnly]);

  // Workflow execution simulation
  const executeWorkflow = useCallback(() => {
    if (readOnly || isExecuting) return;

    setIsExecuting(true);
    setExecutionStatus('running');

    // Simulate workflow execution
    setTimeout(() => {
      setExecutionStatus('completed');
      setTimeout(() => {
        setIsExecuting(false);
        setExecutionStatus('idle');
      }, 2000);
    }, 3000);
  }, [readOnly, isExecuting]);

  // Validate workflow
  const validateWorkflow = useCallback(() => {
    const issues: string[] = [];

    // Check for start node
    const startNodes = nodes.filter(n => n.data.isInitial);
    if (startNodes.length === 0) {
      issues.push('No start node defined');
    } else if (startNodes.length > 1) {
      issues.push('Multiple start nodes defined');
    }

    // Check for end node
    const endNodes = nodes.filter(n => n.data.isFinal);
    if (endNodes.length === 0) {
      issues.push('No end node defined');
    }

    // Check for orphaned nodes
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const orphanedNodes = nodes.filter(n => !connectedNodeIds.has(n.id) && nodes.length > 1);
    if (orphanedNodes.length > 0) {
      issues.push(`${orphanedNodes.length} orphaned nodes found`);
    }

    return issues;
  }, [nodes, edges]);

  // Fit view to content
  const fitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [reactFlowInstance]);

  const validationIssues = validateWorkflow();

  return (
    <div className="h-full flex flex-col">
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Advanced Workflow Builder
          </h2>
          {templateId && (
            <span className="text-sm text-gray-500">
              Template #{templateId}
              {templateLoading && <span className="ml-2 text-xs">(Loading...)</span>}
              {templateData && <span className="ml-2 text-xs">({templateData.name})</span>}
            </span>
          )}
          {enableAdvancedFeatures && (
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
              Advanced
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {!readOnly && (
            <>
              {/* Basic Nodes */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Node
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Basic Nodes</DropdownMenuLabel>
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

                  {enableAdvancedFeatures && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Control Flow</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => addNode('forLoop')}>
                        <RotateCw className="h-4 w-4 mr-2" />
                        For Loop
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addNode('whileLoop')}>
                        <RotateCw className="h-4 w-4 mr-2" />
                        While Loop
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addNode('forEachLoop')}>
                        <RotateCw className="h-4 w-4 mr-2" />
                        For Each Loop
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Data Operations</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => addNode('setVariable')}>
                        <Variable className="h-4 w-4 mr-2" />
                        Set Variable
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addNode('getVariable')}>
                        <Variable className="h-4 w-4 mr-2" />
                        Get Variable
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addNode('calculate')}>
                        <Variable className="h-4 w-4 mr-2" />
                        Calculate
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Advanced</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => addNode('subWorkflow')}>
                        <Workflow className="h-4 w-4 mr-2" />
                        Sub Workflow
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addNode('jsScript')}>
                        <Code className="h-4 w-4 mr-2" />
                        JavaScript
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addNode('pythonScript')}>
                        <Code className="h-4 w-4 mr-2" />
                        Python Script
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addNode('sqlQuery')}>
                        <Code className="h-4 w-4 mr-2" />
                        SQL Query
                      </DropdownMenuItem>
                    </>
                  )}
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

          {!readOnly && enableAdvancedFeatures && (
            <Button
              variant="outline"
              size="sm"
              onClick={executeWorkflow}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Test Run
                </>
              )}
            </Button>
          )}

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
              className="!w-40 !h-32"
            />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#e5e7eb"
            />

            {/* Enhanced Panels */}
            <Panel position="top-right" className="space-y-2">
              {/* Workflow Info */}
              <Card className="w-64 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Workflow Info</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nodes:</span>
                      <span className="font-medium">{nodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Connections:</span>
                      <span className="font-medium">{edges.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium">#{workflowTypeId || 'N/A'}</span>
                    </div>
                    {executionStatus !== 'idle' && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className={`font-medium capitalize ${
                          executionStatus === 'running' ? 'text-blue-600' :
                          executionStatus === 'completed' ? 'text-green-600' :
                          executionStatus === 'error' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {executionStatus}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Validation */}
              {validationIssues.length > 0 && (
                <Card className="w-64 shadow-lg border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-orange-800">Validation Issues</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-1">
                      {validationIssues.map((issue, index) => (
                        <div key={index} className="text-xs text-orange-600 flex items-start space-x-1">
                          <span className="text-orange-400">•</span>
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Enhanced Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>{readOnly ? 'View Mode' : 'Edit Mode'}</span>
          <span>{nodes.length} nodes</span>
          <span>{edges.length} edges</span>
          {validationIssues.length > 0 && (
            <span className="text-orange-600">{validationIssues.length} issues</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>Snap to Grid: On</span>
          <span>Zoom: {reactFlowInstance?.getZoom().toFixed(1)}x</span>
          {enableAdvancedFeatures && (
            <span className="text-purple-600">Advanced Mode</span>
          )}
        </div>
      </div>
    </div>
  );
});

AdvancedWorkflowBuilderInner.displayName = 'AdvancedWorkflowBuilderInner';

export default function AdvancedWorkflowBuilder(props: AdvancedWorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <AdvancedWorkflowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
