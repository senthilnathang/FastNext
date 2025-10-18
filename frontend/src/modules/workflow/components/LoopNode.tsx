"use client";

import { Hash, RotateCw, Settings } from "lucide-react";
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

interface LoopNodeData extends WorkflowNodeData {
  loopType: "for" | "while" | "forEach";
  condition?: string;
  maxIterations?: number;
  iteratorVariable?: string;
  collection?: string;
}

function LoopNode({ data, selected, id }: NodeProps<LoopNodeData>) {
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

  const getLoopTypeIcon = () => {
    switch (data.loopType) {
      case "for":
        return <Hash size={14} className="text-purple-600" />;
      case "while":
        return <RotateCw size={14} className="text-purple-600" />;
      case "forEach":
        return <RotateCw size={14} className="text-purple-600" />;
      default:
        return <RotateCw size={14} className="text-purple-600" />;
    }
  };

  const getLoopDescription = () => {
    switch (data.loopType) {
      case "for":
        return `For ${data.maxIterations || "N"} iterations`;
      case "while":
        return `While ${data.condition || "condition"}`;
      case "forEach":
        return `For each in ${data.collection || "collection"}`;
      default:
        return "Loop operation";
    }
  };

  return (
    <div
      className={`
        px-3 py-2 shadow-md rounded-lg border-2 min-w-[140px] max-w-[200px]
        ${selected ? "border-purple-500" : "border-purple-300"}
        bg-purple-50 transition-all duration-200 hover:shadow-lg
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-400 border-2 border-white"
        style={{ top: -6 }}
      />

      {/* Node header */}
      <div className="flex items-center space-x-2">
        {getLoopTypeIcon()}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs text-purple-800 truncate">
            {data.label || "Loop"}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            {data.description || getLoopDescription()}
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
          <Settings size={12} className="text-purple-500" />
        </Button>
      </div>

      {/* Loop type indicator */}
      <div className="mt-2 flex items-center justify-between">
        <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded uppercase">
          {data.loopType}
        </span>
        {data.maxIterations && (
          <span className="text-xs text-purple-600">
            Max: {data.maxIterations}
          </span>
        )}
      </div>

      {/* Condition/Variable display */}
      {(data.condition || data.iteratorVariable || data.collection) && (
        <div className="mt-1 text-xs text-purple-600 bg-purple-100 rounded px-1.5 py-1 truncate">
          {data.condition || data.iteratorVariable || data.collection}
        </div>
      )}

      {/* Output handles */}
      {/* Main flow (continue loop) */}
      <Handle
        type="source"
        position={Position.Right}
        id="continue"
        className="w-3 h-3 !bg-purple-400 border-2 border-white"
        style={{ right: -6, top: "40%" }}
      />

      {/* Loop body */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="loop_body"
        className="w-3 h-3 !bg-blue-400 border-2 border-white"
        style={{ bottom: -6 }}
      />

      {/* Exit condition */}
      <Handle
        type="source"
        position={Position.Left}
        id="exit"
        className="w-3 h-3 !bg-green-400 border-2 border-white"
        style={{ left: -6, top: "60%" }}
      />

      {/* Loop back input (from loop body) */}
      <Handle
        type="target"
        position={Position.Left}
        id="loop_back"
        className="w-3 h-3 !bg-blue-400 border-2 border-white"
        style={{ left: -6, top: "30%" }}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Loop Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Loop Name</Label>
              <Input
                id="label"
                value={editData.label || ""}
                onChange={(e) =>
                  setEditData({ ...editData, label: e.target.value })
                }
                placeholder="Enter loop name"
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
                placeholder="Enter loop description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loopType">Loop Type</Label>
              <Select
                value={editData.loopType || "for"}
                onValueChange={(value) =>
                  setEditData({ ...editData, loopType: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="for">For Loop</SelectItem>
                  <SelectItem value="while">While Loop</SelectItem>
                  <SelectItem value="forEach">For Each Loop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editData.loopType === "for" && (
              <div className="space-y-2">
                <Label htmlFor="maxIterations">Maximum Iterations</Label>
                <Input
                  id="maxIterations"
                  type="number"
                  value={editData.maxIterations || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      maxIterations: parseInt(e.target.value) || undefined,
                    })
                  }
                  placeholder="Enter max iterations"
                />
              </div>
            )}

            {editData.loopType === "while" && (
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Input
                  id="condition"
                  value={editData.condition || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, condition: e.target.value })
                  }
                  placeholder="e.g., counter < 10"
                />
              </div>
            )}

            {editData.loopType === "forEach" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="collection">Collection Variable</Label>
                  <Input
                    id="collection"
                    value={editData.collection || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, collection: e.target.value })
                    }
                    placeholder="e.g., items"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iteratorVariable">Iterator Variable</Label>
                  <Input
                    id="iteratorVariable"
                    value={editData.iteratorVariable || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        iteratorVariable: e.target.value,
                      })
                    }
                    placeholder="e.g., item"
                  />
                </div>
              </>
            )}

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

export default memo(LoopNode);
