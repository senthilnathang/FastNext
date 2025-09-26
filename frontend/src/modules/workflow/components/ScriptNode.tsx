'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import { Code, Settings, Terminal, FileText, Zap } from 'lucide-react';

interface ScriptNodeData extends WorkflowNodeData {
  language: 'javascript' | 'python' | 'sql' | 'shell' | 'jq';
  script: string;
  inputVariables: string[];
  outputVariables: string[];
  timeout?: number;
  runAsUser?: string;
  environment?: 'sandbox' | 'container' | 'local';
  dependencies?: string[];
}

function ScriptNode({ data, selected }: NodeProps<ScriptNodeData>) {
  const getLanguageIcon = () => {
    switch (data.language) {
      case 'javascript':
        return <Code size={14} className="text-yellow-600" />;
      case 'python':
        return <Code size={14} className="text-blue-600" />;
      case 'sql':
        return <FileText size={14} className="text-green-600" />;
      case 'shell':
        return <Terminal size={14} className="text-gray-600" />;
      case 'jq':
        return <Zap size={14} className="text-purple-600" />;
      default:
        return <Code size={14} className="text-gray-600" />;
    }
  };

  const getLanguageColor = () => {
    switch (data.language) {
      case 'javascript':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'python':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'sql':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'shell':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'jq':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getEnvironmentColor = () => {
    switch (data.environment) {
      case 'sandbox':
        return 'bg-green-100 text-green-700';
      case 'container':
        return 'bg-blue-100 text-blue-700';
      case 'local':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getScriptPreview = () => {
    if (!data.script) return 'No script';
    const lines = data.script.split('\n');
    const firstLine = lines[0]?.trim();
    if (firstLine.length > 20) {
      return firstLine.substring(0, 20) + '...';
    }
    return firstLine || 'Empty script';
  };

  return (
    <div 
      className={`
        px-3 py-2 shadow-md rounded-lg border-2 min-w-[150px] max-w-[200px]
        ${selected ? `border-opacity-80 ${getLanguageColor().split(' ')[2]}` : 'border-gray-300'}
        bg-white transition-all duration-200 hover:shadow-lg
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
        style={{ top: -6 }}
      />
      
      {/* Node header */}
      <div className="flex items-center space-x-2 mb-2">
        {getLanguageIcon()}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs text-gray-800 truncate">
            {data.label || 'Script'}
          </div>
          <div className="text-xs text-gray-600 mt-1 truncate">
            {data.description || getScriptPreview()}
          </div>
        </div>
        <Settings size={12} className="text-gray-500" />
      </div>

      {/* Language badge */}
      <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLanguageColor()} mb-2`}>
        {data.language.toUpperCase()}
      </div>

      {/* Script details */}
      <div className="space-y-1.5">
        {/* Environment */}
        {data.environment && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Env:</span>
            <span className={`px-1.5 py-0.5 text-xs rounded capitalize ${getEnvironmentColor()}`}>
              {data.environment}
            </span>
          </div>
        )}

        {/* Variables */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>In: {data.inputVariables?.length || 0}</span>
          <span>Out: {data.outputVariables?.length || 0}</span>
        </div>

        {/* Timeout */}
        {data.timeout && (
          <div className="text-xs text-gray-600">
            Timeout: {data.timeout}s
          </div>
        )}

        {/* Dependencies count */}
        {data.dependencies && data.dependencies.length > 0 && (
          <div className="text-xs text-gray-600">
            Deps: {data.dependencies.length}
          </div>
        )}

        {/* Run as user */}
        {data.runAsUser && (
          <div className="text-xs text-gray-600 bg-gray-100 rounded px-1.5 py-1 truncate">
            User: {data.runAsUser}
          </div>
        )}

        {/* Script preview */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded px-1.5 py-1 font-mono leading-tight">
          {getScriptPreview()}
        </div>
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

      {/* Data output */}
      <Handle
        type="source"
        position={Position.Right}
        id="data"
        className="w-3 h-3 !bg-blue-400 border-2 border-white"
        style={{ right: -6, top: '60%' }}
      />
    </div>
  );
}

export default memo(ScriptNode);