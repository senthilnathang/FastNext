'use client';

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { WorkflowNodeData } from '../types/reactflow';
import { User, Users, CheckSquare, Settings } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

function UserTaskNode({ data, selected, id }: NodeProps<WorkflowNodeData>) {
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
  return (
    <>
      <div
        className={`
          px-4 py-3 shadow-md rounded-lg border-2 min-w-[150px] max-w-[200px] cursor-pointer group
          ${selected ? 'border-indigo-500' : 'border-indigo-300'}
          bg-indigo-50 transition-all duration-200 hover:shadow-lg
          border-l-4 border-l-indigo-500
        `}
        onDoubleClick={() => setIsEditDialogOpen(true)}
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
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditDialogOpen(true);
            }}
          >
            <Settings size={12} className="text-indigo-500" />
          </Button>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User Task Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Task Name</Label>
              <Input
                id="label"
                value={editData.label || ''}
                onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                placeholder="Enter task name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Enter task description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Input
                id="assignee"
                value={editData.assignee || ''}
                onChange={(e) => setEditData({ ...editData, assignee: e.target.value })}
                placeholder="Enter assignee name or email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredRoles">Required Roles</Label>
              <Input
                id="requiredRoles"
                value={editData.requiredRoles?.join(', ') || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  requiredRoles: e.target.value.split(',').map(role => role.trim()).filter(Boolean)
                })}
                placeholder="Enter roles separated by commas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={editData.priority || 'medium'}
                onValueChange={(value) => setEditData({ ...editData, priority: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="approval"
                checked={editData.approval || false}
                onCheckedChange={(checked) => setEditData({ ...editData, approval: !!checked })}
              />
              <Label htmlFor="approval">Requires Approval</Label>
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

export default memo(UserTaskNode);
