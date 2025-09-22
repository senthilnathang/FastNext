'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import { GitMerge, Zap } from 'lucide-react';

function ParallelGatewayNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const isStart = data.label?.toLowerCase().includes('split') || data.label?.toLowerCase().includes('fork');
  const isMerge = data.label?.toLowerCase().includes('merge') || data.label?.toLowerCase().includes('join');
  
  return (
    <div 
      className={`
        relative px-3 py-2 shadow-md border-2 min-w-[100px] max-w-[150px]
        ${selected ? 'border-purple-500' : 'border-purple-300'}
        bg-purple-50 transition-all duration-200 hover:shadow-lg
        ${isStart ? 'rounded-l-lg rounded-r-none' : isMerge ? 'rounded-r-lg rounded-l-none' : 'rounded-lg'}
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-400 border-2 border-white"
        style={{ left: -6 }}
      />
      
      {/* Node content */}
      <div className="flex flex-col items-center space-y-1">
        <div className="flex items-center space-x-1">
          {isStart ? (
            <GitMerge size={16} className="text-purple-600 rotate-180" />
          ) : isMerge ? (
            <GitMerge size={16} className="text-purple-600" />
          ) : (
            <Zap size={16} className="text-purple-600" />
          )}
        </div>
        
        <div className="text-center">
          <div className="font-medium text-xs text-purple-800 truncate">
            {data.label || 'Gateway'}
          </div>
          {data.description && (
            <div className="text-xs text-purple-600 mt-1 line-clamp-1">
              {data.description}
            </div>
          )}
        </div>

        {/* Gateway type indicator */}
        <div className="text-center">
          <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
            {isStart ? 'Split' : isMerge ? 'Merge' : 'Parallel'}
          </span>
        </div>
      </div>
      
      {/* Output handles - Multiple for split gateway */}
      {isStart ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="out1"
            className="w-3 h-3 !bg-purple-400 border-2 border-white"
            style={{ right: -6, top: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="out2"
            className="w-3 h-3 !bg-purple-400 border-2 border-white"
            style={{ right: -6, top: '70%' }}
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-purple-400 border-2 border-white"
          style={{ right: -6 }}
        />
      )}

      {/* Additional input handles for merge gateway */}
      {isMerge && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="in1"
            className="w-3 h-3 !bg-purple-400 border-2 border-white"
            style={{ left: -6, top: '30%' }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="in2"
            className="w-3 h-3 !bg-purple-400 border-2 border-white"
            style={{ left: -6, top: '70%' }}
          />
        </>
      )}
    </div>
  );
}

export default memo(ParallelGatewayNode);