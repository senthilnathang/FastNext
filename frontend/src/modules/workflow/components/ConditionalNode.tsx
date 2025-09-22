'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import { GitBranch, Settings } from 'lucide-react';

function ConditionalNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <div 
      className={`
        px-3 py-2 shadow-md rounded-lg border-2 min-w-[120px] max-w-[180px]
        ${selected ? 'border-orange-500' : 'border-orange-300'}
        bg-orange-50 transition-all duration-200 hover:shadow-lg
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-orange-400 border-2 border-white"
        style={{ top: -6 }}
      />
      
      {/* Node content */}
      <div className="flex items-center space-x-2">
        <GitBranch 
          size={14} 
          className="text-orange-600 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs text-orange-800 truncate">
            {data.label || 'Condition'}
          </div>
          {data.description && (
            <div className="text-xs text-orange-600 mt-1 line-clamp-1">
              {data.description}
            </div>
          )}
        </div>
        <Settings size={12} className="text-orange-500" />
      </div>

      {/* Condition indicator */}
      <div className="mt-1">
        <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
          Decision
        </span>
      </div>
      
      {/* Output handles - Left (False) and Right (True) */}
      <Handle
        type="source"
        position={Position.Left}
        id="false"
        className="w-3 h-3 !bg-red-400 border-2 border-white"
        style={{ left: -6, top: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 !bg-green-400 border-2 border-white"
        style={{ right: -6, top: '50%' }}
      />
    </div>
  );
}

export default memo(ConditionalNode);