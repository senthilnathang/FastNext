"use client";

import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Edit,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  Trash2,
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

// Company type definition
interface Company {
  id: number;
  name: string;
  display_name: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  industry?: string;
  size?: string;
  description?: string;
  is_active: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

// Mock data for demonstration - replace with actual API calls
const mockCompany: Company = {
  id: 1,
  name: "acme-corp",
  display_name: "Acme Corporation",
  email: "contact@acme.com",
  phone: "+1-555-0100",
  website: "https://acme.com",
  address: "123 Main Street, Suite 100",
  city: "New York",
  state: "NY",
  country: "USA",
  postal_code: "10001",
  industry: "Technology",
  size: "100-500",
  description: "A leading technology company specializing in innovative solutions.",
  is_active: true,
  user_count: 150,
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-12-01T15:30:00Z",
};

const companySizes = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "50-100", label: "50-100 employees" },
  { value: "100-500", label: "100-500 employees" },
  { value: "500-1000", label: "500-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

const industries = [
  "Technology",
  "Finance",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Consulting",
  "Education",
  "Real Estate",
  "Transportation",
  "Other",
];

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = React.useState<Company | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<Company>>({});

  // Fetch company data
  React.useEffect(() => {
    const fetchCompany = async () => {
      setLoading(true);
      try {
        // Replace with actual API call
        // const response = await apiClient.get(`/api/v1/companies/${companyId}`);
        // setCompany(response.data);
        await new Promise((resolve) => setTimeout(resolve, 500));
        setCompany({ ...mockCompany, id: parseInt(companyId) });
        setFormData({ ...mockCompany, id: parseInt(companyId) });
      } catch (error) {
        console.error("Failed to fetch company:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  const handleInputChange = (field: keyof Company, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Replace with actual API call
      // await apiClient.put(`/api/v1/companies/${companyId}`, formData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCompany(formData as Company);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save company:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      // Replace with actual API call
      // await apiClient.delete(`/api/v1/companies/${companyId}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/admin/companies");
    } catch (error) {
      console.error("Failed to delete company:", error);
    }
  };

  const handleCancel = () => {
    setFormData(company as Company);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Company Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The company you are looking for does not exist.
          </p>
          <Link href="/admin/companies">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Companies
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
          <Link href="/admin/companies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{company.display_name}</h1>
              <p className="text-muted-foreground">{company.name}</p>
            </div>
            <Badge variant={company.is_active ? "default" : "destructive"}>
              {company.is_active ? "Active" : "Inactive"}
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
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Company</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this company? This action cannot
                      be undone and will remove all associated data.
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
          <TabsTrigger value="users">Users ({company.user_count})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Company identity and contact details</CardDescription>
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
                      <p className="text-sm">{company.display_name}</p>
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
                      <p className="text-sm">{company.name}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  ) : (
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {company.email}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={formData.phone || ""}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {company.phone || "-"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    {isEditing ? (
                      <Input
                        id="website"
                        value={formData.website || ""}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {company.website ? (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {company.website}
                          </a>
                        ) : (
                          "-"
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    {isEditing ? (
                      <Select
                        value={formData.industry || ""}
                        onValueChange={(value) => handleInputChange("industry", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((ind) => (
                            <SelectItem key={ind} value={ind}>
                              {ind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">{company.industry || "-"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="size">Company Size</Label>
                    {isEditing ? (
                      <Select
                        value={formData.size || ""}
                        onValueChange={(value) => handleInputChange("size", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {companySizes.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">{company.size || "-"}</p>
                    )}
                  </div>
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
                      {company.description || "No description provided"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
                <CardDescription>Company location and address details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  {isEditing ? (
                    <Textarea
                      id="address"
                      value={formData.address || ""}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      {company.address || "-"}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    {isEditing ? (
                      <Input
                        id="city"
                        value={formData.city || ""}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm">{company.city || "-"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    {isEditing ? (
                      <Input
                        id="state"
                        value={formData.state || ""}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm">{company.state || "-"}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    {isEditing ? (
                      <Input
                        id="country"
                        value={formData.country || ""}
                        onChange={(e) => handleInputChange("country", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm">{company.country || "-"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    {isEditing ? (
                      <Input
                        id="postal_code"
                        value={formData.postal_code || ""}
                        onChange={(e) =>
                          handleInputChange("postal_code", e.target.value)
                        }
                      />
                    ) : (
                      <p className="text-sm">{company.postal_code || "-"}</p>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(company.created_at), "PPpp")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{format(new Date(company.updated_at), "PPpp")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Company Users</CardTitle>
              <CardDescription>
                Users associated with this company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {company.user_count} Users
                </h3>
                <p className="text-muted-foreground mb-4">
                  User management for this company will be available here.
                </p>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Company Settings</CardTitle>
              <CardDescription>
                Configure company-specific settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable this company
                  </p>
                </div>
                <Switch
                  checked={isEditing ? formData.is_active : company.is_active}
                  onCheckedChange={(checked) =>
                    isEditing && handleInputChange("is_active", checked)
                  }
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
