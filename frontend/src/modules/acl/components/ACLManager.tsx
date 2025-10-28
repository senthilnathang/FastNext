"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
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
import { Switch } from "@/shared/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Settings,
} from "lucide-react";

interface ACL {
  id: number;
  name: string;
  description?: string;
  entity_type: string;
  operation: string;
  field_name?: string;
  condition_script?: string;
  allowed_roles: string[];
  denied_roles: string[];
  priority: number;
  is_active: boolean;
  created_at: string;
}

interface ACLFormData {
  name: string;
  description: string;
  entity_type: string;
  operation: string;
  field_name: string;
  condition_script: string;
  allowed_roles: string[];
  denied_roles: string[];
  priority: number;
  is_active: boolean;
}

const ENTITY_TYPES = [
  "orders", "invoices", "products", "customers", "tasks",
  "documents", "purchase_orders", "projects", "users", "assets"
];

const OPERATIONS = ["read", "write", "delete", "approve", "create", "update"];

const COMMON_ROLES = [
  "admin", "manager", "user", "finance", "sales",
  "customer_service", "product_manager", "project_manager"
];

export default function ACLManager() {
  const [acls, setAcls] = useState<ACL[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAcl, setEditingAcl] = useState<ACL | null>(null);
  const [formData, setFormData] = useState<ACLFormData>({
    name: "",
    description: "",
    entity_type: "",
    operation: "",
    field_name: "",
    condition_script: "",
    allowed_roles: [],
    denied_roles: [],
    priority: 100,
    is_active: true,
  });

  // Load ACLs
  const loadAcls = async () => {
    try {
      const response = await fetch("/api/v1/acls");
      if (response.ok) {
        const data = await response.json();
        setAcls(data.items);
      } else {
        toast.error("Failed to load ACLs");
      }
    } catch (error) {
      toast.error("Error loading ACLs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcls();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingAcl ? `/api/v1/acls/${editingAcl.id}` : "/api/v1/acls";
      const method = editingAcl ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(`ACL ${editingAcl ? "updated" : "created"} successfully`);
        setShowForm(false);
        setEditingAcl(null);
        resetForm();
        loadAcls();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to save ACL");
      }
    } catch (error) {
      toast.error("Error saving ACL");
    }
  };

  // Handle delete
  const handleDelete = async (acl: ACL) => {
    if (!confirm(`Are you sure you want to delete ACL "${acl.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/acls/${acl.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("ACL deleted successfully");
        loadAcls();
      } else {
        toast.error("Failed to delete ACL");
      }
    } catch (error) {
      toast.error("Error deleting ACL");
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      entity_type: "",
      operation: "",
      field_name: "",
      condition_script: "",
      allowed_roles: [],
      denied_roles: [],
      priority: 100,
      is_active: true,
    });
  };

  // Edit ACL
  const handleEdit = (acl: ACL) => {
    setEditingAcl(acl);
    setFormData({
      name: acl.name,
      description: acl.description || "",
      entity_type: acl.entity_type,
      operation: acl.operation,
      field_name: acl.field_name || "",
      condition_script: acl.condition_script || "",
      allowed_roles: acl.allowed_roles || [],
      denied_roles: acl.denied_roles || [],
      priority: acl.priority,
      is_active: acl.is_active,
    });
    setShowForm(true);
  };

  // Handle role selection
  const handleRoleToggle = (role: string, type: "allowed" | "denied") => {
    setFormData(prev => {
      const currentRoles = type === "allowed" ? prev.allowed_roles : prev.denied_roles;
      const updatedRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];

      return {
        ...prev,
        [type === "allowed" ? "allowed_roles" : "denied_roles"]: updatedRoles,
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading ACLs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="h-8 w-8 mr-3 text-blue-600" />
            Access Control Lists (ACLs)
          </h1>
          <p className="text-gray-600 mt-1">
            Manage dynamic per-record permissions and access control rules
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Create ACL
        </Button>
      </div>

      {/* ACL Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingAcl ? "Edit ACL" : "Create New ACL"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">ACL Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., order_approval_acl"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this ACL controls"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="entity_type">Entity Type *</Label>
                    <Select
                      value={formData.entity_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, entity_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="operation">Operation *</Label>
                    <Select
                      value={formData.operation}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, operation: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATIONS.map(op => (
                          <SelectItem key={op} value={op}>
                            {op.charAt(0).toUpperCase() + op.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="field_name">Field Name (Optional)</Label>
                    <Input
                      id="field_name"
                      value={formData.field_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, field_name: e.target.value }))}
                      placeholder="e.g., price, ssn (leave empty for record-level)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 100 }))}
                      min="1"
                      max="999"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Higher priority rules are evaluated first (1-999)
                    </p>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="condition_script">Condition Script</Label>
                    <Textarea
                      id="condition_script"
                      value={formData.condition_script}
                      onChange={(e) => setFormData(prev => ({ ...prev, condition_script: e.target.value }))}
                      placeholder="Python expression, e.g., entity_data.get('amount', 0) > 1000"
                      rows={4}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Available variables: user, user_id, user_roles, entity_data, context
                    </p>
                  </div>

                  {/* Role Permissions */}
                  <div>
                    <Label>Allowed Roles</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {COMMON_ROLES.map(role => (
                        <div key={role} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`allowed-${role}`}
                            checked={formData.allowed_roles.includes(role)}
                            onChange={() => handleRoleToggle(role, "allowed")}
                            className="rounded"
                          />
                          <Label htmlFor={`allowed-${role}`} className="text-sm">
                            {role}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Denied Roles</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {COMMON_ROLES.map(role => (
                        <div key={role} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`denied-${role}`}
                            checked={formData.denied_roles.includes(role)}
                            onChange={() => handleRoleToggle(role, "denied")}
                            className="rounded"
                          />
                          <Label htmlFor={`denied-${role}`} className="text-sm">
                            {role}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAcl(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAcl ? "Update ACL" : "Create ACL"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ACLs Table */}
      <Card>
        <CardHeader>
          <CardTitle>ACL Rules ({acls.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acls.map((acl) => (
                <TableRow key={acl.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{acl.name}</div>
                      {acl.description && (
                        <div className="text-sm text-gray-500">{acl.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{acl.entity_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{acl.operation}</Badge>
                  </TableCell>
                  <TableCell>
                    {acl.field_name ? (
                      <Badge variant="outline">{acl.field_name}</Badge>
                    ) : (
                      <span className="text-gray-400">Record</span>
                    )}
                  </TableCell>
                  <TableCell>{acl.priority}</TableCell>
                  <TableCell>
                    {acl.is_active ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {acl.allowed_roles?.slice(0, 2).map(role => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                      {acl.allowed_roles && acl.allowed_roles.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{acl.allowed_roles.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(acl)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(acl)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {acls.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No ACL rules configured yet.</p>
              <p className="text-sm">Create your first ACL to get started with dynamic permissions.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}