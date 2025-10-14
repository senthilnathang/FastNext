'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import { Workflow, Settings, ExternalLink, Play } from 'lucide-react';

interface SubWorkflowNodeData extends WorkflowNodeData {
  subWorkflowId: number;
  subWorkflowName: string;
  inputParameters: Record<string, any>;
  outputParameters: string[];
  executionMode: 'synchronous' | 'asynchronous';
  timeout?: number;
  onError: 'fail' | 'continue' | 'retry';
  retryCount?: number;
}

function SubWorkflowNode({ data, selected }: NodeProps<SubWorkflowNodeData>) {
  const getModeColor = () => {
    return data.executionMode === 'synchronous'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-green-100 text-green-700';
  };

  const getErrorHandlingColor = () => {
    switch (data.onError) {
      case 'fail':
        return 'bg-red-100 text-red-700';
      case 'continue':
        return 'bg-yellow-100 text-yellow-700';
      case 'retry':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      className={`
        px-3 py-2 shadow-md rounded-lg border-2 min-w-[160px] max-w-[220px]
        ${selected ? 'border-indigo-500' : 'border-indigo-300'}
        bg-indigo-50 transition-all duration-200 hover:shadow-lg
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-indigo-400 border-2 border-white"
        style={{ top: -6 }}
      />

      {/* Node header */}
      <div className="flex items-center space-x-2">
        <Workflow size={14} className="text-indigo-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs text-indigo-800 truncate">
            {data.label || 'Sub Workflow'}
          </div>
          <div className="text-xs text-indigo-600 mt-1 truncate">
            {data.subWorkflowName || 'Unnamed Workflow'}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <ExternalLink size={10} className="text-indigo-500" />
          <Settings size={12} className="text-indigo-500" />
        </div>
      </div>

      {/* Workflow details */}
      <div className="mt-2 space-y-1.5">
        {/* Execution mode and ID */}
        <div className="flex items-center justify-between">
          <span className={`px-1.5 py-0.5 text-xs rounded ${getModeColor()}`}>
            {data.executionMode === 'synchronous' ? 'Sync' : 'Async'}
          </span>
          <span className="text-xs text-indigo-600">
            ID: {data.subWorkflowId}
          </span>
        </div>

        {/* Error handling */}
        <div className="flex items-center justify-between">
          <span className={`px-1.5 py-0.5 text-xs rounded capitalize ${getErrorHandlingColor()}`}>
            {data.onError}
          </span>
          {data.retryCount && data.onError === 'retry' && (
            <span className="text-xs text-indigo-600">
              Retry: {data.retryCount}x
            </span>
          )}
        </div>

        {/* Parameters info */}
        <div className="flex items-center justify-between text-xs text-indigo-600">
          <span>
            In: {Object.keys(data.inputParameters || {}).length}
          </span>
          <span>
            Out: {data.outputParameters?.length || 0}
          </span>
        </div>

        {/* Timeout */}
        {data.timeout && (
          <div className="text-xs text-indigo-600 bg-indigo-100 rounded px-1.5 py-1">
            Timeout: {data.timeout}s
          </div>
        )}
      </div>

      {/* Output handles */}
      {/* Success */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="success"
        className="w-3 h-3 !bg-green-400 border-2 border-white"
        style={{ bottom: -6, left: '30%' }}
      />

      {/* Error */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="error"
        className="w-3 h-3 !bg-red-400 border-2 border-white"
        style={{ bottom: -6, right: '30%' }}
      />

      {/* Data output (for synchronous workflows) */}
      {data.executionMode === 'synchronous' && (
        <Handle
          type="source"
          position={Position.Right}
          id="data"
          className="w-3 h-3 !bg-blue-400 border-2 border-white"
          style={{ right: -6, top: '50%' }}
        />
      )}

      {/* Execution indicator */}
      <div className="absolute -top-1 -right-1">
        <Play size={8} className="text-indigo-500" />
      </div>
    </div>
  );
}

export default memo(SubWorkflowNode);
