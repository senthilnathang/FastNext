'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import * as Icons from 'lucide-react';

function WorkflowStateNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const IconComponent = data.icon ? (Icons as any)[data.icon] || Icons.Circle : Icons.Circle;
  
  return (
    <div 
      className={`
        px-4 py-3 shadow-md rounded-lg border-2 min-w-[150px] max-w-[200px]
        ${selected ? 'border-blue-500' : 'border-gray-300'}
        transition-all duration-200 hover:shadow-lg
      `}
      style={{ 
        backgroundColor: data.bgColor || '#ffffff',
        borderColor: selected ? '#3B82F6' : (data.color || '#D1D5DB')
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
        style={{ left: -6 }}
      />
      
      {/* Node content */}
      <div className="flex items-center space-x-2">
        <IconComponent 
          size={16} 
          style={{ color: data.color || '#6B7280' }}
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div 
            className="font-medium text-sm truncate"
            style={{ color: data.color || '#374151' }}
          >
            {data.label}
          </div>
          {data.description && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
              {data.description}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mt-2">
        {data.isInitial && (
          <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
            Start
          </span>
        )}
        {data.isFinal && (
          <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
            End
          </span>
        )}
      </div>
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
        style={{ right: -6 }}
      />
    </div>
  );
}

export default memo(WorkflowStateNode);