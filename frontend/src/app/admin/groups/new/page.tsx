"use client";

import {
  ArrowLeft,
  Save,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";

// Group creation schema
const groupSchema = z.object({
  name: z.string().min(1, "Group slug is required").max(100),
  display_name: z.string().min(1, "Display name is required").max(200),
  description: z.string().optional(),
  type: z.enum(["department", "team", "project", "custom"]),
  parent_id: z.number().optional(),
  is_active: z.boolean().default(true),
});

type GroupFormData = z.infer<typeof groupSchema>;

const groupTypes = [
  { value: "department", label: "Department", description: "Organizational unit like HR, Engineering, etc." },
  { value: "team", label: "Team", description: "Working team within a department" },
  { value: "project", label: "Project", description: "Temporary group for a specific project" },
  { value: "custom", label: "Custom", description: "Custom group for any purpose" },
];

// Mock parent groups for demonstration
const mockParentGroups = [
  { id: 1, display_name: "Engineering" },
  { id: 2, display_name: "Marketing" },
  { id: 3, display_name: "Sales" },
  { id: 4, display_name: "Operations" },
];

export default function NewGroupPage() {
  const router = useRouter();

  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formData, setFormData] = React.useState<Partial<GroupFormData>>({
    type: "team",
    is_active: true,
  });

  const handleInputChange = (field: keyof GroupFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Auto-generate slug from display name
  const handleDisplayNameChange = (value: string) => {
    handleInputChange("display_name", value);
    // Auto-generate slug if name is empty or hasn't been manually edited
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    handleInputChange("name", slug);
  };

  const validateForm = (): boolean => {
    try {
      groupSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Replace with actual API call
      // await apiClient.post("/api/v1/groups", formData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/admin/groups");
    } catch (error) {
      console.error("Failed to create group:", error);
    } finally {
      setSaving(false);
    }
  };

  const selectedType = groupTypes.find((t) => t.value === formData.type);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/groups">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create New Group</h1>
            <p className="text-muted-foreground">Add a new group to organize users</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Group Information</CardTitle>
              <CardDescription>Basic group details and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">
                  Display Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="display_name"
                  value={formData.display_name || ""}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="Engineering Team"
                  className={errors.display_name ? "border-destructive" : ""}
                />
                {errors.display_name && (
                  <p className="text-sm text-destructive">{errors.display_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Slug Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="engineering-team"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  URL-friendly identifier for the group
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">
                  Group Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.type || ""}
                  onValueChange={(value) => handleInputChange("type", value)}
                >
                  <SelectTrigger className={errors.type ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select group type" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedType && (
                  <p className="text-sm text-muted-foreground">
                    {selectedType.description}
                  </p>
                )}
                {errors.type && (
                  <p className="text-sm text-destructive">{errors.type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_id">Parent Group (Optional)</Label>
                <Select
                  value={formData.parent_id?.toString() || "none"}
                  onValueChange={(value) =>
                    handleInputChange(
                      "parent_id",
                      value === "none" ? undefined : parseInt(value)
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent (Top Level)</SelectItem>
                    {mockParentGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Optionally nest this group under another group
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Brief description of the group's purpose..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Group configuration options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable this group upon creation
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active ?? true}
                    onCheckedChange={(checked) =>
                      handleInputChange("is_active", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
                <CardDescription>What happens after creation</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">1.</span>
                    After creating the group, you can add members from the group details page.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">2.</span>
                    Assign permissions to control what group members can access.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">3.</span>
                    Configure group-specific settings and notifications.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Link href="/admin/groups">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
