"use client";

import {
  Building2,
  Calendar,
  Edit,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useCompany } from "../hooks/useCompany";
import {
  useAddCompanyMember,
  useCompanyMembers,
  useRemoveCompanyMember,
  useToggleCompanyStatus,
  useUpdateCompanyMember,
  useUpdateCompanySettings,
} from "../hooks/useCompanies";
import type { Company, CompanyMember, CompanyStatus } from "../types";

interface CompanyDetailsProps {
  companyId: number;
  onEdit?: (company: Company) => void;
  onBack?: () => void;
}

const statusVariants: Record<
  CompanyStatus,
  "success" | "secondary" | "destructive"
> = {
  active: "success",
  inactive: "secondary",
  suspended: "destructive",
};

const MEMBER_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

export function CompanyDetails({
  companyId,
  onEdit,
  onBack,
}: CompanyDetailsProps) {
  const [memberSearch, setMemberSearch] = React.useState("");
  const [addMemberOpen, setAddMemberOpen] = React.useState(false);
  const [newMemberEmail, setNewMemberEmail] = React.useState("");
  const [newMemberRole, setNewMemberRole] = React.useState("member");
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] =
    React.useState(false);
  const [memberToRemove, setMemberToRemove] =
    React.useState<CompanyMember | null>(null);

  const { data: company, isLoading: companyLoading } = useCompany(companyId);
  const { data: membersData, isLoading: membersLoading } = useCompanyMembers(
    companyId,
    { search: memberSearch || undefined }
  );

  const toggleStatusMutation = useToggleCompanyStatus();
  const updateSettingsMutation = useUpdateCompanySettings();
  const addMemberMutation = useAddCompanyMember();
  const updateMemberMutation = useUpdateCompanyMember();
  const removeMemberMutation = useRemoveCompanyMember();

  const members = membersData?.items ?? [];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleToggleStatus = async () => {
    if (company) {
      await toggleStatusMutation.mutateAsync(company.id);
    }
  };

  const handleSettingChange = async (
    key: string,
    value: boolean | string | number
  ) => {
    if (company) {
      await updateSettingsMutation.mutateAsync({
        companyId: company.id,
        settings: { [key]: value },
      });
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail) return;

    await addMemberMutation.mutateAsync({
      companyId,
      data: {
        email: newMemberEmail,
        role: newMemberRole,
        send_invitation: true,
      },
    });

    setNewMemberEmail("");
    setNewMemberRole("member");
    setAddMemberOpen(false);
  };

  const handleUpdateMemberRole = async (
    memberId: number,
    newRole: string
  ) => {
    await updateMemberMutation.mutateAsync({
      companyId,
      memberId,
      data: { role: newRole },
    });
  };

  const handleRemoveMember = (member: CompanyMember) => {
    setMemberToRemove(member);
    setRemoveMemberDialogOpen(true);
  };

  const confirmRemoveMember = async () => {
    if (memberToRemove) {
      await removeMemberMutation.mutateAsync({
        companyId,
        memberId: memberToRemove.id,
      });
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    }
  };

  if (companyLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Company not found</h3>
        <p className="text-sm text-muted-foreground">
          The company you're looking for doesn't exist or has been removed.
        </p>
        {onBack && (
          <Button onClick={onBack} className="mt-4">
            Go Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 rounded-lg">
            <AvatarImage src={company.logo_url} alt={company.name} />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-2xl">
              {getInitials(company.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{company.name}</h1>
              <Badge variant={statusVariants[company.status]} className="capitalize">
                {company.status}
              </Badge>
            </div>
            {company.description && (
              <p className="mt-1 text-muted-foreground max-w-xl">
                {company.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {company.industry && (
                <span className="capitalize">
                  {company.industry.replace("_", " ")}
                </span>
              )}
              {company.size && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="capitalize">{company.size}</span>
                </>
              )}
              <span className="text-muted-foreground/50">|</span>
              <span>{company.member_count ?? 0} members</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onEdit?.(company)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggleStatus}>
                {company.status === "active" ? "Deactivate" : "Activate"} Company
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Delete Company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Building2 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {company.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${company.email}`}
                      className="hover:text-primary"
                    >
                      {company.email}
                    </a>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${company.phone}`}
                      className="hover:text-primary"
                    >
                      {company.phone}
                    </a>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                    >
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {(company.address ||
                  company.city ||
                  company.state ||
                  company.country) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      {company.address && <p>{company.address}</p>}
                      <p>
                        {[company.city, company.state, company.postal_code]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {company.country && <p>{company.country}</p>}
                    </div>
                  </div>
                )}
                {!company.email &&
                  !company.phone &&
                  !company.website &&
                  !company.address && (
                    <p className="text-muted-foreground">
                      No contact information available
                    </p>
                  )}
              </CardContent>
            </Card>

            {/* Company Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Slug</span>
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {company.slug}
                  </code>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(company.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{new Date(company.updated_at).toLocaleDateString()}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Members</span>
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {company.member_count ?? 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setAddMemberOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>

          {membersLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
              <Users className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No members found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {memberSearch
                  ? "Try a different search term."
                  : "Add members to this company."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={member.avatar_url}
                              alt={member.full_name ?? member.email}
                            />
                            <AvatarFallback>
                              {getInitials(member.full_name ?? member.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.full_name ?? "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleUpdateMemberRole(member.id, value)
                          }
                          disabled={member.is_owner}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEMBER_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.last_active_at
                          ? new Date(member.last_active_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {!member.is_owner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security options for this company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Require Two-Factor Authentication
                    </div>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    All members must enable 2FA to access this company
                  </p>
                </div>
                <Switch
                  checked={company.settings?.require_2fa ?? false}
                  onCheckedChange={(checked) =>
                    handleSettingChange("require_2fa", checked)
                  }
                  disabled={updateSettingsMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Member Settings</CardTitle>
              <CardDescription>
                Control how members can interact with this company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Allow Member Invites
                    </div>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Existing members can invite new users to the company
                  </p>
                </div>
                <Switch
                  checked={company.settings?.allow_member_invites ?? true}
                  onCheckedChange={(checked) =>
                    handleSettingChange("allow_member_invites", checked)
                  }
                  disabled={updateSettingsMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Customize the appearance for this company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Custom Branding</Label>
                  <p className="text-sm text-muted-foreground">
                    Use custom colors and logo in the company workspace
                  </p>
                </div>
                <Switch
                  checked={company.settings?.branding_enabled ?? false}
                  onCheckedChange={(checked) =>
                    handleSettingChange("branding_enabled", checked)
                  }
                  disabled={updateSettingsMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Invite a new member to this company. They will receive an email
              invitation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_ROLES.filter((r) => r.value !== "owner").map(
                    (role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={!newMemberEmail || addMemberMutation.isPending}
            >
              {addMemberMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog
        open={removeMemberDialogOpen}
        onOpenChange={setRemoveMemberDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              {memberToRemove?.full_name ?? memberToRemove?.email} from this
              company? They will lose access to all company resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMemberMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
