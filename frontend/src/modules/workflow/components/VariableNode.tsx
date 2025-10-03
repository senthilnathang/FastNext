'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import { Variable, Settings, Calculator, Type, Hash } from 'lucide-react';

interface VariableNodeData extends WorkflowNodeData {
  operationType: 'set' | 'get' | 'calculate' | 'transform';
  variableName: string;
  variableType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  value?: any;
  expression?: string;
  scope: 'local' | 'global' | 'instance';
}

function VariableNode({ data, selected, id }: NodeProps<VariableNodeData>) {
  const getOperationIcon = () => {
    switch (data.operationType) {
      case 'set':
        return <Variable size={14} className="text-teal-600" />;
      case 'get':
        return <Variable size={14} className="text-teal-600" />;
      case 'calculate':
        return <Calculator size={14} className="text-teal-600" />;
      case 'transform':
        return <Type size={14} className="text-teal-600" />;
      default:
        return <Variable size={14} className="text-teal-600" />;
    }
  };

  const getTypeIcon = () => {
    switch (data.variableType) {
      case 'number':
        return <Hash size={10} className="text-teal-500" />;
      case 'string':
        return <Type size={10} className="text-teal-500" />;
      case 'boolean':
        return <span className="text-xs font-bold text-teal-500">B</span>;
      case 'object':
        return <span className="text-xs font-bold text-teal-500">O</span>;
      case 'array':
        return <span className="text-xs font-bold text-teal-500">A</span>;
      default:
        return <Variable size={10} className="text-teal-500" />;
    }
  };

  const getScopeColor = () => {
    switch (data.scope) {
      case 'global':
        return 'bg-red-100 text-red-700';
      case 'instance':
        return 'bg-blue-100 text-blue-700';
      case 'local':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div 
      className={`
        px-3 py-2 shadow-md rounded-lg border-2 min-w-[140px] max-w-[200px]
        ${selected ? 'border-teal-500' : 'border-teal-300'}
        bg-teal-50 transition-all duration-200 hover:shadow-lg
      `}
    >
      {/* Input handle (for set/calculate operations) */}
      {(data.operationType === 'set' || data.operationType === 'calculate' || data.operationType === 'transform') && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-teal-400 border-2 border-white"
          style={{ top: -6 }}
        />
      )}
      
      {/* Node header */}
      <div className="flex items-center space-x-2">
        {getOperationIcon()}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs text-teal-800 truncate">
            {data.label || `${data.operationType} Variable`}
          </div>
          <div className="text-xs text-teal-600 mt-1 truncate">
            {data.variableName || 'variable_name'}
          </div>
        </div>
        <Settings size={12} className="text-teal-500" />
      </div>

      {/* Variable details */}
      <div className="mt-2 space-y-1">
        {/* Type and Scope */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {getTypeIcon()}
            <span className="text-xs text-teal-700 capitalize">
              {data.variableType}
            </span>
          </div>
          <span className={`px-1.5 py-0.5 text-xs rounded uppercase ${getScopeColor()}`}>
            {data.scope}
          </span>
        </div>

        {/* Operation type */}
        <div className="flex items-center justify-between">
          <span className="px-1.5 py-0.5 text-xs bg-teal-100 text-teal-700 rounded uppercase">
            {data.operationType}
          </span>
        </div>

        {/* Value/Expression preview */}
        {(data.value !== undefined || data.expression) && (
          <div className="text-xs text-teal-600 bg-teal-100 rounded px-1.5 py-1 truncate">
            {data.expression || String(data.value)}
          </div>
        )}
      </div>
      
      {/* Output handle (for get operations or after set) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-teal-400 border-2 border-white"
        style={{ bottom: -6 }}
      />

      {/* Value output handle (for get operations) */}
      {data.operationType === 'get' && (
        <Handle
          type="source"
          position={Position.Right}
          id="value"
          className="w-3 h-3 !bg-orange-400 border-2 border-white"
          style={{ right: -6, top: '50%' }}
        />
      )}
    </div>
  );
}

export default memo(VariableNode);