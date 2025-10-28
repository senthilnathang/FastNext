"use client";

import { Settings, Timer, Trash2 } from "lucide-react";
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

function TimerNode({ data, selected, id }: NodeProps<WorkflowNodeData>) {
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
          px-3 py-2 shadow-md rounded-full border-2 min-w-[80px] min-h-[80px] cursor-pointer group
          ${selected ? "border-yellow-500" : "border-yellow-300"}
          bg-yellow-50 transition-all duration-200 hover:shadow-lg
          flex flex-col items-center justify-center relative
        `}
        onDoubleClick={() => setIsEditDialogOpen(true)}
      >
        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-yellow-400 border-2 border-white"
          style={{ left: -6 }}
        />

        {/* Edit and Delete buttons */}
        <div className="absolute top-1 right-1 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditDialogOpen(true);
            }}
          >
            <Settings size={10} className="text-yellow-500" />
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
            <Trash2 size={10} />
          </Button>
        </div>

        {/* Node content */}
        <div className="flex flex-col items-center space-y-1">
          <Timer size={20} className="text-yellow-600 flex-shrink-0" />
          <div className="text-center">
            <div className="font-medium text-xs text-yellow-800 truncate">
              {data.label || "Timer"}
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
            {data.duration || "1h"}
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Timer Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Timer Name</Label>
              <Input
                id="label"
                value={editData.label || ""}
                onChange={(e) =>
                  setEditData({ ...editData, label: e.target.value })
                }
                placeholder="Enter timer name"
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
                placeholder="Enter timer description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={editData.duration || ""}
                onChange={(e) =>
                  setEditData({ ...editData, duration: e.target.value })
                }
                placeholder="e.g., 1h, 30m, 5s, 2d"
              />
              <div className="text-xs text-gray-500">
                Examples: 30s, 5m, 1h, 2d (seconds, minutes, hours, days)
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

export default memo(TimerNode);
