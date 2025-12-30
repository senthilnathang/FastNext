"use client";

import {
  ArrowLeft,
  Building2,
  Save,
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

// Company creation schema
const companySchema = z.object({
  name: z.string().min(1, "Company slug is required").max(100),
  display_name: z.string().min(1, "Display name is required").max(200),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type CompanyFormData = z.infer<typeof companySchema>;

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

export default function NewCompanyPage() {
  const router = useRouter();

  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formData, setFormData] = React.useState<Partial<CompanyFormData>>({
    is_active: true,
  });

  const handleInputChange = (field: keyof CompanyFormData, value: any) => {
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
      companySchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
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
      // await apiClient.post("/api/v1/companies", formData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/admin/companies");
    } catch (error) {
      console.error("Failed to create company:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
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
            <h1 className="text-2xl font-bold">Create New Company</h1>
            <p className="text-muted-foreground">Add a new company to the system</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Company identity and contact details</CardDescription>
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
                  placeholder="Acme Corporation"
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
                  placeholder="acme-corp"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  URL-friendly identifier for the company
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@company.com"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+1-555-0100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website || ""}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    placeholder="https://company.com"
                    className={errors.website ? "border-destructive" : ""}
                  />
                  {errors.website && (
                    <p className="text-sm text-destructive">{errors.website}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Company Size</Label>
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
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Brief description of the company..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address & Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
                <CardDescription>Company location details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address || ""}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="123 Main Street, Suite 100"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city || ""}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="New York"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={formData.state || ""}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                      placeholder="NY"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country || ""}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      placeholder="USA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code || ""}
                      onChange={(e) => handleInputChange("postal_code", e.target.value)}
                      placeholder="10001"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Company configuration options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable this company upon creation
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Link href="/admin/companies">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Creating..." : "Create Company"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
