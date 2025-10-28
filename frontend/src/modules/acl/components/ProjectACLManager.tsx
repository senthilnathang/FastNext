"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  Users,
  Lock,
  Unlock,
} from "lucide-react";

interface Project {
  id: number;
  name: string;
  description: string;
  user_id: number;
  is_public: boolean;
}

interface RecordPermission {
  id: number;
  entity_type: string;
  entity_id: string;
  user_id: number;
  operation: string;
  granted_by: number;
  conditions?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  user?: {
    id: number;
    email: string;
    full_name: string;
  };
}

interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
}

interface ProjectACLManagerProps {
  projectId?: string;
}

const OPERATIONS = ["read", "write", "delete"];

export default function ProjectACLManager({ projectId }: ProjectACLManagerProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [permissions, setPermissions] = useState<RecordPermission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedOperation, setSelectedOperation] = useState<string>("");

  // Load project details
  const loadProject = async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`/api/v1/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else {
        toast.error("Failed to load project details");
      }
    } catch (error) {
      toast.error("Error loading project");
    }
  };

  // Load record permissions for this project
  const loadPermissions = async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`/api/v1/acls/record-permissions?entity_type=projects&entity_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.items || []);
      } else {
        toast.error("Failed to load permissions");
      }
    } catch (error) {
      toast.error("Error loading permissions");
    }
  };

  // Load users for permission granting
  const loadUsers = async () => {
    try {
      const response = await fetch("/api/v1/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.items || []);
      }
    } catch (error) {
      toast.error("Error loading users");
    }
  };

  // Grant permission to user
  const grantPermission = async () => {
    if (!selectedUserId || !selectedOperation || !projectId) {
      toast.error("Please select a user and operation");
      return;
    }

    try {
      const response = await fetch("/api/v1/acls/record-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity_type: "projects",
          entity_id: projectId,
          user_id: parseInt(selectedUserId),
          operation: selectedOperation,
        }),
      });

      if (response.ok) {
        toast.success("Permission granted successfully");
        setShowGrantForm(false);
        setSelectedUserId("");
        setSelectedOperation("");
        loadPermissions();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to grant permission");
      }
    } catch (error) {
      toast.error("Error granting permission");
    }
  };

  // Revoke permission
  const revokePermission = async (permissionId: number) => {
    if (!confirm("Are you sure you want to revoke this permission?")) return;

    try {
      const response = await fetch(`/api/v1/acls/record-permissions/${permissionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Permission revoked successfully");
        loadPermissions();
      } else {
        toast.error("Failed to revoke permission");
      }
    } catch (error) {
      toast.error("Error revoking permission");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadProject(), loadPermissions(), loadUsers()]);
      setLoading(false);
    };

    loadData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
          <p className="mt-2 text-sm text-gray-500">Loading ACL permissions...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center p-8">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ACL Permissions for "{project.name}"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            {project.is_public ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Unlock className="h-3 w-3" />
                Public Project
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Private Project
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">{project.description}</p>
        </CardContent>
      </Card>

      {/* Grant Permission Form */}
      {showGrantForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Grant Permission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user">User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="operation">Operation</Label>
                <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select operation" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATIONS.map((op) => (
                      <SelectItem key={op} value={op}>
                        {op.charAt(0).toUpperCase() + op.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={grantPermission}>
                Grant Permission
              </Button>
              <Button variant="outline" onClick={() => setShowGrantForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Record Permissions ({permissions.length})
            </CardTitle>
            <Button onClick={() => setShowGrantForm(!showGrantForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Grant Permission
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No specific permissions granted yet.</p>
              <p className="text-sm text-gray-400">
                Users will rely on ACL rules or project ownership for access.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Granted By</TableHead>
                  <TableHead>Granted At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      {permission.user ? (
                        <div>
                          <div className="font-medium">{permission.user.full_name}</div>
                          <div className="text-sm text-gray-500">{permission.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">User {permission.user_id}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {permission.operation}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      User {permission.granted_by}
                    </TableCell>
                    <TableCell>
                      {new Date(permission.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokePermission(permission.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}