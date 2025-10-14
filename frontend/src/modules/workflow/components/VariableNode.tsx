'use client';

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import { Variable, Settings, Calculator, Type, Hash } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

interface VariableNodeData extends WorkflowNodeData {
  operationType: 'set' | 'get' | 'calculate' | 'transform';
  variableName: string;
  variableType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  value?: any;
  expression?: string;
  scope: 'local' | 'global' | 'instance';
}

function VariableNode({ data, selected, id }: NodeProps<VariableNodeData>) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState(data);

  const handleSave = useCallback(() => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('updateNodeData', {
        detail: { nodeId: id, newData: editData }
      });
      window.dispatchEvent(event);
    }
    setIsEditDialogOpen(false);
  }, [id, editData]);

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
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditDialogOpen(true);
          }}
        >
          <Settings size={12} className="text-teal-500" />
        </Button>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Variable Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={editData.label || ''}
                onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                placeholder="Enter variable label"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Enter variable description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operationType">Operation Type</Label>
              <Select
                value={editData.operationType || 'set'}
                onValueChange={(value) => setEditData({ ...editData, operationType: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set Variable</SelectItem>
                  <SelectItem value="get">Get Variable</SelectItem>
                  <SelectItem value="calculate">Calculate</SelectItem>
                  <SelectItem value="transform">Transform</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variableName">Variable Name</Label>
              <Input
                id="variableName"
                value={editData.variableName || ''}
                onChange={(e) => setEditData({ ...editData, variableName: e.target.value })}
                placeholder="Enter variable name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variableType">Variable Type</Label>
              <Select
                value={editData.variableType || 'string'}
                onValueChange={(value) => setEditData({ ...editData, variableType: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="object">Object</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Scope</Label>
              <Select
                value={editData.scope || 'local'}
                onValueChange={(value) => setEditData({ ...editData, scope: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="instance">Instance</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(editData.operationType === 'set' || editData.operationType === 'transform') && (
              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  value={editData.value || ''}
                  onChange={(e) => setEditData({ ...editData, value: e.target.value })}
                  placeholder="Enter value"
                />
              </div>
            )}

            {editData.operationType === 'calculate' && (
              <div className="space-y-2">
                <Label htmlFor="expression">Expression</Label>
                <Input
                  id="expression"
                  value={editData.expression || ''}
                  onChange={(e) => setEditData({ ...editData, expression: e.target.value })}
                  placeholder="e.g., a + b"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(VariableNode);
