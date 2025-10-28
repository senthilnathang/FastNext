"use client";

import { GitBranch, Settings, Trash2 } from "lucide-react";
import React, { memo, useCallback, useState } from "react";
import { Handle, type NodeProps, Position } from "reactflow";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import type { WorkflowNodeData } from "../types/reactflow";

function ConditionalNode({ data, selected, id }: NodeProps<WorkflowNodeData>) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState(data);

  const handleSave = useCallback(() => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("updateNodeData", {
        detail: { nodeId: id, newData: editData },
      });
      window.dispatchEvent(event);
    }
    setIsEditDialogOpen(false);
  }, [id, editData]);

  const handleDelete = useCallback(() => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("deleteNode", {
        detail: { nodeId: id },
      });
      window.dispatchEvent(event);
    }
  }, [id]);
  return (
    <>
      <div
        className={`
          px-3 py-2 shadow-md rounded-lg border-2 min-w-[120px] max-w-[180px] cursor-pointer
          ${selected ? "border-orange-500" : "border-orange-300"}
          bg-orange-50 transition-all duration-200 hover:shadow-lg group
        `}
        onDoubleClick={() => setIsEditDialogOpen(true)}
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
          <GitBranch size={14} className="text-orange-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs text-orange-800 truncate">
              {data.label || "Condition"}
            </div>
            {data.description && (
              <div className="text-xs text-orange-600 mt-1 line-clamp-1">
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
               <Settings size={12} className="text-orange-500" />
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
               <Trash2 size={12} />
             </Button>
           </div>
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
          style={{ left: -6, top: "50%" }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          className="w-3 h-3 !bg-green-400 border-2 border-white"
          style={{ right: -6, top: "50%" }}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Conditional Node</DialogTitle>
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
                placeholder="Enter condition label"
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
                placeholder="Enter condition description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition Expression</Label>
              <Input
                id="condition"
                value={editData.condition || ""}
                onChange={(e) =>
                  setEditData({ ...editData, condition: e.target.value })
                }
                placeholder="e.g., value > 100"
              />
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

export default memo(ConditionalNode);
