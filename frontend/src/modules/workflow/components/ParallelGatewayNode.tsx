'use client';

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import { GitMerge, Zap, Settings } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

function ParallelGatewayNode({ data, selected, id }: NodeProps<WorkflowNodeData>) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState(data);
  
  const isStart = data.label?.toLowerCase().includes('split') || data.label?.toLowerCase().includes('fork');
  const isMerge = data.label?.toLowerCase().includes('merge') || data.label?.toLowerCase().includes('join');

  const handleSave = useCallback(() => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('updateNodeData', {
        detail: { nodeId: id, newData: editData }
      });
      window.dispatchEvent(event);
    }
    setIsEditDialogOpen(false);
  }, [id, editData]);
  
  return (
    <>
      <div 
        className={`
          relative px-3 py-2 shadow-md border-2 min-w-[100px] max-w-[150px] cursor-pointer group
          ${selected ? 'border-purple-500' : 'border-purple-300'}
          bg-purple-50 transition-all duration-200 hover:shadow-lg
          ${isStart ? 'rounded-l-lg rounded-r-none' : isMerge ? 'rounded-r-lg rounded-l-none' : 'rounded-lg'}
        `}
        onDoubleClick={() => setIsEditDialogOpen(true)}
      >
        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-purple-400 border-2 border-white"
          style={{ left: -6 }}
        />
        
        {/* Edit button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1 p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditDialogOpen(true);
          }}
        >
          <Settings size={10} className="text-purple-500" />
        </Button>
        
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Parallel Gateway Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Gateway Name</Label>
              <Input
                id="label"
                value={editData.label || ''}
                onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                placeholder="Enter gateway name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Enter gateway description"
              />
            </div>
            
            <div className="text-xs text-gray-500">
              <strong>Tip:</strong> Use &quot;split&quot; or &quot;fork&quot; in the name for splitting gateways, 
              &quot;merge&quot; or &quot;join&quot; for merging gateways.
            </div>
            
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
    </>
  );
}

export default memo(ParallelGatewayNode);