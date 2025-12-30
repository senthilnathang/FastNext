"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Edit,
  Lock,
  MoreVertical,
  Plus,
  Save,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { Badge } from "@/shared/components/ui/badge";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";

// Group type definition
interface Group {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  type: "department" | "team" | "project" | "custom";
  parent_id?: number;
  parent_name?: string;
  is_active: boolean;
  is_system: boolean;
  member_count: number;
  permissions_count: number;
  created_at: string;
  updated_at: string;
}

interface GroupMember {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
}

interface GroupPermission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
}

// Mock data
const mockGroup: Group = {
  id: 1,
  name: "engineering",
  display_name: "Engineering",
  description: "Engineering department responsible for product development and technical infrastructure.",
  type: "department",
  is_active: true,
  is_system: false,
  member_count: 45,
  permissions_count: 15,
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-12-01T15:30:00Z",
};

const mockMembers: GroupMember[] = [
  {
    id: 1,
    user_id: 1,
    username: "john.doe",
    full_name: "John Doe",
    email: "john.doe@example.com",
    role: "owner",
    joined_at: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    user_id: 2,
    username: "jane.smith",
    full_name: "Jane Smith",
    email: "jane.smith@example.com",
    role: "admin",
    joined_at: "2024-02-01T09:00:00Z",
  },
  {
    id: 3,
    user_id: 3,
    username: "bob.wilson",
    full_name: "Bob Wilson",
    email: "bob.wilson@example.com",
    role: "member",
    joined_at: "2024-03-15T14:00:00Z",
  },
];

const mockPermissions: GroupPermission[] = [
  {
    id: 1,
    name: "View Projects",
    description: "Can view all projects",
    resource: "projects",
    action: "read",
  },
  {
    id: 2,
    name: "Edit Projects",
    description: "Can edit project details",
    resource: "projects",
    action: "write",
  },
  {
    id: 3,
    name: "Manage Team",
    description: "Can manage team members",
    resource: "team",
    action: "manage",
  },
];

const groupTypes = [
  { value: "department", label: "Department" },
  { value: "team", label: "Team" },
  { value: "project", label: "Project" },
  { value: "custom", label: "Custom" },
];

const memberRoles = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

const roleColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  member: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = React.useState<Group | null>(null);
  const [members, setMembers] = React.useState<GroupMember[]>([]);
  const [permissions, setPermissions] = React.useState<GroupPermission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<Group>>({});
  const [memberSearchQuery, setMemberSearchQuery] = React.useState("");

  // Fetch group data
  React.useEffect(() => {
    const fetchGroup = async () => {
      setLoading(true);
      try {
        // Replace with actual API calls
        await new Promise((resolve) => setTimeout(resolve, 500));
        setGroup({ ...mockGroup, id: parseInt(groupId) });
        setFormData({ ...mockGroup, id: parseInt(groupId) });
        setMembers(mockMembers);
        setPermissions(mockPermissions);
      } catch (error) {
        console.error("Failed to fetch group:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId]);

  const handleInputChange = (field: keyof Group, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setGroup(formData as Group);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save group:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/admin/groups");
    } catch (error) {
      console.error("Failed to delete group:", error);
    }
  };

  const handleCancel = () => {
    setFormData(group as Group);
    setIsEditing(false);
  };

  const handleRemoveMember = async (memberId: number) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const filteredMembers = React.useMemo(() => {
    return members.filter(
      (member) =>
        memberSearchQuery === "" ||
        member.full_name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        member.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
    );
  }, [members, memberSearchQuery]);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Group Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The group you are looking for does not exist.
          </p>
          <Link href="/admin/groups">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {group.display_name}
                {group.is_system && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </h1>
              <p className="text-muted-foreground">{group.name}</p>
            </div>
            <Badge variant={group.is_active ? "default" : "destructive"}>
              {group.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                disabled={group.is_system}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={group.is_system}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Group</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this group? This will remove
                      all member associations. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="permissions">
            Permissions ({permissions.length})
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Group Information</CardTitle>
                <CardDescription>Basic group details and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name</Label>
                    {isEditing ? (
                      <Input
                        id="display_name"
                        value={formData.display_name || ""}
                        onChange={(e) =>
                          handleInputChange("display_name", e.target.value)
                        }
                      />
                    ) : (
                      <p className="text-sm">{group.display_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Slug Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={formData.name || ""}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm">{group.name}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Group Type</Label>
                  {isEditing ? (
                    <Select
                      value={formData.type || ""}
                      onValueChange={(value) => handleInputChange("type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm capitalize">{group.type}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  {isEditing ? (
                    <Textarea
                      id="description"
                      value={formData.description || ""}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {group.description || "No description provided"}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <Label>Active Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable this group
                    </p>
                  </div>
                  <Switch
                    checked={isEditing ? formData.is_active : group.is_active}
                    onCheckedChange={(checked) =>
                      isEditing && handleInputChange("is_active", checked)
                    }
                    disabled={!isEditing || group.is_system}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics & Metadata</CardTitle>
                <CardDescription>Group usage and system information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Members</span>
                    </div>
                    <p className="text-2xl font-bold">{group.member_count}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm">Permissions</span>
                    </div>
                    <p className="text-2xl font-bold">{group.permissions_count}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">System Group</span>
                    <Badge variant={group.is_system ? "secondary" : "outline"}>
                      {group.is_system ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(group.created_at), "PPpp")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{format(new Date(group.updated_at), "PPpp")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Group Members</CardTitle>
                  <CardDescription>
                    Manage users in this group
                  </CardDescription>
                </div>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search members..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="max-w-sm"
              />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="text-muted-foreground">
                          No members found
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {member.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.full_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleColors[member.role]}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(member.joined_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Change Role</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Group Permissions</CardTitle>
                  <CardDescription>
                    Permissions assigned to this group
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Permission
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="text-muted-foreground">
                          No permissions assigned
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    permissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{permission.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {permission.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{permission.resource}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{permission.action}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
