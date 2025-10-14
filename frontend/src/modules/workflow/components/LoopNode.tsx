'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import { RotateCw, Settings, Hash } from 'lucide-react';

interface LoopNodeData extends WorkflowNodeData {
  loopType: 'for' | 'while' | 'forEach';
  condition?: string;
  maxIterations?: number;
  iteratorVariable?: string;
  collection?: string;
}

function LoopNode({ data, selected }: NodeProps<LoopNodeData>) {
  const getLoopTypeIcon = () => {
    switch (data.loopType) {
      case 'for':
        return <Hash size={14} className="text-purple-600" />;
      case 'while':
        return <RotateCw size={14} className="text-purple-600" />;
      case 'forEach':
        return <RotateCw size={14} className="text-purple-600" />;
      default:
        return <RotateCw size={14} className="text-purple-600" />;
    }
  };

  const getLoopDescription = () => {
    switch (data.loopType) {
      case 'for':
        return `For ${data.maxIterations || 'N'} iterations`;
      case 'while':
        return `While ${data.condition || 'condition'}`;
      case 'forEach':
        return `For each in ${data.collection || 'collection'}`;
      default:
        return 'Loop operation';
    }
  };

  return (
    <div
      className={`
        px-3 py-2 shadow-md rounded-lg border-2 min-w-[140px] max-w-[200px]
        ${selected ? 'border-purple-500' : 'border-purple-300'}
        bg-purple-50 transition-all duration-200 hover:shadow-lg
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-400 border-2 border-white"
        style={{ top: -6 }}
      />

      {/* Node header */}
      <div className="flex items-center space-x-2">
        {getLoopTypeIcon()}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs text-purple-800 truncate">
            {data.label || 'Loop'}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            {data.description || getLoopDescription()}
          </div>
        </div>
        <Settings size={12} className="text-purple-500" />
      </div>

      {/* Loop type indicator */}
      <div className="mt-2 flex items-center justify-between">
        <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded uppercase">
          {data.loopType}
        </span>
        {data.maxIterations && (
          <span className="text-xs text-purple-600">
            Max: {data.maxIterations}
          </span>
        )}
      </div>

      {/* Condition/Variable display */}
      {(data.condition || data.iteratorVariable || data.collection) && (
        <div className="mt-1 text-xs text-purple-600 bg-purple-100 rounded px-1.5 py-1 truncate">
          {data.condition || data.iteratorVariable || data.collection}
        </div>
      )}

      {/* Output handles */}
      {/* Main flow (continue loop) */}
      <Handle
        type="source"
        position={Position.Right}
        id="continue"
        className="w-3 h-3 !bg-purple-400 border-2 border-white"
        style={{ right: -6, top: '40%' }}
      />

      {/* Loop body */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="loop_body"
        className="w-3 h-3 !bg-blue-400 border-2 border-white"
        style={{ bottom: -6 }}
      />

      {/* Exit condition */}
      <Handle
        type="source"
        position={Position.Left}
        id="exit"
        className="w-3 h-3 !bg-green-400 border-2 border-white"
        style={{ left: -6, top: '60%' }}
      />

      {/* Loop back input (from loop body) */}
      <Handle
        type="target"
        position={Position.Left}
        id="loop_back"
        className="w-3 h-3 !bg-blue-400 border-2 border-white"
        style={{ left: -6, top: '30%' }}
      />
    </div>
  );
}

export default memo(LoopNode);
