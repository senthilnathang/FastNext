"use client";

import { Code, FileText, Settings, Terminal, Zap } from "lucide-react";
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

interface ScriptNodeData extends WorkflowNodeData {
  language: "javascript" | "python" | "sql" | "shell" | "jq";
  script: string;
  inputVariables: string[];
  outputVariables: string[];
  timeout?: number;
  runAsUser?: string;
  environment?: "sandbox" | "container" | "local";
  dependencies?: string[];
}

function ScriptNode({ data, selected, id }: NodeProps<ScriptNodeData>) {
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

  const getLanguageIcon = () => {
    switch (data.language) {
      case "javascript":
        return <Code size={14} className="text-yellow-600" />;
      case "python":
        return <Code size={14} className="text-blue-600" />;
      case "sql":
        return <FileText size={14} className="text-green-600" />;
      case "shell":
        return <Terminal size={14} className="text-gray-600" />;
      case "jq":
        return <Zap size={14} className="text-purple-600" />;
      default:
        return <Code size={14} className="text-gray-600" />;
    }
  };

  const getLanguageColor = () => {
    switch (data.language) {
      case "javascript":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "python":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "sql":
        return "bg-green-100 text-green-800 border-green-300";
      case "shell":
        return "bg-gray-100 text-gray-800 border-gray-300";
      case "jq":
        return "bg-purple-100 text-purple-800 border-purple-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getEnvironmentColor = () => {
    switch (data.environment) {
      case "sandbox":
        return "bg-green-100 text-green-700";
      case "container":
        return "bg-blue-100 text-blue-700";
      case "local":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getScriptPreview = () => {
    if (!data.script) return "No script";
    const lines = data.script.split("\n");
    const firstLine = lines[0]?.trim();
    if (firstLine.length > 20) {
      return firstLine.substring(0, 20) + "...";
    }
    return firstLine || "Empty script";
  };

  return (
    <div
      className={`
        px-3 py-2 shadow-md rounded-lg border-2 min-w-[150px] max-w-[200px]
        ${selected ? `border-opacity-80 ${getLanguageColor().split(" ")[2]}` : "border-gray-300"}
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
            {data.label || "Script"}
          </div>
          <div className="text-xs text-gray-600 mt-1 truncate">
            {data.description || getScriptPreview()}
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
          <Settings size={12} className="text-gray-500" />
        </Button>
      </div>

      {/* Language badge */}
      <div
        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLanguageColor()} mb-2`}
      >
        {data.language.toUpperCase()}
      </div>

      {/* Script details */}
      <div className="space-y-1.5">
        {/* Environment */}
        {data.environment && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Env:</span>
            <span
              className={`px-1.5 py-0.5 text-xs rounded capitalize ${getEnvironmentColor()}`}
            >
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
          <div className="text-xs text-gray-600">Timeout: {data.timeout}s</div>
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

      {/* Data output */}
      <Handle
        type="source"
        position={Position.Right}
        id="data"
        className="w-3 h-3 !bg-blue-400 border-2 border-white"
        style={{ right: -6, top: "60%" }}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Script Node</DialogTitle>
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
                placeholder="Enter script label"
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
                placeholder="Enter script description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={editData.language || "javascript"}
                onValueChange={(value) =>
                  setEditData({ ...editData, language: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="sql">SQL</SelectItem>
                  <SelectItem value="shell">Shell</SelectItem>
                  <SelectItem value="jq">JQ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="script">Script</Label>
              <Textarea
                id="script"
                value={editData.script || ""}
                onChange={(e) =>
                  setEditData({ ...editData, script: e.target.value })
                }
                placeholder="Enter your script code"
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={editData.environment || "sandbox"}
                onValueChange={(value) =>
                  setEditData({ ...editData, environment: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="container">Container</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inputVariables">Input Variables</Label>
              <Input
                id="inputVariables"
                value={editData.inputVariables?.join(", ") || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    inputVariables: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="var1, var2, var3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outputVariables">Output Variables</Label>
              <Input
                id="outputVariables"
                value={editData.outputVariables?.join(", ") || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    outputVariables: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="result1, result2"
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="runAsUser">Run As User</Label>
              <Input
                id="runAsUser"
                value={editData.runAsUser || ""}
                onChange={(e) =>
                  setEditData({ ...editData, runAsUser: e.target.value })
                }
                placeholder="Enter user to run as"
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

export default memo(ScriptNode);
