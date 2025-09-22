'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import { Timer } from 'lucide-react';

function TimerNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <div 
      className={`
        px-3 py-2 shadow-md rounded-full border-2 min-w-[80px] min-h-[80px]
        ${selected ? 'border-yellow-500' : 'border-yellow-300'}
        bg-yellow-50 transition-all duration-200 hover:shadow-lg
        flex flex-col items-center justify-center
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-yellow-400 border-2 border-white"
        style={{ left: -6 }}
      />
      
      {/* Node content */}
      <div className="flex flex-col items-center space-y-1">
        <Timer 
          size={20} 
          className="text-yellow-600 flex-shrink-0"
        />
        <div className="text-center">
          <div className="font-medium text-xs text-yellow-800 truncate">
            {data.label || 'Timer'}
          </div>
          {data.description && (
            <div className="text-xs text-yellow-600 mt-1 line-clamp-1">
              {data.description}
            </div>
          )}
        </div>
      </div>

      {/* Timer duration indicator */}
      <div className="mt-1">
        <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
          {data.duration || '1h'}
        </span>
      </div>
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-yellow-400 border-2 border-white"
        style={{ right: -6 }}
      />
    </div>
  );
}

export default memo(TimerNode);