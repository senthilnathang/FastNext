"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  useCreateCompany,
  useDeleteCompanyLogo,
  useUpdateCompany,
  useUploadCompanyLogo,
} from "../hooks/useCompanies";
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from "../types";
import { COMPANY_INDUSTRIES, COMPANY_SIZES } from "../types";

// Validation schema
const companyFormSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    )
    .optional()
    .or(z.literal("")),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  settings: z.object({
    allow_member_invites: z.boolean().optional(),
    require_2fa: z.boolean().optional(),
    branding_enabled: z.boolean().optional(),
    timezone: z.string().optional(),
    locale: z.string().optional(),
  }).optional(),
});

type CompanyFormData = z.infer<typeof companyFormSchema>;

interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
  onSuccess?: (company: Company) => void;
}

export function CompanyForm({
  open,
  onOpenChange,
  company,
  onSuccess,
}: CompanyFormProps) {
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isEditing = !!company;

  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const uploadLogoMutation = useUploadCompanyLogo();
  const deleteLogoMutation = useDeleteCompanyLogo();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      website: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
      industry: "",
      size: "",
      settings: {
        allow_member_invites: true,
        require_2fa: false,
        branding_enabled: false,
        timezone: "UTC",
        locale: "en",
      },
    },
  });

  // Reset form when company changes
  React.useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        slug: company.slug ?? "",
        description: company.description ?? "",
        website: company.website ?? "",
        email: company.email ?? "",
        phone: company.phone ?? "",
        address: company.address ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        country: company.country ?? "",
        postal_code: company.postal_code ?? "",
        industry: company.industry ?? "",
        size: company.size ?? "",
        settings: {
          allow_member_invites: company.settings?.allow_member_invites ?? true,
          require_2fa: company.settings?.require_2fa ?? false,
          branding_enabled: company.settings?.branding_enabled ?? false,
          timezone: company.settings?.timezone ?? "UTC",
          locale: company.settings?.locale ?? "en",
        },
      });
      setLogoPreview(company.logo_url ?? null);
    } else {
      form.reset();
      setLogoPreview(null);
    }
    setLogoFile(null);
  }, [company, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        form.setError("root", { message: "Please select an image file" });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        form.setError("root", { message: "Image must be less than 5MB" });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    try {
      // Clean up empty strings
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== "")
      ) as CreateCompanyRequest | UpdateCompanyRequest;

      let result: Company;

      if (isEditing && company) {
        result = await updateCompanyMutation.mutateAsync({
          id: company.id,
          data: cleanData as UpdateCompanyRequest,
        });

        // Handle logo changes for existing company
        if (logoFile) {
          await uploadLogoMutation.mutateAsync({ id: company.id, file: logoFile });
        } else if (!logoPreview && company.logo_url) {
          await deleteLogoMutation.mutateAsync(company.id);
        }
      } else {
        result = await createCompanyMutation.mutateAsync(cleanData as CreateCompanyRequest);

        // Upload logo for new company
        if (logoFile && result.id) {
          await uploadLogoMutation.mutateAsync({ id: result.id, file: logoFile });
        }
      }

      form.reset();
      setLogoFile(null);
      setLogoPreview(null);
      onOpenChange(false);
      onSuccess?.(result);
    } catch (error) {
      console.error("Failed to save company:", error);
    }
  };

  const isSubmitting =
    createCompanyMutation.isPending ||
    updateCompanyMutation.isPending ||
    uploadLogoMutation.isPending ||
    deleteLogoMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Company" : "Create New Company"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the company information below."
              : "Fill in the details to create a new company."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="contact">Contact & Location</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Logo Upload */}
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
                    >
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Company logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    {logoPreview && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={handleRemoveLogo}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Company Logo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a logo for your company. PNG or JPG, max 5MB.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Acme Inc."
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="acme-inc"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          URL-friendly identifier
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Brief description of the company..."
                          disabled={isSubmitting}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select
                          disabled={isSubmitting}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMPANY_INDUSTRIES.map((industry) => (
                              <SelectItem
                                key={industry.value}
                                value={industry.value}
                              >
                                {industry.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Size</FormLabel>
                        <Select
                          disabled={isSubmitting}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMPANY_SIZES.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="url"
                            placeholder="https://example.com"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="contact@example.com"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123 Main Street"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="San Francisco"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="CA"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="United States"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="94102"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="settings.allow_member_invites"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Allow Member Invites
                        </FormLabel>
                        <FormDescription>
                          Allow existing members to invite new users to the
                          company
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settings.require_2fa"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Require Two-Factor Authentication
                        </FormLabel>
                        <FormDescription>
                          Require all members to enable 2FA for their accounts
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settings.branding_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Custom Branding
                        </FormLabel>
                        <FormDescription>
                          Enable custom branding for the company workspace
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="settings.timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select
                          disabled={isSubmitting}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/New_York">
                              Eastern Time
                            </SelectItem>
                            <SelectItem value="America/Chicago">
                              Central Time
                            </SelectItem>
                            <SelectItem value="America/Denver">
                              Mountain Time
                            </SelectItem>
                            <SelectItem value="America/Los_Angeles">
                              Pacific Time
                            </SelectItem>
                            <SelectItem value="Europe/London">
                              London
                            </SelectItem>
                            <SelectItem value="Europe/Paris">Paris</SelectItem>
                            <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                            <SelectItem value="Asia/Singapore">
                              Singapore
                            </SelectItem>
                            <SelectItem value="Australia/Sydney">
                              Sydney
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="settings.locale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select
                          disabled={isSubmitting}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                            <SelectItem value="ja">Japanese</SelectItem>
                            <SelectItem value="zh">Chinese</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Create Company"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
