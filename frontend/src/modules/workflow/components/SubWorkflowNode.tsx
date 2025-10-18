"use client";

import { ExternalLink, Play, Settings, Workflow } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import type { WorkflowNodeData } from "../types/reactflow";

interface SubWorkflowNodeData extends WorkflowNodeData {
  subWorkflowId: number;
  subWorkflowName: string;
  inputParameters: Record<string, any>;
  outputParameters: string[];
  executionMode: "synchronous" | "asynchronous";
  timeout?: number;
  onError: "fail" | "continue" | "retry";
  retryCount?: number;
}

function SubWorkflowNode({
  data,
  selected,
  id,
}: NodeProps<SubWorkflowNodeData>) {
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

  const getModeColor = () => {
    return data.executionMode === "synchronous"
      ? "bg-blue-100 text-blue-700"
      : "bg-green-100 text-green-700";
  };

  const getErrorHandlingColor = () => {
    switch (data.onError) {
      case "fail":
        return "bg-red-100 text-red-700";
      case "continue":
        return "bg-yellow-100 text-yellow-700";
      case "retry":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div
      className={`
        px-3 py-2 shadow-md rounded-lg border-2 min-w-[160px] max-w-[220px]
        ${selected ? "border-indigo-500" : "border-indigo-300"}
        bg-indigo-50 transition-all duration-200 hover:shadow-lg
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-indigo-400 border-2 border-white"
        style={{ top: -6 }}
      />

      {/* Node header */}
      <div className="flex items-center space-x-2">
        <Workflow size={14} className="text-indigo-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs text-indigo-800 truncate">
            {data.label || "Sub Workflow"}
          </div>
          <div className="text-xs text-indigo-600 mt-1 truncate">
            {data.subWorkflowName || "Unnamed Workflow"}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <ExternalLink size={10} className="text-indigo-500" />
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
      </div>

      {/* Workflow details */}
      <div className="mt-2 space-y-1.5">
        {/* Execution mode and ID */}
        <div className="flex items-center justify-between">
          <span className={`px-1.5 py-0.5 text-xs rounded ${getModeColor()}`}>
            {data.executionMode === "synchronous" ? "Sync" : "Async"}
          </span>
          <span className="text-xs text-indigo-600">
            ID: {data.subWorkflowId}
          </span>
        </div>

        {/* Error handling */}
        <div className="flex items-center justify-between">
          <span
            className={`px-1.5 py-0.5 text-xs rounded capitalize ${getErrorHandlingColor()}`}
          >
            {data.onError}
          </span>
          {data.retryCount && data.onError === "retry" && (
            <span className="text-xs text-indigo-600">
              Retry: {data.retryCount}x
            </span>
          )}
        </div>

        {/* Parameters info */}
        <div className="flex items-center justify-between text-xs text-indigo-600">
          <span>In: {Object.keys(data.inputParameters || {}).length}</span>
          <span>Out: {data.outputParameters?.length || 0}</span>
        </div>

        {/* Timeout */}
        {data.timeout && (
          <div className="text-xs text-indigo-600 bg-indigo-100 rounded px-1.5 py-1">
            Timeout: {data.timeout}s
          </div>
        )}
      </div>

      {/* Output handles */}
      {/* Success */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="success"
        className="w-3 h-3 !bg-green-400 border-2 border-white"
        style={{ bottom: -6, left: "30%" }}
      />

      {/* Error */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="error"
        className="w-3 h-3 !bg-red-400 border-2 border-white"
        style={{ bottom: -6, right: "30%" }}
      />

      {/* Data output (for synchronous workflows) */}
      {data.executionMode === "synchronous" && (
        <Handle
          type="source"
          position={Position.Right}
          id="data"
          className="w-3 h-3 !bg-blue-400 border-2 border-white"
          style={{ right: -6, top: "50%" }}
        />
      )}

      {/* Execution indicator */}
      <div className="absolute -top-1 -right-1">
        <Play size={8} className="text-indigo-500" />
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Sub Workflow Node</DialogTitle>
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
                placeholder="Enter sub workflow label"
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
                placeholder="Enter sub workflow description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subWorkflowId">Sub Workflow ID</Label>
              <Input
                id="subWorkflowId"
                type="number"
                value={editData.subWorkflowId || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    subWorkflowId: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Enter sub workflow ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subWorkflowName">Sub Workflow Name</Label>
              <Input
                id="subWorkflowName"
                value={editData.subWorkflowName || ""}
                onChange={(e) =>
                  setEditData({ ...editData, subWorkflowName: e.target.value })
                }
                placeholder="Enter sub workflow name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="executionMode">Execution Mode</Label>
              <Select
                value={editData.executionMode || "synchronous"}
                onValueChange={(value) =>
                  setEditData({ ...editData, executionMode: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="synchronous">Synchronous</SelectItem>
                  <SelectItem value="asynchronous">Asynchronous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="onError">Error Handling</Label>
              <Select
                value={editData.onError || "fail"}
                onValueChange={(value) =>
                  setEditData({ ...editData, onError: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fail">Fail</SelectItem>
                  <SelectItem value="continue">Continue</SelectItem>
                  <SelectItem value="retry">Retry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editData.onError === "retry" && (
              <div className="space-y-2">
                <Label htmlFor="retryCount">Retry Count</Label>
                <Input
                  id="retryCount"
                  type="number"
                  value={editData.retryCount || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      retryCount: parseInt(e.target.value) || undefined,
                    })
                  }
                  placeholder="Enter retry count"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (seconds)</Label>
              <Input
                id="timeout"
                type="number"
                value={editData.timeout || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    timeout: parseInt(e.target.value) || undefined,
                  })
                }
                placeholder="Enter timeout in seconds"
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
    </div>
  );
}

export default memo(SubWorkflowNode);
