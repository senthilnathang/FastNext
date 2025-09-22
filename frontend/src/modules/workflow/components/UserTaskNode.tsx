'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import { User, Users, CheckSquare } from 'lucide-react';

function UserTaskNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  return (
    <div 
      className={`
        px-4 py-3 shadow-md rounded-lg border-2 min-w-[150px] max-w-[200px]
        ${selected ? 'border-indigo-500' : 'border-indigo-300'}
        bg-indigo-50 transition-all duration-200 hover:shadow-lg
        border-l-4 border-l-indigo-500
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-indigo-400 border-2 border-white"
        style={{ left: -6 }}
      />
      
      {/* Node content */}
      <div className="flex items-center space-x-2">
        <User 
          size={16} 
          className="text-indigo-600 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-indigo-800 truncate">
            {data.label || 'User Task'}
          </div>
          {data.description && (
            <div className="text-xs text-indigo-600 mt-1 line-clamp-2">
              {data.description}
            </div>
          )}
        </div>
      </div>

      {/* Task details */}
      <div className="mt-2 space-y-1">
        {data.assignee && (
          <div className="flex items-center space-x-1">
            <User size={12} className="text-indigo-500" />
            <span className="text-xs text-indigo-700">{data.assignee}</span>
          </div>
        )}
        
        {data.requiredRoles && data.requiredRoles.length > 0 && (
          <div className="flex items-center space-x-1">
            <Users size={12} className="text-indigo-500" />
            <span className="text-xs text-indigo-700">
              {data.requiredRoles.join(', ')}
            </span>
          </div>
        )}

        {data.approval && (
          <div className="flex items-center space-x-1">
            <CheckSquare size={12} className="text-green-500" />
            <span className="text-xs text-green-700">Requires Approval</span>
          </div>
        )}
      </div>

      {/* Priority indicator */}
      <div className="flex justify-between items-center mt-2">
        <span className="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
          Task
        </span>
        
        {data.priority && (
          <span className={`px-1.5 py-0.5 text-xs rounded ${
            data.priority === 'high' ? 'bg-red-100 text-red-700' :
            data.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {data.priority}
          </span>
        )}
      </div>
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-indigo-400 border-2 border-white"
        style={{ right: -6 }}
      />
    </div>
  );
}

export default memo(UserTaskNode);