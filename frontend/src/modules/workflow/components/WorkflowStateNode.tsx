"use client";

import * as Icons from "lucide-react";
import React, { memo, useCallback, useState } from "react";
import { Handle, type NodeProps, Position } from "reactflow";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import type { WorkflowNodeData } from "../types/reactflow";

function WorkflowStateNode({
  data,
  selected,
  id,
}: NodeProps<WorkflowNodeData>) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState(data || {});

  const IconComponent = data?.icon
    ? (Icons as any)[data.icon] || Icons.Circle
    : Icons.Circle;

  const handleSave = useCallback(() => {
    // Update the node data
    if (typeof window !== "undefined") {
      const event = new CustomEvent("updateNodeData", {
        detail: { nodeId: id, newData: editData },
      });
      window.dispatchEvent(event);
    }
    setIsEditDialogOpen(false);
  }, [id, editData]);

  const handleDelete = useCallback(() => {
    // Delete the node
    if (typeof window !== "undefined") {
      const event = new CustomEvent("deleteNode", {
        detail: { nodeId: id },
      });
      window.dispatchEvent(event);
    }
  }, [id]);

  const iconOptions = [
    "Circle",
    "Square",
    "Triangle",
    "Star",
    "Heart",
    "Diamond",
    "CheckCircle",
    "XCircle",
    "AlertCircle",
    "Info",
    "Settings",
    "User",
    "Users",
    "Mail",
    "Phone",
    "Calendar",
    "Clock",
  ];

  return (
    <>
      <div
        className={`
          px-4 py-3 shadow-md rounded-lg border-2 min-w-[150px] max-w-[200px] cursor-pointer
          ${selected ? "border-blue-500" : "border-gray-300"}
          transition-all duration-200 hover:shadow-lg
        `}
        style={{
          backgroundColor: data?.bgColor || "#ffffff",
          borderColor: selected ? "#3B82F6" : data?.color || "#D1D5DB",
        }}
        onDoubleClick={() => setIsEditDialogOpen(true)}
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
            style={{ color: data?.color || "#6B7280" }}
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div
              className="font-medium text-sm truncate"
              style={{ color: data?.color || "#374151" }}
            >
              {data?.label || "State"}
            </div>
            {data?.description && (
              <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                {data.description}
              </div>
            )}
          </div>
           <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <Button
               variant="ghost"
               size="sm"
               className="p-1 h-auto"
               onClick={(e) => {
                 e.stopPropagation();
                 setIsEditDialogOpen(true);
               }}
             >
               <Icons.Settings size={12} />
             </Button>
             <Button
               variant="ghost"
               size="sm"
               className="p-1 h-auto text-red-500 hover:text-red-700 hover:bg-red-50"
               onClick={(e) => {
                 e.stopPropagation();
                 handleDelete();
               }}
             >
               <Icons.Trash2 size={12} />
             </Button>
           </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mt-2">
          {data?.isInitial && (
            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
              Start
            </span>
          )}
          {data?.isFinal && (
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit State Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={editData.label || ""}
                onChange={(e) =>
                  setEditData({ ...editData, label: e.target.value })
                }
                placeholder="Enter state label"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editData.description || ""}
                onChange={(e) =>
                  setEditData({ ...editData, description: e.target.value })
                }
                placeholder="Enter state description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={editData.color || "#6B7280"}
                  onChange={(e) =>
                    setEditData({ ...editData, color: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bgColor">Background</Label>
                <Input
                  id="bgColor"
                  type="color"
                  value={editData.bgColor || "#F9FAFB"}
                  onChange={(e) =>
                    setEditData({ ...editData, bgColor: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select
                value={editData.icon || "Circle"}
                onValueChange={(value) =>
                  setEditData({ ...editData, icon: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <div className="flex items-center space-x-2">
                        {React.createElement(
                          (Icons as any)[icon] || Icons.Circle,
                          { size: 16 },
                        )}
                        <span>{icon}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isInitial"
                  checked={editData.isInitial || false}
                  onCheckedChange={(checked) =>
                    setEditData({ ...editData, isInitial: !!checked })
                  }
                />
                <Label htmlFor="isInitial">Start State</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFinal"
                  checked={editData.isFinal || false}
                  onCheckedChange={(checked) =>
                    setEditData({ ...editData, isFinal: !!checked })
                  }
                />
                <Label htmlFor="isFinal">End State</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(WorkflowStateNode);
